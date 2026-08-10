import { logger } from '../logger.js';
import { saveTrainingRequest, TRAINING_TYPES } from '../database/training.js';
import {
    buildAcceptedDmEmbed,
    buildExpiredDmEmbed,
    buildRequestButtons,
    buildRequestEmbed,
    buildSubmissionDmEmbed,
} from './trainingEmbeds.js';

async function sendTrainingDm(client, userId, embed, context) {
    try {
        const user = await client.users.fetch(userId);
        await user.send({ embeds: [embed] });
        return true;
    } catch (error) {
        logger.warn(`Unable to send ${context} DM`, {
            userId,
            error: error.message,
        });
        return false;
    }
}

export async function sendTrainingSubmittedDm(client, userId, typeLabel) {
    return sendTrainingDm(client, userId, buildSubmissionDmEmbed(typeLabel), 'training submission');
}

export async function sendTrainingAcceptedDm(client, userId, typeLabel) {
    return sendTrainingDm(client, userId, buildAcceptedDmEmbed(typeLabel), 'training acceptance');
}

export async function sendTrainingExpiredDm(client, userId) {
    return sendTrainingDm(client, userId, buildExpiredDmEmbed(userId), 'training expiry');
}

export async function syncTrainingRequestMessage(client, request) {
    if (!request.channelId || !request.messageId) {
        return false;
    }

    try {
        const channel = await client.channels.fetch(request.channelId);
        if (!channel?.isTextBased?.()) {
            return false;
        }

        const message = await channel.messages.fetch(request.messageId);
        if (!message) {
            return false;
        }

        await message.edit({
            embeds: [buildRequestEmbed(request)],
            components: [buildRequestButtons(request)],
        });

        return true;
    } catch (error) {
        logger.warn('Unable to sync training request message', {
            guildId: request.guildId,
            requestId: request.id,
            channelId: request.channelId,
            messageId: request.messageId,
            error: error.message,
        });
        return false;
    }
}

export async function expireTrainingRequest(client, request, reason = 'Automatic time out after 2 hours from request') {
    if (!request || request.status !== 'pending') {
        return false;
    }

    request.status = 'expired';
    request.expiredAt = Date.now();
    request.expireReason = reason;

    await saveTrainingRequest(request.guildId, request.id, request);
    await syncTrainingRequestMessage(client, request);
    await sendTrainingExpiredDm(client, request.requesterId);

    logger.info('Training request expired', {
        guildId: request.guildId,
        requestId: request.id,
        requesterId: request.requesterId,
        type: TRAINING_TYPES[request.type]?.label || request.type,
        reason,
    });

    return true;
}
