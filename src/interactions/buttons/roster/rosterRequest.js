import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';

export default {
  name: 'roster_request',

  async execute(interaction, client, args) {
    const modal = new ModalBuilder()
      .setCustomId('roster_name_modal')
      .setTitle('Roster Request');

    // NOTE: Discord limits modal input labels to 45 characters.
    const nameInput = new TextInputBuilder()
      .setCustomId('character_name')
      .setLabel("Please enter your character's name:")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: John Doe')
      .setRequired(true)
      .setMaxLength(100);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));

    await interaction.showModal(modal);
  },
};
