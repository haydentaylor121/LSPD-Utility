import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { getTrainingConfig, getTrainingRequest, saveTrainingRequest, TRAINING_TYPES } from '../../../utils/database/training.js';
import { buildRequestEmbed, buildRequestButtons } from '../../../utils/training/trainingEmbeds.js';
import { expireTrainingRequest, sendTrainingAcceptedDm } from '../../../utils/training/trainingRequestLifecycle.js';

export default {
    name: 'training_accept',

    async execute(interaction, client, args) {
        const [requestId] = args;

        const request = await getTrainingRequest(interaction.guildId, requestId);

        if (!request) {
            return interaction.reply({
                embeds: [errorEmbed('Not Found', 'This request no longer exists.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (request.status !== 'pending') {
            return interaction.reply({
                embeds: [errorEmbed('Already Handled', `This request has already been marked **${request.status}**.`)],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (Date.now() > request.expiresAt) {
            await expireTrainingRequest(client, request);
            await interaction.update({
                embeds: [buildRequestEmbed({ ...request, status: 'expired' })],
                components: [buildRequestButtons({ ...request, status: 'expired' })],
            }).catch(() => {});
            return interaction.followUp({
                embeds: [errorEmbed('Expired', 'This request has expired.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        const trainingConfig = await getTrainingConfig(interaction.guildId);
        const typeMeta = TRAINING_TYPES[request.type];
        const requiredRoleId = typeMeta ? trainingConfig[typeMeta.roleConfigKey] : null;

        if (requiredRoleId && !interaction.member.roles.cache.has(requiredRoleId)) {
            return interaction.reply({
                embeds: [errorEmbed('Not Allowed', `You need the <@&${requiredRoleId}> role to accept this request.`)],
                flags: MessageFlags.Ephemeral,
            });
        }

        request.status = 'accepted';
        request.instructorId = interaction.user.id;
        await saveTrainingRequest(interaction.guildId, requestId, request);

        logger.info('Training request accepted', {
            guildId: interaction.guildId,
            requestId,
            instructorId: interaction.user.id,
        });

        await interaction.update({
            embeds: [buildRequestEmbed(request)],
            components: [buildRequestButtons(request)],
        });

        await sendTrainingAcceptedDm(client, request.requesterId, typeMeta?.label || request.type);

        return interaction.followUp({
            content: 'Request accepted and requester notified.',
            flags: MessageFlags.Ephemeral,
        }).catch(() => {});
    },
};
