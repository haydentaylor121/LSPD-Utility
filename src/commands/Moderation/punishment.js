/**
 * src/commands/Moderation/punishment.js
 * -----------------------------------------------------------------------
 * /punishment issue
 *
 * Fully self-contained — no other files required. Edit the CONFIG block
 * below with your real IDs, drop this file in src/commands/Moderation/,
 * and it will work with any standard discord.js v14 command handler that
 * loads command.data + command.execute.
 *
 * What it does:
 *   - Dropdown (slash command choices) for punishment type
 *   - Generates a unique Case ID
 *   - Creates a forum post in your Punishments forum channel
 *   - Shows the member's avatar top-right, uses their server nickname
 *   - Supports up to 3 evidence attachments
 *   - DMs the punished member with an Acknowledge button
 *   - Adds Reviewed by IA/HC, Department Hub Processed, Roles & Roster
 *     Updated buttons + a Roster link button
 *   - Full error handling throughout
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');

// ======================================================================
// CONFIG — edit everything in this block
// ======================================================================
const CONFIG = {
  PUNISHMENTS_FORUM_CHANNEL_ID: 'REPLACE_WITH_FORUM_CHANNEL_ID',
  ROSTER_URL: 'https://example.com/roster',
  DEPARTMENT_NAME: 'LSPD',
  EMBED_COLOR: 0xE84142,

  // Roles allowed to run /punishment issue
  ISSUER_ROLE_IDS: ['REPLACE_WITH_ROLE_ID_1', 'REPLACE_WITH_ROLE_ID_2'],

  // Roles allowed to click "Reviewed by IA/HC"
  IA_HC_ROLE_IDS: ['REPLACE_WITH_IA_ROLE_ID', 'REPLACE_WITH_HIGH_COMMAND_ROLE_ID'],

  // Roles allowed to click "Department Hub Processed"
  HUB_ROLE_IDS: ['REPLACE_WITH_HUB_ADMIN_ROLE_ID'],

  // Roles allowed to click "Roles & Roster Updated"
  ROSTER_MANAGER_ROLE_IDS: ['REPLACE_WITH_ROSTER_MANAGER_ROLE_ID'],

  PUNISHMENT_TYPES: [
    { name: 'Written Warning', value: 'WRITTEN_WARNING', label: 'WRITTEN WARNING', color: 0xFACC15 },
    { name: 'Verbal Warning', value: 'VERBAL_WARNING', label: 'VERBAL WARNING', color: 0x9CA3AF },
    { name: 'Strike', value: 'STRIKE', label: 'STRIKE', color: 0xF97316 },
    { name: 'Suspension', value: 'SUSPENSION', label: 'SUSPENSION', color: 0xEF4444 },
    { name: 'Termination', value: 'TERMINATION', label: 'TERMINATION', color: 0x7F1D1D },
  ],

  APPEALS_INSTRUCTIONS:
    'If you believe this record is unjust, you may appeal it by **opening a ticket** ' +
    'to discuss it with Internal Affairs. Do not DM a supervisor or Internal Affairs members directly.',
};

// ======================================================================
// STORAGE — simple JSON-file backed case store (data/punishment-cases.json)
// ======================================================================
const DATA_DIR = path.join(__dirname, '..', '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'punishment-cases.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
}
function readAllCases() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } catch (err) {
    console.error('[punishment] Failed to read case store:', err);
    return {};
  }
}
function writeAllCases(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function saveCase(caseId, record) {
  const all = readAllCases();
  all[caseId] = record;
  writeAllCases(all);
  return record;
}
function getCase(caseId) {
  return readAllCases()[caseId] || null;
}
function updateCase(caseId, patch) {
  const all = readAllCases();
  if (!all[caseId]) return null;
  all[caseId] = { ...all[caseId], ...patch };
  writeAllCases(all);
  return all[caseId];
}

// ======================================================================
// HELPERS
// ======================================================================
function generateCaseId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function parseDurationToMs(durationText) {
  if (!durationText) return null;
  const normalized = durationText.trim().toLowerCase();
  if (['permanent', 'n/a', 'none'].includes(normalized)) return null;
  const match = normalized.match(/^(\d+)\s*(day|days|hour|hours|week|weeks)$/);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unitMs = { day: 86400000, days: 86400000, hour: 3600000, hours: 3600000, week: 604800000, weeks: 604800000 }[match[2]];
  return amount * unitMs;
}

function formatMember(member) {
  const displayName = member.displayName || member.user?.username || member.username;
  return `<@${member.id}> | ${displayName} (\`${member.id}\`)`;
}

function ts(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

function buildCaseActionRow(caseId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`punishment_toggle_ia_${caseId}`).setLabel('Reviewed by IA/HC').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`punishment_toggle_hub_${caseId}`).setLabel('Department Hub Processed').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`punishment_toggle_roster_${caseId}`).setLabel('Roles & Roster Updated').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setLabel('Roster').setStyle(ButtonStyle.Link).setURL(CONFIG.ROSTER_URL),
  );
}

function buildCaseEmbed(caseData, member, issuer, typeMeta) {
  const expiresText = caseData.expiresAt ? ts(new Date(caseData.expiresAt)) : 'Starts after member acknowledges';
  const embed = new EmbedBuilder()
    .setColor(typeMeta.color || CONFIG.EMBED_COLOR)
    .setTitle(`${CONFIG.DEPARTMENT_NAME} Punishment - Case ${caseData.caseId}`)
    .setThumbnail(member.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: 'Member', value: formatMember(member) },
      { name: 'Issued by', value: formatMember(issuer) },
      { name: 'Issued', value: ts(new Date(caseData.issuedAt)) },
      { name: 'Punishment Issued', value: `**${typeMeta.label}**` },
      { name: 'Reason', value: caseData.reason },
      { name: 'Active For', value: caseData.activeFor || 'N/A', inline: true },
      { name: 'Expires', value: expiresText, inline: true },
    )
    .setFooter({ text: `Case ${caseData.caseId} • ${CONFIG.DEPARTMENT_NAME} Punishment Utility` })
    .setTimestamp(new Date(caseData.issuedAt));

  embed.addFields({
    name: 'Status',
    value: [
      `${caseData.reviewedByIA ? '✅' : '⬜'} Reviewed by IA/HC`,
      `${caseData.hubProcessed ? '✅' : '⬜'} Department Hub Processed`,
      `${caseData.rosterUpdated ? '✅' : '⬜'} Roles & Roster Updated`,
    ].join('\n'),
  });

  if (caseData.acknowledged) {
    embed.addFields({ name: 'Acknowledged', value: `Member acknowledged this on ${ts(new Date(caseData.acknowledgedAt))}` });
  }
  return embed;
}

function buildEvidenceEmbeds(evidenceUrls) {
  return (evidenceUrls || [])
    .filter(Boolean)
    .slice(0, 3)
    .map((url, i) => new EmbedBuilder().setColor(CONFIG.EMBED_COLOR).setTitle(i === 0 ? 'Evidence' : undefined).setImage(url));
}

function buildDmEmbed(caseData, typeMeta, guildName) {
  const expiresText = caseData.expiresAt ? ts(new Date(caseData.expiresAt)) : 'N/A';
  const embed = new EmbedBuilder()
    .setColor(typeMeta.color || CONFIG.EMBED_COLOR)
    .setAuthor({ name: `${CONFIG.DEPARTMENT_NAME} Punishment & Utility` })
    .setTitle('🔴 Disciplinary Notice')
    .setDescription(`Hello ${caseData.memberTag},\n\nThis is a notice regarding a disciplinary record on your account.`)
    .addFields(
      { name: 'Record ID', value: `\`${caseData.caseId}\``, inline: true },
      { name: 'Action', value: `**${typeMeta.label}**`, inline: true },
      { name: 'Reason', value: caseData.reason },
      { name: 'Issued', value: ts(new Date(caseData.issuedAt)) },
      { name: 'Expires', value: expiresText },
      { name: 'Appeals', value: CONFIG.APPEALS_INSTRUCTIONS },
    )
    .setFooter({ text: guildName || CONFIG.DEPARTMENT_NAME });

  if (caseData.acknowledged) {
    embed.addFields({ name: 'Acknowledged', value: `You acknowledged this discipline action on ${ts(new Date(caseData.acknowledgedAt))}.` });
  }
  return embed;
}

async function refreshForumPost(client, caseData, typeMeta) {
  if (!caseData.forumThreadId) return;
  const thread = await client.channels.fetch(caseData.forumThreadId).catch(() => null);
  if (!thread) return;
  const starter = await thread.fetchStarterMessage().catch(() => null);
  if (!starter) return;
  const guild = thread.guild;
  const member = await guild.members.fetch(caseData.memberId).catch(() => null);
  const issuer = await guild.members.fetch(caseData.issuerId).catch(() => null);
  if (!member || !issuer) return;
  await starter.edit({
    embeds: [buildCaseEmbed(caseData, member, issuer, typeMeta), ...buildEvidenceEmbeds(caseData.evidence)],
    components: [buildCaseActionRow(caseData.caseId)],
  });
}

// ======================================================================
// BUTTON INTERACTION HANDLING (self-attaching, no other files needed)
// ======================================================================
let listenerAttached = false;
function ensureButtonListener(client) {
  if (listenerAttached) return;
  listenerAttached = true;

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('punishment_')) return;

    try {
      const parts = interaction.customId.split('_');
      const kind = parts[1];

      if (kind === 'ack') {
        const caseId = parts[2];
        const caseData = getCase(caseId);
        if (!caseData) return interaction.reply({ content: '❌ This case record no longer exists.', ephemeral: true });
        if (interaction.user.id !== caseData.memberId) {
          return interaction.reply({ content: '❌ Only the punished member can acknowledge this record.', ephemeral: true });
        }
        if (caseData.acknowledged) {
          return interaction.reply({ content: 'ℹ️ You already acknowledged this record.', ephemeral: true });
        }

        const acknowledgedAt = Date.now();
        const expiresAt = caseData.durationMs ? acknowledgedAt + caseData.durationMs : null;
        const updated = updateCase(caseId, { acknowledged: true, acknowledgedAt, expiresAt });
        const typeMeta = CONFIG.PUNISHMENT_TYPES.find((t) => t.value === updated.punishmentType);

        await interaction.update({
          embeds: [buildDmEmbed(updated, typeMeta, interaction.guild?.name)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`punishment_ack_${caseId}`).setLabel('Acknowledged ✓').setStyle(ButtonStyle.Success).setDisabled(true),
            ),
          ],
        });

        await refreshForumPost(interaction.client, updated, typeMeta).catch((err) =>
          console.error('[punishment] Failed to refresh forum post after ack:', err),
        );
        return;
      }

      if (kind === 'toggle') {
        const fieldMap = {
          ia: { key: 'reviewedByIA', roles: CONFIG.IA_HC_ROLE_IDS, label: 'Reviewed by IA/HC' },
          hub: { key: 'hubProcessed', roles: CONFIG.HUB_ROLE_IDS, label: 'Department Hub Processed' },
          roster: { key: 'rosterUpdated', roles: CONFIG.ROSTER_MANAGER_ROLE_IDS, label: 'Roles & Roster Updated' },
        };
        const field = parts[2];
        const caseId = parts[3];
        const target = fieldMap[field];
        if (!target) return interaction.reply({ content: '❌ Unknown status field.', ephemeral: true });

        const caseData = getCase(caseId);
        if (!caseData) return interaction.reply({ content: '❌ This case record no longer exists.', ephemeral: true });

        const hasPermission = target.roles.some((roleId) => interaction.member.roles.cache.has(roleId));
        if (!hasPermission) {
          return interaction.reply({ content: `❌ You don't have permission to toggle "${target.label}".`, ephemeral: true });
        }

        const updated = updateCase(caseId, { [target.key]: !caseData[target.key] });
        const typeMeta = CONFIG.PUNISHMENT_TYPES.find((t) => t.value === updated.punishmentType);

        const member = await interaction.guild.members.fetch(updated.memberId).catch(() => null);
        const issuer = await interaction.guild.members.fetch(updated.issuerId).catch(() => null);
        if (!member || !issuer) {
          return interaction.reply({ content: '❌ Could not resolve member/issuer to refresh the embed.', ephemeral: true });
        }

        await interaction.update({
          embeds: [buildCaseEmbed(updated, member, issuer, typeMeta), ...buildEvidenceEmbeds(updated.evidence)],
          components: [buildCaseActionRow(caseId)],
        });
        return;
      }
    } catch (err) {
      console.error('[punishment button] Unexpected error:', err);
      const payload = { content: '❌ Something went wrong processing that action.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}

// ======================================================================
// COMMAND
// ======================================================================
module.exports = {
  data: new SlashCommandBuilder()
    .setName('punishment')
    .setDescription('LSPD disciplinary record management')
    .addSubcommand((sub) =>
      sub
        .setName('issue')
        .setDescription('Issue a disciplinary record to a member')
        .addUserOption((opt) => opt.setName('member').setDescription('The member being disciplined').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Punishment type')
            .setRequired(true)
            .addChoices(...CONFIG.PUNISHMENT_TYPES.map((t) => ({ name: t.name, value: t.value }))),
        )
        .addStringOption((opt) => opt.setName('reason').setDescription('Reason for the punishment').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('e.g. "14 Days", "48 Hours", "Permanent" (leave blank for N/A)').setRequired(false),
        )
        .addAttachmentOption((opt) => opt.setName('evidence1').setDescription('Evidence screenshot/file (optional)').setRequired(false))
        .addAttachmentOption((opt) => opt.setName('evidence2').setDescription('Additional evidence (optional)').setRequired(false))
        .addAttachmentOption((opt) => opt.setName('evidence3').setDescription('Additional evidence (optional)').setRequired(false)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    ensureButtonListener(interaction.client);

    const sub = interaction.options.getSubcommand();
    if (sub !== 'issue') return;

    try {
      const issuerMember = interaction.member;
      const hasPermission = CONFIG.ISSUER_ROLE_IDS.some((roleId) => issuerMember.roles.cache.has(roleId));
      if (!hasPermission) {
        return interaction.reply({ content: '❌ You do not have permission to issue punishments.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const targetUser = interaction.options.getUser('member', true);
      const typeValue = interaction.options.getString('type', true);
      const reason = interaction.options.getString('reason', true);
      const duration = interaction.options.getString('duration') || 'N/A';
      const evidenceAttachments = [
        interaction.options.getAttachment('evidence1'),
        interaction.options.getAttachment('evidence2'),
        interaction.options.getAttachment('evidence3'),
      ].filter(Boolean);

      const typeMeta = CONFIG.PUNISHMENT_TYPES.find((t) => t.value === typeValue);
      if (!typeMeta) return interaction.editReply({ content: '❌ Unknown punishment type selected.' });

      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) return interaction.editReply({ content: '❌ Could not find that member in this server.' });

      const forumChannel = await interaction.guild.channels.fetch(CONFIG.PUNISHMENTS_FORUM_CHANNEL_ID).catch(() => null);
      if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
        return interaction.editReply({
          content: '❌ The configured Punishments forum channel could not be found. Check `PUNISHMENTS_FORUM_CHANNEL_ID` in the CONFIG block.',
        });
      }

      const caseId = generateCaseId();
      const issuedAt = Date.now();
      const durationMs = parseDurationToMs(duration);

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
        expiresAt: null,
        evidence: evidenceAttachments.map((a) => a.url),
        reviewedByIA: false,
        hubProcessed: false,
        rosterUpdated: false,
        acknowledged: false,
        acknowledgedAt: null,
        forumThreadId: null,
        forumMessageId: null,
        dmChannelId: null,
        dmMessageId: null,
      };

      const caseEmbed = buildCaseEmbed(caseData, targetMember, issuerMember, typeMeta);
      const evidenceEmbeds = buildEvidenceEmbeds(caseData.evidence);
      const actionRow = buildCaseActionRow(caseId);

      const thread = await forumChannel.threads.create({
        name: `Case ${caseId} — ${targetMember.displayName}`,
        message: { embeds: [caseEmbed, ...evidenceEmbeds], components: [actionRow] },
      });

      const starterMessage = await thread.fetchStarterMessage().catch(() => null);
      caseData.forumThreadId = thread.id;
      caseData.forumMessageId = starterMessage?.id ?? null;

      let dmSent = true;
      try {
        const dmEmbed = buildDmEmbed(caseData, typeMeta, interaction.guild.name);
        const dmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`punishment_ack_${caseId}`).setLabel('Acknowledge').setStyle(ButtonStyle.Success),
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
