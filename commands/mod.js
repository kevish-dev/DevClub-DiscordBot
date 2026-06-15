// ===================================================
// commands/mod.js — Unified Moderation Command
// ===================================================
// Combines all moderation actions into subcommands:
// /mod ban, /mod kick, /mod timeout, /mod purge, 
// /mod warn, /mod history, /mod lock, /mod unlock
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');
const { getModLogChannel, addWarning, getWarnings } = require('../utils/mod-store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('🛡️ Server moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    
    // --- PURGE ---
    .addSubcommand(sub =>
      sub.setName('purge')
        .setDescription('🧹 Bulk delete messages in this channel')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to delete (1-100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Only delete messages from this user')
            .setRequired(false)
        )
    )

    // --- TIMEOUT ---
    .addSubcommand(sub =>
      sub.setName('timeout')
        .setDescription('⏱️ Temporarily mute a user in the server')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The user to time out').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('duration')
            .setDescription('Timeout duration')
            .setRequired(true)
            .addChoices(
              { name: '60 Seconds', value: 60 * 1000 },
              { name: '5 Minutes',  value: 5 * 60 * 1000 },
              { name: '10 Minutes', value: 10 * 60 * 1000 },
              { name: '1 Hour',     value: 60 * 60 * 1000 },
              { name: '1 Day',      value: 24 * 60 * 60 * 1000 },
              { name: '1 Week',     value: 7 * 24 * 60 * 60 * 1000 },
              { name: 'Remove Timeout', value: 0 }
            )
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the timeout').setRequired(false)
        )
    )

    // --- KICK ---
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('👢 Kick a member from the server')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The member to kick').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the kick').setRequired(false)
        )
    )

    // --- BAN ---
    .addSubcommand(sub =>
      sub.setName('ban')
        .setDescription('🔨 Ban a member from the server')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The member to ban').setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('delete_messages')
            .setDescription('Delete their recent messages?')
            .setRequired(true)
            .addChoices(
              { name: 'Don\'t delete any', value: 0 },
              { name: 'Previous 1 Hour',   value: 60 * 60 },
              { name: 'Previous 24 Hours', value: 24 * 60 * 60 },
              { name: 'Previous 7 Days',   value: 7 * 24 * 60 * 60 }
            )
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the ban').setRequired(false)
        )
    )

    // --- WARN ---
    .addSubcommand(sub =>
      sub.setName('warn')
        .setDescription('⚠️ Issue a formal warning to a member')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The member to warn').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for the warning').setRequired(true)
        )
    )

    // --- HISTORY ---
    .addSubcommand(sub =>
      sub.setName('history')
        .setDescription('📋 Check the warning history of a member')
        .addUserOption(opt =>
          opt.setName('user').setDescription('The member to check').setRequired(true)
        )
    )

    // --- LOCK ---
    .addSubcommand(sub =>
      sub.setName('lock')
        .setDescription('🔒 Lock this channel (prevents regular members from talking)')
        .addStringOption(opt =>
          opt.setName('reason').setDescription('Reason for locking').setRequired(false)
        )
    )

    // --- UNLOCK ---
    .addSubcommand(sub =>
      sub.setName('unlock')
        .setDescription('🔓 Unlock this channel (allows regular members to talk again)')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Route to the appropriate handler
    switch (subcommand) {
      case 'purge':   return handlePurge(interaction);
      case 'timeout': return handleTimeout(interaction);
      case 'kick':    return handleKick(interaction);
      case 'ban':     return handleBan(interaction);
      case 'warn':    return handleWarn(interaction);
      case 'history': return handleHistory(interaction);
      case 'lock':    return handleLock(interaction);
      case 'unlock':  return handleUnlock(interaction);
      default:
        return interaction.reply({ content: 'Unknown subcommand', ephemeral: true });
    }
  },
};

// =====================================================
// Subcommand Handlers
// =====================================================

