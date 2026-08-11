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
