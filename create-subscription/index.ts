import * as request from 'request-promise-native';
import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
    getHostedUrl,
    getStravaWebhooksVerifyToken,
    getStravaWebhooksToken
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';
import { getUrlWithParams } from '../shared/utilities';
import { isContext } from 'vm';


export async function run(context: Context, req: HttpRequest) {

    try {
        const stravaResponse: any = await createSubscription(context);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
        return Promise.resolve();
    } catch {
        return handleGenericError(context);
    }
};

const createSubscription = async (context: Context) => {
    const stravaBaseUrl = 'https://api.strava.com/api/v3/push_subscriptions';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
        // callback_url: `${getHostedUrl()}/subscription?code=${getStravaWebhooksToken()}`,
        callback_url: `${getHostedUrl()}/subscription`,
        verify_token: getStravaWebhooksVerifyToken(),
    }

    const url = getUrlWithParams(stravaBaseUrl, params);

    context.log('Creating subscription', url);

    try {
        await request.post(url);
    } catch (error) {
        context.log.error(error)
        throw error;
    }
}
