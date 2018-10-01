import * as request from 'request-promise-native';
import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import { handleMissingParameter } from '../shared/function-utilities';
import {
    ProcessedActivityModel,
    ProcessedActivityBindingEntity,
} from '../shared/models';
import { DataProvider } from '../shared/data-provider';

export const FUNCTION_NAME = 'deleteaccount';

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
        return handleMissingParameter(context, 'token');
    }

    context.log(`Deauthorizing user ${userId}...`);
    const deauthorizeUrl = `https://www.strava.com/oauth/deauthorize?access_token=${stravaToken}`;
    try {
        await request.post(deauthorizeUrl);
        context.log('User deauthorized');
    } catch (error) {
        context.log.error(`Problem deauthorizing user. User may have already been deauthorized.`, userId, error);
    }

    const dataProvider = new DataProvider();
    dataProvider.init();

    context.log(`Deleting ${tokenEntities && tokenEntities.length} tokens...`);
    await deleteEntities(context, dataProvider, tokenEntities);
    context.log(`Deleting user settings...`);
    await deleteEntities(context, dataProvider, context.bindings.userSettings);

    const processedActivityEntities = context.bindings.processedActivities as ProcessedActivityBindingEntity[] || [];
    context.log(`Deleting ${processedActivityEntities && processedActivityEntities.length} processed activities...`)
    for (let i = 0; i < processedActivityEntities.length; i++) {

        const activityEntity = processedActivityEntities[i];
        const activityModel = ProcessedActivityModel.fromBindingEntity(activityEntity);
        try {
            const weatherEntity = await dataProvider.getWeatherForActivityId(activityModel.activityId);
            await deleteEntities(context, dataProvider, weatherEntity, activityEntity);
        } catch (error) {
            context.log.error('Error deleting activity and weather info for activity', activityModel.activityId, error)
        }
    }

    context.log('Deleted all entities.');

    context.res = {
        status: 200,
        body: '',
    };
};

const deleteEntities = async (context: Context, dataProvider: DataProvider, ...entities: any[]): Promise<any> => {
    let entity: any;
    for (let i = 0; i < entities.length; i++) {
        entity = entities[i];
        if (entity) {
            try {
                await dataProvider.deleteEntity(entities[i]);
            } catch (error) {
                context.log.error('Error deleting entity', error)
            }
        }
    }
}
