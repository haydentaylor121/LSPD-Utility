// training.js — data access for the Ride-Along & Training Request feature.

import { logger } from '../logger.js';
import { db } from './wrapper.js';
import { getTrainingConfigKey, getTrainingRequestKey, getTrainingRequestsPrefix } from './trainingKeys.js';

export const TRAINING_DEFAULTS = {
    requestChannelId: '1525941201847713932',
    ftdRoleId: '1524811810119876728',
    trainingRoleId: '1524811810119876728',
    expiryMinutes: 120,
};

// Requestable training/ride-along types shown in the panel dropdown.
// `roleConfigKey` points at the guild-config field holding the role ID that
// should be pinged + is allowed to Accept requests of this type.
export const TRAINING_TYPES = {
    basic_ridealong: {
        label: 'Basic Ride Along',
        description: 'Request a basic ride-along.',
        emoji: '🚓',
        roleConfigKey: 'ftdRoleId',
    },
    use_of_force_retraining: {
        label: 'Use of Force Retraining',
        description: 'Request a use of force retraining session.',
        emoji: '⚖️',
        roleConfigKey: 'trainingRoleId',
    },
    basic_training: {
        label: 'Basic Training',
        description: 'Request a basic training session.',
        emoji: '📘',
        roleConfigKey: 'trainingRoleId',
    },
    sergeant_ridealong: {
        label: 'Sergeant Ride Along',
        description: 'Request a ride-along with a Sergeant.',
        emoji: '🚓',
        roleConfigKey: 'ftdRoleId',
        requiredRoleConfigKey: 'sergeantEligibleRoleId',
    },
    command_ridealong: {
        label: 'Command Ride Along',
        description: 'Request a ride-along with Command staff.',
        emoji: '🚓',
        roleConfigKey: 'ftdRoleId',
        requiredRoleConfigKey: 'commandEligibleRoleId',
    },
};

async function ensureReady() {
    if (!db.initialized) {
        await db.initialize();
    }
}

function normalizeTrainingConfig(config = {}) {
    const sanitizedConfig = Object.fromEntries(
        Object.entries(config).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    );

    return {
        ...TRAINING_DEFAULTS,
        ...sanitizedConfig,
    };
}

export async function getTrainingConfig(guildId) {
    await ensureReady();
    const config = await db.get(getTrainingConfigKey(guildId));
    return normalizeTrainingConfig(config || {});
}

export async function saveTrainingConfig(guildId, config) {
    await ensureReady();
    await db.set(getTrainingConfigKey(guildId), config);
    return config;
}

export async function updateTrainingConfig(guildId, updates) {
    const current = await getTrainingConfig(guildId);
    const merged = { ...current, ...updates };
    await saveTrainingConfig(guildId, merged);
    return merged;
}

export async function getTrainingRequest(guildId, requestId) {
    await ensureReady();
    return await db.get(getTrainingRequestKey(guildId, requestId));
}

export async function saveTrainingRequest(guildId, requestId, data) {
    await ensureReady();
    await db.set(getTrainingRequestKey(guildId, requestId), data);
    return data;
}

export async function deleteTrainingRequest(guildId, requestId) {
    await ensureReady();
    await db.delete(getTrainingRequestKey(guildId, requestId));
}

export async function listTrainingRequests(guildId) {
    await ensureReady();

    if (typeof db.list !== 'function') {
        return [];
    }

    try {
        const keys = await db.list(getTrainingRequestsPrefix(guildId));
        const requests = await Promise.all(
            (keys || []).map(async (key) => {
                try {
                    return await db.get(key);
                } catch (err) {
                    logger.warn('training: failed to load request during list', { guildId, key, error: err.message });
                    return null;
                }
            }),
        );
        return requests.filter(Boolean);
    } catch (err) {
        logger.warn('training: failed to list requests', { guildId, error: err.message });
        return [];
    }
}
