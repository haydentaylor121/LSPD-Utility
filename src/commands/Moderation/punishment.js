// commands/punishment.js
//
// /punishment issue
//   member          (user, required)     - who's being punished
//   punishment      (choice, required)   - Written Warning / Strike 1-3 / Suspension / Demotion / etc
//   reason          (string, required)   - how they broke SOP/GSOP
//   length          (string, optional)   - e.g. "14 Days" (leave blank for indefinite/N-A)
//   rank_or_details (string, optional)   - required context for Demotion / Alternative
//   evidence        (attachment, optional)
//   evidence_2      (attachment, optional)
//   evidence_3      (attachment, optional)
//   notify_member   (boolean, optional, default true) - DM the member a disciplinary notice
//   silent          (boolean, optional, default false) - post case without an @mention ping
//
// Wire-up: drop this whole `punishment-command` folder into your project and
// register the command the same way you register your other slash commands
// (module.exports = { data, execute }). Also require and call
// interactions/buttons.js's handler from your interactionCreate listener -
// see interactions/buttons.js for the one-line hookup.

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');

const config = require('../config');
const { PUNISHMENT_TYPES, labelFor } = require('../utils/punishmentTypes');
const { generateCaseId } = require('../utils/caseId');
const { saveCase } = require('../utils/store');

const data = new SlashCommandBuilder()
  .setName('punishment')
  .setDescription('Issue or manage LSPD disciplinary records')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) =>
    sub
      .setName('issue')
      .setDescription('Issue a disciplinary record to a member')
      .addUserOption((opt) => opt.setName('member').setDescription('Member receiving the punishment').setRequired(true))
      .addStringOption((opt) => {
        opt.setName('punishment').setDescription('Punishment type').setRequired(true);
        PUNISHMENT_TYPES.forEach((t) => opt.addChoices({ name: t.name, value: t.value }));
        return opt;
      })
      .addStringOption((opt) => opt.setName('reason').setDescription('How the member broke SOP/GSOP').setRequired(true))
      .addStringOption((opt) => opt.setName('length').setDescription('Active duration, e.g. "14 Days" (leave blank if N/A)').setRequired(false))
      .addStringOption((opt) => opt.setName('rank_or_details').setDescription('New rank (Demotion) or details (Alternative)').setRequired(false))
      .addAttachmentOption((opt) => opt.setName('evidence').setDescription('Primary evidence attachment').setRequired(false))
      .addAttachmentOption((opt) => opt.setName('evidence_2').setDescription('Additional evidence').setRequired(false))
      .addAttachmentOption((opt) => opt.setName('evidence_3').setDescription('Additional evidence').setRequired(false))
      .addBooleanOption((opt) => opt.setName('notify_member').setDescription('DM the member a disciplinary notice (default: true)').setRequired(false))
      .addBooleanOption((opt) => opt.setName('silent').setDescription('Post the case without pinging the member (default: false)').setRequired(false)),
  );

