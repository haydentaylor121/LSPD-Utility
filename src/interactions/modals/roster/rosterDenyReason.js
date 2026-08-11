import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { getColor } from '../../../config/bot.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

export default {
  name: 'roster_deny_modal',

  async execute(interaction, client, args) {
    const [requesterId] = args;
    const reason = interaction.fields.getTextInputValue('deny_reason');

    const requester = await client.users.fetch(requesterId).catch(() => null);

    if (!requester) {
      return interaction.reply({
        embeds: [errorEmbed('Not Found', 'Could not find that user.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const denyEmbed = new EmbedBuilder()
      .setTitle('Roster Request')
      .setColor(getColor('error'))
      .setDescription(
        'Your roster request has been denied with the following reason.\n' +
        `**Reason:**\n${reason}\n\n` +
        'Please create a new request.',
      );

    try {
      await requester.send({ embeds: [denyEmbed] });
    } catch {
      return interaction.reply({
        embeds: [errorEmbed('DM Failed', 'Could not DM that user — their DMs are closed.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Disable the buttons on the request embed
    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true),
      ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true).setLabel('Denied'),
    );

    await interaction.update({ components: [disabledRow] });
    await interaction.followUp({
      embeds: [successEmbed('Denied', "The requester has been DM'd.")],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});

    logger.info('Roster request denied', {
      guildId: interaction.guildId,
      requesterId,
      deniedBy: interaction.user.id,
      reason,
    });
  },
};
