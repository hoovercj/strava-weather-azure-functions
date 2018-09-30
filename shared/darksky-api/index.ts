import * as http from 'http';
import * as request from 'request-promise-native';
import { RequestResponse } from 'request';

import { AuthToken } from '../models'

export interface WeatherResponse {
    currently: WeatherSnapshot;
}

export interface WeatherSnapshot {
    summary: string;
    temperature: number;
    apparentTemperature: number;
    windSpeed: number;
    windGust: number;
    windBearing?: number;
    humidity: number;
    dewPoint: number;
    pressure: number;
    cloudCover: number;
    visibility: number;
    ozone: number;
    uvIndex: number;
    precipProbability: number;
    precipIntensity: number;
    precipType: 'rain' | 'snow' | 'sleet';
}

export interface DarkskyApiOptions {
    apiKey: AuthToken;
    latitude: string;
    longitude: string;
    time: Date;
}

export const getWeatherSnapshot = async (options: DarkskyApiOptions): Promise<RequestResponse> => {
    // TODO: exclude all parts of response EXCEPT currently
    // OR use the other parts of the response to find the range of weather for the activity
    const url = `https://api.darksky.net/forecast/${options.apiKey}/${options.latitude},${options.longitude},${Math.floor(Number(options.time) / 1000)}`;

    return request.get(url, {
        resolveWithFullResponse: true,
        simple: false,
        json: true,
    });
}