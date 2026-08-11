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
