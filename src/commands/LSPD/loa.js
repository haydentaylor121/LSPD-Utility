import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

import { ACCENT_GREEN } from '../../services/loaService.js';

const data = new SlashCommandBuilder()
  .setName('loa')
  .setDescription('Post the LOA information panel')
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages,
  );

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('📋 LOA (Leave of Absence)')
    .setDescription(
      [
        "Clicking the **LOA** button will allow you to submit a Leave of Absence request if you're going to be unavailable for a period of time.",
        '',
        'Please provide the required information, including the **reason for your LOA** and **how long you expect to be away**. Your request will then be reviewed by the appropriate staff member. **Minimum time to go LOA is 7 days.**',
        '',
        '**⚠️ Please only submit an LOA if you genuinely need time away.**',
      ].join('\n'),
    );

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('loa_start')
      .setLabel('LOA')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
  await interaction.channel.send({
    embeds: [embed],
    components: [button],
  });
}

export default { data, category: 'LSPD', execute };
4. src/interactions/buttons/loa/loaButtons.js
Create this file:

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import {
  ACCENT_GREEN,
  buildApprovalEmbed,
  buildChannelEmbed,
  buildConfirmationEmbed,
  buildQuestionEmbed,
  getLoaStore,
  LOA_CHANNEL_ID,
  LOA_PING_ROLE_ID,
  LOA_QUESTIONS,
  MIN_LOA_DAYS,
  parseLengthToDays,
} from '../../../services/loaService.js';

function buildAnswerButton(questionId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`loa_answer:${questionId}`)
      .setLabel('Answer')
      .setStyle(ButtonStyle.Primary),
  );
}

function disableRow(message) {
  const row = message?.components?.[0];
  if (!row) return null;

  return new ActionRowBuilder().addComponents(
    ButtonBuilder.from(row.components[0]).setDisabled(
      true,
    ),
    ButtonBuilder.from(row.components[1]).setDisabled(
      true,
    ),
  );
}

// ── Green "LOA" button on the info panel ──────────────────
const loaStart = {
  name: 'loa_start',
  async execute(interaction, client) {
    const store = getLoaStore(client);
    store.set(interaction.user.id, {});

    const introEmbed = new EmbedBuilder()
      .setColor(ACCENT_GREEN)
      .setTitle('LOA Request')
      .setDescription(
        'Please complete the following questions to submit your LOA request to the Los Santos Police Department.',
      );

    const q1 = LOA_QUESTIONS[0];

    try {
      await interaction.user.send({
        embeds: [introEmbed],
      });
      await interaction.user.send({
        embeds: [buildQuestionEmbed(q1)],
        components: [buildAnswerButton(q1.id)],
      });
      await interaction.reply({
        content:
          '✅ Check your DMs to start your LOA request.',
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content:
          "❌ I couldn't send you a DM. Please enable DMs from server members.",
        ephemeral: true,
      });
    }
  },
};

// ── "Answer" button on each question embed → opens modal ─
const loaAnswer = {
  name: 'loa_answer',
  async execute(interaction, client, args) {
    const [questionId] = args;
    const question = LOA_QUESTIONS.find(
      (q) => q.id === questionId,
    );
    if (!question) return;

    const modal = new ModalBuilder()
      .setCustomId(`loa_modal:${questionId}`)
      .setTitle('LOA Request');

    const input = new TextInputBuilder()
      .setCustomId('answer')
      .setLabel(question.label)
      .setStyle(
        question.style === 'Paragraph'
          ? TextInputStyle.Paragraph
          : TextInputStyle.Short,
      )
      .setPlaceholder(question.placeholder)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input),
    );
    await interaction.showModal(modal);
  },
};

