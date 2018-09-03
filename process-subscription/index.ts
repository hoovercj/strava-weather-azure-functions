import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaWebhooksVerifyToken,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';

export async function run(context: Context, req: HttpRequest) {

    if (req.method === HttpMethod.Get) {
        return verifySubscription(context, req);
    } else {
        return processEvent(context, req);
    }
};

const verifySubscription = async (context: Context, req: HttpRequest) => {
    const verifyToken = req.query['hub.verify_token'] || req.query.hub.verify_token;
    const challenge = req.query['hub.challenge'] || req.query.hub.challenge;

    if (verifyToken !== getStravaWebhooksVerifyToken()) {
        return handleGenericError(context, `Verify token was incorrect.`);
    }

    if (!challenge) {
        context.log.warn('Challenge was empty');
    }

    const echo = JSON.stringify({
        ['hub.challenge']: challenge,
    });

    context.log('Echoing challenge', echo);

    context.res = {
        status: 200,
        body: echo,
    }

    return Promise.resolve();
}

const processEvent = async (context: Context, req: HttpRequest) => {
    context.bindings.queueItem = req.body;

    context.res = {
        status: 200,
        body: undefined,
    };
    return Promise.resolve();
}
