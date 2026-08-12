import { ActionRowBuilder, ButtonBuilder } from 'discord.js';

import { buildDmEmbed } from '../../../services/donationService.js';

function disableRow(message) {
  const row = message?.components?.[0];
  if (!row) return null;

  return new ActionRowBuilder().addComponents(
    ButtonBuilder.from(row.components[0]).setDisabled(true),
  );
}

const donationReplyModal = {
  name: 'donation_reply_modal',
  async execute(interaction, client, args) {
    const [userId] = args;

    const reply = interaction.fields.getTextInputValue('reply');
    const reviewedBy =
      interaction.fields.getTextInputValue('reviewed_by');

    const requester = await client.users
      .fetch(userId)
      .catch(() => null);

    if (!requester) {
      await interaction.reply({
        content: '❌ Could not find the user.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const embed = buildDmEmbed(reply, reviewedBy);

    try {
      await requester.send({ embeds: [embed] });

      const row = disableRow(interaction.message);
      if (row) {
        await interaction.message.edit({ components: [row] });
      }

      await interaction.editReply({
        content: `✅ DM sent to ${requester}.`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Could not DM the user.',
      });
    }
  },
};

export default [donationReplyModal];
