import * as request from 'request-promise-native';
import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';
import { getUrlWithParams } from '../shared/utilities';


export async function run(context: Context, req: HttpRequest) {

    try {
        const stravaResponse: any = await getSubscriptions(context);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
        return Promise.resolve();
    } catch {
        return handleGenericError(context);
    }
};

const getSubscriptions = async (context: Context) => {
    const stravaBaseUrl = 'https://api.strava.com/api/v3/push_subscriptions';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
    }

    const url = getUrlWithParams(stravaBaseUrl, params);

    context.log.verbose(`Get Subscriptions`, url);

    try {
        return request.get(url);
    } catch (error) {
        context.log.error(error);
        throw error;
    }
}
