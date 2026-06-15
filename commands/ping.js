// ===================================================
// commands/ping.js — Bot Latency Checker
// ===================================================
// A simple utility command to check the bot's current
// latency and API response time.
// ===================================================

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('🏓 Check the bot\'s latency and API response time'),

  async execute(interaction) {
    // Note the time before we send the reply
    const sent = await interaction.deferReply({ fetchReply: true });
    
    // Calculate round-trip latency
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    
    // WebSocket heartbeat ping
    const apiPing = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `\`${latency}ms\``, inline: true },
        { name: 'API Latency', value: `\`${apiPing}ms\``, inline: true }
      )
      .setColor(latency < 200 ? 0x2ecc71 : 0xe67e22) // Green if fast, orange if a bit slow
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
