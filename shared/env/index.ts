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
