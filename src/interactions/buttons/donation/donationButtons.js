import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

const donationDm = {
  name: 'donation_dm',
  async execute(interaction, client, args) {
    const [userId] = args;

    const replyInput = new TextInputBuilder()
      .setCustomId('reply')
      .setLabel('Your Reply')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const reviewedByInput = new TextInputBuilder()
      .setCustomId('reviewed_by')
      .setLabel('Reviewed By')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const modal = new ModalBuilder()
      .setCustomId(`donation_reply_modal:${userId}`)
      .setTitle('Send User a DM');

    modal.addComponents(
      new ActionRowBuilder().addComponents(replyInput),
      new ActionRowBuilder().addComponents(reviewedByInput),
    );

    await interaction.showModal(modal);
  },
};

export default [donationDm];
