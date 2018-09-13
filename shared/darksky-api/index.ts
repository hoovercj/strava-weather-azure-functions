import * as request from 'request-promise-native';

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
    uvIndex: number;
}

export interface DarkskyApiOptions {
    apiKey: AuthToken;
    latitude: string;
    longitude: string;
    time: Date;
}

export const getWeatherSnapshot = async (options: DarkskyApiOptions): Promise<WeatherSnapshot> => {
    // TODO: exclude all parts of response EXCEPT currently
    const url = `https://api.darksky.net/forecast/${options.apiKey}/${options.latitude},${options.longitude},${Math.floor(Number(options.time) / 1000)}`;
    // TODO: Ensure that cache is being used instead of this
    console.log(url);
    const response = await request.get(url)
        .catch(console.error);

    if (!response) {
        return;
    }

    const weatherResponse = JSON.parse(response) as WeatherResponse;
    return weatherResponse && weatherResponse.currently;
}