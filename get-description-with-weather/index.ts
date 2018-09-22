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
    percentToString,
    bearingToString,
    pressureToString,
    visibilityToString,
    ozoneToString,
    rainIntensityToString,
    visibilityToSnowIntensityString,
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
    IUserSettings,
    WeatherFieldSettings,
    DEFAULT_USER_SETTINGS,
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
        const userSettings = Object.assign(DEFAULT_USER_SETTINGS, await dataProvider.getUserSettings(activityDetails.athlete.id));

        const description = getDescriptionWithWeatherForDetailedActivity(activityDetails, weatherDetails, userSettings);

        const successResponse = {
            status: 200,
            body: description,
        };

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
        return;
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

const getDescriptionWithWeatherForDetailedActivity = (activityDetails: Strava.DetailedActivity, weatherDetails: WeatherSnapshot, settings: IUserSettings): string => {
    if (!activityDetails || !weatherDetails) {
        return null;
    }

    const weatherDescription = getDescriptionFromWeather(weatherDetails, settings);

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

const getDescriptionFromWeather = (weather: WeatherSnapshot, settings: IUserSettings): string => {
    const strings = [];
    const { weatherUnits, weatherFields } = settings;

    if (weatherFields.summary) {
        strings.push(`Weather Summary: ${weather.summary}`);
    }

    if (weatherFields.temperature) {
        strings.push(`Temperature: ${tempToString(weather.temperature, weatherUnits)}`);
    }

    if (weatherFields.apparentTemperature) {
        const heatIndexDiff = Math.abs(weather.apparentTemperature - weather.temperature);
        if (heatIndexDiff > 10) {
            strings.push(`Felt Like: ${tempToString(weather.apparentTemperature, weatherUnits)}`);
        }
    }

    const precipitationString = getPrecipitationString(weather, weatherFields, weatherUnits);
    if (precipitationString && precipitationString.length > 0) {
        strings.push(`Precipitation: ${precipitationString}`);
    }

    if (weatherFields.uvIndex) {
        if (weather.uvIndex >= 7) {
            strings.push(`UV Index: ${weather.uvIndex}`);
        }
    }

    if (weatherFields.humidity) {
        strings.push(`Humidity: ${percentToString(weather.humidity)}`);
    }

    if (weatherFields.dewPoint) {
        strings.push(`Dew Point: ${tempToString(weather.dewPoint, weatherUnits)}`);
    }

    const windStringContent = getWindSpeedAndDirectionString(weather, weatherFields, weatherUnits);
    if (windStringContent.length > 0) {
        strings.push(`Wind: ${windStringContent}`);
    }

    if (weatherFields.windGust) {
        // Does not have to be an absolute value because only a positive value makes sense
        // i.e. wind gusts less than the wind speed are silly
        const windGustDiff = weather.windSpeed - weather.windGust;
        if (windGustDiff > 5) {
            strings.push(`Gusts up to: ${speedToString(weather.windGust, weatherUnits)}`);
        }
    }

    if (weatherFields.pressure) {
        strings.push(`Pressure: ${pressureToString(weather.pressure, weatherUnits)}`)
    }

    if (weatherFields.cloudCover) {
        strings.push(`Cloud Cover: ${percentToString(weather.humidity)}`);
    }

    if (weatherFields.visibility) {
        strings.push(`Visibility: ${visibilityToString(weather.visibility, weatherUnits)}`);
    }

    if (weatherFields.ozone) {
        strings.push(`Ozone: ${ozoneToString(weather.ozone)} DB`);
    }

    return strings.join('\n');
}

const getPrecipitationString = (weather: WeatherSnapshot, weatherFields: WeatherFieldSettings, weatherUnits: WeatherUnits) => {
    if (!weather.precipIntensity) {
        return;
    }

    let precipIntensity: string;
    switch (weather.precipType) {
        case 'rain':
        case 'sleet':
            precipIntensity = rainIntensityToString(weather.precipIntensity);
            break;
        case 'snow':
            precipIntensity = visibilityToSnowIntensityString(weather.visibility);
            break;
    }

    let precipitationStringParts: string[] = [];

    if (weatherFields.precipIntensity) {
        precipitationStringParts.push(precipIntensity);
    }

    if (weatherFields.precipType) {
        precipitationStringParts.push(weather.precipType);
    }

    if (weatherFields.precipProbability) {
        if (weather.precipProbability) {
            precipitationStringParts.push(`(${percentToString(weather.precipProbability)})`);
        }
    }

    return precipitationStringParts.join(' ').trim();
}

const getWindSpeedAndDirectionString = (weather: WeatherSnapshot, weatherFields: WeatherFieldSettings, weatherUnits: WeatherUnits) => {
    let windSpeedString: string;
    let bearingString: string;
    if (weatherFields.windSpeed) {
        windSpeedString = speedToString(weather.windSpeed, weatherUnits);
    }

    if (weatherFields.windBearing) {
        bearingString = weather.windBearing ? bearingToString(weather.windBearing) : '';
    }

    return `${bearingString} ${windSpeedString}`.trim();
}