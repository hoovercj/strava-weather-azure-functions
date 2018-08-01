import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaWebhooksVerifyToken,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';

type AspectType = 'create' | 'update' | 'delete';

interface DeauthorizationEvent extends BaseSubscriptionEvent {
    object_type: 'athlete',
    updates: {
        'authorized': 'false',
    }
}

interface ActivityEvent extends BaseSubscriptionEvent {
    object_type: 'activity',
    updates: {
        title?: string,
        type?: string,
        private?: 'true' | 'false'
    }
}

interface BaseSubscriptionEvent {
    aspect_type: AspectType,
    event_time: number,
    object_id: number,
    owner_id: number,
    subscription_id: number,
}

type SubscriptionEvent = ActivityEvent | DeauthorizationEvent;

export async function run(context: Context, req: HttpRequest) {

    if (req.method === HttpMethod.Get) {
        return verifySubscription(context, req);
    } else {
        return processEvent(context, req);
    }
};

const verifySubscription = async (context: Context, req: HttpRequest) => {
    context.log('Verify subscription', req);

    const verifyToken = req.query['hub.verify_token'] || req.query.hub.verify_token;
    const challenge = req.query['hub.challenge'] || req.query.hub.challenge;

    if (verifyToken !== getStravaWebhooksVerifyToken()) {
        return handleGenericError(context, `Verify token was incorrect. Expected ${getStravaWebhooksVerifyToken()}. Received ${verifyToken}`);
    }

    if (!challenge) {
        context.log.warn('Challenge was empty');
    }

    context.res = {
        status: 200,
        body: {
            ['hub.challenge']: challenge,
        }
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
