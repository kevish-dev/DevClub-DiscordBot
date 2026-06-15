// ===================================================
// events/messageDelete.js — Deleted Message Logger
// ===================================================
// Fires whenever a message is deleted. Checks if a 
// mod-log channel is configured and posts the deleted 
// message contents there.
// ===================================================

const { Events, EmbedBuilder } = require('discord.js');
const { getDeletedLogChannel } = require('../utils/mod-store');

module.exports = {
  name: Events.MessageDelete,

  async execute(message) {
    // Ignore partial messages (messages deleted that were sent before bot started)
    // Ignore bot messages (we don't need to log when the bot deletes its own stuff)
    // Ignore direct messages (DMs)
    if (message.partial || message.author?.bot || !message.guild) return;

    try {
      const logChannelId = getDeletedLogChannel(message.guild.id);
      if (!logChannelId) return; // No log channel configured

      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (!logChannel) return;

      // Build the deleted message embed
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Message Deleted')
        .setAuthor({ 
          name: message.author.tag, 
          iconURL: message.author.displayAvatarURL() 
        })
        .setDescription(
          `**Message by ${message.author} deleted in ${message.channel}**\n\n` +
          (message.content ? message.content : '*[No text content — maybe an image or embed]*')
        )
        .setColor(0xe74c3c) // red
        .setTimestamp()
        .setFooter({ text: `User ID: ${message.author.id} | Message ID: ${message.id}` });

      // Check for attachments (images, etc)
      if (message.attachments.size > 0) {
        const attachmentUrls = message.attachments.map(a => a.proxyURL).join('\n');
        embed.addFields({ name: 'Attachments (Links may expire)', value: attachmentUrls });
      }

      await logChannel.send({ embeds: [embed] });
    } catch (err) {
      console.error('❌ messageDelete error:', err);
    }
  },
};
