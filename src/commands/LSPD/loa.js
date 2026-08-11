async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(ACCENT_GREEN)
    .setTitle('📋 LOA (Leave of Absence)')
    .setDescription(
      [
        "Clicking the **LOA** button will allow you to submit a Leave of Absence request if you're going to be unavailable for a period of time.",
        '',
        'Please provide the required information, including the **reason for your LOA** and **how long you expect to be away**. Your request will then be reviewed by the appropriate staff member. **Minimum time to go LOA is 7 days.**',
        '',
        '**⚠️ Please only submit an LOA if you genuinely need time away.**',
      ].join('\n'),
    );

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('loa_start')
      .setLabel('LOA')
      .setStyle(ButtonStyle.Success),
  );

  await interaction.deferReply({ ephemeral: true });
  await interaction.deleteReply();
  await interaction.channel.send({
    embeds: [embed],
    components: [button],
  });
}
