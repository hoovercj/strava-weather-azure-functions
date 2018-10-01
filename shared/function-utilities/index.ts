import { Context } from 'azure-functions-ts-essentials';
import * as Url from 'url';

import { ApiLimits } from '../models';
import { EnvironmentVariable } from '../env';
import { ApiStatus } from './api-status';

export * from './api-status';

const proxyRequests = function () {
    const proxy = {
        protocol: "http:",
        hostname: "127.0.0.1",
        port: 8888,
    };

    var proxyUrl = Url.format(proxy);
    process.env.http_proxy = proxyUrl;
    process.env.https_proxy = proxyUrl;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

proxyRequests();

export const handleMissingParameter = (context: Context, parameter: string): void => {
    const messageRoot = 'Missing or invalid required parameter';
    const message = `${messageRoot}: ${parameter}`;

    context.log.error(messageRoot, parameter);

    context.res = {
        status: 400,
        body: message,
    }
}

export const handleConfigurationError = (context: Context, configurationKey: EnvironmentVariable) => {
    const messageRoot = 'Missing or invalid configuration key';
    const message = `${messageRoot}: ${configurationKey}`;

    context.log.error(messageRoot, configurationKey);

    context.res = {
        status: 400,
        body: message,
    }
}

export const handleError = (context: Context, message: string, error?: any): void => {
    if (message) {
        context.log.error(message, error);
    }

    context.res = {
        status: 400,
        body: `Something went wrong. ${message}`.trim(),
    }
}

export interface ApiLimitBody {
    apiLimits: ApiLimits,
}

export const handleApiLimitError = (context: Context, apiStatus: ApiStatus, apiLimits: ApiLimits): void => {
    if (apiStatus.limitReached)
    context.res = {
        status: 429,
        body: {
            apiLimits,
        } as ApiLimitBody
    }
}
