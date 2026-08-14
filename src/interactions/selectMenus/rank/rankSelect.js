import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

import {
  ACCENT_BLUE,
  buildRankEmbed,
  RANK_OPTIONS,
  RANK_LABELS,
} from '../../../services/rankRequirementsService.js';

function buildSelectMenu(disabledRank = null) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('rank_select')
      .setPlaceholder('Select your rank')
      .setDisabled(!!disabledRank)
      .addOptions(
        RANK_OPTIONS.map((rank) => ({
          label: RANK_LABELS[rank],
          value: rank,
          default: rank === disabledRank,
        })),
      ),
  );
}

export default {
  name: 'rank_select',
  async execute(interaction, client) {
    const rank = interaction.values[0];
    const embed = buildRankEmbed(rank);

    if (!embed) {
      await interaction.reply({
        content: '❌ Could not find requirements for that rank.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [embed],
      ephemeral: false,
    });
  },
};
