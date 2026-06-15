// ===================================================
// deploy-commands.js — Register slash commands with Discord
// ===================================================
// Run this ONCE (or whenever you add/change a command):
//   npm run deploy
//
// This pushes your command definitions to Discord's API
// so they appear in the slash-command picker.
// We deploy to a single guild (instant) rather than globally (up to 1 hr cache).
// ===================================================

const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];

// Read every file in /commands and grab its .data (SlashCommandBuilder) as JSON
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.warn(`⚠️  Skipped ${file} — no "data" export.`);
  }
}

// Instantiate the REST client with your bot token
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Deploy!
(async () => {
  try {
    console.log(`🔄 Deploying ${commands.length} command(s) to guild ${process.env.GUILD_ID}…`);

    // PUT replaces ALL guild commands at once (idempotent)
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`✅ Successfully deployed ${data.length} command(s).`);
  } catch (error) {
    console.error('❌ Failed to deploy commands:', error);
  }
})();
