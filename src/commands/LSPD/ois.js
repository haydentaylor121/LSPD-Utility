import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import { ACCENT_BLUE, OIS_IMAGE_URL } from '../../services/oisService.js';

const data = new SlashCommandBuilder()
  .setName('ois')
  .setDescription('Post the OIS Report information panel')
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ManageMessages,
  );

async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT_BLUE)
    .setTitle('OIS Report')
    .setDescription(
      [
        'Anytime Lethal Force is utilized on a scene, this report is **REQUIRED** to be filled out. Failure to complete or thoroughly complete this form can result in Immediate Termination and Criminal Charges. Use of Lethal Force is to be your last option when using force. These reports are to be used **ANYTIME** your firearm is discharged.',
      ].join('\n'),
    );

  // ════════════════════════════════════════════════════════════
  // IMAGE: Replace the OIS_IMAGE_URL in your .env file with your
  // own image link, or paste a URL directly below.
  // To remove the image entirely, delete or comment out the
  // .setImage() line.
  // ════════════════════════════════════════════════════════════
  if (OIS_IMAGE_URL) {
    embed.setImage(OIS_IMAGE_URL);
  }

  embed.setFooter({
    text: 'Ensure your DMs are open so the bot can send updates.',
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ois_select')
    .setPlaceholder('Select an option by clicking here!')
    .addOptions([
      {
        label: 'OIS Report',
        description:
          'Use this to submit your OIS report if you fired your weapon.',
        value: 'submit',
      },
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);

  // Send as a standalone message (no "used /ois" header)
  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
  await interaction.channel.send({
    embeds: [embed],
    components: [row],
  });
}

export default { data, category: 'LSPD', execute };
