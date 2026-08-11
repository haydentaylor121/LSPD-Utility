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
  name: 'roster_accept',

  async execute(interaction, client, args) {
    const [requesterId] = args;

    const requester = await client.users.fetch(requesterId).catch(() => null);

    if (!requester) {
      return interaction.reply({
        embeds: [errorEmbed('Not Found', 'Could not find that user.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const acceptEmbed = new EmbedBuilder()
      .setTitle('Roster Request')
      .setColor(getColor('success'))
      .setDescription('Your roster request has been accepted. Please check the discord for your new name.');

    try {
      await requester.send({ embeds: [acceptEmbed] });
    } catch {
      return interaction.reply({
        embeds: [errorEmbed('DM Failed', 'Could not DM that user — their DMs are closed.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Disable the buttons on the request embed
    const disabledRow = new ActionRowBuilder().addComponents(
      ButtonBuilder.from(interaction.message.components[0].components[0]).setDisabled(true).setLabel('Accepted'),
      ButtonBuilder.from(interaction.message.components[0].components[1]).setDisabled(true),
    );

    await interaction.update({ components: [disabledRow] });
    await interaction.followUp({
      embeds: [successEmbed('Accepted', "The requester has been DM'd.")],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});

    logger.info('Roster request accepted', {
      guildId: interaction.guildId,
      requesterId,
      acceptedBy: interaction.user.id,
    });
  },
};
