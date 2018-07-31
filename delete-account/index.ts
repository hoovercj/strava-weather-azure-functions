import * as request from 'request-promise-native';
import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    ProcessedActivityModel,
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

    const deauthorizeUrl = `https://www.strava.com/oauth/deauthorize?access_token=${stravaToken}`;
    await request.post(deauthorizeUrl);

    // TODO: Once webhooks work, this should be handled
    // automatically by the webhooks processing code
    const dataProvider = new DataProvider();
    dataProvider.init();

    await deleteEntities(dataProvider, tokenEntities);
    await deleteEntities(dataProvider, context.bindings.userSettings);

    const processedActivityEntities = context.bindings.processedActivities as ProcessedActivityBindingEntity[];
    for (let i = 0; i < processedActivityEntities.length; i++) {

        const activityEntity = processedActivityEntities[i];
        const activityModel = ProcessedActivityModel.fromBindingEntity(activityEntity);
        try {
            const weatherEntity = await dataProvider.getWeatherForActivityId(activityModel.activityId);
            await deleteEntities(dataProvider, weatherEntity, activityEntity);
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

const deleteEntities = async (dataProvider: DataProvider, ...entities: any[]): Promise<any> => {
    let entity: any;
    for (let i = 0; i < entities.length; i++) {
        entity = entities[i];
        if (entity) {
            try {
                await dataProvider.deleteEntity(entities[i]);
            } catch {
                // TODO: logging
            }
        }
    }
}
