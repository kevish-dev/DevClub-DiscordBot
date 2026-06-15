// ===================================================
// commands/clean-server.js — Nuclear Server Reset
// ===================================================
// Deletes ALL channels and categories in the guild,
// then creates a fresh #welcome and #general-chat.
//
// ⚠️  DESTRUCTIVE — includes a confirmation button
// to prevent accidental wipes. Admin-only.
// ===================================================

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clean-server')
    .setDescription('🧹 Delete ALL channels & categories, then create #welcome and #general-chat')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // ── 1. Confirmation prompt (this is irreversible!) ────
    const confirmButton = new ButtonBuilder()
      .setCustomId('clean_server_confirm')
      .setLabel('Yes, wipe everything')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🗑️');

    const cancelButton = new ButtonBuilder()
      .setCustomId('clean_server_cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const confirmMsg = await interaction.reply({
      content:
        '⚠️ **Are you sure?** This will **permanently delete every channel and category** in this server, ' +
        'then create only `#welcome` and `#general-chat`.\n\n' +
        'This action **cannot be undone**.',
      components: [row],
      ephemeral: true,
    });

    // ── 2. Wait for the button click (30 second timeout) ──
    let confirmation;
    try {
      confirmation = await confirmMsg.awaitMessageComponent({
        componentType: ComponentType.Button,
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000, // 30 seconds to decide
      });
    } catch {
      // Timed out — cancel silently
      return await interaction.editReply({
        content: '⏰ Timed out — server clean cancelled.',
        components: [],
      });
    }

    // ── 3. Handle cancel ──────────────────────────────────
    if (confirmation.customId === 'clean_server_cancel') {
      return await confirmation.update({
        content: '✅ Cancelled — no changes were made.',
        components: [],
      });
    }

    // ── 4. Confirmed — start deleting ─────────────────────
    await confirmation.update({
      content: '🧹 **Cleaning server…** This may take a moment.',
      components: [],
    });

    const guild = interaction.guild;
    let deleted = 0;
    let errors = 0;

    try {
      // Fetch all channels (cache might be stale for large servers)
      const channels = await guild.channels.fetch();

      // Delete all channels — categories, text, voice, forums, etc.
      for (const [, channel] of channels) {
        if (!channel) continue; // null guard for uncached

        try {
          await channel.delete('Server clean by admin');
          deleted++;
          console.log(`🗑️  Deleted: ${channel.name} (${ChannelType[channel.type]})`);
        } catch (err) {
          // Some channels might be undeletable (e.g., community rules channel)
          console.warn(`⚠️  Could not delete ${channel.name}: ${err.message}`);
          errors++;
        }
      }

      // ── 5. Send a summary in the new #general-chat ──────
      await interaction.channel.send(
        `🧹 **Server cleaned by ${interaction.user}**\n` +
          `• Deleted: **${deleted}** channels\n` +
          `• Errors: **${errors}**\n\n` +
          `Run \`/setup-roles\` then \`/setup-server\` to rebuild the full server structure.`
      );
    } catch (err) {
      console.error('❌ clean-server error:', err);

      // Try to send error feedback somewhere the user can see it
      // (original channel was likely deleted, so we try to create one)
      try {
        const errorCh = await guild.channels.create({
          name: 'bot-error',
          type: ChannelType.GuildText,
        });
        await errorCh.send(
          `❌ Server clean encountered an error:\n\`\`\`${err.message}\`\`\``
        );
      } catch {
        // Last resort — just log it
        console.error('❌ Could not create error channel either.');
      }
    }
  },
};