// ── "Submit" button on the confirmation embed ─────────────
const loaSubmit = {
  name: 'loa_submit',
  async execute(interaction, client) {
    const store = getLoaStore(client);
    const data = store.get(interaction.user.id);

    if (
      !data ||
      !data.name ||
      !data.length ||
      !data.reason
    ) {
      await interaction.reply({
        content:
          '❌ Your LOA request data was not found. Please start a new request using the LOA button.',
        ephemeral: true,
      });
      return;
    }

    const channel = await client.channels
      .fetch(LOA_CHANNEL_ID)
      .catch(() => null);

    if (!channel) {
      await interaction.reply({
        content: '❌ LOA channel not found.',
        ephemeral: true,
      });
      return;
    }

    const embed = buildChannelEmbed(
      interaction.user,
      data,
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`loa_accept:${interaction.user.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`loa_deny:${interaction.user.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `<@&${LOA_PING_ROLE_ID}>`,
      embeds: [embed],
      components: [buttons],
    });

    store.delete(interaction.user.id);

    await interaction.reply({
      content:
        '✅ Your LOA request has been submitted for review.',
      ephemeral: true,
    });
  },
};

// ── "Accept" button on the staff channel post ─────────────
const loaAccept = {
  name: 'loa_accept',
  async execute(interaction, client, args) {
    const [userId] = args;
    const requester = await client.users
      .fetch(userId)
      .catch(() => null);

    if (!requester) {
      await interaction.reply({
        content:
          '❌ Could not find the requesting user.',
        ephemeral: true,
      });
      return;
    }

    const messageEmbed = interaction.message.embeds[0];
    const lengthField = messageEmbed?.fields?.find(
      (f) => f.name === 'Length',
    );
    const reasonField = messageEmbed?.fields?.find(
      (f) => f.name === 'Reason',
    );
    const length = lengthField?.value || 'N/A';
    const reason = reasonField?.value || 'N/A';

    const approvalEmbed = buildApprovalEmbed(
      length,
      reason,
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`loa_end_early:${userId}`)
        .setLabel('End LOA Early')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⏹️'),
      new ButtonBuilder()
        .setCustomId(`loa_modify:${userId}`)
        .setLabel('Modify LOA')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✏️'),
    );

    await interaction.deferReply({ ephemeral: true });

    try {
      await requester.send({
        embeds: [approvalEmbed],
        components: [buttons],
      });

      const row = disableRow(interaction.message);
      if (row) {
        await interaction.message.edit({
          components: [row],
        });
      }

      await interaction.editReply({
        content: `✅ LOA request approved. DM sent to ${requester}.`,
      });
    } catch {
      await interaction.editReply({
        content:
          '❌ Could not DM the requesting user.',
      });
    }
  },
};

// ── "Deny" button → opens denial reason modal ─────────────
const loaDeny = {
  name: 'loa_deny',
  async execute(interaction, client, args) {
    const [userId] = args;

    const modal = new ModalBuilder()
      .setCustomId(`loa_deny_modal:${userId}`)
      .setTitle('Deny LOA Request');

    const input = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for denial')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(input),
    );
    await interaction.showModal(modal);
  },
};

// ── "End LOA Early" button on the approval DM ─────────────
const loaEndEarly = {
  name: 'loa_end_early',
  async execute(interaction, client, args) {
    const [userId] = args;

    const channel = await client.channels
      .fetch(LOA_CHANNEL_ID)
      .catch(() => null);

    if (channel) {
      await channel
        .send({
          content: `⚠️ <@${userId}> has ended their LOA early.`,
        })
        .catch(() => {});
    }

    await interaction.reply({
      content:
        '✅ Your LOA has been ended early. Staff have been notified.',
      ephemeral: true,
    });
  },
};

// ── "Modify LOA" button on the approval DM ─────────────────
const loaModify = {
  name: 'loa_modify',
  async execute(interaction, client) {
    const store = getLoaStore(client);
    store.set(interaction.user.id, {});

    const q1 = LOA_QUESTIONS[0];

    try {
      await interaction.user.send({
        embeds: [buildQuestionEmbed(q1)],
        components: [buildAnswerButton(q1.id)],
      });
      await interaction.reply({
        content:
          '✅ Check your DMs to modify your LOA request.',
        ephemeral: true,
      });
    } catch {
      await interaction.reply({
        content:
          '❌ Could not send DM. Please enable DMs from server members.',
        ephemeral: true,
      });
    }
  },
};

