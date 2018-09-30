import dotenv = require('dotenv');
dotenv.config();

import { AuthToken } from '../models';

declare namespace NodeJS {
    export interface ProcessEnv {
        DARK_SKY_API_KEY: string;
        STRAVA_CLIENT_ID: string;
        STRAVA_CLIENT_SECRET: string;
        WEBSITE_HOSTNAME: string;
        FUNCTIONS_DEFAULT_KEY: string;
        STRAVA_WEBHOOKS_TOKEN: string;
        STRAVA_WEBHOOKS_VERIFY_TOKEN: string;
    }
}

export type EnvironmentVariable = keyof NodeJS.ProcessEnv;

export const getDarkSkyApiKey = (): AuthToken => {
    return process.env.DARK_SKY_API_KEY;
}

export const getDarkSkyApiLimit = (): number => {
    return Number(process.env.DARK_SKY_API_LIMIT);
}

export const getStravaClientId = (): string => {
    return process.env.STRAVA_CLIENT_ID;
}

export const getStravaClientSecret = (): string => {
    return process.env.STRAVA_CLIENT_SECRET;
}

export const getHostedUrl = (): string => {
    return `https://${process.env.WEBSITE_HOSTNAME}/api`;
}

export const getBackendCode = (): string => {
    return process.env.FUNCTIONS_DEFAULT_KEY;
}

export const getStravaWebhooksToken = (): string => {
    return process.env.STRAVA_WEBHOOKS_TOKEN;
}

export const getStravaWebhooksVerifyToken = (): string => {
    return process.env.STRAVA_WEBHOOKS_VERIFY_TOKEN;
}
