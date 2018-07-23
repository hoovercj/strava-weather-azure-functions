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
import { PartitionKeys } from '../shared/models';
import { DataProvider } from '../shared/data-provider';

interface IStravaAuthenticationResponse {
    access_token: string;
    athlete: IUserInfo;
}

interface IUserInfo {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    profile_medium: string;
    profile: string;
    email: string;
}

export async function run(context: Context, req: HttpRequest) {
    const stravaCode = req.query.stravacode || (req.body && req.body.stravacode);
    if (!stravaCode) {
        return handleMissingParameter(context, 'stravacode');
    }

    try {
        const stravaResponse: IStravaAuthenticationResponse = JSON.parse(await exchangeCodeForToken(stravaCode));
     
        const storageService = new DataProvider();
        await storageService.init();
        
        await storageService.storeUserIdForToken(stravaResponse.access_token, stravaResponse.athlete.id);

        context.res = {
            status: 200,
            body: stravaResponse,
        };
        return Promise.resolve();
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
