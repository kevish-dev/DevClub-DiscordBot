// ===================================================
// commands/setup-logs.js — Log Channels Setup
// ===================================================
// Designates channels to receive moderation logs and
// deleted message logs. You can split them or use one.
// Admin only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const { setModLogChannel, setDeletedLogChannel } = require('../utils/mod-store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-logs')
    .setDescription('⚙️ Set the channels for moderation and deleted message logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName('mod_logs')
        .setDescription('Channel for mod actions (kicks, bans, warns, timeouts)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addChannelOption((opt) =>
      opt
        .setName('deleted_msgs')
        .setDescription('Channel to capture deleted messages')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const modChannel = interaction.options.getChannel('mod_logs');
    const deletedChannel = interaction.options.getChannel('deleted_msgs');

    if (!modChannel && !deletedChannel) {
      return await interaction.reply({
        content: '⚠️ You must provide at least one channel to setup logs.',
        ephemeral: true
      });
    }

    try {
      let response = [];
      
      if (modChannel) {
        setModLogChannel(interaction.guild.id, modChannel.id);
        response.push(`✅ **Mod actions** will now be logged to ${modChannel}.`);
        await modChannel.send('🛡️ **Mod Log Initialized**\nModeration actions (warns, kicks, bans) will be logged here.');
      }

      if (deletedChannel) {
        setDeletedLogChannel(interaction.guild.id, deletedChannel.id);
        response.push(`✅ **Deleted messages** will now be captured in ${deletedChannel}.`);
        await deletedChannel.send('🗑️ **Deleted Messages Log Initialized**\nMessages deleted by users will be logged here.');
      }

      await interaction.reply({
        content: response.join('\n'),
        ephemeral: true,
      });

    } catch (err) {
      console.error('❌ setup-logs error:', err);
      await interaction.reply({
        content: `❌ Failed to setup log channels:\n\`\`\`${err.message}\`\`\``,
        ephemeral: true,
      });
    }
  },
};
