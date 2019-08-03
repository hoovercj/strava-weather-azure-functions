import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import deepmerge from 'deepmerge';

import * as Strava from '../shared/strava-api';
import {
    handleException,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
    IUserSettings,
    UserSettingsModel,
    UserSettingsBindingEntity,
    DEFAULT_USER_SETTINGS,
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
        return handleMissingParameter(context, 'token');
    }

    const settingsEntity: UserSettingsBindingEntity = context.bindings.userSettings;
    const settings: UserSettingsModel | undefined = settingsEntity ? UserSettingsModel.fromBindingEntity(settingsEntity) : undefined;

    if (context.req.method === HttpMethod.Get) {
        const userSettings = settings && settings.userSettings;
        context.res = {
            status: 200,
            body: userSettings
                ? deepmerge(DEFAULT_USER_SETTINGS, userSettings)
                : DEFAULT_USER_SETTINGS,
        }
        return;
    }

    try {
        const userSettings = req.body as IUserSettings;

        if (!userSettings) {
            return handleMissingParameter(context, 'settings');
        }

        const mergedSettings = deepmerge(settings && settings.userSettings || {}, userSettings || {});

        const storageService = new DataProvider();
        await storageService.init();
        await storageService.storeUserSettings(userId, mergedSettings);

        context.res = {
            status: 200,
            body: mergedSettings,
        }
    } catch (error) {
        return handleException(context, 'Unable to update settings', error);
    }
};
