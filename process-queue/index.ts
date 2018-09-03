import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';

import {
    getStravaWebhooksVerifyToken,
} from '../shared/env';
import {
    handleGenericError,
} from '../shared/function-utilities';
import { isNullOrUndefined } from 'util';

type AspectType = 'create' | 'update' | 'delete';

interface AthleteEvent extends BaseSubscriptionEvent {
    object_type: 'athlete',
    updates: {
        'authorized': 'false' | boolean,
    }
}

interface ActivityEvent extends BaseSubscriptionEvent {
    object_type: 'activity',
    updates: {
        title?: string,
        type?: string,
        private?: 'true' | 'false' | boolean
    }
}

interface BaseSubscriptionEvent {
    aspect_type: AspectType,
    event_time: number,
    object_id: number,
    owner_id: number,
    subscription_id: number,
}

type SubscriptionEvent = ActivityEvent | AthleteEvent;

export async function run(context: Context) {
    const event: SubscriptionEvent = context.bindings.queueItem;

    if (isAthleteEvent(event)) {
        // TODO: process athlete event
    } else if (isActivityEvent(event)) {
        // TODO: process activity event
    } else {
        // TODO: handle unknown event
    }
};

const handleAthleteEvent = (event: AthleteEvent) => {
    if (event.updates && !isNullOrUndefined(event.updates.authorized)) {
        if (event.updates.authorized === false || event.updates.authorized === 'false') {
            // TODO: Extract delete-account into "shared"
            throw Error('Not yet implemented');
            // return;
        }
    }

    // TODO: Ignore message, it doesn't match expectations
}

const handleActivityEvent = (event: ActivityEvent) => {
    // TODO: Extract get-description-with-weather into shared
    throw Error('Not yet implemented');
}

const isAthleteEvent = (event: SubscriptionEvent): event is AthleteEvent => {
    return event.object_type === 'athlete';
}

const isActivityEvent = (event: SubscriptionEvent): event is ActivityEvent => {
    return event.object_type === 'activity';
}