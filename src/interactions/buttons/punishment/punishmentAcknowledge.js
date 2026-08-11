import { EmbedBuilder } from 'discord.js';

import {
  formatDate,
  parseLengthToMs,
} from '../../../services/punishmentService.js';

export default {
  name: 'punishment_ack',

  async execute(interaction, client, args) {
    const [threadId, messageId] = args;

    const thread = await client.channels
      .fetch(threadId)
      .catch(() => null);

    if (!thread) {
      await interaction.reply({
        content: '❌ Punishment log not found.',
        ephemeral: true,
      });
      return;
    }

    const message = await thread.messages
      .fetch(messageId)
      .catch(() => null);

    if (!message || !message.embeds[0]) {
      await interaction.reply({
        content: '❌ Punishment log not found.',
        ephemeral: true,
      });
      return;
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const fields = [...(embed.data.fields || [])];

    let expiresText = 'Acknowledged';

    const activeForField = fields.find(
      (field) => field.name === 'Active For',
    );

    if (activeForField) {
      const duration = parseLengthToMs(activeForField.value);

      if (duration > 0) {
        expiresText = formatDate(
          new Date(Date.now() + duration),
        );
      }
    }

    const expiresIndex = fields.findIndex(
      (field) => field.name === 'Expires',
    );

    if (expiresIndex >= 0) {
      fields[expiresIndex] = {
        ...fields[expiresIndex],
        value: expiresText,
      };
    }

    const acknowledgedValue =
      `✅ Yes — ${interaction.user} ` +
      `(${formatDate(new Date())})`;

    const acknowledgedIndex = fields.findIndex(
      (field) => field.name === 'Acknowledged',
    );

    if (acknowledgedIndex >= 0) {
      fields[acknowledgedIndex] = {
        ...fields[acknowledgedIndex],
        value: acknowledgedValue,
      };
    } else {
      fields.push({
        name: 'Acknowledged',
        value: acknowledgedValue,
        inline: false,
      });
    }

    embed.setFields(fields);

    await message.edit({
      embeds: [embed],
    });

    await interaction.reply({
      content:
        '✅ You have acknowledged your punishment. This has been logged.',
      ephemeral: true,
    });
  },
};
