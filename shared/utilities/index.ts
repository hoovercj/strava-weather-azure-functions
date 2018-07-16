export const farenheitToCelcius = (temp: number): string => {
    return getRoundedString((temp - 32) * (5 / 9), 2);
}

export const tempToString = (temp: number): string => {
    return `${temp}° (${farenheitToCelcius(temp)}C)`;
}

export const speedToString = (speed: number): string => {
    return `${speed} mph (${getRoundedString(speed * 0.44704, 2)} m/s)`;
}

export const humidityToString = (humidity: number): string => {
    return `${getRoundedString(humidity * 100, 0)}%`;
}

export function getRoundedString(value: number | string, decimals: number): string {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}