import { Context } from 'azure-functions-ts-essentials';
import * as request from 'request-promise-native';
import { RequestResponse } from 'request';
import { isNullOrUndefined } from 'util';

import {
    getHostedUrl, getBackendCode,
} from '../shared/env';
import { ApiStatus } from '../shared/function-utilities';
import { DataProvider, QueueService } from '../shared/data-provider';
import { UserId, AuthToken, ActivityId, ApiLimits } from '../shared/models';

import { FUNCTION_NAME as deleteAccountFunctionName } from '../delete-account';
import { FUNCTION_NAME as getDescriptionFunctionName } from '../get-description-with-weather';

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

    try {
        if (isAthleteEvent(event)) {
            await handleAthleteEvent(context, event);
        } else if (isActivityEvent(event)) {
            await handleActivityEvent(context, event);
        } else {
            context.log.warn(`Ignoring unknown event type: ${event && event!.object_type}`);
        }
    } catch (error) {
        context.log.error('Error handling event', error);
        throw error;
    }
};

const handleAthleteEvent = async (context: Context, event: AthleteEvent) => {
    context.log('Handle Athlete Event');
    if (event.updates && !isNullOrUndefined(event.updates.authorized)) {
        if (event.updates.authorized === false || event.updates.authorized === 'false') {
            const userId: UserId = event.owner_id;
            context.log(`Processing athlete event for user ${userId}`);

            const dataProvider = new DataProvider();
            dataProvider.init();

            context.log('Fetching user tokens...');
            const tokens: AuthToken[] = await dataProvider.getTokensForUserId(userId);
            context.log(`Fetched ${tokens && tokens.length || 0} user tokens.`);
            if (tokens && tokens.length > 0) {
                const baseUrl = `${getHostedUrl()}/${deleteAccountFunctionName}/${userId}`;
                context.log('Request: ' + baseUrl);
                const token = tokens[0];
                const url = `${baseUrl}?token=${token}&code=${getBackendCode()}`;
                return request.delete(url);
            } else {
                context.log.error('Ignoring event because application found no valid tokens for user', userId);
            }
        } else {
            context.log.warn('Ignoring event because it was of an unknown form.', `Event.Updates.Authorized = ${event.updates && event.updates.authorized}`);
        }
    } else {
        context.log.warn('Ignoring event because it was of an unknown form.', `Event.Updates.Authorized = ${event.updates && event.updates.authorized}`);
    }
}

const handleActivityEvent = async (context: Context, event: ActivityEvent) => {
    if (event.aspect_type !== 'create') {
        context.log(`Ignoring event. Event type was not 'create'`);
        return;
    }

    const userId: UserId = event.owner_id;
    const activityId: ActivityId = event.object_id;

    context.log(`Processing activity ${activityId} for user ${userId}`);

    const dataProvider = new DataProvider();
    dataProvider.init();

    context.log('Fetching user settings...');
    const userSettings = await dataProvider.getUserSettings(userId);;
    context.log('Fetched user settings.');

    if (!userSettings || !userSettings.autoUpdate) {
        context.log(`Ignoring event. User ${userId} does not have AutoUpdate enabled`);
        return;
    } else {
        context.log(`User has enabled AutoUpdate`);
    }

    context.log('Fetching user tokens...')
    const tokens: AuthToken[] = await dataProvider.getTokensForUserId(userId)
    context.log(`Fetched ${tokens && tokens.length || 0} user tokens.`);
    if (tokens && tokens.length > 0) {
        const baseUrl = `${getHostedUrl()}/${getDescriptionFunctionName}/${activityId}`;
        context.log('Request: ' + baseUrl);
        const token = tokens[0];
        const url = `${baseUrl}?token=${token}&code=${getBackendCode()}`;
        const result = await request.post(url, { resolveWithFullResponse: true, simple: false, json: true }) as RequestResponse;
        if (result.body && result.body.apiLimits) {
            requeueEvent(event, result.body.apiLimits);
        }
    } else {
        context.log.error('Ignoring event because application found no valid tokens for user', userId);
    }
}

const isAthleteEvent = (event: SubscriptionEvent): event is AthleteEvent => {
    return event.object_type === 'athlete';
}

const isActivityEvent = (event: SubscriptionEvent): event is ActivityEvent => {
    return event.object_type === 'activity';
}

const requeueEvent = async (event: SubscriptionEvent, limits: ApiLimits) => {
    const apiStatus = new ApiStatus(limits);

    const queueService = new QueueService();
    await queueService.init();
    queueService.enqueueMessage(event, apiStatus.secondsUntilApisAvailable);
}