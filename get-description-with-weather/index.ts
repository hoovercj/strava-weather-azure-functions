import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import deepmerge from 'deepmerge';
import * as http from 'http';
import { RequestResponse } from 'request';

import {
    WeatherSnapshot,
    DarkskyApiOptions,
    getWeatherSnapshot,
} from '../shared/darksky-api';
import { DataProvider } from '../shared/data-provider'
import { getDarkSkyApiKey } from '../shared/env';
import {
    handleError,
    handleMissingParameter,
    handleConfigurationError,
    ApiStatus,
    handleApiLimitError,
    getNewApiLimits,
} from '../shared/function-utilities';
import {
    AuthToken,
    ActivityId,
    PartitionKeys,
    WeatherUnits,
    IUserSettings,
    WeatherFieldSettings,
    DEFAULT_USER_SETTINGS,
    UserId,
} from '../shared/models';
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
import { DetailedActivity } from '../shared/strava-api';

export const FUNCTION_NAME = 'description';

interface DetailedActivityResponse {
    response: http.ClientResponse;
    body: Strava.DetailedActivity;
}

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
        return handleConfigurationError(context, 'DARK_SKY_API_KEY');
    }

    // Check if the strava rate limit has already been hit before calling the API
    const { currentApiLimits } = context.bindings;
    let apiStatus = new ApiStatus(currentApiLimits);
    if (apiStatus.stravaLimitReached) {
        return handleApiLimitError(context, apiStatus, currentApiLimits);
    }

    let weatherSnapshot: WeatherSnapshot = context.bindings.activityWeather && JSON.parse(context.bindings.activityWeather.Weather);
    if (!weatherSnapshot) {
        // Before making strava api call, if the darksky api would need to be called,
        // make sure its limit hasn't been reached
        if (apiStatus.darkskyLimitReached) {
            return handleApiLimitError(context, apiStatus, currentApiLimits);
        }
    }

    try {
        context.bindings.outTableBinding = [];

        const activityResult = await getDetailedActivityForId(stravaToken, activityId)
        const activityResponse = activityResult.response;
        const activityDetails = activityResult.body;

        let newApiLimits = getNewApiLimits(currentApiLimits, activityResponse)
        context.bindings.newApiLimits = newApiLimits;

        if (!activityDetails) {
            // After calling the api, check that the request was not denied due to
            // breaking the api limit
            apiStatus = new ApiStatus(newApiLimits);
            if (apiStatus.stravaLimitReached) {
                return handleApiLimitError(context, apiStatus, newApiLimits);
            }
        }

        if (!weatherSnapshot) {
            const weatherResults = await getWeatherForDetailedActivity(activityDetails, darkSkyApiKey);
            weatherSnapshot = weatherResults.body && weatherResults.body.currently;
            newApiLimits = getNewApiLimits(newApiLimits, weatherResults)
            context.bindings.newApiLimits = newApiLimits;

            if (weatherSnapshot) {
                context.bindings.outTableBinding.push({
                    PartitionKey: PartitionKeys.ActivityWeather,
                    RowKey: activityId,
                    Weather: JSON.stringify(weatherSnapshot),
                });
            } else {
                // After calling the api, check that the request was not denied due to
                // breaking the api limit
                apiStatus = new ApiStatus(newApiLimits);
                if (apiStatus.darkskyLimitReached) {
                    return handleApiLimitError(context, apiStatus, newApiLimits);
                }

                return handleActivityWithoutWeather(context, activityDetails);
            }
        }

        const dataProvider = new DataProvider();
        dataProvider.init();

        const savedSettings = await dataProvider.getUserSettings(activityDetails.athlete.id);
        const userSettings = deepmerge(DEFAULT_USER_SETTINGS, savedSettings);

        const description = getDescriptionWithWeatherForDetailedActivity(activityDetails, weatherSnapshot, userSettings);

        if (!description) {
            apiStatus = new ApiStatus(currentApiLimits);
            if (apiStatus.stravaLimitReached) {
                return handleApiLimitError(context, apiStatus, currentApiLimits);
            }
        }

        const successResponse = {
            status: 200,
            body: description,
        };

        // If the method is post, attempt to edit the description in strava
        // If successful, or if the method is get, return the description in the body
        if (req.method === HttpMethod.Post) {
            const postResult = await postDescription(stravaToken, activityId, description);
            newApiLimits = getNewApiLimits(newApiLimits, postResult.response);

            const postSuccess = postResult.response && postResult.response.statusCode === 200;

            if (postSuccess) {
                const alreadyProcessed = !!context.bindings.processedActivity;
                if (!alreadyProcessed) {
                    context.bindings.outTableBinding.push({
                        PartitionKey: PartitionKeys.ProcessedActivities,
                        RowKey: activityId,
                        UserId: activityDetails.athlete.id,
                    });
                }
            } else {
                apiStatus = new ApiStatus(currentApiLimits);
                if (apiStatus.stravaLimitReached) {
                    return handleApiLimitError(context, apiStatus, currentApiLimits);
                } else {
                    // TODO: log why we were unable to update the description
                    return handleError(context, 'Unable to update description');
                }
            }

            context.res = successResponse;
        }
    } catch (error) {
        return handleError(context, 'Error in get-description-with-weather', error);
    }
};

const postDescription = async (token: AuthToken, activityId: ActivityId, description: string): Promise<DetailedActivityResponse> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const response = await activitiesApi.updateActivityById(activityId, { description });
        return response;
    } catch (error) {
        if (error.body && error.response) {
            return error;
        }
        throw error;
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

const getDetailedActivityForId = async (token: AuthToken, id: ActivityId): Promise<DetailedActivityResponse> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    try {
        const activityResponse = await activitiesApi.getActivityById(id)
        return activityResponse;
    } catch (error) {
        if (error.response && error.body) {
            return error;
        }
        // TODO: logging
        throw error;
    }
}

const getWeatherForDetailedActivity = async (activity: Strava.DetailedActivity, apiKey: AuthToken): Promise<RequestResponse> => {
    if (!activity.startLatlng) {
        return null;
    }

    const options: DarkskyApiOptions = {
        apiKey: apiKey,
        latitude: String(activity.startLatlng[0]),
        longitude: String(activity.startLatlng[1]),
        time: activity.startDate,
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

    if (weatherFields.link) {
        strings.push('www.stravaweather.net')
    }

    return strings.join('\n');
}

const getPrecipitationString = (weather: WeatherSnapshot, weatherFields: WeatherFieldSettings, weatherUnits: WeatherUnits) => {
    if (!weather.precipIntensity) {
        return;
    }

    let precipIntensity: string = '';
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
    let windSpeedString: string = '';
    let bearingString: string = '';
    if (weatherFields.windSpeed) {
        windSpeedString = speedToString(weather.windSpeed, weatherUnits);
    }

    if (weatherFields.windBearing) {
        bearingString = weather.windBearing ? bearingToString(weather.windBearing) : '';
    }

    return `${bearingString} ${windSpeedString}`.trim();
}

const handleActivityWithoutWeather = (context: Context, activity: DetailedActivity): void => {
    context.res = {
        status: 200,
        body: activity.description,
    }
}
