// ===================================================
// commands/grant-inner-circle.js — Secret Section Unlock
// ===================================================
// /grant-inner-circle @user
// Assigns the "Inner Circle" role, granting access to
// the locked SECRET SECTION category. Admin-only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('grant-inner-circle')
    .setDescription('🔓 Grant a user access to the Secret Section (Inner Circle)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('The user to grant Inner Circle access')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const targetUser = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(targetUser.id);

      // Find the "Inner Circle" role
      const role = interaction.guild.roles.cache.find(
        (r) => r.name === 'Inner Circle'
      );

      if (!role) {
        return await interaction.editReply(
          '❌ The **Inner Circle** role does not exist. Run `/setup-roles` first!'
        );
      }

      // Check if user already has the role
      if (member.roles.cache.has(role.id)) {
        return await interaction.editReply(
          `ℹ️ ${targetUser} already has the **Inner Circle** role.`
        );
      }

      // Assign the role
      await member.roles.add(role, 'Granted Inner Circle access by admin');

      // Confirmation embed in the admin's reply
      await interaction.editReply(
        `✅ ${targetUser} has been granted **Inner Circle** access! 🔓`
      );

      // Try to DM the user about their new access
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🔓  Welcome to the Inner Circle!')
          .setDescription(
            `You've been granted access to the **Secret Section** in the NST server.\n\n` +
              `Check out the new channels visible to you — you've earned it! 🎉`
          )
          .setColor(0xe74c3c)
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch {
        // User might have DMs disabled — not critical
        console.warn(`⚠️  Could not DM ${targetUser.tag} about Inner Circle grant.`);
      }
    } catch (err) {
      console.error('❌ grant-inner-circle error:', err);
      await interaction.editReply(
        `❌ Failed to grant Inner Circle:\n\`\`\`${err.message}\`\`\``
      );
    }
  },
};
