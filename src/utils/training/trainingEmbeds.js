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
        : [
            'Welcome to the Los Santos Police Department training request system!',
            '',
            'To request a training, use the dropdown below to select the type of training you need.',
            '',
            'Options Avalible',
            'Basic Training',
            'Use of Force Retraining',
            'Basic Ride Along',
            'Sergeant Ride Along',
            'Command Ride Along',
            '',
            'Note: Some ride-alongs may require specific roles. Only ride-alongs you are eligible for will appear in the dropdown.',
            '',
            'If you feel that your instructor was misbehaving please open an internal affairs report in Tickets',
            '',
            'Use the dropdown below to get started!',
        ].join('\n');

    return new EmbedBuilder()
        .setTitle('LSPD | Ride-Along & Training Requests')
        .setDescription(description)
        .setColor(getColor('info'));
}

export function buildPanelSelectRow() {
    const menu = new StringSelectMenuBuilder()
        .setCustomId(TRAINING_SELECT_CUSTOM_ID)
        .setPlaceholder('Select a training request...')
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
            { name: 'Requester', value: `<@${request.requesterId}> (${request.requesterId})`, inline: false },
            { name: 'Requested', value: typeMeta?.label || request.type, inline: false },
            { name: 'Status', value: statusMeta.label, inline: false },
            {
                name: 'Expires',
                value: request.status === 'pending' ? `<t:${expiresUnix}:R>` : 'Expired or handled',
                inline: false,
            },
        );

    if (request.instructorId) {
        embed.addFields({ name: 'Instructor', value: `<@${request.instructorId}>`, inline: false });
    }

    return embed;
}

export function buildRequestButtons(request) {
    const isPending = request.status === 'pending';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`training_accept:${request.id}`)
            .setLabel('Accept')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success)
            .setDisabled(!isPending),
    );
}

export function buildSubmissionDmEmbed(typeLabel) {
    return new EmbedBuilder()
        .setTitle('Training Request Submitted')
        .setDescription(`Your training request for **${typeLabel}** has been submitted successfully.`)
        .setColor(getColor('success'));
}

export function buildAcceptedDmEmbed(typeLabel) {
    return new EmbedBuilder()
        .setTitle('Training Request Accepted')
        .setDescription(`Your training request for **${typeLabel}** has been accepted please attend the training.`)
        .setColor(getColor('success'));
}

export function buildExpiredDmEmbed(requesterId) {
    return new EmbedBuilder()
        .setTitle('LSPD Request Update')
        .setDescription(
            `Hello <@${requesterId}>! Your request from 2 hours ago has been canceled.\n\nReason: Automatic time out after 2 hours from request\n\nPlease make another request.`,
        )
        .setColor(getColor('warning'));
}
