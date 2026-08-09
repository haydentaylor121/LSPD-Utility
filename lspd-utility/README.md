# LSPD Utility Bot

A Discord bot that manages LSPD ride-along & training requests with a dropdown
panel, request embeds with an Accept button, DM confirmations, and an automatic
2-hour expiry.

## Features

- `/setup-panel` slash command (admin only) posts the request panel + dropdown.
- Dropdown options: Basic Ride Along, Use of Force Retraining, Basic Training,
  Sergeant Ride Along, Command Ride Along.
- Selecting an option posts a request embed in the configured channel and pings
  the configured role, with a 👍 Accept button.
- Requester gets a DM confirmation on submit, on accept, and on auto-expiry.
- Requests automatically expire after 2 hours.

## Setup

1. Create an application at <https://discord.com/developers/applications>,
   add a Bot, and copy the **Token** and **Application (Client) ID**.
2. Enable the **Server Members Intent** on the Bot page (needed for role checks).
3. Invite the bot with the `applications.commands` and `bot` scopes plus the
   `Send Messages`, `Embed Links`, and `Read Message History` permissions.
4. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `CLIENT_ID`.
   Optionally set `GUILD_ID` for instant slash-command registration.
5. Open `index.js` and replace the placeholder role IDs in `ROLE_REQUIREMENTS`
   (`SERGEANT_ROLE_ID_HERE`, `COMMAND_ROLE_ID_HERE`) with the real role IDs that
   should be allowed to request Sergeant / Command ride-alongs. Leave them as
   arrays of role ID strings.

## Run locally

```bash
npm install
npm start
```

Then run `/setup-panel` in the channel where you want the panel.

## Deploy on Railway

1. Push this folder to your GitHub repo
   (<https://github.com/haydentaylor121/LSPD-Utility>).
2. In Railway, **New Project → Deploy from GitHub repo**, select the repo.
3. Set the Root Directory to the `bot/` folder (if the repo has other content).
4. Add the variables `DISCORD_TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`
   in Railway's Variables tab.
5. Railway auto-detects Node and runs `npm start`.

## Notes

- Active request timers are kept in memory. If the bot restarts, in-flight
  pending requests won't auto-expire (they'll stay visible until accepted or
  cleared manually). For persistent timers you'd need a database — not included
  to keep this script simple.
- Discord's select menu options are static per panel, so role filtering happens
  at selection time: ineligible users get an ephemeral "not eligible" reply.
