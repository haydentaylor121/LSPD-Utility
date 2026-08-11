import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

import {
  ACCENT_RED,
  APPEAL_CHANNEL_ID,
  buildStatusButtons,
  DM_BODY,
  FORUM_CHANNEL_ID,
  formatDate,
  generateCaseNumber,
  PUNISHMENTS,
  ROSTER_URL,
  SERVER_NAME,
} from '../../services/punishmentService.js';

const data = new SlashCommandBuilder()
  .setName('punish')
  .setDescription('Punishment management commands')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('issue')
      .setDescription('Issue a punishment to a member')
      .addUserOption((option) =>
        option
          .setName('member')
          .setDescription('The member to punish')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('punishment')
          .setDescription('The type of punishment to issue')
          .setRequired(true)
          .addChoices(
            ...Object.entries(PUNISHMENTS).map(
              ([value, punishment]) => ({
                name: punishment.label,
                value,
              }),
            ),
          ),
      )
      .addStringOption((option) =>
        option
          .setName('reason')
          .setDescription('Reason for the punishment')
          .setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName('length')
          .setDescription(
            'Length of the punishment, for example 14 Days',
          )
          .setRequired(true),
      )
      .addAttachmentOption((option) =>
        option
          .setName('evidence')
          .setDescription('Primary evidence attachment'),
      )
      .addStringOption((option) =>
        option
          .setName('note')
          .setDescription('Internal IA-only note'),
      )
      .addAttachmentOption((option) =>
        option
          .setName('evidence_2')
          .setDescription('Additional evidence attachment'),
      )
      .addAttachmentOption((option) =>
        option
          .setName('evidence_3')
          .setDescription('Additional evidence attachment'),
      )
      .addAttachmentOption((option) =>
        option
          .setName('evidence_4')
          .setDescription('Additional evidence attachment'),
      )
      .addStringOption((option) =>
        option
          .setName('evidence_link')
          .setDescription('External evidence link'),
      )
      .addBooleanOption((option) =>
        option
          .setName('dm_member')
          .setDescription(
            'Whether the punished member should receive a DM',
          ),
      )
      .addStringOption((option) =>
        option
          .setName('demotion')
          .setDescription('New rank for a demotion'),
      )
      .addStringOption((option) =>
        option
          .setName('alternative')
          .setDescription('Alternative punishment description'),
      ),
  )
  .setDefaultMemberPermissions(
    PermissionFlagsBits.ModerateMembers,
  );

