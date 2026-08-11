import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import { getColor } from '../../../config/bot.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';

// ===== Config =====
const ROSTER_LOG_CHANNEL_ID = '1528529847427535028';
const PING_ROLE_ID = '1521781111557066752';

export default {
  name: 'roster_name_modal',

  async execute(interaction, client, args) {
    const chosenName = interaction.fields.getTextInputValue('character_name');
    const submitter = interaction.user;
    const time = `<t:${Math.floor(Date.now() / 1000)}:F>`;

    const requestEmbed = new EmbedBuilder()
      .setTitle('Roster Request')
      .setColor(getColor('info'))
      .addFields(
        { name: 'Name', value: `${submitter}`, inline: false },
        { name: 'New Name', value: chosenName, inline: false },
        { name: 'Time', value: time, inline: false },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`roster_accept:${submitter.id}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`roster_deny:${submitter.id}`)
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger),
    );

    const channel = await client.channels.fetch(ROSTER_LOG_CHANNEL_ID).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        embeds: [errorEmbed('Configuration Error', 'Could not find the roster log channel. Please contact an admin.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await channel.send({
        content: `<@&${PING_ROLE_ID}>`,
        embeds: [requestEmbed],
        components: [row],
        allowedMentions: { roles: [PING_ROLE_ID] },
      });
    } catch (error) {
      logger.error('Failed to post roster request', {
        error: error.message,
        guildId: interaction.guildId,
        userId: submitter.id,
      });

      return interaction.reply({
        embeds: [errorEmbed('Failed to Submit', 'Could not post your request. Check the bot permissions in the roster channel.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    logger.info('Roster request submitted', {
      guildId: interaction.guildId,
      userId: submitter.id,
      newName: chosenName,
    });

    return interaction.reply({
      embeds: [successEmbed('Roster Request Submitted', 'Your roster request has been submitted for review.')],
      flags: MessageFlags.Ephemeral,
    });
  },
};
