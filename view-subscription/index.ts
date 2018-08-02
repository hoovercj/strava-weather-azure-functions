import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';
import { request } from '../shared/request';


export async function run(context: Context, req: HttpRequest) {
    try {
        const stravaResponse: any = await getSubscriptions(context);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
        return Promise.resolve();
    } catch (error) {
        context.log.error(error)
        return handleGenericError(context);
    }
};

const getSubscriptions = async (context: Context) => {
    const stravaBaseUrl = 'https://api.strava.com/api/v3/push_subscriptions';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
    }

    return request(context, stravaBaseUrl, params);
}