export default [
  loaStart,
  loaAnswer,
  loaSubmit,
  loaAccept,
  loaDeny,
  loaEndEarly,
  loaModify,
];
5. src/interactions/modals/loa/loaModals.js
Create this file:

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import {
  buildConfirmationEmbed,
  buildDenialEmbed,
  buildQuestionEmbed,
  getLoaStore,
  LOA_QUESTIONS,
  MIN_LOA_DAYS,
  parseLengthToDays,
} from '../../../services/loaService.js';

function buildAnswerButton(questionId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`loa_answer:${questionId}`)
      .setLabel('Answer')
      .setStyle(ButtonStyle.Primary),
  );
}

function disableRow(message) {
  const row = message?.components?.[0];
  if (!row) return null;

  return new ActionRowBuilder().addComponents(
    ButtonBuilder.from(row.components[0]).setDisabled(
      true,
    ),
    ButtonBuilder.from(row.components[1]).setDisabled(
      true,
    ),
  );
}

// ── Handles all 4 question modals ──────────────────────────
const loaModal = {
  name: 'loa_modal',
  async execute(interaction, client, args) {
    const [questionId] = args;
    const question = LOA_QUESTIONS.find(
      (q) => q.id === questionId,
    );
    if (!question) return;

    const answer =
      interaction.fields.getTextInputValue('answer');

    const store = getLoaStore(client);
    const data = store.get(interaction.user.id) || {};
    data[question.field] = answer;
    store.set(interaction.user.id, data);

    // Validate minimum 7 days on the length question
    if (question.field === 'length') {
      const days = parseLengthToDays(answer);
      if (days < MIN_LOA_DAYS) {
        await interaction.reply({
          content: `❌ The minimum LOA duration is ${MIN_LOA_DAYS} days. You entered ${days} day(s). Please start a new LOA request.`,
          ephemeral: true,
        });
        store.delete(interaction.user.id);
        return;
      }
    }

    await interaction.deferReply({ ephemeral: true });

    const questionIndex = LOA_QUESTIONS.findIndex(
      (q) => q.id === questionId,
    );
    const nextQuestion =
      LOA_QUESTIONS[questionIndex + 1];

    if (nextQuestion) {
      await interaction.user.send({
        embeds: [buildQuestionEmbed(nextQuestion)],
        components: [buildAnswerButton(nextQuestion.id)],
      });
      await interaction.editReply({
        content:
          '✅ Answer recorded. Check your DMs for the next question.',
      });
    } else {
      // All questions answered — send confirmation + submit button
      await interaction.user.send({
        embeds: [buildConfirmationEmbed(data)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('loa_submit')
              .setLabel('Submit')
              .setStyle(ButtonStyle.Success),
          ),
        ],
      });
      await interaction.editReply({
        content:
          '✅ All questions answered. Check your DMs to submit your request.',
      });
    }
  },
};

// ── Handles the denial reason modal ────────────────────────
const loaDenyModal = {
  name: 'loa_deny_modal',
  async execute(interaction, client, args) {
    const [userId] = args;
    const reason =
      interaction.fields.getTextInputValue('reason');

    const requester = await client.users
      .fetch(userId)
      .catch(() => null);

    if (!requester) {
      await interaction.reply({
        content:
          '❌ Could not find the requesting user.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await requester.send({
        embeds: [buildDenialEmbed(reason)],
      });

      const row = disableRow(interaction.message);
      if (row) {
        await interaction.message.edit({
          components: [row],
        });
      }

      await interaction.editReply({
        content: `✅ LOA request denied. DM sent to ${requester}.`,
      });
    } catch {
      await interaction.editReply({
        content:
          '❌ Could not DM the requesting user.',
      });
    }
  },
};

