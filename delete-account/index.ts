import { Context, HttpRequest } from 'azure-functions-ts-essentials';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    ProcessedActivityEntity,
    ProcessedActivityModel,
    UserSettingsEntity,
    ProcessedActivityBindingEntity,
} from '../shared/models';
import { DataProvider } from '../shared/data-provider';

export async function run(context: Context, req: HttpRequest): Promise<void> {
    const userId = context.bindingData.userid;
    if (!userId) {
        return handleMissingParameter(context, 'userid');
    }

    const stravaToken = req.query.token || (req.body && req.body.token);
    if (!stravaToken) {
        return handleMissingParameter(context, 'token');
    }

    const tokenEntities: any[] = context.bindings.userTokens || [];
    let authorized = false;
    for (let i = 0; i < tokenEntities.length; i++) {
        if (tokenEntities[i].UserId === userId && tokenEntities[i].RowKey === stravaToken) {
            authorized = true;
            break;
        }
    }

    if (!authorized) {
        return handleGenericError(context, 'Must provide a valid auth token');
    }

    const dataProvider = new DataProvider();
    dataProvider.init();

    // Delete tokens first because they are the most important
    for (let i = 0; i < tokenEntities.length; i++) {
        try {
            await dataProvider.deleteEntity(tokenEntities[i]);
        } catch {
            // TODO: logging
        }
    }

    const userSettingsEntity: UserSettingsEntity = context.bindings.userSettings;
    if (userSettingsEntity) {
        try {
            await dataProvider.deleteEntity(userSettingsEntity);
        } catch {
            // TODO: logging
        }
    }

    const processedActivityEntities = context.bindings.processedActivities && context.bindings.processedActivities as ProcessedActivityBindingEntity[];
    for (let i = 0; i < processedActivityEntities.length; i++) {

        const activityEntity = processedActivityEntities[i];
        const activityModel = ProcessedActivityModel.fromBindingEntity(activityEntity);
        try {
            const weatherEntity = await dataProvider.getWeatherForActivityId(activityModel.activityId);
            await dataProvider.deleteEntity(weatherEntity);
        } catch {
            // TODO: logging
        }

        try {
            await dataProvider.deleteEntity(activityEntity);
        } catch {
            // TODO: logging
        }
    }

    context.res = {
        status: 200,
        body: '',
    };
    return Promise.resolve();
};