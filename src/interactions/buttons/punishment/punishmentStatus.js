import {
  buildStatusButtons,
  parseStatesFromMessage,
} from '../../../services/punishmentService.js';

export default {
  name: 'punishment_status',

  async execute(interaction, client, args) {
    const [code] = args;
    const states = parseStatesFromMessage(
      interaction.message,
    );

    if (code in states) {
      states[code] = !states[code];
    }

    await interaction.message.edit({
      components: [buildStatusButtons(states)],
    });

    await interaction.reply({
      content: 'Status updated.',
      ephemeral: true,
    });
  },
};
