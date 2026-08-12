import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js';

import {
  buildDonationEmbed,
  DONATION_CHANNEL_ID,
  DONATION_PING_ROLE_ID,
} from '../../services/donationService.js';

const data = new SlashCommandBuilder()
  .setName('donate-submit')
  .setDescription('Submit a donation')
  .addStringOption((option) =>
    option
      .setName('amount')
      .setDescription('Donation Amount')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('name_callsign')
      .setDescription('Your name and callsign')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('reason')
      .setDescription('Reason for donation')
      .setRequired(true),
  )
  .addAttachmentOption((option) =>
    option
      .setName('evidence')
      .setDescription('Any evidence to confirm (photo/file)')
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('confirm')
      .setDescription('Are you sure you want to submit this?')
      .addChoices(
        { name: 'Yes', value: 'Yes' },
        { name: 'No', value: 'No' },
      )
      .setRequired(true),
  );

async function execute(interaction, client) {
  const confirm = interaction.options.getString('confirm');

  if (confirm === 'No') {
    await interaction.reply({
      content: '❌ Your donation was not submitted.',
      ephemeral: true,
    });
    return;
  }

  const amount = interaction.options.getString('amount');
  const nameCallsign = interaction.options.getString('name_callsign');
  const reason = interaction.options.getString('reason');
  const evidence = interaction.options.getAttachment('evidence');

  const channel = await client.channels
    .fetch(DONATION_CHANNEL_ID)
    .catch(() => null);

  if (!channel) {
    await interaction.reply({
      content: '❌ Donation channel not found.',
      ephemeral: true,
    });
    return;
  }

  const embed = buildDonationEmbed(
    interaction.user,
    nameCallsign,
    amount,
    reason,
    confirm,
    evidence,
  );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`donation_dm:${interaction.user.id}`)
      .setLabel('Send user a dm')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({
    content: `<@&${DONATION_PING_ROLE_ID}>`,
    embeds: [embed],
    components: [buttons],
  });

  await interaction.reply({
    content: '✅ Your donation has been submitted.',
    ephemeral: true,
  });
}

export default { data, category: 'LSPD', execute };
