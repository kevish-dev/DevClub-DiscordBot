// ===================================================
// commands/award-points.js — Admin DSA Point Award
// ===================================================
// /award-points @user <points> <reason>
// Adds points to a user's leaderboard total. Admin-only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { addPoints } = require('../utils/leaderboard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('award-points')
    .setDescription('⭐ Award DSA leaderboard points to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt
        .setName('user')
        .setDescription('The user to award points to')
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('points')
        .setDescription('Number of points (use negative to deduct)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('reason')
        .setDescription('Why are you awarding these points?')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const points = interaction.options.getInteger('points');
      const reason = interaction.options.getString('reason');

      // Award the points and get the new total
      const newTotal = addPoints(
        targetUser.id,
        targetUser.displayName,
        points,
        reason
      );

      // Build a confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('⭐  Points Awarded')
        .setColor(points >= 0 ? 0x2ecc71 : 0xe74c3c) // green for +, red for −
        .addFields(
          { name: 'User',      value: `${targetUser}`, inline: true },
          { name: 'Points',    value: `**${points >= 0 ? '+' : ''}${points}**`, inline: true },
          { name: 'New Total', value: `**${newTotal}**`, inline: true },
          { name: 'Reason',    value: reason },
        )
        .setFooter({ text: `Awarded by ${interaction.user.displayName}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('❌ award-points error:', err);
      await interaction.reply({
        content: `❌ Failed to award points:\n\`\`\`${err.message}\`\`\``,
        ephemeral: true,
      });
    }
  },
};
