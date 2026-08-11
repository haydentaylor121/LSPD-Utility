import { EmbedBuilder } from 'discord.js';

export const LOA_CHANNEL_ID =
  process.env.LOA_CHANNEL_ID || '1525928234984669405';

export const LOA_PING_ROLE_ID =
  process.env.LOA_PING_ROLE_ID || '1521781111557066752';

export const ACCENT_GREEN = 0x4caf50;
export const ACCENT_RED = 0xed4245;
export const MIN_LOA_DAYS = 7;

export const LOA_QUESTIONS = [
  {
    id: '1',
    field: 'name',
    question: 'What is your name and callsign?',
    label: 'Name and callsign',
    placeholder: 'L-101 H. Evans',
    style: 'Short',
  },
  {
    id: '2',
    field: 'length',
    question: 'How long will you be LOA?',
    label: 'LOA length',
    placeholder: '14 days',
    style: 'Short',
  },
  {
    id: '3',
    field: 'reason',
    question:
      'What is the reason for you requesting LOA?',
    label: 'Reason',
    placeholder: 'Personal things',
    style: 'Paragraph',
  },
  {
    id: '4',
    field: 'understanding',
    question:
      'You understand if you are found to be lying about LOA it will result in disciplinary actions?',
    label: 'Do you understand?',
    placeholder: 'Yes',
    style: 'Short',
  },
];

export function getLoaStore(client) {
  if (!client.loaRequests) client.loaRequests = new Map();
  return client.loaRequests;
}

export function parseLengthToDays(length) {
  if (!length) return 0;
  const normalized = length.toLowerCase();

  const months = normalized.match(
    /(\d+)\s*(month|months)\b/,
  );
  const weeks = normalized.match(
    /(\d+)\s*(week|weeks|w)\b/,
  );
  const days = normalized.match(
    /(\d+)\s*(day|days|d)\b/,
  );

  if (months)
    return Number.parseInt(months[1], 10) * 30;
  if (weeks)
    return Number.parseInt(weeks[1], 10) * 7;
  if (days) return Number.parseInt(days[1], 10);

  const number = normalized.match(/(\d+)/);
  return number
    ? Number.parseInt(number[1], 10)
    : 0;
}

export function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function buildQuestionEmbed(question) {
  return new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('LOA Request')
    .setDescription(
      `**${question.question}**\n\nExample: ${question.placeholder}`,
    );
}

export function buildConfirmationEmbed(data) {
  return new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('LOA Request')
    .setDescription(
      'Do you wish to submit your LOA Request?',
    )
    .addFields(
      {
        name: 'Name & Callsign',
        value: data.name || 'N/A',
        inline: false,
      },
      {
        name: 'Length',
        value: data.length || 'N/A',
        inline: false,
      },
      {
        name: 'Reason',
        value: data.reason || 'N/A',
        inline: false,
      },
      {
        name: 'Acknowledgement',
        value: data.understanding || 'N/A',
        inline: false,
      },
    );
}

export function buildChannelEmbed(requester, data) {
  return new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('LOA Request')
    .addFields(
      {
        name: 'Officer',
        value: `${requester}`,
        inline: false,
      },
      {
        name: 'Length',
        value: data.length || 'N/A',
        inline: false,
      },
      {
        name: 'Reason',
        value: data.reason || 'N/A',
        inline: false,
      },
    )
    .setFooter({
      text: `Requested by ${requester.tag}`,
    })
    .setTimestamp();
}

export function buildApprovalEmbed(length, reason) {
  const days = parseLengthToDays(length);
  const startDate = new Date();
  const endDate = new Date(
    Date.now() + days * 86_400_000,
  );

  return new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('✅ LOA Request Approved')
    .setDescription(
      'Your Leave of Absence request has been **approved**.',
    )
    .addFields(
      {
        name: 'Start Date',
        value: `\`${formatDate(startDate)}\``,
        inline: true,
      },
      {
        name: 'End Date',
        value: `\`${formatDate(endDate)}\``,
        inline: true,
      },
      {
        name: 'Duration',
        value: `\`${days} day(s)\``,
        inline: true,
      },
      {
        name: 'Reason',
        value: reason || 'N/A',
        inline: false,
      },
    )
    .setFooter({
      text: 'Use the buttons below to end your LOA early or request a modification.',
    })
    .setTimestamp();
}

export function buildDenialEmbed(reason) {
  return new EmbedBuilder()
    .setColor(ACCENT_RED)
    .setTitle('❌ LOA Request Denied')
    .setDescription(
      'Your Leave Of Absence has been **Denied**',
    )
    .addFields({
      name: 'Reason',
      value: reason || 'N/A',
      inline: false,
    })
    .setTimestamp();
}
