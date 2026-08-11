import { EmbedBuilder } from 'discord.js';

export const OIS_CHANNEL_ID =
  process.env.OIS_CHANNEL_ID || '1525933783491285203';

export const OIS_PING_ROLE_ID =
  process.env.OIS_PING_ROLE_ID || '1521781111557066752';

export const OIS_IMAGE_URL =
  process.env.OIS_IMAGE_URL || '';

export const ACCENT_BLUE = 0x2e51a2;
export const ACCENT_GREEN = 0x3ba55d;
export const ACCENT_RED = 0xed4245;

export const OIS_QUESTIONS = [
  {
    field: 'callsign',
    question: 'Your Callsign | Rank | Name:',
    example: 'L-### | SGT | John Doe',
  },
  {
    field: 'datetime',
    question:
      'Date and Time of Occurrence:',
    example: 'MM/DD/YYYY HH:MM (TZ)',
  },
  {
    field: 'supervisor',
    question:
      'What supervisor(s) assisted on your Use of Force 10-71 request?:',
    example: 'L-### | John Doe',
  },
  {
    field: 'shots',
    question:
      'Approximately how many rounds did you discharge, where were you aiming and what steps did you take after shots fired?',
    example:
      '10 rounds, aiming at the suspect\'s chest, and immediately reporting to my supervisor.',
  },
  {
    field: 'bodycam',
    question:
      'Bodycam and / or Dashcam Footage Link | NEEDS TO BE YOUR OWN FOOTAGE Per LSPD SOP.',
    example: 'https://medal.tv/',
  },
  {
    field: 'understanding',
    question:
      'I Understand and Affirm that all the information contained within this report to be fulfilled with full honesty and the utmost amount of detail / evidence. Understand and Affirm that failure to abide by SOP guidelines will result in termination, etc.',
    example: 'Yes',
  },
];

export function buildQuestionEmbed(index) {
  const question = OIS_QUESTIONS[index];
  const questionNum = index + 1;
  const total = OIS_QUESTIONS.length;

  return new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle(`OIS Report - Question ${questionNum}/${total}`)
    .setDescription(
      [
        `**${question.question}**`,
        '',
        '**Example**',
        `\`${question.example}\``,
        '',
        'Reply with your answer, or type `cancel` to stop.',
      ].join('\n'),
    );
}

export function buildStaffEmbed(officer, data) {
  return new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle('OIS Report')
    .addFields(
      {
        name: "Officer's Callsign, rank and name",
        value: `${data.callsign} (${officer})`,
        inline: false,
      },
      {
        name: 'The date and time of the occurrence',
        value: data.datetime || 'N/A',
        inline: false,
      },
      {
        name: 'The supervisor on scene who assisted',
        value: data.supervisor || 'N/A',
        inline: false,
      },
      {
        name: 'Shots fired, aiming, steps after',
        value: data.shots || 'N/A',
        inline: false,
      },
      {
        name: 'Bodycam',
        value: data.bodycam || 'N/A',
        inline: false,
      },
      {
        name: 'Do they understand that failure to abide by SOP guidelines can result in discipline?',
        value: data.understanding || 'N/A',
        inline: false,
      },
    )
    .setFooter({ text: `Submitted by ${officer.tag}` })
    .setTimestamp();
}

export function buildAcceptedEmbed(grade, reviewedBy, additionalInfo) {
  const date = new Date();
  const formatted = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('OIS Report Accepted')
    .setDescription('Your OIS report has been approved.')
    .addFields(
      {
        name: 'Grade',
        value: `${grade}/5`,
        inline: true,
      },
      {
        name: 'Reviewed By',
        value: reviewedBy,
        inline: true,
      },
      ...(additionalInfo
        ? [{ name: 'Additional Info', value: additionalInfo, inline: false }]
        : []),
    )
    .setFooter({ text: formatted });
}

export function buildDeniedEmbed(grade, reviewedBy, additionalInfo) {
  const date = new Date();
  const formatted = date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return new EmbedBuilder()
    .setColor(ACCENT_RED)
    .setTitle('OIS Report Denied')
    .setDescription('Your OIS report has been denied.')
    .addFields(
      {
        name: 'Grade',
        value: `${grade}/5`,
        inline: true,
      },
      {
        name: 'Reviewed By',
        value: reviewedBy,
        inline: true,
      },
      ...(additionalInfo
        ? [{ name: 'Additional Info', value: additionalInfo, inline: false }]
        : []),
    )
    .setFooter({ text: formatted });
}

export function askQuestion(user, index) {
  return new Promise((resolve) => {
    if (index >= OIS_QUESTIONS.length) {
      resolve({ status: 'complete' });
      return;
    }

    const embed = buildQuestionEmbed(index);
    const questionNum = index + 1;
    const total = OIS_QUESTIONS.length;

    user
      .send({ embeds: [embed] })
      .then((sentMessage) => {
        const filter = (m) => m.author.id === user.id;
        const collector = sentMessage.channel.createMessageCollector({
          filter,
          max: 1,
          time: 600_000,
        });

        collector.on('collect', (message) => {
          const answer = message.content.trim();

          if (answer.toLowerCase() === 'cancel') {
            resolve({ status: 'cancelled' });
            return;
          }

          resolve({ status: 'answered', answer, field: OIS_QUESTIONS[index].field, nextIndex: index + 1 });
        });

        collector.on('end', (collected) => {
          if (collected.size === 0) {
            resolve({ status: 'timeout' });
          }
        });
      })
      .catch(() => {
        resolve({ status: 'dm_failed' });
      });
  });
}
