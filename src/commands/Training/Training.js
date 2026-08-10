import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { successEmbed } from '../../utils/embeds.js';
import { replyUserError, ErrorTypes, handleInteractionError } from '../../utils/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { getTrainingConfig, updateTrainingConfig } from '../../utils/database/training.js';
import { buildPanelEmbed, buildPanelSelectRow } from '../../utils/training/trainingEmbeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('training')
        .setDescription('Minutes before a pending request expires (default: 120).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
            sub
                .setName('setup')
                .setDescription('Post the ride-along/training request panel in a channel.')
                .addChannelOption((opt) =>
                    opt
                        .setName('panel_channel')
                        .setDescription('Channel where the request panel (dropdown) will be posted.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addStringOption((opt) =>
                    opt
                        .setName('message')
                        .setDescription('Custom description text for the panel (optional).')
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName('config')
                .setDescription('Configure where requests are posted and which roles are pinged/eligible.')
                .addChannelOption((opt) =>
                    opt
                        .setName('request_channel')
                        .setDescription('Channel where submitted requests are posted for staff.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true),
                )
                .addRoleOption((opt) =>
                    opt
                        .setName('ftd_role')
                        .setDescription('Field Training Division role — pinged for ride-alongs, can Accept them.')
                        .setRequired(false),
                )
                .addRoleOption((opt) =>
                    opt
                        .setName('training_role')
                        .setDescription('Role pinged for Basic Training / Use of Force Retraining requests.')
                        .setRequired(false),
                )
                .addRoleOption((opt) =>
                    opt
                        .setName('sergeant_eligible_role')
                        .setDescription('Role required to request a Sergeant Ride Along.')
                        .setRequired(false),
                )
                .addRoleOption((opt) =>
                    opt
                        .setName('command_eligible_role')
                        .setDescription('Role required to request a Command Ride Along.')
                        .setRequired(false),
                )
                .addIntegerOption((opt) =>
                    opt
                        .setName('expiry_minutes')
                        .setDescription('Minutes before a pending request expires (default: 30).')
                        .setMinValue(5)
                        .setMaxValue(1440)
                        .setRequired(false),
                ),
        ),

    category: 'training',

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return replyUserError(interaction, {
                type: ErrorTypes.PERMISSION,
                message: 'You need the `Manage Server` permission for this action.',
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'config') {
                const requestChannel = interaction.options.getChannel('request_channel');
                const ftdRole = interaction.options.getRole('ftd_role');
                const trainingRole = interaction.options.getRole('training_role');
                const sergeantRole = interaction.options.getRole('sergeant_eligible_role');
                const commandRole = interaction.options.getRole('command_eligible_role');
                const expiryMinutes = interaction.options.getInteger('expiry_minutes');

                const updates = { requestChannelId: requestChannel.id };
                if (ftdRole) updates.ftdRoleId = ftdRole.id;
                if (trainingRole) updates.trainingRoleId = trainingRole.id;
                if (sergeantRole) updates.sergeantEligibleRoleId = sergeantRole.id;
                if (commandRole) updates.commandEligibleRoleId = commandRole.id;
                if (expiryMinutes) updates.expiryMinutes = expiryMinutes;

                const saved = await updateTrainingConfig(interaction.guildId, updates);

                logger.info('Training config updated', { guildId: interaction.guildId, userId: interaction.user.id, updates });

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [
                        successEmbed(
                            'Training Config Updated',
                            [
                                `**Request Channel:** ${requestChannel}`,
                                `**FTD Role:** ${saved.ftdRoleId ? `<@&${saved.ftdRoleId}>` : 'Not set'}`,
                                `**Training Role:** ${saved.trainingRoleId ? `<@&${saved.trainingRoleId}>` : 'Not set'}`,
                                `**Sergeant-Eligible Role:** ${saved.sergeantEligibleRoleId ? `<@&${saved.sergeantEligibleRoleId}>` : 'Not set'}`,
                                `**Command-Eligible Role:** ${saved.commandEligibleRoleId ? `<@&${saved.commandEligibleRoleId}>` : 'Not set'}`,
                                `**Expiry:** ${saved.expiryMinutes || 120} minutes`,
                            ].join('\n'),
                        ),
                    ],
                });
            }

            if (subcommand === 'setup') {
                const panelChannel = interaction.options.getChannel('panel_channel');
                const customMessage = interaction.options.getString('message');

                const existing = await getTrainingConfig(interaction.guildId);
                if (!existing.requestChannelId) {
                    return replyUserError(interaction, {
                        type: ErrorTypes.CONFIGURATION,
                        message: 'Run `/training config` first to set a request channel (and roles) before posting the panel.',
                    });
                }

                const sentPanel = await panelChannel.send({
                    embeds: [buildPanelEmbed(customMessage)],
                    components: [buildPanelSelectRow()],
                });

                await updateTrainingConfig(interaction.guildId, {
                    panelChannelId: panelChannel.id,
                    panelMessageId: sentPanel.id,
                });

                logger.info('Training panel set up', {
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    panelChannelId: panelChannel.id,
                });

                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [successEmbed('Training Panel Posted', `The ride-along/training request panel has been sent to ${panelChannel}.`)],
                });
            }
        } catch (error) {
            logger.error('Training command error', {
                error: error.message,
                stack: error.stack,
                guildId: interaction.guildId,
                subcommand,
            });
            return handleInteractionError(interaction, error, {
                commandName: 'training',
                source: 'training_command',
            });
        }
    },
};
