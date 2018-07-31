import { Context } from 'azure-functions-ts-essentials';

export const handleMissingParameter = (context: Context, parameter: string): Promise<void> => {
    context.res = {
        status: 400,
        body: `Missing required parameter "${parameter}"`,
    }

    return Promise.resolve();
}

export const handleGenericError = (context: Context, message: string = ''): Promise<void> => {
    if (message) {
        context.log.error(message);
    }

    context.res = {
        status: 400,
        body: `Something went wrong. ${message}`.trim(),
    }

    return Promise.resolve();
}