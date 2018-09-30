import * as request from 'request-promise-native';
import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
} from '../shared/env';
import {
    handleException,
} from '../shared/function-utilities';

export async function run(context: Context, req: HttpRequest) {
    const id = context.bindingData.id;

    context.log.info(`Deleting subscription id: ${id}`);

    try {
        const stravaResponse: any = await deleteSubscription(context, id);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
    } catch (error) {
        return handleException(context, 'Error deleting subscription', error);
    }
};

const deleteSubscription = async (context: Context, id: string) => {

    const url = `https://api.strava.com/api/v3/push_subscriptions/${id}`;
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
    };

    return request.default({
        uri: url,
        method: HttpMethod.Delete,
        formData: params,
    });
}
