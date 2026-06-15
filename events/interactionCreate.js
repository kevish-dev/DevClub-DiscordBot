// ===================================================
// events/interactionCreate.js — Central Interaction Router
// ===================================================
// Handles:
//   1. Slash command execution (routes to command files)
//   2. Select menu interactions (role self-assignment)
// ===================================================

const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate, // 'interactionCreate'

  async execute(interaction) {
    // ─── 1. SLASH COMMANDS ──────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.warn(`⚠️  Unknown command: /${interaction.commandName}`);
        return interaction.reply({
          content: '❌ Unknown command.',
          ephemeral: true,
        });
      }

      try {
        await command.execute(interaction);
      } catch (err) {
        console.error(`❌ Error executing /${interaction.commandName}:`, err);

        // If we already replied/deferred, edit; otherwise reply
        const errorMsg = '❌ Something went wrong running this command.';
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: errorMsg });
        } else {
          await interaction.reply({ content: errorMsg, ephemeral: true });
        }
      }
      return;
    }

    // ─── 2. SELECT MENUS (role self-assignment) ─────────
    if (interaction.isStringSelectMenu()) {
      // Our customIds are "role_select_Academic", "role_select_Hostel", etc.
      if (!interaction.customId.startsWith('role_select_')) return;

      await interaction.deferReply({ ephemeral: true });

      try {
        const guild = interaction.guild;
        const member = interaction.member;
        const selectedRoleNames = interaction.values; // array of role names the user picked

        const added = [];
        const removed = [];
        const notFound = [];

        for (const roleName of selectedRoleNames) {
          // Find the role in the guild by exact name
          const role = guild.roles.cache.find((r) => r.name === roleName);

          if (!role) {
            notFound.push(roleName);
            continue;
          }

          // Toggle: if member has the role → remove it; otherwise → add it
          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Self-unassigned via role menu');
            removed.push(roleName);
          } else {
            await member.roles.add(role, 'Self-assigned via role menu');
            added.push(roleName);
          }
        }

        // Build a user-friendly response
        const lines = [];
        if (added.length)    lines.push(`✅ **Added:** ${added.join(', ')}`);
        if (removed.length)  lines.push(`❎ **Removed:** ${removed.join(', ')}`);
        if (notFound.length) lines.push(`⚠️ **Not found:** ${notFound.join(', ')}`);

        await interaction.editReply(lines.join('\n') || 'No changes made.');
      } catch (err) {
        console.error('❌ Role menu interaction error:', err);
        await interaction.editReply(
          `❌ Failed to update roles:\n\`\`\`${err.message}\`\`\``
        );
      }
    }
  },
};
