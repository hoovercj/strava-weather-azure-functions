import { Context, HttpRequest, HttpMethod } from 'azure-functions-ts-essentials';
import deepmerge from 'deepmerge';
import * as http from 'http';

import {
    WeatherSnapshot,
    DarkskyApiOptions,
    getWeatherSnapshot,
} from '../shared/darksky-api';
import { DataProvider } from '../shared/data-provider'
import { getDarkSkyApiKey } from '../shared/env';
import {
    handleException,
    handleMissingParameter,
    handleConfigurationError,
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
    isVirutalActivity,
} from '../shared/utilities';
import { DetailedActivity } from '../shared/strava-api';

interface PostActivityResult {
    response: http.ClientResponse;
    body: DetailedActivity;
}

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
        return handleConfigurationError(context, 'DARK_SKY_API_KEY');
    }

    try {
        context.bindings.outTableBinding = [];

        const activityDetails = await getDetailedActivityForId(stravaToken, activityId);

        const dataProvider = new DataProvider();
        dataProvider.init();

        const savedSettings = await dataProvider.getUserSettings(activityDetails.athlete.id);
        const userSettings = savedSettings
            ? deepmerge(DEFAULT_USER_SETTINGS, savedSettings)
            : DEFAULT_USER_SETTINGS;

        const ignoreVirtualActivity = userSettings.ignoreVirtualActivities && isVirutalActivity(activityDetails);

        if (ignoreVirtualActivity) {
            return handleIgnoredActivity(context, activityDetails);
        }

        let weatherDetails = context.bindings.activityWeather && JSON.parse(context.bindings.activityWeather.Weather);
        if (!weatherDetails) {
            weatherDetails = await getWeatherForDetailedActivity(activityDetails, darkSkyApiKey);
            if (weatherDetails) {
                context.bindings.outTableBinding.push({
                    PartitionKey: PartitionKeys.ActivityWeather,
                    RowKey: activityId,
                    Weather: JSON.stringify(weatherDetails),
                });
            } else {
                return handleIgnoredActivity(context, activityDetails);
            }
        }

        const description = getDescriptionWithWeatherForDetailedActivity(activityDetails, weatherDetails, userSettings);

        const successResponse = {
            status: 200,
            body: description,
        };

        // If the method is post, attempt to edit the description in strava
        // If successful, or if the method is get, return the description in the body
        if (req.method === HttpMethod.Post) {
            await postDescription(stravaToken, activityId, description);
            const alreadyProcessed = !!context.bindings.processedActivity;
            if (!alreadyProcessed) {
                context.bindings.outTableBinding.push({
                    PartitionKey: PartitionKeys.ProcessedActivities,
                    RowKey: activityId,
                    UserId: activityDetails.athlete.id,
                });
            }
        }

        context.res = successResponse;
    } catch (error) {
        return handleException(context, 'Error in get-description-with-weather', error);
    }
};

const postDescription = async (token: AuthToken, activityId: ActivityId, description: string): Promise<PostActivityResult> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    return activitiesApi.updateActivityById(activityId, { description });
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
    const activityResponse = await activitiesApi.getActivityById(id)
    return activityResponse
        && activityResponse.body;
}

const getWeatherForDetailedActivity = async (activity: Strava.DetailedActivity, apiKey: AuthToken): Promise<WeatherSnapshot> => {
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

const handleIgnoredActivity = (context: Context, activity: DetailedActivity): void => {
    context.res = {
        status: 200,
        body: activity.description,
    }
}
