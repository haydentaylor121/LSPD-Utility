import {
  ActionRowBuilder,
  ButtonBuilder,
} from 'discord.js';

import {
  buildAcceptedEmbed,
  buildDeniedEmbed,
} from '../../../services/oisService.js';

function disableRow(message) {
  const row = message?.components?.[0];
  if (!row) return null;

  return new ActionRowBuilder().addComponents(
    ButtonBuilder.from(row.components[0]).setDisabled(true),
    ButtonBuilder.from(row.components[1]).setDisabled(true),
  );
}

const oisReviewModal = {
  name: 'ois_review_modal',
  async execute(interaction, client, args) {
    const [action, userId] = args;

    const grade =
      interaction.fields.getTextInputValue('grade') || 'N/A';
    const reviewedBy =
      interaction.fields.getTextInputValue('reviewed_by') ||
      interaction.user.username;
    const additionalInfo =
      interaction.fields.getTextInputValue('additional_info') ||
      '';

    const requester = await client.users
      .fetch(userId)
      .catch(() => null);

    if (!requester) {
      await interaction.reply({
        content: '❌ Could not find the reporting officer.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const embed =
      action === 'approve'
        ? buildAcceptedEmbed(grade, reviewedBy, additionalInfo)
        : buildDeniedEmbed(grade, reviewedBy, additionalInfo);

    try {
      await requester.send({ embeds: [embed] });

      const row = disableRow(interaction.message);
      if (row) {
        await interaction.message.edit({ components: [row] });
      }

      await interaction.editReply({
        content: `✅ OIS report ${action === 'approve' ? 'approved' : 'denied'}. DM sent to ${requester}.`,
      });
    } catch {
      await interaction.editReply({
        content: '❌ Could not DM the reporting officer.',
      });
    }
  },
};

export default [oisReviewModal];
