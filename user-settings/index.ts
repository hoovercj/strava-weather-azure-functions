import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import { getDarkSkyApiKey } from '../shared/env';

import * as Strava from '../shared/strava-api';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
    UserSettingsEntity,
    IUserSettings,
} from '../shared/models';
import { DataProvider } from '../shared/data-provider';


export async function run(context: Context, req: HttpRequest): Promise<void> {
    const stravaToken = req.query.token || (req.body && req.body.token);
    const userId = context.bindingData.userid;

    if (!stravaToken) {
        return handleMissingParameter(context, 'token');
    }

    if (!userId) {
        return handleMissingParameter(context, 'userid');
    }

    const entities: any[] = context.bindings.userTokens || [];
    let authorized = false;
    for (let i = 0; i < entities.length; i++) {
        if (entities[i].UserId === userId && entities[i].RowKey === stravaToken) {
            authorized = true;
            break;
        }
    }

    if (!authorized) {
        return handleGenericError(context, 'Must provide a valid auth token');
    }

    if (context.req.method === HttpMethod.Get) {
        context.res = {
            status: 200,
            body: (context.bindings.userSettings as UserSettingsEntity).UserSettings,
        }
        return Promise.resolve();
    }

    try {
        const userSettings = req.body as IUserSettings;

        if (!userSettings) {
            return handleMissingParameter(context, 'settings');
        }

        // TODO: update settings
        const storageService = new DataProvider();
        await storageService.init();

        await storageService.storeUserSettings(userId, userSettings);

        context.res = {
            status: 200,
            body: userSettings,
        }
        return Promise.resolve();

    } catch {
        return handleGenericError(context, 'Unable to update settings');
    }
};

const postDescription = async (token: AuthToken, activityId: ActivityId, description: string): Promise<boolean> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const response = await activitiesApi.updateActivityById(activityId, { description });
        return response.response.statusCode === 200;
    } catch (error) {
        // TODO: logging
        return false;
    }
}

const getDetailedActivityForId = async (token: AuthToken, id: ActivityId) => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const activityResponse = await activitiesApi.getActivityById(id)
        return activityResponse
            && activityResponse.body;
    } catch (error) {
        // TODO: logging
        throw error;
    }
}
