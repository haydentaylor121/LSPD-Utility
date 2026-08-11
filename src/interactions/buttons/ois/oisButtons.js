import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

// ── "Approve" button → opens review modal ──────────────────
const oisApprove = {
  name: 'ois_approve',
  async execute(interaction, client, args) {
    const [userId] = args;

    const gradeInput = new TextInputBuilder()
      .setCustomId('grade')
      .setLabel('Grade out of 5 (1-5)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('4');

    const reviewedByInput = new TextInputBuilder()
      .setCustomId('reviewed_by')
      .setLabel('Reviewed By')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(interaction.user.username);

    const additionalInput = new TextInputBuilder()
      .setCustomId('additional_info')
      .setLabel('Additional info (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const modal = new ModalBuilder()
      .setCustomId(`ois_review_modal:approve:${userId}`)
      .setTitle('Approve OIS Report');

    modal.addComponents(
      new ActionRowBuilder().addComponents(gradeInput),
      new ActionRowBuilder().addComponents(reviewedByInput),
      new ActionRowBuilder().addComponents(additionalInput),
    );

    await interaction.showModal(modal);
  },
};

// ── "Deny" button → opens review modal ──────────────────────
const oisDeny = {
  name: 'ois_deny',
  async execute(interaction, client, args) {
    const [userId] = args;

    const gradeInput = new TextInputBuilder()
      .setCustomId('grade')
      .setLabel('Grade out of 5 (1-5)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('2');

    const reviewedByInput = new TextInputBuilder()
      .setCustomId('reviewed_by')
      .setLabel('Reviewed By')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder(interaction.user.username);

    const additionalInput = new TextInputBuilder()
      .setCustomId('additional_info')
      .setLabel('Additional info (optional)')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    const modal = new ModalBuilder()
      .setCustomId(`ois_review_modal:deny:${userId}`)
      .setTitle('Deny OIS Report');

    modal.addComponents(
      new ActionRowBuilder().addComponents(gradeInput),
      new ActionRowBuilder().addComponents(reviewedByInput),
      new ActionRowBuilder().addComponents(additionalInput),
    );

    await interaction.showModal(modal);
  },
};

export default [oisApprove, oisDeny];
