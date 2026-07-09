// ===================================================
// index.js — NST Discord Bot Entry Point
// ===================================================
// This file boots the bot, loads all commands and events,
// and connects to Discord.  Run with: npm start
// ===================================================

const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
require('dotenv').config();

// -------------------------------------------------
// 1. Create the Discord client with required intents
// -------------------------------------------------
// • Guilds            — needed to see servers, channels, roles
// • GuildMembers      — needed for welcome system (guildMemberAdd)
// • GuildMessages     — needed to read messages (future use)
// • MessageContent    — needed to read message text  (future use)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember], // ensures partial member data is still usable
});

// -------------------------------------------------
// 2. Load all slash commands from /commands folder
// -------------------------------------------------
// Each command file exports { data, execute }.
// We store them in a Collection keyed by command name.
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Safety check: every command file MUST export data.name and execute
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    console.log(`✅ Loaded command: /${command.data.name}`);
  } else {
    console.warn(`⚠️  Skipped ${file} — missing "data" or "execute" export.`);
  }
}

// -------------------------------------------------
// 3. Load all event handlers from /events folder
// -------------------------------------------------
// Each event file exports { name, once?, execute }.
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`✅ Loaded event: ${event.name}${event.once ? ' (once)' : ''}`);
}

// -------------------------------------------------
// 4. "ready" event — fires once when bot connects
// -------------------------------------------------
client.once('ready', () => {
  console.log('');
  console.log('══════════════════════════════════════════');
  console.log(`🤖 ${client.user.tag} is online!`);
  console.log(`📡 Serving ${client.guilds.cache.size} server(s)`);
  console.log('══════════════════════════════════════════');
  console.log('');
});

// -------------------------------------------------
// 5. Log in to Discord using the token from .env
// -------------------------------------------------
client.login(process.env.DISCORD_TOKEN);