/**
 * src/interactions/buttons/punishment/punishment.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all /punishment button interactions.
 *
 * Button customId format:  <name>:<caseId>
 *   pun_ack:<caseId>    — Officer acknowledges their DM notice
 *   pun_ia:<caseId>     — IA/HC marks case as reviewed
 *   pun_hub:<caseId>    — Hub admin marks case as processed
 *   pun_roster:<caseId> — Roster manager marks roster as updated
 *
 * The bot's interactionCreate does:
 *   const [name, ...args] = interaction.customId.split(':');
 *   const button = client.buttons.get(name);
 *   await button.execute(interaction, client, args);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import {
  getCase,
  updateCase,
  buildDisciplinaryEmbed,
  PUNISHMENT_CONFIG,
} from '../../../commands/Moderation/punishment.js';
import { logger } from '../../../utils/logger.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function memberHasAnyRole(member, roleIds) {
  if (!member) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

async function ephemeralReply(interaction, content) {
  try {
    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content, flags: MessageFlags.Ephemeral });
  } catch {
    // Interaction may have expired
  }
}

// ── Acknowledge handler (officer clicks button in DM) ─────────────────────────

async function handleAcknowledge(interaction, caseId, client) {
  const record = await getCase(caseId);
  if (!record) return ephemeralReply(interaction, '❌ Could not find this punishment record.');

  if (interaction.user.id !== record.targetId) {
    return ephemeralReply(interaction, '❌ Only the officer who received this notice can acknowledge it.');
  }
  if (record.isAcknowledged) {
    return ephemeralReply(interaction, '⚠️ You have already acknowledged this notice.');
  }

  const now = Date.now();
  const updated = await updateCase(caseId, { isAcknowledged: true, acknowledgedAt: now });
  if (!updated) return ephemeralReply(interaction, '❌ Failed to update the record. Please try again.');

  // Rebuild the embed with the ✅ Acknowledged field filled in
  try {
    const guild = await client.guilds.fetch(record.guildId).catch(() => null);
    if (guild) {
      const member = await guild.members.fetch(record.targetId).catch(() => null);
      if (member) {
        const newEmbed = buildDisciplinaryEmbed({
          member,
          caseId: record.caseId,
          punishmentType: record.punishmentType,
          reason: record.reason,
          additionalInfo: record.additionalInfo,
          issuedAt: record.issuedAt,
          expiresAt: record.expiresAt,
          isPermanent: record.isPermanent,
          isAcknowledged: true,
          acknowledgedAt: now,
          guild,
        });

        // Update the DM message: swap in the updated embed, remove the button
        await interaction.update({ embeds: [newEmbed], components: [] });

        // Post acknowledgement notice in the forum thread
        if (record.forumThreadId) {
          try {
            const thread = await guild.channels.fetch(record.forumThreadId).catch(() => null);
            if (thread) {
              const ackEmbed = new EmbedBuilder()
                .setColor(0x22c55e)
                .setTitle('✅ Notice Acknowledged')
                .setDescription(
                  `<@${record.targetId}> acknowledged their disciplinary notice on <t:${Math.floor(now / 1000)}:F>.`,
                )
                .setTimestamp();
              await thread.send({ embeds: [ackEmbed] });
            }
          } catch (err) {
            logger.warn('[punishment] Could not post ack notice to forum thread', { error: err.message });
          }
        }

        logger.info('[punishment] Officer acknowledged notice', { caseId, userId: record.targetId });
        return;
      }
    }
  } catch (err) {
    logger.error('[punishment] Error during acknowledge update', { error: err.message });
  }

  // Fallback
  await interaction.update({ content: '✅ You have acknowledged this disciplinary notice.', components: [] });
}

// ── Helper: rebuild the staff button row with completed items disabled ─────────

function buildUpdatedStaffRow(caseId, record) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`pun_ia:${caseId}`)
      .setLabel('✅ Reviewed by IA/HC')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!!record.reviewedByIA),
    new ButtonBuilder()
      .setCustomId(`pun_hub:${caseId}`)
      .setLabel('🏢 Hub Processed')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!!record.hubProcessed),
    new ButtonBuilder()
      .setCustomId(`pun_roster:${caseId}`)
      .setLabel('📋 Roles & Roster Updated')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!!record.rosterUpdated),
    new ButtonBuilder()
      .setURL(PUNISHMENT_CONFIG.ROSTER_URL)
      .setLabel('📄 Open Roster')
      .setStyle(ButtonStyle.Link),
  );
}

function buildStatusEmbed(record) {
  const lines = [];
  if (record.reviewedByIA) {
    lines.push(`✅ Reviewed by IA/HC — <@${record.reviewedByIAId}> (<t:${Math.floor(record.reviewedByIAAt / 1000)}:R>)`);
  }
  if (record.hubProcessed) {
    lines.push(`🏢 Hub Processed — <@${record.hubProcessedById}> (<t:${Math.floor(record.hubProcessedAt / 1000)}:R>)`);
  }
  if (record.rosterUpdated) {
    lines.push(`📋 Roster Updated — <@${record.rosterUpdatedById}> (<t:${Math.floor(record.rosterUpdatedAt / 1000)}:R>)`);
  }
  return new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('📊 Processing Status')
    .setDescription(lines.length > 0 ? lines.join('\n') : '*No actions completed yet.*')
    .setTimestamp();
}

// ── IA/HC Reviewed ────────────────────────────────────────────────────────────

async function handleIAReview(interaction, caseId) {
  if (!memberHasAnyRole(interaction.member, PUNISHMENT_CONFIG.1521622449760895156,1521628516930814083)) {
    return ephemeralReply(interaction, '❌ You need the IA/HC role to use this button.');
  }

  const record = await getCase(caseId);
  if (!record) return ephemeralReply(interaction, '❌ Could not find this punishment record.');
  if (record.reviewedByIA) return ephemeralReply(interaction, '⚠️ Already marked as reviewed by IA/HC.');

  const now = Date.now();
  const updated = await updateCase(caseId, {
    reviewedByIA: true,
    reviewedByIAAt: now,
    reviewedByIAId: interaction.user.id,
  });

  const row = buildUpdatedStaffRow(caseId, updated);
  const statusEmbed = buildStatusEmbed(updated);

  await interaction.update({ components: [row] });
  await interaction.followUp({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });

  logger.info('[punishment] Marked as reviewed by IA/HC', { caseId, userId: interaction.user.id });
}

// ── Hub Processed ────────────────────────────────────────────────────────────

async function handleHubProcessed(interaction, caseId) {
  if (!memberHasAnyRole(interaction.member, PUNISHMENT_CONFIG.HUB_ROLE_IDS)) {
    return ephemeralReply(interaction, '❌ You need the Hub role to use this button.');
  }

  const record = await getCase(caseId);
  if (!record) return ephemeralReply(interaction, '❌ Could not find this punishment record.');
  if (record.hubProcessed) return ephemeralReply(interaction, '⚠️ Already marked as Hub Processed.');

  const now = Date.now();
  const updated = await updateCase(caseId, {
    hubProcessed: true,
    hubProcessedAt: now,
    hubProcessedById: interaction.user.id,
  });

  const row = buildUpdatedStaffRow(caseId, updated);
  const statusEmbed = buildStatusEmbed(updated);

  await interaction.update({ components: [row] });
  await interaction.followUp({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });

  logger.info('[punishment] Marked as hub processed', { caseId, userId: interaction.user.id });
}

// ── Roles & Roster Updated ────────────────────────────────────────────────────

async function handleRosterUpdated(interaction, caseId) {
  if (!memberHasAnyRole(interaction.member, PUNISHMENT_CONFIG.1521628800842993684, 1526498908929392691)) {
    return ephemeralReply(interaction, '❌ You need the Roster Manager role to use this button.');
  }

  const record = await getCase(caseId);
  if (!record) return ephemeralReply(interaction, '❌ Could not find this punishment record.');
  if (record.rosterUpdated) return ephemeralReply(interaction, '⚠️ Already marked as Roles & Roster Updated.');

  const now = Date.now();
  const updated = await updateCase(caseId, {
    rosterUpdated: true,
    rosterUpdatedAt: now,
    rosterUpdatedById: interaction.user.id,
  });

  const row = buildUpdatedStaffRow(caseId, updated);
  const statusEmbed = buildStatusEmbed(updated);

  await interaction.update({ components: [row] });
  await interaction.followUp({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });

  logger.info('[punishment] Marked as roster updated', { caseId, userId: interaction.user.id });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export — array of handler objects (name + execute)
// The interactions loader registers each by handler.name in client.buttons
// interactionCreate calls: execute(interaction, client, args)
//   where args = interaction.customId.split(':').slice(1) = [caseId]
// ═══════════════════════════════════════════════════════════════════════════════

export default [
  {
    name: 'pun_ack',
    async execute(interaction, client, args) {
      await handleAcknowledge(interaction, args[0], client);
    },
  },
  {
    name: 'pun_ia',
    async execute(interaction, client, args) {
      await handleIAReview(interaction, args[0]);
    },
  },
  {
    name: 'pun_hub',
    async execute(interaction, client, args) {
      await handleHubProcessed(interaction, args[0]);
    },
  },
  {
    name: 'pun_roster',
    async execute(interaction, client, args) {
      await handleRosterUpdated(interaction, args[0]);
    },
  },
];
;
