/**
 * commands/punishment.js
 * -----------------------------------------------------------------------
 * /punishment issue
 *
 * Staff-only command that:
 *   1. Validates the issuer has permission to hand out punishments
 *   2. Builds a case record + unique Case ID
 *   3. Creates a forum post in the Punishments forum channel
 *   4. DMs the punished member a disciplinary notice with an Acknowledge button
 *   5. Adds Reviewed/Processed/Roster buttons + a Roster link button
 * -----------------------------------------------------------------------
 */

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');

const config = require('../config');
const { generateCaseId, parseDurationToMs } = require('../utils/caseId');
const { saveCase } = require('../utils/store');
const { buildCaseEmbed, buildEvidenceEmbeds, buildDmEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punishment')
    .setDescription('LSPD disciplinary record management')
    .addSubcommand((sub) =>
      sub
        .setName('issue')
        .setDescription('Issue a disciplinary record to a member')
        .addUserOption((opt) =>
          opt.setName('member').setDescription('The member being disciplined').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Punishment type')
            .setRequired(true)
            // This renders as a dropdown in the Discord client.
            .addChoices(...config.PUNISHMENT_TYPES.map((t) => ({ name: t.name, value: t.value }))),
        )
        .addStringOption((opt) =>
          opt.setName('reason').setDescription('Reason for the punishment').setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('duration')
            .setDescription('e.g. "14 Days", "48 Hours", "Permanent" (leave blank for N/A)')
            .setRequired(false),
        )
        .addAttachmentOption((opt) =>
          opt.setName('evidence1').setDescription('Evidence screenshot/file (optional)').setRequired(false),
        )
        .addAttachmentOption((opt) =>
          opt.setName('evidence2').setDescription('Additional evidence (optional)').setRequired(false),
        )
        .addAttachmentOption((opt) =>
          opt.setName('evidence3').setDescription('Additional evidence (optional)').setRequired(false),
        ),
    )
    // Sensible default; the runtime role check below is the real gate.
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'issue') return;

    try {
      // ---- Permission check -------------------------------------------------
      const issuerMember = interaction.member;
      const hasPermission = config.ISSUER_ROLE_IDS.some((roleId) => issuerMember.roles.cache.has(roleId));
      if (!hasPermission) {
        return interaction.reply({
          content: '❌ You do not have permission to issue punishments.',
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      // ---- Gather inputs ------------------------------------------------
      const targetUser = interaction.options.getUser('member', true);
      const typeValue = interaction.options.getString('type', true);
      const reason = interaction.options.getString('reason', true);
      const duration = interaction.options.getString('duration') || 'N/A';
      const evidenceAttachments = [
        interaction.options.getAttachment('evidence1'),
        interaction.options.getAttachment('evidence2'),
        interaction.options.getAttachment('evidence3'),
      ].filter(Boolean);

      const typeMeta = config.PUNISHMENT_TYPES.find((t) => t.value === typeValue);
      if (!typeMeta) {
        return interaction.editReply({ content: '❌ Unknown punishment type selected.' });
      }

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.editReply({ content: '❌ Could not find that member in this server.' });
      }

      // ---- Build case record ---------------------------------------------
      const caseId = generateCaseId();
      const issuedAt = Date.now();
      const durationMs = parseDurationToMs(duration);
      // Per the reference screenshot, expiry starts once the member acknowledges,
      // so we don't compute expiresAt until acknowledgement — we just store the
      // requested duration for later calculation.
      const caseData = {
        caseId,
        guildId: interaction.guild.id,
        memberId: targetMember.id,
        memberTag: targetUser.tag ?? targetUser.username,
        issuerId: issuerMember.id,
        punishmentType: typeValue,
        reason,
        activeFor: duration,
        durationMs,
        issuedAt,
        expiresAt: null, // set on acknowledgement (or immediately if no ack flow desired)
        evidence: evidenceAttachments.map((a) => a.url),
        reviewedByIA: false,
        hubProcessed: false,
        rosterUpdated: false,
        acknowledged: false,
        acknowledgedAt: null,
        forumChannelId: null,
        forumMessageId: null,
        forumThreadId: null,
        dmChannelId: null,
        dmMessageId: null,
      };

      // ---- Create the forum post ------------------------------------------
      const forumChannel = await interaction.guild.channels.fetch(config.PUNISHMENTS_FORUM_CHANNEL_ID).catch(() => null);
      if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        return interaction.editReply({
          content: '❌ The configured Punishments forum channel could not be found. Check `PUNISHMENTS_FORUM_CHANNEL_ID` in config.js.',
        });
      }

      const caseEmbed = buildCaseEmbed(caseData, targetMember, issuerMember, typeMeta);
      const evidenceEmbeds = buildEvidenceEmbeds(caseData.evidence);
      const actionRow = buildCaseActionRow(caseId);

      const thread = await forumChannel.threads.create({
        name: `Case ${caseId} — ${targetMember.displayName}`,
        message: {
          embeds: [caseEmbed, ...evidenceEmbeds],
          components: [actionRow],
        },
        appliedTags: [],
      });

      const forumStarterMessage = await thread.fetchStarterMessage().catch(() => null);

      caseData.forumThreadId = thread.id;
      caseData.forumChannelId = thread.id; // messages live in the thread itself
      caseData.forumMessageId = forumStarterMessage?.id ?? null;

      // ---- DM the member ---------------------------------------------------
      let dmSent = true;
      try {
        const dmEmbed = buildDmEmbed(caseData, typeMeta, interaction.guild.name);
        const dmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`punishment_ack_${caseId}`)
            .setLabel('Acknowledge')
            .setStyle(ButtonStyle.Success),
        );
        const dm = await targetUser.send({ embeds: [dmEmbed], components: [dmRow] });
        caseData.dmChannelId = dm.channel.id;
        caseData.dmMessageId = dm.id;
      } catch (err) {
        dmSent = false;
        console.error(`[punishment] Failed to DM ${targetUser.id}:`, err);
      }

      saveCase(caseId, caseData);

      await interaction.editReply({
        content:
          `✅ Punishment **${typeMeta.label}** issued to <@${targetMember.id}> — Case \`${caseId}\`.\n` +
          `Forum post: ${thread.url}\n` +
          (dmSent ? '📩 Member was notified via DM.' : '⚠️ Could not DM the member (DMs may be closed).'),
      });
    } catch (err) {
      console.error('[punishment issue] Unexpected error:', err);
      const payload = { content: '❌ Something went wrong issuing this punishment. Check the bot logs.' };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply({ ...payload, ephemeral: true }).catch(() => {});
      }
    }
  },
};

/**
 * Builds the row of status/utility buttons attached to the forum post.
 * Exported so the interaction handler can rebuild identical rows after toggling.
 */
function buildCaseActionRow(caseId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`punishment_toggle_ia_${caseId}`)
      .setLabel('Reviewed by IA/HC')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`punishment_toggle_hub_${caseId}`)
      .setLabel('Department Hub Processed')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`punishment_toggle_roster_${caseId}`)
      .setLabel('Roles & Roster Updated')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Roster')
      .setStyle(ButtonStyle.Link)
      .setURL(config.ROSTER_URL),
  );
}

module.exports.buildCaseActionRow = buildCaseActionRow;