async function handlePurge(interaction) {
  // Check specific permission
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({ content: '❌ You need Manage Messages permission to purge.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const amount = interaction.options.getInteger('amount');
  const targetUser = interaction.options.getUser('user');

  try {
    let messages = await interaction.channel.messages.fetch({ limit: amount });
    if (targetUser) {
      messages = messages.filter(msg => msg.author.id === targetUser.id);
    }
    if (messages.size === 0) {
      return await interaction.editReply('⚠️ No messages matched the criteria to delete.');
    }

    const deletedMessages = await interaction.channel.bulkDelete(messages, true);

    const embed = new EmbedBuilder()
      .setTitle('🧹 Messages Purged')
      .setDescription(`Successfully deleted **${deletedMessages.size}** message(s).`)
      .setColor(0x3498db)
      .setTimestamp();
    if (targetUser) embed.addFields({ name: 'Filtered to User', value: `${targetUser}` });

    await interaction.editReply({ embeds: [embed] });

    // Mod Log
    const logChannelId = getModLogChannel(interaction.guild.id);
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🧹 Messages Purged')
          .addFields(
            { name: 'Channel', value: `${interaction.channel}`, inline: true },
            { name: 'Moderator', value: `${interaction.user}`, inline: true },
            { name: 'Messages Deleted', value: `${deletedMessages.size}`, inline: true }
          )
          .setColor(0x3498db)
          .setTimestamp();
        if (targetUser) logEmbed.addFields({ name: 'Filtered to User', value: `${targetUser}` });
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to purge messages:\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleTimeout(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const targetUser = interaction.options.getUser('user');
  const durationMs = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    if (!member.manageable) {
      return await interaction.editReply(`❌ I cannot time out ${targetUser}.`);
    }

    if (durationMs === 0) {
      await member.timeout(null, reason);
      await interaction.editReply(`✅ Removed timeout from ${targetUser}.`);
    } else {
      await member.timeout(durationMs, `By ${interaction.user.tag}: ${reason}`);
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('⏱️ You have been timed out')
          .setDescription(`You were timed out in **${interaction.guild.name}**.`)
          .addFields({ name: 'Reason', value: reason }, { name: 'Duration', value: `${durationMs / 60000} minute(s)` })
          .setColor(0xe67e22)
          .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
      } catch {}

      await interaction.editReply(`✅ Successfully timed out ${targetUser} for ${durationMs / 60000} minute(s).`);

      const logChannelId = getModLogChannel(interaction.guild.id);
      if (logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('⏱️ Member Timed Out')
            .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
            .addFields(
              { name: 'User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
              { name: 'Moderator', value: `${interaction.user}`, inline: true },
              { name: 'Duration', value: `${durationMs / 60000} minute(s)`, inline: true },
              { name: 'Reason', value: reason }
            )
            .setColor(0xe67e22)
            .setTimestamp();
          await logChannel.send({ embeds: [logEmbed] });
        }
      }
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to apply timeout:\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleKick(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    return interaction.reply({ content: '❌ You need Kick Members permission.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  try {
    const member = await interaction.guild.members.fetch(targetUser.id);
    if (!member.manageable) {
      return await interaction.editReply(`❌ I cannot kick ${targetUser}.`);
    }

    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('👢 You were kicked')
        .setDescription(`You have been kicked from **${interaction.guild.name}**.`)
        .addFields({ name: 'Reason', value: reason })
        .setColor(0xe74c3c)
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch {}

    await member.kick(`By ${interaction.user.tag}: ${reason}`);
    await interaction.editReply(`✅ Successfully kicked ${targetUser.tag}.\n**Reason:** ${reason}`);

    const logChannelId = getModLogChannel(interaction.guild.id);
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('👢 Member Kicked')
          .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
          .addFields(
            { name: 'User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
            { name: 'Moderator', value: `${interaction.user}`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(0xe74c3c)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to kick member:\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleBan(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
    return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const targetUser = interaction.options.getUser('user');
  const deleteMessageSeconds = interaction.options.getInteger('delete_messages');
  const reason = interaction.options.getString('reason') || 'No reason provided';

  try {
    let member;
    try { member = await interaction.guild.members.fetch(targetUser.id); } catch {}
    if (member && !member.manageable) {
      return await interaction.editReply(`❌ I cannot ban ${targetUser}.`);
    }

    if (member) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('🔨 You were permanently banned')
          .setDescription(`You have been banned from **${interaction.guild.name}**.`)
          .addFields({ name: 'Reason', value: reason })
          .setColor(0x992d22)
          .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
      } catch {}
    }

    await interaction.guild.members.ban(targetUser.id, {
      deleteMessageSeconds,
      reason: `By ${interaction.user.tag}: ${reason}`,
    });

    await interaction.editReply(`✅ Successfully banned ${targetUser.tag}.\n**Reason:** ${reason}`);

    const logChannelId = getModLogChannel(interaction.guild.id);
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('🔨 Member Banned')
          .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
          .addFields(
            { name: 'User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
            { name: 'Moderator', value: `${interaction.user}`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(0x992d22)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to ban member:\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleWarn(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');

  try {
    const totalWarnings = addWarning(targetUser.id, interaction.user.id, reason);
    let dmStatus = 'DM sent to user.';
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('⚠️ You received a warning')
        .setDescription(`You have been warned in **${interaction.guild.name}**.`)
        .addFields({ name: 'Reason', value: reason }, { name: 'Total Warnings', value: `${totalWarnings}` })
        .setColor(0xf1c40f)
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch {
      dmStatus = '*Could not DM user (DMs disabled).*';
    }

    const logChannelId = getModLogChannel(interaction.guild.id);
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('⚠️ Member Warned')
          .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL() })
          .addFields(
            { name: 'User', value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
            { name: 'Moderator', value: `${interaction.user}`, inline: true },
            { name: 'Total Warnings', value: `${totalWarnings}`, inline: true },
            { name: 'Reason', value: reason }
          )
          .setColor(0xf1c40f)
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }

    await interaction.editReply(`✅ Successfully warned ${targetUser}. (${totalWarnings} total warnings)\n${dmStatus}`);
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to warn member:\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleHistory(interaction) {
  const targetUser = interaction.options.getUser('user');
  try {
    const warnings = getWarnings(targetUser.id);
    if (warnings.length === 0) {
      return await interaction.reply({ content: `✅ ${targetUser} has a clean record! (0 warnings)`, ephemeral: true });
    }

    const recentWarnings = warnings.slice(-20);
    const embed = new EmbedBuilder()
      .setTitle(`📋 Moderation History for ${targetUser.tag}`)
      .setDescription(`${targetUser} has **${warnings.length}** total warning(s). Showing the most recent:`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor(0xe67e22);

    recentWarnings.forEach((warn, index) => {
      const date = new Date(warn.timestamp);
      const discordTimestamp = `<t:${Math.floor(date.getTime() / 1000)}:R>`;
      embed.addFields({
        name: `Warning #${warnings.length - recentWarnings.length + index + 1}`,
        value: `**Reason:** ${warn.reason}\n**Moderator:** <@${warn.moderatorId}>\n**Date:** ${discordTimestamp}`
      });
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: `❌ Failed to fetch history:\n\`\`\`${err.message}\`\`\``, ephemeral: true });
  }
}

async function handleLock(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: '❌ You need Manage Channels permission.', ephemeral: true });
  }
  await interaction.deferReply();
  const reason = interaction.options.getString('reason') || 'No reason provided';
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      AddReactions: false,
    }, { reason: `Channel locked by ${interaction.user.tag}: ${reason}` });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Channel Locked')
      .setDescription('This channel has been temporarily locked by moderators. You cannot send messages here right now.')
      .addFields({ name: 'Reason', value: reason })
      .setColor(0xe74c3c)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to lock the channel.\n\`\`\`${err.message}\`\`\``);
  }
}

async function handleUnlock(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: '❌ You need Manage Channels permission.', ephemeral: true });
  }
  await interaction.deferReply();
  try {
    await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
      SendMessages: null,
      SendMessagesInThreads: null,
      CreatePublicThreads: null,
      CreatePrivateThreads: null,
      AddReactions: null,
    }, { reason: `Channel unlocked by ${interaction.user.tag}` });

    const embed = new EmbedBuilder()
      .setTitle('🔓 Channel Unlocked')
      .setDescription('This channel has been unlocked. You can send messages again.')
      .setColor(0x2ecc71)
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    await interaction.editReply(`❌ Failed to unlock the channel.\n\`\`\`${err.message}\`\`\``);
  }
}
