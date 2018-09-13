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
    humidityToString,
} from '../shared/utilities';
import {
    handleGenericError,
    handleMissingParameter,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
    PartitionKeys,
    WeatherUnits,
} from '../shared/models';
import { DataProvider } from '../shared/data-provider'

export const FUNCTION_NAME = 'description';

export async function run(context: Context, req: HttpRequest): Promise<void> {
    const stravaToken = req.query.token || (req.body && req.body.token);
    const activityId = context.bindingData.activityid;
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
        context.bindings.outTableBinding = [];

        const activityDetails = await getDetailedActivityForId(stravaToken, activityId)

        let weatherDetails = context.bindings.activityWeather && JSON.parse(context.bindings.activityWeather.Weather);
        if (!weatherDetails) {
            weatherDetails = await getWeatherForDetailedActivity(activityDetails, darkSkyApiKey);
            if (weatherDetails) {
                context.bindings.outTableBinding.push({
                    PartitionKey: PartitionKeys.ActivityWeather,
                    RowKey: activityId,
                    Weather: JSON.stringify(weatherDetails),
                });
            }
        }

        const dataProvider = new DataProvider();
        dataProvider.init();
        const userSettings = await dataProvider.getUserSettings(activityDetails.athlete.id);

        const description = getDescriptionWithWeatherForDetailedActivity(activityDetails, weatherDetails, userSettings && userSettings.weatherUnits);

        const successResponse = {
            status: 200,
            body: description,
        }

        // If the method is post, attempt to edit the description in strava
        // If successful, or if the method is get, return the description in the body
        if (req.method === HttpMethod.Post) {
            const success = await postDescription(stravaToken, activityId, description);
            if (success) {
                const alreadyProcessed = !!context.bindings.processedActivity;
                if (!alreadyProcessed) {
                    context.bindings.outTableBinding.push({
                        PartitionKey: PartitionKeys.ProcessedActivities,
                        RowKey: activityId,
                        UserId: activityDetails.athlete.id,
                    });
                }

                context.res = successResponse;
            } else {
                return handleGenericError(context, 'Unable to update description');
            }
        } else {
            context.res = successResponse;
        }
        return context.done();
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

const getDescriptionWithWeatherForDetailedActivity = (activityDetails: Strava.DetailedActivity, weatherDetails: WeatherSnapshot, units: WeatherUnits): string => {
    if (!activityDetails || !weatherDetails) {
        return null;
    }

    if (!units) {
        units = WeatherUnits.Both;
    }

    const weatherDescription = getDescriptionFromWeather(weatherDetails, units);

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

const getDescriptionFromWeather = (weather: WeatherSnapshot, units: WeatherUnits): string => {
    const strings = [];
    strings.push(`Weather Summary: ${weather.summary}`);
    strings.push(`Temperature: ${tempToString(weather.temperature, units)}`);

    const heatIndexDiff = Math.abs(weather.apparentTemperature - weather.temperature);
    if (heatIndexDiff > 10) {
        strings.push(`Felt Like: ${tempToString(weather.apparentTemperature, units)}`);
    }

    strings.push(`Humidity: ${humidityToString(weather.humidity)}`);

    if (weather.uvIndex >= 7) {
        strings.push(`UV Index: ${weather.uvIndex}`);
    }

    strings.push(`Wind Speed: ${speedToString(weather.windSpeed, units)}`);

    // Does not have to be an absolute value
    const windGustDiff = weather.windSpeed - weather.windGust;
    if (windGustDiff > 5) {
        strings.push(`Gusts up to: ${speedToString(weather.windGust, units)}`);
    }

    return strings.join('\n');
}
