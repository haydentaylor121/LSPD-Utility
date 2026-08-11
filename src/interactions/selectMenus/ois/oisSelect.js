import { EmbedBuilder } from 'discord.js';

import {
  ACCENT_BLUE,
  askQuestion,
  buildStaffEmbed,
  OIS_CHANNEL_ID,
  OIS_PING_ROLE_ID,
  OIS_QUESTIONS,
} from '../../../services/oisService.js';

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export default {
  name: 'ois_select',
  async execute(interaction, client) {
    if (interaction.values[0] !== 'submit') return;

    const officer = interaction.user;

    const canDm = await officer
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(ACCENT_BLUE)
            .setTitle('OIS Report')
            .setDescription(
              'Reply to each question `cancel` with your answer. Type cancel at any time to stop.',
            ),
        ],
      })
      .then(() => true)
      .catch(() => false);

    if (!canDm) {
      await interaction.reply({
        content:
          '❌ I couldn\'t send you a DM. Please enable DMs from server members.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '✅ Check your DMs to begin your OIS report.',
      ephemeral: true,
    });

    const data = {};
    let cancelled = false;

    for (let i = 0; i < OIS_QUESTIONS.length; i += 1) {
      const result = await askQuestion(officer, i);

      if (result.status === 'cancelled') {
        cancelled = true;
        break;
      }

      if (result.status === 'timeout') {
        await officer.send({
          content: '⏰ The OIS report timed out. Please start again.',
        });
        cancelled = true;
        break;
      }

      if (result.status === 'answered') {
        data[result.field] = result.answer;
      }
    }

    if (cancelled) return;

    await officer.send({
      content: '✅ Your OIS report has been submitted.',
    });

    const channel = await client.channels
      .fetch(OIS_CHANNEL_ID)
      .catch(() => null);

    if (!channel) return;

    const staffEmbed = buildStaffEmbed(officer, data);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ois_approve:${officer.id}`)
        .setLabel('Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`ois_deny:${officer.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `<@&${OIS_PING_ROLE_ID}>`,
      embeds: [staffEmbed],
      components: [buttons],
    });
  },
};
