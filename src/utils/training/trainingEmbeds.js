// trainingEmbeds.js — builds the panel embed and the request-card embed/buttons.

import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { getColor } from '../../config/bot.js';
import { TRAINING_TYPES } from '../database/training.js';

export const TRAINING_SELECT_CUSTOM_ID = 'training_request_select';

const STATUS_META = {
    pending: { label: '⏳ Pending', color: getColor('warning') },
    accepted: { label: '🟢 Accepted', color: getColor('info') },
    concluded: { label: '✅ Concluded', color: getColor('success') },
    expired: { label: '⌛ Expired', color: getColor('gray', '#99AAB5') },
};

export function buildPanelEmbed(customMessage) {
    const description = customMessage
        ? customMessage
        : 'Welcome to the training request system!\n\nTo request a training, use the dropdown below to select the type of training you need.';

    return new EmbedBuilder()
        .setTitle('Ride-Along & Training Requests')
        .setDescription(description)
        .addFields({
            name: 'Options Available',
            value: Object.values(TRAINING_TYPES).map((t) => `• ${t.label}`).join('\n'),
        })
        .setColor(getColor('info'))
        .setFooter({ text: 'Use the dropdown below to get started.' });
}

export function buildPanelSelectRow() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(TRAINING_SELECT_CUSTOM_ID)
        .setPlaceholder('Select a Ride-Along or Training to request...')
        .addOptions(
            Object.entries(TRAINING_TYPES).map(([value, meta]) => ({
                label: meta.label,
                description: meta.description,
                value,
                emoji: meta.emoji,
            })),
        );

    return new ActionRowBuilder().addComponents(menu);
}

export function buildRequestEmbed(request) {
    const typeMeta = TRAINING_TYPES[request.type];
    const statusMeta = STATUS_META[request.status] || STATUS_META.pending;
    const expiresUnix = Math.floor(request.expiresAt / 1000);

    const embed = new EmbedBuilder()
        .setTitle('LSPD Request')
        .setColor(statusMeta.color)
        .addFields(
            { name: 'Requester', value: `<@${request.requesterId}>`, inline: false },
            { name: 'Requested', value: typeMeta?.label || request.type, inline: false },
            { name: 'Status', value: statusMeta.label, inline: false },
            {
                name: 'Expires',
                value: request.status === 'pending' ? `<t:${expiresUnix}:R>` : '—',
                inline: false,
            },
        )
        .setTimestamp(request.createdAt);

    if (request.instructorId) {
        embed.addFields({ name: 'Instructor', value: `<@${request.instructorId}>`, inline: false });
    }

    return embed;
}

export function buildRequestButtons(request) {
    const isPending = request.status === 'pending';
    const isAccepted = request.status === 'accepted';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`training_accept:${request.id}`)
            .setLabel('Accept')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isPending),
        new ButtonBuilder()
            .setCustomId(`training_conclude:${request.id}`)
            .setLabel('Conclude')
            .setEmoji('🎓')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!(isPending || isAccepted)),
    );
}
