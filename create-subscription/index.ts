import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
    getHostedUrl,
    getStravaWebhooksVerifyToken,
} from '../shared/env';
import {
    handleError,
} from '../shared/function-utilities';
import * as request from 'request-promise-native';

export async function run(context: Context, req: HttpRequest) {
    try {
        const stravaResponse: any = await createSubscription(context);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
    } catch (error) {
        return handleError(context, 'Error creating subscription', error);
    }
};

const createSubscription = async (context: Context) => {
    const stravaBaseUrl = 'https://api.strava.com/api/v3/push_subscriptions';
    const url = `${stravaBaseUrl}?client_id=${getStravaClientId()}&client_secret=${getStravaClientSecret()}&verify_token=${getStravaWebhooksVerifyToken()}&callback_url=${getHostedUrl()}/subscription/process`;

    return request.post(url);
}
