import { Context, HttpMethod } from "azure-functions-ts-essentials";
import * as _request from 'request-promise-native';
import { getUrlWithParams } from "../utilities";

export const request = (context: Context, url: string, params: any, method: HttpMethod = HttpMethod.Get) => {

    context.log(`${method} ${url}`);

    const urlWithParams = getUrlWithParams(url, params);

    return _request.default({
        method,
        uri: urlWithParams,
    });
}