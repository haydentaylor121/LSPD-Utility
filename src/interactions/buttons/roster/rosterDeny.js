import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  name: 'roster_deny',

  async execute(interaction, client, args) {
    const [requesterId] = args;

    const modal = new ModalBuilder()
      .setCustomId(`roster_deny_modal:${requesterId}`)
      .setTitle('Deny Roster Request');

    const reasonInput = new TextInputBuilder()
      .setCustomId('deny_reason')
      .setLabel('Please pick a reason for the denial.')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    await interaction.showModal(modal);
  },
};