async function execute(interaction) {
  if (interaction.options.getSubcommand() !== 'issue') return;

  await interaction.deferReply({ ephemeral: true });

  const member = interaction.options.getUser('member');
  const punishmentKey =
    interaction.options.getString('punishment');
  const punishment = PUNISHMENTS[punishmentKey];
  const reason = interaction.options.getString('reason');
  const length = interaction.options.getString('length');
  const evidence =
    interaction.options.getAttachment('evidence');
  const evidence2 =
    interaction.options.getAttachment('evidence_2');
  const evidence3 =
    interaction.options.getAttachment('evidence_3');
  const evidence4 =
    interaction.options.getAttachment('evidence_4');
  const evidenceLink =
    interaction.options.getString('evidence_link');
  const note = interaction.options.getString('note');
  const dmMember =
    interaction.options.getBoolean('dm_member') ?? true;
  const demotionRank =
    interaction.options.getString('demotion');
  const alternativeDescription =
    interaction.options.getString('alternative');

  const guild = interaction.guild;
  const issuer = interaction.user;
  const caseNumber = generateCaseNumber();

  let roleApplied = 'None';

  if (punishment.roleId) {
    const role = await guild.roles
      .fetch(punishment.roleId)
      .catch(() => null);

    const targetMember = await guild.members
      .fetch(member.id)
      .catch(() => null);

    if (role && targetMember) {
      try {
        await targetMember.roles.add(role);
        roleApplied = role.name;
      } catch (error) {
        roleApplied = `Failed: ${error.message}`;
      }
    }
  }

  const evidenceAttachments = [
    evidence,
    evidence2,
    evidence3,
    evidence4,
  ].filter(Boolean);

  const forumEmbed = new EmbedBuilder()
    .setTitle(`LSPD Punishment - Case ${caseNumber}`)
    .setColor(ACCENT_RED)
    .setThumbnail(
      member.displayAvatarURL({
        extension: 'png',
        size: 128,
      }),
    )
    .addFields(
      {
        name: 'Member',
        value: `${member} (${member.id})`,
        inline: false,
      },
      {
        name: 'Issued by',
        value: `${issuer} (${issuer.id})`,
        inline: false,
      },
      {
        name: 'Issued',
        value: formatDate(new Date()),
        inline: false,
      },
      {
        name: 'Punishment Issued',
        value: punishment.label
          .split(' | ')[0]
          .toUpperCase(),
        inline: false,
      },
      {
        name: 'Reason',
        value: reason,
        inline: false,
      },
      {
        name: 'Active For',
        value: length,
        inline: true,
      },
      {
        name: 'Expires',
        value: 'Starts after member acknowledges',
        inline: true,
      },
    );

  if (punishmentKey === 'demotion' && demotionRank) {
    forumEmbed.addFields({
      name: 'Demoted To',
      value: demotionRank,
      inline: false,
    });
  }

  if (
    punishmentKey === 'alternative' &&
    alternativeDescription
  ) {
    forumEmbed.addFields({
      name: 'Alternative Punishment',
      value: alternativeDescription,
      inline: false,
    });
  }

  if (roleApplied !== 'None') {
    forumEmbed.addFields({
      name: 'Role Applied',
      value: roleApplied,
      inline: true,
    });
  }

  if (note) {
    forumEmbed.addFields({
      name: '🔒 Internal Note (IA only)',
      value: note,
      inline: false,
    });
  }

  const evidenceLines = evidenceAttachments.map(
    (attachment, index) =>
      `[Evidence ${index + 1}](${attachment.url})`,
  );

  if (evidenceLink) {
    evidenceLines.push(`[External Link](${evidenceLink})`);
  }

  if (evidenceLines.length > 0) {
    forumEmbed.addFields({
      name: 'Evidence',
      value: evidenceLines.join('\n'),
      inline: false,
    });
  }

  if (evidence) {
    forumEmbed.setImage(evidence.url);
  }

  if (ROSTER_URL) {
    forumEmbed.addFields({
      name: '\u200B',
      value: `[🔗 Roster](${ROSTER_URL})`,
      inline: false,
    });
  }

  forumEmbed
    .setFooter({
      text: `LSPD Utility • Case ${caseNumber}`,
    })
    .setTimestamp();

  const forumChannel = await guild.channels
    .fetch(FORUM_CHANNEL_ID)
    .catch(() => null);

  if (
    !forumChannel ||
    forumChannel.type !== ChannelType.GuildForum
  ) {
    await interaction.editReply(
      '❌ Forum channel not found or is not a Forum channel.',
    );
    return;
  }

  const statusButtons = buildStatusButtons({
    r: false,
    p: false,
    u: false,
  });

  const punishmentName = punishment.label.split(' | ')[0];
  const threadName =
    `${punishmentName} — ${member.username} — ${caseNumber}`;

  const thread = await forumChannel.threads.create({
    name: threadName.slice(0, 100),
    message: {
      embeds: [forumEmbed],
      components: [statusButtons],
    },
    reason: `Punishment issued by ${issuer.tag}`,
  });

  const starterMessage = await thread
    .fetchStarterMessage()
    .catch(() => null);

  const forumMessageId =
    starterMessage?.id || thread.id;

  let dmSent = false;

  if (dmMember) {
    const dmEmbed = new EmbedBuilder()
      .setTitle('LSPD Punishment Memorandum')
      .setColor(ACCENT_RED)
      .addFields(
        {
          name: 'Member',
          value: `${member}`,
          inline: true,
        },
        {
          name: 'Issued by',
          value: `${issuer}`,
          inline: true,
        },
        {
          name: 'Punishment',
          value: punishmentName.toUpperCase(),
          inline: true,
        },
        {
          name: 'Length',
          value: length,
          inline: true,
        },
        {
          name: 'Case Number',
          value: caseNumber,
          inline: true,
        },
        {
          name: 'Expires',
          value: `${length} after you acknowledge the punishment`,
          inline: true,
        },
        {
          name: 'Reason',
          value: reason,
          inline: false,
        },
        {
          name: '\u200B',
          value: DM_BODY,
          inline: false,
        },
      )
      .setFooter({
        text: `Message from server: ${SERVER_NAME}`,
      })
      .setTimestamp();

    const acknowledgeButton = new ButtonBuilder()
      .setCustomId(
        `punishment_ack:${thread.id}:${forumMessageId}`,
      )
      .setLabel('Acknowledge')
      .setStyle(ButtonStyle.Success);

    const appealButton = new ButtonBuilder()
      .setLabel('Appeal')
      .setStyle(ButtonStyle.Link)
      .setURL(
        `https://discord.com/channels/${guild.id}/${APPEAL_CHANNEL_ID}`,
      );

    const dmButtons = new ActionRowBuilder().addComponents(
      acknowledgeButton,
      appealButton,
    );

    try {
      await member.send({
        embeds: [dmEmbed],
        components: [dmButtons],
      });

      dmSent = true;
    } catch (error) {
      console.log(
        `Could not DM ${member.tag}: ${error.message}`,
      );
    }
  }

  await interaction.editReply(
    `✅ Punishment **${punishmentName}** issued to ${member}.\n` +
      `📄 Forum log: ${thread.url}\n` +
      (dmSent
        ? '✉️ Member DM sent.'
        : '⚠️ Could not DM member.'),
  );
}

export default {
  data,
  category: 'LSPD',
  execute,
};
