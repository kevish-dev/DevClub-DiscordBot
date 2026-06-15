// ===================================================
// commands/post-achievement.js — Achievement Poster
// ===================================================
// Lets any member post a formatted achievement embed
// to #wins-and-achievements.
// ===================================================

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

// Category → emoji mapping for visual flair
const CATEGORY_EMOJI = {
  internship:   '💼',
  hackathon:    '🏆',
  'open-source': '🌐',
  startup:      '🚀',
  research:     '📚',
};

// Category → embed color
const CATEGORY_COLOR = {
  internship:   0x3498db,
  hackathon:    0xf1c40f,
  'open-source': 0x2ecc71,
  startup:      0xe74c3c,
  research:     0x9b59b6,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-achievement')
    .setDescription('🏅 Share an achievement with the server!')
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Category of achievement')
        .setRequired(true)
        .addChoices(
          { name: '💼 Internship',    value: 'internship' },
          { name: '🏆 Hackathon',     value: 'hackathon' },
          { name: '🌐 Open Source',   value: 'open-source' },
          { name: '🚀 Startup',       value: 'startup' },
          { name: '📚 Research',      value: 'research' },
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('description')
        .setDescription('Tell us about your achievement!')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('proof')
        .setDescription('Link to proof (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const type = interaction.options.getString('type');
      const description = interaction.options.getString('description');
      const proof = interaction.options.getString('proof');

      const emoji = CATEGORY_EMOJI[type] || '🏅';
      const color = CATEGORY_COLOR[type] || 0x5865f2;
      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

      // Find #wins-and-achievements channel
      const channel = interaction.guild.channels.cache.find(
        (ch) => ch.name === 'wins-and-achievements'
      );

      if (!channel) {
        return await interaction.editReply(
          '❌ Could not find `#wins-and-achievements` channel. Run `/setup-server` first!'
        );
      }

      // Build the achievement embed
      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.displayName,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle(`${emoji}  New Achievement — ${typeLabel}`)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `Category: ${typeLabel}` });

      if (proof) {
        embed.addFields({ name: '🔗 Proof / Link', value: proof });
      }

      await channel.send({ embeds: [embed] });

      await interaction.editReply(
        `✅ Your achievement has been posted in ${channel}! Congratulations! 🎉`
      );
    } catch (err) {
      console.error('❌ post-achievement error:', err);
      await interaction.editReply(
        `❌ Failed to post achievement:\n\`\`\`${err.message}\`\`\``
      );
    }
  },
};
