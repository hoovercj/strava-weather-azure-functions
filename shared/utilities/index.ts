import { WeatherUnits } from "../models";
import { DetailedActivity } from "../strava-api";

export const tempToString = (degreesFarenhit: number, weatherUnits: WeatherUnits): string => {
    const imperial = `${getRoundedString(degreesFarenhit, 0)}°`;
    const metric = `${farenheitToCelcius(degreesFarenhit)}C`;

    switch (weatherUnits) {
        case WeatherUnits.Imperial:
            return imperial;
        case WeatherUnits.Metric:
            return metric;
        default:
            return toImperialAndMetricString(imperial, metric);
    }
}

export const speedToString = (mph: number, weatherUnits: WeatherUnits): string => {
    const imperial = `${getRoundedString(mph, 0)} mph`;
    const metric = `${getRoundedString(mph * 0.44704, 0)} m/s`;

    switch (weatherUnits) {
        case WeatherUnits.Imperial:
            return imperial;
        case WeatherUnits.Metric:
            return metric;
        default:
            return toImperialAndMetricString(imperial, metric);
    }
}

export const rainIntensityToString = (inchesPerHour: number): string => {
    if (inchesPerHour < 0.098) {
        return 'light';
    } else if (inchesPerHour < 0.3) {
        return 'moderate';
    } else if (inchesPerHour < 2) {
        return 'heavy';
    } else {
        return 'violent';
    }
}

export const visibilityToSnowIntensityString = (miles: number): string => {
    if (miles > .62) {
        return 'light';
    } else if (miles > 0.31) {
        return 'moderate';
    } else {
        return 'heavy';
    }
}

export const percentToString = (percentage: number): string => {
    return `${getRoundedString(percentage * 100, 0)}%`;
}

export const bearingToString = (bearing: number): string => {
    if (bearing > 337 || bearing <= 22) {
        return 'N';
    } else if (bearing > 22 && bearing <= 67) {
        return 'NE';
    } else if (bearing > 67 && bearing <= 112) {
        return 'E';
    } else if (bearing > 112 && bearing <= 157) {
        return 'SE';
    } else if (bearing > 157 && bearing <= 202) {
        return 'S';
    } else if (bearing > 202 && bearing <= 247) {
        return 'SW';
    } else if (bearing > 247 && bearing <= 292) {
        return 'W';
    } else if (bearing > 292 && bearing <= 337) {
        return 'NW';
    } else {
        return '';
    }
}

export const pressureToString = (millibars: number, weatherUnits: WeatherUnits): string => {
    const imperial = `${millibarsToInchesMercury(millibars)} in`;
    const metric = `${getRoundedString(millibars, 1)} mb`;

    switch(weatherUnits) {
        case WeatherUnits.Imperial:
            return imperial;
        case WeatherUnits.Metric:
            return metric;
        default:
            return toImperialAndMetricString(imperial, metric);
    }
}

export const visibilityToString = (miles: number, weatherUnits: WeatherUnits): string => {
    let imperial = `${miles} mi`;
    let metric = `${milesToKm(miles)} km`;

    if (miles === 10) {
        imperial = `+${imperial}`;
        metric = `+${metric}`;
    }

    return toImperialAndMetricString(imperial, metric);
}

export const ozoneToString = (dobsons: number): string => {
    return String(dobsons);
}

export const toImperialAndMetricString = (imperial: string, metric: string): string => {
    return `${imperial} (${metric})`;
}

export const milesToKm = (miles: number): string => {
    return getRoundedString(miles * 1.60934, 2);
}

export const farenheitToCelcius = (degreesFarenheit: number): string => {
    return getRoundedString((degreesFarenheit - 32) * (5 / 9), 0);
}

export const millibarsToInchesMercury = (millibars: number): string => {
    return getRoundedString(millibars * 0.02953, 2);
}

export function getRoundedString(value: number | string, decimals: number): string {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}

export const getUrlWithParams = (url, params) => {
    let paramsString = '?';
    for (let key in (params || {})) {
        paramsString += `&${key}=${encodeURIComponent(params[key])}`
    }

    return `${url}${paramsString}`;
}

export const isVirutalActivity = ({ type }: DetailedActivity) => {
    return type === ActivityType.VirtualRide || type === ActivityType.VirtualRun;
}

enum ActivityType {
    AlpineSki = 'AlpineSki',
    BackcountrySki = 'BackcountrySki',
    Canoeing = 'Canoeing',
    Crossfit = 'Crossfit',
    EBikeRide = 'EBikeRide',
    Elliptical = 'Elliptical',
    Hike = 'Hike',
    IceSkate = 'IceSkate',
    InlineSkate = 'InlineSkate',
    Kayaking = 'Kayaking',
    Kitesurf = 'Kitesurf',
    NordicSki = 'NordicSki',
    Ride = 'Ride',
    RockClimbing = 'RockClimbing',
    RollerSki = 'RollerSki',
    Rowing = 'Rowing',
    Run = 'Run',
    Snowboard = 'Snowboard',
    Snowshoe = 'Snowshoe',
    StairStepper = 'StairStepper',
    StandUpPaddling = 'StandUpPaddling',
    Surfing = 'Surfing',
    Swim = 'Swim',
    VirtualRide = 'VirtualRide',
    VirtualRun = 'VirtualRun',
    Walk = 'Walk',
    WeightTraining = 'WeightTraining',
    Windsurf = 'Windsurf',
    Workout = 'Workout',
    Yoga = 'Yoga'
}
