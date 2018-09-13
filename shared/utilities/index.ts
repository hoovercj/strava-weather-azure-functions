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
