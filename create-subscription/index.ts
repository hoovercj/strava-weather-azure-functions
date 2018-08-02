import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret,
    getHostedUrl,
    getStravaWebhooksVerifyToken,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';
import { request } from '../shared/request';


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
        // TODO: get auth code back into URL
        // callback_url: `${getHostedUrl()}/subscription?code=${getStravaWebhooksToken()}`,
        callback_url: `${getHostedUrl()}/subscription/process`,
        verify_token: getStravaWebhooksVerifyToken(),
    }

    context.log('Creating subscription');

    try {
        await request(context, stravaBaseUrl, params, HttpMethod.Post);
    } catch (error) {
        context.log.error(error)
        throw error;
    }
}
