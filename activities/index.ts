import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import * as Strava from '../shared/strava-api';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';

export async function run(context: Context, req: HttpRequest) {
    const token = req.query.token || (req.body && req.body.token);

    if (!token) {
        return handleMissingParameter(context, 'token');
    }

    try {
        const activities = await getActivitiesForToken(token);
        context.res = {
            status: 200,
            body: activities,
        };
        return Promise.resolve();
    } catch {
        return handleGenericError(context);
    }
};

const getActivitiesForToken = async (token) => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;

    try {
        const activitiesResponse = await activitiesApi.getLoggedInAthleteActivities();
        return activitiesResponse
            && activitiesResponse.body;
    } catch (error) {
        // TODO: logging
        throw error;
    }
}