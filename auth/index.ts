import * as request from 'request-promise-native';
import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret
} from '../shared/env';
import {
    handleGenericError,
    handleMissingParameter
} from '../shared/function-utilities';

export async function run(context: Context, req: HttpRequest) {
    const code = req.query.code || (req.body && req.body.code);

    if (!code) {
        return handleMissingParameter(context, 'code');
    }

    try {
        const token = await exchangeCodeForToken(code);
        context.res = {
            status: 200,
            body: token,
        };
        return;
    } catch {
        return handleGenericError(context);
    }
};

const getUrlWithParams = (url, params) => {
    let paramsString = '?';
    for (let key in params) {
        paramsString += `&${key}=${params[key]}`
    }

    return `${url}${paramsString}`;
}

const exchangeCodeForToken = async (code) => {
    const stravaBaseUrl = 'https://www.strava.com/oauth/token';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
        code
    }

    const url = getUrlWithParams(stravaBaseUrl, params);

    try {
        return request.post(url);
    } catch (error) {
        // TODO: logging
        throw error;
    }
}
