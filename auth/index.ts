import * as request from 'request-promise-native';
import { Context, HttpRequest } from 'azure-functions-ts-essentials';

import {
    getStravaClientId,
    getStravaClientSecret
} from '../shared/env';
import {
    handleException,
    handleMissingParameter
} from '../shared/function-utilities';
import { DataProvider } from '../shared/data-provider';
import { getUrlWithParams } from '../shared/utilities';

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
    } catch (error) {
        return handleException(context, 'Error authorizing user', error);
    }
};

const exchangeCodeForToken = async (code) => {
    const stravaBaseUrl = 'https://www.strava.com/oauth/token';
    const params = {
        client_id: getStravaClientId(),
        client_secret: getStravaClientSecret(),
        code
    }

    const url = getUrlWithParams(stravaBaseUrl, params);

    return request.post(url);
}
