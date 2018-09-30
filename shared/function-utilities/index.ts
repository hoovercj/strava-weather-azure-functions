import { Context } from 'azure-functions-ts-essentials';
import { ProcessedActivityBindingEntity } from '../models';
import { EnvironmentVariable } from '../env';

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

export const handleException = (context: Context, message: string, error: any): void => {
    if (message) {
        context.log.error(message, error);
    }

    context.res = {
        status: 400,
        body: `Something went wrong. ${message}`.trim(),
    }
}