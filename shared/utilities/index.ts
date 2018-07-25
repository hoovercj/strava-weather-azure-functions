export const farenheitToCelcius = (temp: number): string => {
    return getRoundedString((temp - 32) * (5 / 9), 0);
}

export const tempToString = (temp: number): string => {
    return `${getRoundedString(temp, 0)}° (${farenheitToCelcius(temp)}C)`;
}

export const speedToString = (speed: number): string => {
    return `${getRoundedString(speed, 0)} mph (${getRoundedString(speed * 0.44704, 0)} m/s)`;
}

export const humidityToString = (humidity: number): string => {
    return `${getRoundedString(humidity * 100, 0)}%`;
}

export function getRoundedString(value: number | string, decimals: number): string {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}