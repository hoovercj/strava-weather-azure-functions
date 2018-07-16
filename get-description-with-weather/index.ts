import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import { getDarkSkyApiKey } from '../shared/env';

import {
    WeatherSnapshot,
    DarkskyApiOptions,
    getWeatherSnapshot,
} from '../shared/darksky-api';
import * as Strava from '../shared/strava-api';
import {
    speedToString,
    tempToString,
} from '../shared/utilities';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
} from '../shared/models';

export async function run(context: Context, req: HttpRequest): Promise<void> {
    const stravaToken = req.query.token || (req.body && req.body.token);
    const activityId = req.query.id || (req.body && req.body.id);
    const darkSkyApiKey = getDarkSkyApiKey();

    if (!stravaToken) {
        return handleMissingParameter(context, 'token');
    }

    if (!activityId) {
        return handleMissingParameter(context, 'activityid');
    }

    if (!darkSkyApiKey) {
        return handleGenericError(context);
    }

    try {
        const description = await getDescriptionWithWeatherForActivityId(stravaToken, activityId, darkSkyApiKey);

        // If the method is post, attempt to edit the description in strava
        // If successful, or if the method is get, return the description in the body
        if (req.method === HttpMethod.Post) {
            await postDescription(stravaToken, activityId, description);
        }

        context.res = {
            status: 200,
            body: description,
        };
        return Promise.resolve();
    } catch {
        return handleGenericError(context);
    }
};

const postDescription = async (token: AuthToken, activityId: ActivityId, description: string): Promise<boolean> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const response = await activitiesApi.updateActivityById(activityId, { description });
        return response.response.statusCode === 200;
    } catch (error) {
        // TODO: logging
        return false;
    }
}

const getDescriptionWithWeatherForActivityId = async (stravaToken: AuthToken, activityId: ActivityId, darkSkyApiKey: AuthToken) => {
    const activityDetails = await getDetailedActivityForId(stravaToken, activityId)
    if (!activityDetails) return;

    const weatherDetails = await getWeatherForDetailedActivity(activityDetails, darkSkyApiKey)
    if (!weatherDetails) return;

    const weatherDescription = getDescriptionFromWeather(weatherDetails);

    // If the comment already contains the weather information, don't add it again
    if (activityDetails.description && activityDetails.description.indexOf("Weather Summary") >= 0) {
        return activityDetails.description;
    }

    const newComment = [activityDetails.description, weatherDescription].join('\n\n').trim();

    return newComment;
}

const getDetailedActivityForId = async (token: AuthToken, id: ActivityId) => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const activityResponse = await activitiesApi.getActivityById(id)
        return activityResponse
            && activityResponse.body;
    } catch (error) {
        // TODO: logging
        throw error;
    }
}

const getWeatherForDetailedActivity = async (run: Strava.DetailedActivity, apiKey: AuthToken): Promise<WeatherSnapshot> => {
    const options: DarkskyApiOptions = {
        apiKey: apiKey,
        latitude: String(run.startLatlng[0]),
        longitude: String(run.startLatlng[1]),
        time: run.startDate,
    }

    return getWeatherSnapshot(options);
}

const getDescriptionFromWeather = (weather: WeatherSnapshot): string => {
    const strings = [];
    strings.push(`Weather Summary: ${weather.summary}`);
    strings.push(`Temperature: ${tempToString(weather.temperature)}`);

    const heatIndexDiff = Math.abs(weather.apparentTemperature - weather.temperature);
    if (heatIndexDiff > 10) {
        strings.push(`Felt Like: ${tempToString(weather.apparentTemperature)}`);
    }

    strings.push(`Humidity: ${weather.humidity * 100}%`);

    if (weather.uvIndex >= 7) {
        strings.push(`UV Index: ${weather.uvIndex}`);
    }

    strings.push(`Wind Speed: ${speedToString(weather.windSpeed)}`);

    // Does not have to be an absolute value
    const windGustDiff = weather.windSpeed - weather.windGust;
    if (windGustDiff > 5) {
        strings.push(`Gusts up to: ${speedToString(weather.windGust)}`);
    }

    return strings.join('\n');
}
