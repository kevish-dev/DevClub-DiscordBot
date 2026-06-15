# NST Discord Bot — Setup Guide

> A step-by-step guide to get the bot running on your own machine.

---

## 1. Prerequisites

- **Node.js** v18+ (LTS) — [download](https://nodejs.org/)
- A **Discord account** with a test server where you have Administrator permissions
- **Developer Mode** enabled in Discord (Settings → Advanced → Developer Mode)

---

## 2. Create a Discord Application & Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** → name it **NST Bot** → Create
3. Go to the **Bot** tab on the left sidebar
4. Click **"Reset Token"** → copy the token (you'll need this for `.env`)
5. Under **Privileged Gateway Intents**, enable:
   - ✅ **Server Members Intent** (needed for welcome system)
   - ✅ **Message Content Intent** (needed for future features)
6. Go to the **OAuth2** tab:
   - Under **Scopes**, check: `bot`, `applications.commands`
   - Under **Bot Permissions**, check: `Administrator` (or manually select: Manage Roles, Manage Channels, Send Messages, Embed Links, Read Message History, Use External Emojis, Add Reactions, View Channels, Attach Files)
   - Copy the generated **invite URL** and open it in your browser to invite the bot to your server

---

## 3. Configure Environment

Copy the `.env` file and fill in your values:

```bash
DISCORD_TOKEN=your-bot-token-from-step-2
CLIENT_ID=your-application-id  # found on the "General Information" tab
GUILD_ID=your-server-id        # right-click server name → Copy Server ID
```

---

## 4. Install Dependencies

```bash
cd DevClub-DiscordBot
npm install
```

---

## 5. Deploy Slash Commands

This registers your commands with Discord so they appear in the `/` menu:

```bash
npm run deploy
```

You should see: `✅ Successfully deployed X command(s).`

> **Note:** Run this again any time you add or modify a command file.

---

## 6. Start the Bot

```bash
npm start
```

You should see:
```
✅ Loaded command: /setup-server
✅ Loaded command: /setup-roles
...
🤖 NST Bot#1234 is online!
```

---

## 7. First-Time Server Setup (in Discord)

Run these commands **in order** in any text channel on your server:

| Step | Command | What it does |
|------|---------|-------------|
| 1 | `/setup-roles` | Creates all roles (batch, hostel, interest, prestige, special) |
| 2 | `/setup-server` | Creates all categories & channels with permission overwrites |
| 3 | `/setup-roles-menu` | Posts role-picker dropdowns (run this **in the #roles channel**) |

> **Important:** Run `/setup-roles` BEFORE `/setup-server`, because the server config references roles by name for permission overwrites.

All three commands are **idempotent** — safe to run multiple times.

---

## 8. Bot Role Position

After inviting the bot, go to **Server Settings → Roles** and drag the bot's role **above** all the roles it needs to manage (Academic, Hostel, Interest, etc.). If the bot's role is below a role, it cannot assign/remove that role.

---

## 9. External Bot Setup

These bots complement the NST bot but are NOT rebuilt — just invite them:

### Ticket Tool (Support Tickets)
- Invite: https://tickettool.xyz/
- Use for: Student support requests, admin tickets
- Setup: Create a ticket panel in a `#support` channel

### Sesh (Event Scheduling)
- Invite: https://sesh.fyi/
- Use for: RSVPs, event polls, calendar integration
- Setup: Use `/create` in the `#event-announcements` channel

### Disboard (Server Bumping)
- Invite: https://disboard.org/
- Use for: Server discovery and growth
- Setup: Members use `/bump` every 2 hours in `#bot-commands`

---

## 10. Troubleshooting

| Problem | Solution |
|---------|----------|
| Commands don't show up | Run `npm run deploy` and restart bot |
| "Missing Permissions" | Move bot role higher in Server Settings → Roles |
| Role not found during server setup | Run `/setup-roles` before `/setup-server` |
| Welcome messages not sent | Enable "Server Members Intent" in Developer Portal |
| "Unknown interaction" | Bot took >3 seconds — check internet speed / API latency |
| Bot crashes on start | Check `.env` values — make sure token is correct |

---

## Project Structure

```
DevClub-DiscordBot/
├── index.js              # Entry point — loads commands & events
├── deploy-commands.js    # Push slash commands to Discord API
├── .env                  # Secrets (never commit!)
├── .gitignore
├── package.json
├── SETUP.md              # ← You are here
├── config/
│   ├── server-config.json  # Full server structure definition
│   └── roles-config.json   # All roles, groups, and colors
├── commands/
│   ├── setup-server.js     # /setup-server — scaffold channels
│   ├── setup-roles.js      # /setup-roles — create roles
│   ├── setup-roles-menu.js # /setup-roles-menu — post role pickers
│   ├── post-achievement.js # /post-achievement — share wins
│   ├── award-points.js     # /award-points — admin point award
│   ├── leaderboard.js      # /leaderboard — top 10 display
│   └── grant-inner-circle.js # /grant-inner-circle — secret access
├── events/
│   ├── interactionCreate.js # Routes commands + select menus
│   └── guildMemberAdd.js    # Welcome system
├── utils/
│   └── leaderboard.js       # JSON read/write helpers
└── data/
    └── leaderboard.json     # Runtime points data (gitignored)
```
