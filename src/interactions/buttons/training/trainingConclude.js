import { MessageFlags } from 'discord.js';
import { errorEmbed } from '../../../utils/embeds.js';
import { logger } from '../../../utils/logger.js';
import { getTrainingConfig, getTrainingRequest, saveTrainingRequest, TRAINING_TYPES } from '../../../utils/database/training.js';
import { buildRequestEmbed, buildRequestButtons } from '../../../utils/training/trainingEmbeds.js';

export default {
    name: 'training_conclude',

    async execute(interaction, client, args) {
        const [requestId] = args;

        const request = await getTrainingRequest(interaction.guildId, requestId);

        if (!request) {
            return interaction.reply({
                embeds: [errorEmbed('Not Found', 'This request no longer exists.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        if (request.status === 'concluded' || request.status === 'expired') {
            return interaction.reply({
                embeds: [errorEmbed('Already Handled', `This request has already been marked **${request.status}**.`)],
                flags: MessageFlags.Ephemeral,
            });
        }

        const trainingConfig = await getTrainingConfig(interaction.guildId);
        const typeMeta = TRAINING_TYPES[request.type];
        const eligibleRoleId = typeMeta ? trainingConfig[typeMeta.roleConfigKey] : null;

        const isAssignedInstructor = request.instructorId === interaction.user.id;
        const isRequester = request.requesterId === interaction.user.id;
        const hasEligibleRole = eligibleRoleId && interaction.member.roles.cache.has(eligibleRoleId);

        if (!isAssignedInstructor && !hasEligibleRole && !isRequester) {
            return interaction.reply({
                embeds: [errorEmbed('Not Allowed', 'Only the assigned instructor, an eligible staff member, or the requester can conclude this request.')],
                flags: MessageFlags.Ephemeral,
            });
        }

        request.status = 'concluded';
        request.concludedBy = interaction.user.id;
        await saveTrainingRequest(interaction.guildId, requestId, request);

        logger.info('Training request concluded', {
            guildId: interaction.guildId,
            requestId,
            concludedBy: interaction.user.id,
        });

        await interaction.update({
            embeds: [buildRequestEmbed(request)],
            components: [buildRequestButtons(request)],
        });

        return interaction.followUp({
            content: `This request has been concluded by ${interaction.user}.`,
        }).catch(() => {});
    },
};
