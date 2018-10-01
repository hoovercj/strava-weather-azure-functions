import { Context, HttpRequest } from 'azure-functions-ts-essentials';
import * as request from 'request-promise-native';

import {
    getStravaClientId,
    getStravaClientSecret,
} from '../shared/env';
import {
    handleError,
} from '../shared/function-utilities';
import { getUrlWithParams } from '../shared/utilities';


export async function run(context: Context, req: HttpRequest) {
    try {
        const stravaResponse: any = await getSubscriptions(context);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
    } catch (error) {
        return handleError(context, 'Error viewing subscription', error);
    }
};

const getSubscriptions = async (context: Context) => {
    const stravaBaseUrl = 'https://api.strava.com/api/v3/push_subscriptions';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
    }

    const url = getUrlWithParams(stravaBaseUrl, params);

    return request.get(url);
}
