import dotenv = require('dotenv');
dotenv.config();

import { AuthToken } from '../models';

export const getDarkSkyApiKey = (): AuthToken => {
    return process.env.DARK_SKY_API_KEY;
}

export const getStravaClientId = (): string => {
    return process.env.STRAVA_CLIENT_ID;
}

export const getStravaClientSecret = (): string => {
    return process.env.STRAVA_CLIENT_SECRET;
}

export const getHostedUrl = (): string => {
    return `${process.env.WEBSITE_HOSTNAME}/api`;
}

export const getStravaWebhooksToken = (): string => {
    return process.env.STRAVA_WEBHOOKS_TOKEN;
}

export const getStravaWebhooksVerifyToken = (): string => {
    return process.env.STRAVA_WEBHOOKS_VERIFY_TOKEN;
}
