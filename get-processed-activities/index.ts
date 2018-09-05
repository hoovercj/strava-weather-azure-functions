import { Context, HttpRequest } from 'azure-functions-ts-essentials';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
    PartitionKeys,
} from '../shared/models';

export async function run(context: Context, req: HttpRequest): Promise<void> {
    const userId = context.bindingData.userid;
    if (!userId) {
        return handleMissingParameter(context, 'userid');
    }

    const stravaToken = req.query.token || (req.body && req.body.token);
    if (!stravaToken) {
        return handleMissingParameter(context, 'token');
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

    const processedActivities = context.bindings.processedActivities && context.bindings.processedActivities.map(entity => {
        return entity.RowKey;
    });

    context.res = {
        status: 200,
        body: processedActivities,
    };

    return context.done();
};