import { WeatherUnits } from "../models";

export const farenheitToCelcius = (temp: number): string => {
    return getRoundedString((temp - 32) * (5 / 9), 0);
}

export const tempToString = (temp: number, weatherUnits: WeatherUnits): string => {
    const imperial = `${getRoundedString(temp, 0)}°`;
    const metric = `${farenheitToCelcius(temp)}C`;

    switch (weatherUnits) {
        case WeatherUnits.Imperial:
            return imperial;
        case WeatherUnits.Metric:
            return metric;
        default:
            return `${imperial} (${metric})`;
    }
}

export const speedToString = (speed: number, weatherUnits: WeatherUnits): string => {
    const imperial = `${getRoundedString(speed, 0)} mph`;
    const metric = `${getRoundedString(speed * 0.44704, 0)} m/s`;

    switch (weatherUnits) {
        case WeatherUnits.Imperial:
            return imperial;
        case WeatherUnits.Metric:
            return metric;
        default:
            return `${imperial} (${metric})`;
    }
}

export const humidityToString = (humidity: number): string => {
    return `${getRoundedString(humidity * 100, 0)}%`;
}

export function getRoundedString(value: number | string, decimals: number): string {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}

export const getUrlWithParams = (url, params) => {
    let paramsString = '?';
    for (let key in params) {
        paramsString += `&${key}=${encodeURIComponent(params[key])}`
    }

    return `${url}${paramsString}`;
}