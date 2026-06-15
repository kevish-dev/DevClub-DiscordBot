// ===================================================
// commands/setup-server.js — Server Scaffolding Tool
// ===================================================
// Creates all categories and channels defined in server-config.json.
// Supports:
//   • Category-level permission overwrites
//   • Channel-level permission overwrites (override/extend category perms)
//   • Channel topics
//   • Text, voice, and forum channel types
// Idempotent: skips anything that already exists by name.
// Admin-only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');
const path = require('node:path');

module.exports = {
  // ---------------------------------------------------
  // Slash command definition (sent to Discord via deploy-commands.js)
  // ---------------------------------------------------
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('🏗️ Scaffold all categories & channels from server-config.json')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // only admins see this

  // ---------------------------------------------------
  // Execution logic
  // ---------------------------------------------------
  async execute(interaction) {
    // Defer the reply because this will take a while (many API calls)
    await interaction.deferReply({ ephemeral: true });

    // Re-read config fresh every time (don't cache with require)
    // so changes to the JSON are picked up without restarting the bot
    const fs = require('node:fs');
    const configPath = path.join(__dirname, '..', 'config', 'server-config.json');
    const serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const guild = interaction.guild;
    let created = 0;
    let skipped = 0;
    const errors = [];

    try {
      // Make sure role cache is populated (needed to resolve role names → IDs)
      await guild.roles.fetch();

      // Walk through every category in the config
      for (const catConfig of serverConfig.categories) {
        // ── 1. Find or create the CATEGORY ──────────────────
        let category = guild.channels.cache.find(
          (ch) => ch.name === catConfig.name && ch.type === ChannelType.GuildCategory
        );

        if (!category) {
          // Build permission overwrites for the category (if any)
          const overwrites = buildOverwrites(guild, catConfig.permissionOverwrites);

          category = await guild.channels.create({
            name: catConfig.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: overwrites,
          });
          created++;
          console.log(`📁 Created category: ${catConfig.name}`);
        } else {
          skipped++;
        }

        // ── 2. Create each CHANNEL inside the category ──────
        for (const chConfig of catConfig.channels) {
          const channelType =
            chConfig.type === 'voice'
              ? ChannelType.GuildVoice
              : chConfig.type === 'forum'
              ? ChannelType.GuildForum
              : ChannelType.GuildText;

          // Check if channel already exists under this category
          const existing = guild.channels.cache.find(
            (ch) =>
              ch.name === chConfig.name &&
              ch.parentId === category.id &&
              ch.type === channelType
          );

          if (!existing) {
            // Build channel creation options
            const createOptions = {
              name: chConfig.name,
              type: channelType,
              parent: category.id,
            };

            // Set topic if provided (only for text channels)
            if (chConfig.topic && channelType === ChannelType.GuildText) {
              createOptions.topic = chConfig.topic;
            }

            // If the channel has its OWN permission overwrites, apply them
            // ON TOP of the category permissions.
            // If not, the channel inherits category permissions automatically.
            if (chConfig.permissionOverwrites && chConfig.permissionOverwrites.length > 0) {
              // Start with the category's overwrites as a base
              const baseOverwrites = buildOverwrites(guild, catConfig.permissionOverwrites);

              // Layer channel-specific overwrites on top
              const channelOverwrites = buildOverwrites(guild, chConfig.permissionOverwrites);

              // Merge: channel-level overwrites take priority for the same role
              const mergedMap = new Map();
              for (const ow of baseOverwrites) {
                mergedMap.set(ow.id, ow);
              }
              for (const ow of channelOverwrites) {
                if (mergedMap.has(ow.id)) {
                  // Merge allow/deny arrays: channel-specific wins
                  const existing = mergedMap.get(ow.id);
                  mergedMap.set(ow.id, {
                    id: ow.id,
                    allow: [...new Set([...existing.allow, ...ow.allow])],
                    deny: [...new Set([...existing.deny, ...ow.deny])],
                  });
                } else {
                  mergedMap.set(ow.id, ow);
                }
              }

              createOptions.permissionOverwrites = Array.from(mergedMap.values());
            }

            try {
              await guild.channels.create(createOptions);
              created++;
              console.log(`  #️⃣  Created channel: ${chConfig.name}`);
            } catch (chErr) {
              errors.push(`${chConfig.name}: ${chErr.message}`);
              console.error(`  ❌ Failed to create ${chConfig.name}:`, chErr.message);
            }
          } else {
            skipped++;
          }
        }
      }

      // ── 3. Report results ────────────────────────────────
      let report =
        `✅ **Server scaffolding complete!**\n` +
        `• Created: **${created}** categories/channels\n` +
        `• Skipped (already exist): **${skipped}**\n`;

      if (errors.length) {
        report += `• ⚠️ Errors (${errors.length}):\n${errors.map((e) => `  - ${e}`).join('\n')}`;
      } else {
        report += '• Errors: none 🎉';
      }

      await interaction.editReply(report);
    } catch (err) {
      console.error('❌ setup-server error:', err);
      await interaction.editReply(
        `❌ Something went wrong during server setup:\n\`\`\`${err.message}\`\`\``
      );
    }
  },
};

// =====================================================
// Helper: Convert config permission overwrites to
// discord.js PermissionOverwrites array
// =====================================================
// Each overwrite in config looks like:
//   { "role": "Batch 2027", "allow": ["ViewChannel", ...], "deny": ["SendMessages", ...] }
// We resolve role names to IDs and convert permission names to bitfield flags.
// =====================================================
function buildOverwrites(guild, overwriteConfigs) {
  if (!overwriteConfigs || overwriteConfigs.length === 0) return [];

  return overwriteConfigs
    .map((ow) => {
      // Resolve the role — "@everyone" is the guild's default role (guild.id)
      let id;
      if (ow.role === '@everyone') {
        id = guild.id; // @everyone role shares the guild ID
      } else {
        const role = guild.roles.cache.find((r) => r.name === ow.role);
        if (!role) {
          console.warn(`⚠️  Role "${ow.role}" not found — skipping overwrite. Run /setup-roles first!`);
          return null;
        }
        id = role.id;
      }

      // Convert string permission names to bitfield flags
      // e.g. "ViewChannel" → PermissionsBitField.Flags.ViewChannel
      const allow = (ow.allow || [])
        .map((p) => PermissionsBitField.Flags[p])
        .filter(Boolean);
      const deny = (ow.deny || [])
        .map((p) => PermissionsBitField.Flags[p])
        .filter(Boolean);

      return { id, allow, deny };
    })
    .filter(Boolean); // remove nulls from missing roles
}
