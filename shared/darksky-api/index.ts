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

export const getWeatherSnapshot = async (options: DarkskyApiOptions): Promise<WeatherSnapshot> => {
    // TODO: exclude all parts of response EXCEPT currently
    // OR use the other parts of the response to find the range of weather for the activity
    const url = `https://api.darksky.net/forecast/${options.apiKey}/${options.latitude},${options.longitude},${Math.floor(Number(options.time) / 1000)}`;
    const response = await request.get(url);

    if (!response) {
        return;
    }

    const weatherResponse = JSON.parse(response) as WeatherResponse;
    return weatherResponse && weatherResponse.currently;
}