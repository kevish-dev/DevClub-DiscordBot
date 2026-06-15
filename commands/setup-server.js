// ===================================================
// commands/setup-server.js — Server Scaffolding Tool
// ===================================================
// Creates all categories and channels defined in server-config.json.
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
const serverConfig = require(path.join(__dirname, '..', 'config', 'server-config.json'));

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

    const guild = interaction.guild;
    let created = 0;
    let skipped = 0;
    let errors = [];

    try {
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
            await guild.channels.create({
              name: chConfig.name,
              type: channelType,
              parent: category.id,
              // Channels inherit category permissions unless overridden
            });
            created++;
            console.log(`  #️⃣  Created channel: ${chConfig.name}`);
          } else {
            skipped++;
          }
        }
      }

      // ── 3. Report results ────────────────────────────────
      await interaction.editReply(
        `✅ **Server scaffolding complete!**\n` +
          `• Created: **${created}** categories/channels\n` +
          `• Skipped (already exist): **${skipped}**\n` +
          (errors.length
            ? `• Errors: ${errors.join(', ')}`
            : '• Errors: none 🎉')
      );
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
          console.warn(`⚠️  Role "${ow.role}" not found — skipping overwrite.`);
          return null;
        }
        id = role.id;
      }

      // Convert string permission names to bitfield flags
      const allow = (ow.allow || []).map((p) => PermissionsBitField.Flags[p]);
      const deny = (ow.deny || []).map((p) => PermissionsBitField.Flags[p]);

      return { id, allow, deny };
    })
    .filter(Boolean); // remove nulls from missing roles
}
