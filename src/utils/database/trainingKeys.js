// trainingKeys.js — canonical storage keys for the ride-along/training feature.

export function getTrainingConfigKey(guildId) {
    return `guild:${guildId}:training:config`;
}

export function getTrainingRequestKey(guildId, requestId) {
    return `guild:${guildId}:training:request:${requestId}`;
}

export function getTrainingRequestsPrefix(guildId) {
    return `guild:${guildId}:training:request:`;
}
