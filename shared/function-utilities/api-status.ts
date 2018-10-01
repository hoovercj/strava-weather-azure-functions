import * as http from 'http';
import { getDarkSkyApiLimit } from '../env';
import { ApiLimits } from '../models';

declare module 'http' {
    interface IncomingHttpHeaders {
        'X-Ratelimit-Limit': string | string[]; // strava: Short,Daily
        'X-Ratelimit-Usage': string | string[]; // strava: Short,Daily
        'X-Forecast-API-Calls': string; // darksky: Number of requests made today
    }
}

export const HTTP_STATUS_CODE_API_LIMIT_REACHED = 429;

export class ApiStatus {

    constructor(private limits: ApiLimits) {}

    public get secondsUntilApisAvailable(): number {
        const now = Date.now();
        let lastApiResetInUtcMilliseconds = now;

        if (this.darkskyLimitReached && this.limits.darkSkyReset > lastApiResetInUtcMilliseconds) {
            lastApiResetInUtcMilliseconds = this.limits.darkSkyReset;
        }

        if (this.stravaDailyLimitReached && this.limits.stravaDailyReset > lastApiResetInUtcMilliseconds) {
            lastApiResetInUtcMilliseconds = this.limits.stravaDailyReset;
        } else if (this.stravaShortLimitReached && this.limits.stravaShortReset > lastApiResetInUtcMilliseconds) {
            lastApiResetInUtcMilliseconds = this.limits.stravaShortReset;
        }

        return Math.ceil((lastApiResetInUtcMilliseconds - now) / 1000);
    }

    public get limitReached(): boolean {
        return this.stravaLimitReached || this.darkskyLimitReached;
    }

    public get stravaLimitReached(): boolean {
        return this.stravaDailyLimitReached || this.stravaShortLimitReached;
    }

    public get stravaDailyLimitReached(): boolean {
        const stravaDailyLimitExpired = Date.now() >= this.limits.stravaDailyReset;
        return !stravaDailyLimitExpired && this.limits.stravaDailyUsage + API_BUFFER >= this.limits.stravaDailyLimit;
    }

    public get stravaShortLimitReached(): boolean {
        const stravaShortLimitExpired = Date.now() >= this.limits.stravaShortReset;
        return !stravaShortLimitExpired && this.limits.stravaShortUsage + API_BUFFER >= this.limits.stravaShortLimit;
    }

    public get darkskyLimitReached(): boolean {
        const darkskyLimitExpired = Date.now() >= this.limits.darkSkyReset;
        return !darkskyLimitExpired && this.limits.darkskyUsage >= getDarkSkyApiLimit();
    }
}

const API_BUFFER = 10;

export const getNewApiLimits = (currentLimits: ApiLimits, response: http.ClientResponse): ApiLimits => {
    if (!response || !response.headers) {
        return currentLimits;
    }

    const newLimits: ApiLimits = {};

    const headers = response.headers;
    const rawLimit = headers['X-Ratelimit-Limit'] || headers['x-ratelimit-limit'];
    if (rawLimit) {
        const [shortLimit, dailyLimit] = Array.isArray(rawLimit) ? rawLimit : rawLimit.split(',');
        newLimits.stravaShortLimit = Number(shortLimit);
        newLimits.stravaDailyLimit = Number(dailyLimit);
    }
    const rawUsage = headers['X-Ratelimit-Usage'] || headers['x-ratelimit-usage'];
    if (rawUsage) {
        const [shortUsage, dailyUsage] = Array.isArray(rawUsage) ? rawUsage : rawUsage.split(',');
        newLimits.stravaShortUsage = Number(shortUsage);
        newLimits.stravaDailyUsage = Number(dailyUsage);
    }
    const darkskyUsage = headers['X-Forecast-API-Calls'] || headers['x-forecast-api-Calls'];
    if (darkskyUsage != undefined) { // intentionally using != to match null and undefined
        newLimits.darkskyUsage = Number(darkskyUsage);
    }

    const fifteenMinutes = (1000 /*ms*/ * 60 /*sec*/ * 15 /*min*/);
    const sevenPointFiveMinutes = fifteenMinutes / 2;
    const nextQuarterUtc = Math.round((Date.now() + sevenPointFiveMinutes) / fifteenMinutes) * fifteenMinutes;
    const nextMidnightUtc = new Date().setUTCHours(24, 0, 0, 0);

    return {
        ...(currentLimits || {}),
        ...newLimits,
        stravaShortReset: nextQuarterUtc,
        stravaDailyReset: nextMidnightUtc,
        darkSkyReset: nextMidnightUtc,
    };
}
