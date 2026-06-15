// ===================================================
// commands/setup-roles.js — Role Creation Tool
// ===================================================
// Creates all roles defined in roles-config.json.
// Idempotent: skips roles that already exist by name.
// Admin-only.
// ===================================================

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('node:path');
const rolesConfig = require(path.join(__dirname, '..', 'config', 'roles-config.json'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles')
    .setDescription('🎨 Create all roles defined in roles-config.json')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    let created = 0;
    let skipped = 0;

    try {
      for (const group of rolesConfig.roleGroups) {
        for (const roleDef of group.roles) {
          // Check if role already exists (case-sensitive match)
          const existing = guild.roles.cache.find((r) => r.name === roleDef.name);

          if (existing) {
            skipped++;
            continue;
          }

          // Create the role
          await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: group.hoist || false,    // Prestige roles are hoisted (shown separately)
            mentionable: true,
            reason: `Auto-created by NST Bot — group: ${group.group}`,
          });

          created++;
          console.log(`🏷️  Created role: ${roleDef.name} (${group.group})`);
        }
      }

      await interaction.editReply(
        `✅ **Role setup complete!**\n` +
          `• Created: **${created}** roles\n` +
          `• Skipped (already exist): **${skipped}**`
      );
    } catch (err) {
      console.error('❌ setup-roles error:', err);
      await interaction.editReply(
        `❌ Failed to create roles:\n\`\`\`${err.message}\`\`\``
      );
    }
  },
};
