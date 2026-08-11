import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export const FORUM_CHANNEL_ID =
  process.env.FORUM_CHANNEL_ID || '1525932520607322272';

export const APPEAL_CHANNEL_ID =
  process.env.APPEAL_CHANNEL_ID || '1525174507449614636';

export const ROSTER_URL = process.env.ROSTER_URL || '';

export const SERVER_NAME =
  process.env.SERVER_NAME || 'TNRP | LSPD';

export const ACCENT_RED = 0xed4245;

export const PUNISHMENTS = {
  written_warning: {
    label: 'Written Warning | Sergeant+',
    roleId: process.env.ROLE_WRITTEN_WARNING || '',
  },
  strike_1: {
    label: 'Strike 1 | Lieutenant+',
    roleId: process.env.ROLE_STRIKE_1 || '',
  },
  strike_2: {
    label: 'Strike 2 | Lieutenant+',
    roleId: process.env.ROLE_STRIKE_2 || '',
  },
  strike_3: {
    label: 'Strike 3 | Lieutenant+',
    roleId: process.env.ROLE_STRIKE_3 || '',
  },
  suspension: {
    label: 'Suspension | Internal Affairs',
    roleId: process.env.ROLE_SUSPENSION || '',
  },
  demotion: {
    label: 'Demotion (specify rank below) | Internal Affairs',
    roleId: process.env.ROLE_DEMOTION || '',
  },
  termination: {
    label: 'Termination | Internal Affairs',
    roleId: process.env.ROLE_TERMINATION || '',
  },
  blacklist: {
    label: 'Blacklist | Internal Affairs',
    roleId: process.env.ROLE_BLACKLIST || '',
  },
  alternative: {
    label: 'Alternative (specify below) | Staff Sergeant+',
    roleId: process.env.ROLE_ALTERNATIVE || '',
  },
  admin_leave: {
    label:
      'Administrative Leave / Pending Investigation | Internal Affairs',
    roleId: process.env.ROLE_ADMIN_LEAVE || '',
  },
};

export const DM_BODY =
  'The Los Santos Police Department maintains a firm policy against such behavior, and it is essential to uphold the standards of our organization. We trust that this message clarifies the basis for your punishment and encourages you to reflect on your actions moving forward.\n\nShould you have any questions or concerns, please do not hesitate to reach out to the Internal Affairs team. If you wish to appeal this punishment, click the "Appeal" button at the bottom of this message and open an internal affairs ticket.';

export function generateCaseNumber() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let caseNumber = '';

  for (let index = 0; index < 8; index += 1) {
    caseNumber +=
      characters[Math.floor(Math.random() * characters.length)];
  }

  return caseNumber;
}

export function parseLengthToMs(length) {
  if (!length) return 0;

  const normalized = length.toLowerCase();
  const minutes = normalized.match(
    /(\d+)\s*(minute|min|minutes|m)\b/,
  );
  const hours = normalized.match(/(\d+)\s*(hour|hr|hours|h)\b/);
  const days = normalized.match(/(\d+)\s*(day|days|d)\b/);
  const weeks = normalized.match(/(\d+)\s*(week|weeks|w)\b/);

  if (days) return Number.parseInt(days[1], 10) * 86_400_000;
  if (weeks) return Number.parseInt(weeks[1], 10) * 604_800_000;
  if (hours) return Number.parseInt(hours[1], 10) * 3_600_000;
  if (minutes) return Number.parseInt(minutes[1], 10) * 60_000;

  return 0;
}

export function formatDate(date) {
  return date.toLocaleString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function buildStatusButtons(states) {
  const createButton = (label, code, completed) =>
    new ButtonBuilder()
      .setCustomId(`punishment_status:${code}`)
      .setLabel(completed ? `✅ ${label}` : label)
      .setStyle(
        completed ? ButtonStyle.Success : ButtonStyle.Secondary,
      );

  return new ActionRowBuilder().addComponents(
    createButton('Reviewed by IA/HC', 'r', states.r),
    createButton('Department Hub Processed', 'p', states.p),
    createButton('Roles & Roster Updated', 'u', states.u),
  );
}

export function parseStatesFromMessage(message) {
  const states = {
    r: false,
    p: false,
    u: false,
  };

  for (const row of message.components) {
    for (const button of row.components || []) {
      if (button.style !== ButtonStyle.Success) continue;

      const code = (button.customId || '').split(':').pop();

      if (code in states) {
        states[code] = true;
      }
    }
  }

  return states;
}
