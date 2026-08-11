import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { getColor } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('roster-request')
    .setDescription('Post the LSPD Roster Request panel'),

  async execute(interaction, guildConfig, client) {
    const embed = new EmbedBuilder()
      .setTitle('🚔 LSPD — Roster Request')
      .setColor(getColor('info'))
      .setDescription(
        'Interested in joining the Los Santos Police Department roster? Please submit your request using the format below.\n\n' +
        '📌 Requirements\n\n' +
        '• You must be an active member of LSPD.\n' +
        '• Please pick a real name.\n' +
        '• Requests will be reviewed by LSPD Command.\n' +
        '• Please do not submit duplicate requests.\n\n' +
        'Once your request has been submitted, LSPD Command will review it and update your roster status accordingly.\n\n' +
        '🔹 Thank you for your service to the Los Santos Police Department.',
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('roster_request')
        .setLabel('📰 Roster Request')
        .setStyle(ButtonStyle.Success),
    );

    await interaction.reply({ embeds: [embed], components: [row] });

    logger.info('Roster request panel posted', {
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });
  },
};
