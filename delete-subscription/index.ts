import * as request from 'request-promise-native';
import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';

export async function run(context: Context, req: HttpRequest) {

    try {
        const stravaResponse: any = await deleteSubscription(context.bindingData.id);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
        return Promise.resolve();
    } catch {
        return handleGenericError(context);
    }
};

const deleteSubscription = async (id: string) => {
    const url = `https://api.strava.com/api/v3/push_subscriptions/${id}`;
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
    }

    try {
        return request.delete(url, params)
    } catch (error) {
        // TODO: logging
        throw error;
    }
}
