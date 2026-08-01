import { MessageFlags } from 'discord.js';
import { randomUUID } from 'crypto';
import { InteractionHelper } from '../../../utils/interactionHelper.js';
import { errorEmbed, successEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { getTrainingConfig, saveTrainingRequest, TRAINING_TYPES } from '../../../utils/database/training.js';
import { buildRequestEmbed, buildRequestButtons, TRAINING_SELECT_CUSTOM_ID } from '../../../utils/training/trainingEmbeds.js';

export default {
    name: TRAINING_SELECT_CUSTOM_ID,

    async execute(interaction, client) {
        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) return;

        const typeKey = interaction.values[0];
        const typeMeta = TRAINING_TYPES[typeKey];

        if (!typeMeta) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Unknown Option', 'That request type is no longer available.')],
            });
        }

        const trainingConfig = await getTrainingConfig(interaction.guildId);

        if (!trainingConfig.requestChannelId) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Not Configured', 'This server has not finished setting up the training system yet. Please contact an admin.')],
            });
        }

        // Eligibility gate for ride-alongs that require a specific role (e.g. Sergeant/Command).
        if (typeMeta.requiredRoleConfigKey) {
            const requiredRoleId = trainingConfig[typeMeta.requiredRoleConfigKey];
            if (requiredRoleId && !interaction.member.roles.cache.has(requiredRoleId)) {
                return InteractionHelper.safeEditReply(interaction, {
                    embeds: [errorEmbed('Not Eligible', `You are not eligible to request **${typeMeta.label}**.`)],
                });
            }
        }

        const pingRoleId = trainingConfig[typeMeta.roleConfigKey];
        const requestChannel = interaction.guild.channels.cache.get(trainingConfig.requestChannelId);

        if (!requestChannel) {
            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Configuration Error', 'The configured request channel could not be found. Please contact an admin.')],
            });
        }

        const expiryMinutes = trainingConfig.expiryMinutes || 30;
        const request = {
            id: randomUUID().slice(0, 8),
            guildId: interaction.guildId,
            requesterId: interaction.user.id,
            type: typeKey,
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + expiryMinutes * 60 * 1000,
            instructorId: null,
            channelId: requestChannel.id,
            messageId: null,
        };

        try {
            const sentMessage = await requestChannel.send({
                content: pingRoleId ? `<@&${pingRoleId}>` : null,
                embeds: [buildRequestEmbed(request)],
                components: [buildRequestButtons(request)],
            });

            request.messageId = sentMessage.id;
            await saveTrainingRequest(interaction.guildId, request.id, request);

            logger.info('Training request submitted', {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                requestId: request.id,
                type: typeKey,
            });

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [successEmbed('Request Submitted', `Your request for **${typeMeta.label}** has been sent to ${requestChannel}.`)],
            });
        } catch (error) {
            logger.error('Failed to submit training request', {
                error: error.message,
                guildId: interaction.guildId,
                userId: interaction.user.id,
                type: typeKey,
            });

            return InteractionHelper.safeEditReply(interaction, {
                embeds: [errorEmbed('Failed to Submit', 'Something went wrong posting your request. Check the bot\'s permissions in the request channel.')],
            });
        }
    },
};