function isStaff(interactionMember) {
  if (interactionMember.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (!config.STAFF_ROLE_IDS.length) return true; // no gate configured yet
  return config.STAFF_ROLE_IDS.some((id) => interactionMember.roles.cache.has(id));
}

function meetsRankGate(punishmentValue, interactionMember) {
  const gate = config.RANK_GATES[punishmentValue];
  if (!gate || !gate.length) return true;
  return gate.some((id) => interactionMember.roles.cache.has(id));
}

async function execute(interaction) {
  if (interaction.options.getSubcommand() !== 'issue') return;

  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: 'You do not have permission to issue disciplinary records.', ephemeral: true });
  }

  const member = interaction.options.getUser('member', true);
  const punishmentValue = interaction.options.getString('punishment', true);
  const reason = interaction.options.getString('reason', true);
  const length = interaction.options.getString('length');
  const rankOrDetails = interaction.options.getString('rank_or_details');
  const notifyMember = interaction.options.getBoolean('notify_member') ?? true;
  const silent = interaction.options.getBoolean('silent') ?? false;

  const evidenceAttachments = ['evidence', 'evidence_2', 'evidence_3']
    .map((name) => interaction.options.getAttachment(name))
    .filter(Boolean);

  if (!meetsRankGate(punishmentValue, interaction.member)) {
    return interaction.reply({ content: 'Your rank does not permit issuing this punishment type.', ephemeral: true });
  }

  if (['demotion', 'alternative'].includes(punishmentValue) && !rankOrDetails) {
    return interaction.reply({
      content: `The **${labelFor(punishmentValue)}** punishment type requires \`rank_or_details\` to be filled in.`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const caseId = generateCaseId();
  const label = labelFor(punishmentValue); // e.g. "STRIKE 1"
  const issuedAt = new Date();

  // Fetch the target as a guild member so we can use their formatted display name
  // (e.g. "L-922 | PO J. Hernandez | LSPD") the same way your server's nicknames do.
  let targetMember;
  try {
    targetMember = await interaction.guild.members.fetch(member.id);
  } catch {
    targetMember = null;
  }
  const displayName = targetMember ? targetMember.displayName : member.username;
  const issuerDisplayName = interaction.member.displayName || interaction.user.username;

  // ---- Build case embed (posted in the punishments channel/forum) ----
  const caseEmbed = new EmbedBuilder()
    .setColor(punishmentValue.startsWith('strike') ? config.STRIKE_COLOR : config.EMBED_COLOR)
    .setAuthor({ name: 'LSPD Utility', iconURL: interaction.client.user.displayAvatarURL() })
    .setTitle(`LSPD Punishment - Case \`${caseId}\``)
    .addFields(
      { name: 'Member', value: `${member} (\`${member.id}\`)` },
      { name: 'Issued by', value: `${interaction.user} (\`${interaction.user.id}\`)` },
      { name: 'Issued', value: `<t:${Math.floor(issuedAt.getTime() / 1000)}:F>` },
      { name: 'Punishment Issued', value: `\`${label}\`` },
      { name: 'Reason', value: reason },
      { name: 'Active For', value: length ? `\`${length}\`` : 'N/A' },
      { name: 'Expires', value: 'Starts after member acknowledges' },
    )
    .setThumbnail(member.displayAvatarURL())
    .setTimestamp(issuedAt);

  if (rankOrDetails) {
    caseEmbed.addFields({ name: punishmentValue === 'demotion' ? 'New Rank' : 'Details', value: rankOrDetails });
  }

  const files = [];
  const evidenceEmbeds = [];
  evidenceAttachments.forEach((att, i) => {
    const filename = `evidence_${i}_${att.name}`;
    files.push(new AttachmentBuilder(att.url, { name: filename }));
    evidenceEmbeds.push(
      new EmbedBuilder()
        .setColor(config.EMBED_COLOR)
        .setImage(`attachment://${filename}`)
        .setTitle(i === 0 ? 'Evidence' : undefined),
    );
  });

  const trackingRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`punish_track:reviewed:${caseId}`).setLabel('Reviewed by IA/HC').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`punish_track:hub:${caseId}`).setLabel('Department Hub Processed').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`punish_track:roster:${caseId}`).setLabel('Roles & Roster Updated').setStyle(ButtonStyle.Danger),
  );

  // ---- Post the case ----
  const targetChannel = await interaction.client.channels.fetch(config.PUNISHMENTS_CHANNEL_ID);
  let posted;
  const threadTitle = `[${label}] ${displayName} | ${caseId}`;

  if (targetChannel.type === ChannelType.GuildForum) {
    const availableTag = config.FORUM_TAG_NAME
      ? targetChannel.availableTags.find((t) => t.name === config.FORUM_TAG_NAME)
      : null;
    const thread = await targetChannel.threads.create({
      name: threadTitle,
      appliedTags: availableTag ? [availableTag.id] : [],
      message: {
        content: silent ? undefined : `${member}`,
        embeds: [caseEmbed, ...evidenceEmbeds],
        files,
        components: [trackingRow],
      },
    });
    posted = thread;
  } else {
    posted = await targetChannel.send({
      content: silent ? undefined : `${member}`,
      embeds: [caseEmbed, ...evidenceEmbeds],
      files,
      components: [trackingRow],
    });
  }

  // ---- Persist case state ----
  saveCase(caseId, {
    caseId,
    memberId: member.id,
    issuerId: interaction.user.id,
    punishmentValue,
    label,
    reason,
    length: length || null,
    rankOrDetails: rankOrDetails || null,
    issuedAt: issuedAt.toISOString(),
    acknowledged: false,
    acknowledgedAt: null,
    reviewed: false,
    hubProcessed: false,
    rosterUpdated: false,
    channelId: posted.id,
    guildId: interaction.guild.id,
  });

  // ---- DM the member the disciplinary notice ----
  if (notifyMember) {
    const dmEmbed = new EmbedBuilder()
      .setColor(config.EMBED_COLOR)
      .setTitle('🔴 Disciplinary Notice')
      .setDescription(
        `Hello ${member},\n\nThis is a notice regarding a disciplinary record on your account.`,
      )
      .addFields(
        { name: '🆔 Record ID', value: `\`${caseId}\``, inline: true },
        { name: '🔷 Action', value: label, inline: true },
        { name: '📋 Reason', value: reason },
        { name: '⏳ Issued', value: `<t:${Math.floor(issuedAt.getTime() / 1000)}:F>` },
        { name: '⏳ Expires', value: length ? `Starts after you acknowledge (${length} once acknowledged)` : 'N/A' },
        { name: '🗳️ Appeals', value: config.APPEALS_TEXT },
      );

    const ackRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`punish_ack:${caseId}`).setLabel('Acknowledge').setStyle(ButtonStyle.Success),
    );

    try {
      await member.send({ embeds: [dmEmbed], components: [ackRow] });
    } catch {
      // Member has DMs closed - not fatal, just let the issuer know.
      await interaction.followUp({
        content: `Case \`${caseId}\` was posted, but I couldn't DM ${member} (their DMs may be closed).`,
        ephemeral: true,
      });
    }
  }

  await interaction.editReply({ content: `Case \`${caseId}\` issued for ${member} - posted in ${targetChannel}.` });
}

module.exports = { data, execute };
