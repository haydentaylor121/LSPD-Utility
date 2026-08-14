import {
  ActionRowBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import { ACCENT_BLUE, RANK_OPTIONS, RANK_LABELS } from '../../services/rankRequirementsService.js';

const data = new SlashCommandBuilder()
  .setName('rank-requirements')
  .setDescription('View the promotion requirements for your rank');

async function execute(interaction) {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('rank_select')
    .setPlaceholder('Select your rank')
    .addOptions(
      RANK_OPTIONS.map((rank) => ({
        label: RANK_LABELS[rank],
        value: rank,
      })),
    );

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Send as a standalone message (no "used /rank-requirements" header)
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
  await interaction.channel.send({
    content: '**Select your rank to view promotion requirements:**',
    components: [row],
  });
}

export default { data, category: 'LSPD', execute };
