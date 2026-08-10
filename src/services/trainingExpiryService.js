import { logger } from '../utils/logger.js';
import { listTrainingRequests } from '../utils/database/training.js';
import { expireTrainingRequest } from '../utils/training/trainingRequestLifecycle.js';

export async function checkTrainingRequestExpiries(client) {
    for (const guild of client.guilds.cache.values()) {
        try {
            const requests = await listTrainingRequests(guild.id);

            for (const request of requests) {
                if (!request || request.status !== 'pending' || !request.expiresAt) {
                    continue;
                }

                if (Date.now() <= request.expiresAt) {
                    continue;
                }

                await expireTrainingRequest(client, request);
            }
        } catch (error) {
            logger.error('Error while checking training request expiries', {
                guildId: guild.id,
                error: error.message,
            });
        }
    }
}
