import { Context } from 'azure-functions-ts-essentials';

export const handleMissingParameter = (context: Context, parameter: string): void => {
    context.res = {
        status: 400,
        body: `Missing required parameter "${parameter}"`,
    }
}

export const handleGenericError = (context: Context, message: string = ''): void => {
    if (message) {
        context.log.error(message);
    }

    context.res = {
        status: 400,
        body: `Something went wrong. ${message}`.trim(),
    }
}