export default [loaModal, loaDenyModal];
6. README.md addition
Append to the bottom of your existing README.md:

## LOA (Leave of Absence) System

The `/loa` command posts an information panel with a green **LOA** button. Members press it to start a DM-guided request flow:

1. Bot sends an intro DM, then a question embed with an **Answer** button
2. Four questions are asked via modals (name/callsign, length, reason, acknowledgement)
3. A confirmation embed with a **Submit** button appears
4. On submit, the request is posted to the LOA staff channel with role ping, Accept and Deny buttons
5. **Accept** DMs the requester an approval embed with End LOA Early / Modify LOA buttons
6. **Deny** opens a modal for the denial reason, then DMs the requester a denial embed

### Required environment variables

See `.env.example` for `LOA_CHANNEL_ID` and `LOA_PING_ROLE_ID`.
Installation tutorial
Step 1: Pull the latest repo
cd LSPD-Utility
git pull origin main
Step 2: Create the folders
mkdir -p src/interactions/buttons/loa
mkdir -p src/interactions/modals/loa
src/commands/LSPD and src/services already exist.

Step 3: Add the files
Create and paste the code into:

src/services/loaService.js
src/commands/LSPD/loa.js
src/interactions/buttons/loa/loaButtons.js
src/interactions/modals/loa/loaModals.js
Do not create index.js. Your bot auto-discovers commands, buttons, and modals in these folders.

Step 4: Update .env.example and .env
Append the two LOA variables to .env.example, then add them to your local .env:

LOA_CHANNEL_ID=1525928234984669405
LOA_PING_ROLE_ID=1521781111557066752
Step 5: Install and run locally
npm install
npm start
The console should log that loa command, 7 buttons, and 2 modals were loaded.

Step 6: Test in Discord
Run /loa in a staff channel to post the info panel. Then:

Press the green LOA button → check DMs
Answer all 4 questions via modals
Press Submit on the confirmation embed
Go to the LOA staff channel → press Accept or Deny
Accept → requester gets the approval DM with End LOA Early / Modify LOA buttons
Deny → type a reason → requester gets the denial DM
Commands register globally, so /loa may take up to an hour to appear after first deploy.

Step 7: Push to GitHub
git add src/services/loaService.js
git add src/commands/LSPD/loa.js
git add src/interactions/buttons/loa/loaButtons.js
git add src/interactions/modals/loa/loaModals.js
git add .env.example
git add README.md
git commit -m "Add LOA request system"
git push origin main
Do not git add .env.

Step 8: Deploy on Railway
Add LOA_CHANNEL_ID and LOA_PING_ROLE_ID to your Railway service variables, then redeploy.

11 minutes ago


image.png
very fast explain what script and how to make this not have my name saying i used /loa and just have the embed there

a few seconds ago


Revert
Quick fix — replace the execute function in src/commands/LSPD/loa.js with this:

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('📋 LOA (Leave of Absence)')
    .setDescription(
      [
        "Clicking the **LOA** button will allow you to submit a Leave of Absence request if you're going to be unavailable for a period of time.",
        '',
        'Please provide the required information, including the **reason for your LOA** and **how long you expect to be away**. Your request will then be reviewed by the appropriate staff member. **Minimum time to go LOA is 7 days.**',
        '',
        '**⚠️ Please only submit an LOA if you genuinely need time away.**',
      ].join('\n'),
    );

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('loa_start')
      .setLabel('LOA')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
  await interaction.channel.send({
    embeds: [embed],
    components: [button],
  });
}
What changed: Instead of interaction.reply() (which Discord auto-tags with "user used /loa"), the bot now silently acknowledges the interaction with an ephemeral reply, immediately deletes it, and sends the embed as a standalone message via channel.send(). The result is a clean bot message with no command-invocation header.

a few seconds ago



