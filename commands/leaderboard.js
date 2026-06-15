// ===================================================
// commands/leaderboard.js — DSA Leaderboard Display
// ===================================================
// /leaderboard — Shows the top 10 users by DSA points.
// Available to everyone.
// ===================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTop } = require('../utils/leaderboard');

// Medal emojis for top 3 positions
const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('📊 Display the DSA leaderboard (top 10)'),

  async execute(interaction) {
    try {
      const top = getTop(10);

      if (top.length === 0) {
        return await interaction.reply({
          content: '📊 The leaderboard is empty! No points have been awarded yet.',
          ephemeral: true,
        });
      }

      // Build the leaderboard lines
      const lines = top.map((entry, i) => {
        const medal = MEDALS[i] || `**${i + 1}.**`;
        return `${medal} <@${entry.userId}> — **${entry.points}** pts`;
      });

      const embed = new EmbedBuilder()
        .setTitle('📊  DSA Leaderboard — Top 10')
        .setDescription(lines.join('\n'))
        .setColor(0xf1c40f) // gold
        .setTimestamp()
        .setFooter({ text: 'NST Bot • Leaderboard updates in real-time' });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('❌ leaderboard error:', err);
      await interaction.reply({
        content: `❌ Failed to load leaderboard:\n\`\`\`${err.message}\`\`\``,
        ephemeral: true,
      });
    }
  },
};
