// ===================================================
// events/guildMemberAdd.js — Welcome System
// ===================================================
// Fires when a new member joins the server.
// • Posts a welcome embed in #welcome
// • Adds a "Get Started →" button linking to #start-here
// • Auto-assigns the "New Member" role (if it exists)
// ===================================================

const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  name: Events.GuildMemberAdd, // 'guildMemberAdd'

  async execute(member) {
    const guild = member.guild;

    // ── 1. Find the #welcome channel ──────────────────
    const welcomeChannel = guild.channels.cache.find(
      (ch) => ch.name === 'welcome'
    );

    if (!welcomeChannel) {
      console.warn('⚠️  #welcome channel not found — skipping welcome message.');
      return;
    }

    // ── 2. Find #start-here for the button link ──────
    const startHere = guild.channels.cache.find(
      (ch) => ch.name === 'start-here'
    );

    // ── 3. Build the welcome embed ───────────────────
    const embed = new EmbedBuilder()
      .setTitle('👋  Welcome to Dev Club Server!')
      .setDescription(
        `Hey ${member}, welcome to the community! 🎉\n\n` +
          `We're now **${guild.memberCount}** members strong.\n\n` +
          `Head over to the **#start-here** channel to get set up, ` +
          `pick your roles, and start connecting with your batch!`
      )
      .setThumbnail(member.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(0x5865f2) // Discord blurple
      .setTimestamp()
      .setFooter({
        text: guild.name,
        iconURL: guild.iconURL({ dynamic: true }),
      });

    // ── 4. Build the "Get Started" button ────────────
    const components = [];
    if (startHere) {
      const button = new ButtonBuilder()
        .setLabel('Get Started →')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${startHere.id}`)
        .setEmoji('🚀');

      components.push(new ActionRowBuilder().addComponents(button));
    }

    // ── 5. Send the welcome message ──────────────────
    try {
      await welcomeChannel.send({
        content: `${member}`, // ping the new member
        embeds: [embed],
        components,
      });
    } catch (err) {
      console.error('❌ Failed to send welcome message:', err);
    }

    // ── 6. Auto-assign "New Member" role ─────────────
    try {
      const newMemberRole = guild.roles.cache.find(
        (r) => r.name === 'New Member'
      );

      if (newMemberRole) {
        await member.roles.add(newMemberRole, 'Auto-assigned on join');
        console.log(`🏷️  Assigned "New Member" to ${member.user.tag}`);
      }
    } catch (err) {
      console.error('❌ Failed to assign New Member role:', err);
    }
  },
};
