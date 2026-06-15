// ===================================================
// commands/setup-roles-menu.js — Self-Assign Role Picker
// ===================================================
// Posts persistent select-menu embeds in the current channel
// so members can pick their own roles (Academic, Hostel, Interest).
// Uses customId format "role_select_<group>" for persistence.
// Admin-only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const path = require('node:path');
const rolesConfig = require(path.join(__dirname, '..', 'config', 'roles-config.json'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-roles-menu')
    .setDescription('📋 Post self-assign role menus in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // Only post menus for self-assignable groups
      const selfAssignGroups = rolesConfig.roleGroups.filter((g) => g.selfAssignable);

      // Emoji map per group to make the menus more visual
      const groupEmoji = {
        Academic: '🎓',
        Hostel: '🏠',
        Interest: '💡',
      };

      // Color map per group for embed sidebar
      const groupColor = {
        Academic: 0x3498db,
        Hostel: 0x2ecc71,
        Interest: 0xe67e22,
      };

      for (const group of selfAssignGroups) {
        const emoji = groupEmoji[group.group] || '🔹';
        const color = groupColor[group.group] || 0x5865f2;

        // Build the embed
        const embed = new EmbedBuilder()
          .setTitle(`${emoji}  ${group.group} Roles`)
          .setDescription(
            `${group.description}\n\n` +
              `Use the dropdown below to **toggle** a role.\n` +
              `Select it again to remove it.`
          )
          .setColor(color)
          .setFooter({ text: 'NST Bot • Role self-assignment' });

        // Build the select menu
        const menu = new StringSelectMenuBuilder()
          .setCustomId(`role_select_${group.group}`) // e.g. "role_select_Academic"
          .setPlaceholder(`Choose your ${group.group.toLowerCase()} role(s)…`)
          .setMinValues(1)
          .setMaxValues(group.roles.length) // allow multi-select
          .addOptions(
            group.roles.map((r) => ({
              label: r.name,
              value: r.name, // we match by role name at interaction time
              description: `Toggle the ${r.name} role`,
            }))
          );

        const row = new ActionRowBuilder().addComponents(menu);

        // Send to the channel (NOT ephemeral — this is the persistent message)
        await interaction.channel.send({ embeds: [embed], components: [row] });
      }

      await interaction.editReply('✅ Role menus posted! Members can now self-assign.');
    } catch (err) {
      console.error('❌ setup-roles-menu error:', err);
      await interaction.editReply(
        `❌ Failed to post role menus:\n\`\`\`${err.message}\`\`\``
      );
    }
  },
};
