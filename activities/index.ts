import { Context, HttpRequest } from 'azure-functions-ts-essentials';
import { ClientResponse } from 'http';

import * as Strava from '../shared/strava-api';
import {
    handleError,
    handleMissingParameter,
    getNewApiLimits,
    ApiStatus,
    handleApiLimitError,
} from '../shared/function-utilities';

interface ActivitiesResult {
    response: ClientResponse;
    body: Array<Strava.SummaryActivity>;
}

export async function run(context: Context, req: HttpRequest) {
    const token = req.query.token || (req.body && req.body.token);

    if (!token) {
        return handleMissingParameter(context, 'token');
    }

    // Check if the strava rate limit has already been hit before calling the API
    const { currentApiLimits } = context.bindings;
    if (currentApiLimits) {
        const apiStatus = new ApiStatus(currentApiLimits);
        if (apiStatus.stravaLimitReached) {
            return handleApiLimitError(context, apiStatus, currentApiLimits);
        }
    }

    try {
        const { response, body } = await getActivitiesForToken(token);

        const newApiLimits = getNewApiLimits(currentApiLimits, response)
        context.bindings.newApiLimits = newApiLimits;

        // After calling the api, check that the request was not denied due to
        // breaking the api limit
        if (newApiLimits) {
            const apiStatus = new ApiStatus(newApiLimits);
            if (apiStatus.stravaLimitReached) {
                return handleApiLimitError(context, apiStatus, newApiLimits);
            }
        }

        context.res = {
            status: response.statusCode,
            body: body,
        };
    } catch (error) {
        return handleError(context, 'Error fetching activities', error);
    }
};

const getActivitiesForToken = async (token): Promise<ActivitiesResult> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;

    try {
        // TODO: Handle "before" parameter + paging
        const activitiesResponse = await activitiesApi.getLoggedInAthleteActivities();
        return activitiesResponse;
    } catch (error) {
        if (error.response && error.body) {
            return error;
        }

        throw error;
    }
}