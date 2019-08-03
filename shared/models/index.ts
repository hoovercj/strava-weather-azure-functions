import { ActivityId, AuthToken, UserId } from '../models';
import { TableUtilities } from 'azure-storage';
import { WeatherSnapshot } from '../darksky-api';

export type UserId = number;
export type ActivityId = number;
export type AuthToken = string;

type WeatherSnapshotKeys = keyof WeatherSnapshot;
export type WeatherFieldSettings = {
    [key in WeatherSnapshotKeys | 'link']?: boolean;
};

export enum DistanceUnits {
    Miles = 'Miles',
    Kilometers = 'Kilometers',
}

export enum WeatherUnits {
    Metric = 'Metric',
    Imperial = 'Imperial',
    Both = 'Both',
}

export interface IUserSettings {
    distanceUnits: DistanceUnits;
    weatherUnits: WeatherUnits;
    autoUpdate: boolean;
    weatherFields: WeatherFieldSettings;
    ignoreVirtualActivities: boolean;
}

export const DEFAULT_USER_SETTINGS: IUserSettings = {
    distanceUnits: DistanceUnits.Miles,
    autoUpdate: false,
    weatherUnits: WeatherUnits.Both,
    weatherFields: {
        summary: true,
        temperature: true,
        apparentTemperature: true,
        precipIntensity: true,
        precipProbability: true,
        precipType: true,
        humidity: true,
        uvIndex: true,
        windBearing: true,
        windGust: true,
        windSpeed: true,
        link: true,
    },
    ignoreVirtualActivities: false,
}

export enum PartitionKeys {
    ActivityWeather = 'activityWeather',
    ProcessedActivities = 'processedActivities',
    TokenToUser = 'tokenToUser',
    UserSettings = 'userSettings',
}

export interface UserIdToTokenBindingEntity {
    PartitionKey: string;
    RowKey: string;
    Token: string;
}

export interface TokenToUserIdBindingEntity {
    PartitionKey: string;
    RowKey: string;
    UserId: number;
}

export interface TokenToUserIdEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export interface ProcessedActivityBindingEntity {
    PartitionKey: string;
    RowKey: string;
    UserId: number;
}

export interface ProcessedActivityEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export interface UserSettingsBindingEntity {
    PartitionKey: string;
    RowKey: string;
    UserSettings: string;
}

export interface UserSettingsEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserSettings: TableUtilities.entityGenerator.EntityProperty<string>;
}

export interface ActivityWeatherBindingEntity {
    PartitionKey: string;
    RowKey: string;
    Weather: string;
}

export interface ActivityWeatherEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    Weather: TableUtilities.entityGenerator.EntityProperty<string>;
}

const entGen = TableUtilities.entityGenerator;

export class TokenToUserIdModel {
    constructor(public token: AuthToken, public userId: UserId) {
    }

    public static fromBindingEntity(entity: TokenToUserIdBindingEntity): TokenToUserIdModel {
        return new TokenToUserIdModel(entity.RowKey, Number(entity.UserId));
    }

    public static fromEntity(entity: TokenToUserIdEntity): TokenToUserIdModel {
        return new TokenToUserIdModel(entity.RowKey._, entity.UserId._);
    }

    public static toEntity(token: AuthToken, userId: UserId): TokenToUserIdEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.TokenToUser)),
            RowKey: entGen.String(token),
            UserId: entGen.Int32(userId),
        };
    }
}

export class ProcessedActivityModel {
    constructor(public activityId: ActivityId, public userId: UserId) {
    }

    public static fromBindingEntity(entity: ProcessedActivityBindingEntity): ProcessedActivityModel {
        return new ProcessedActivityModel(Number(entity.RowKey), entity.UserId);
    }

    public static fromEntity(entity: ProcessedActivityEntity): ProcessedActivityModel {
        return new ProcessedActivityModel(Number(entity.RowKey._), entity.UserId._);
    }

    public static toEntity(activityId: ActivityId, userId: UserId): ProcessedActivityEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.ProcessedActivities)),
            RowKey: entGen.String(String(activityId)),
            UserId: entGen.Int32(userId),
        };
    }
}

export class UserSettingsModel {
    constructor(public userId: UserId, public userSettings: IUserSettings) {
    }

    public static fromBindingEntity(entity: UserSettingsBindingEntity): UserSettingsModel {
        return new UserSettingsModel(Number(entity.RowKey), JSON.parse(entity.UserSettings));
    }

    public static fromEntity(entity: UserSettingsEntity): UserSettingsModel {
        return new UserSettingsModel(Number(entity.RowKey._), JSON.parse(entity.UserSettings._));
    }

    public static toEntity(userId: UserId, userSettings: IUserSettings): UserSettingsEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.UserSettings)),
            RowKey: entGen.String(String(userId)),
            UserSettings: entGen.String(JSON.stringify(userSettings)),
        };
    }
}

export class ActivityWeatherModel {
    constructor(public activityId: ActivityId, public weather: WeatherSnapshot) {
    }

    public static fromEntity(entity: ActivityWeatherEntity): ActivityWeatherModel {
        return new ActivityWeatherModel(Number(entity.RowKey._), JSON.parse(entity.Weather._));
    }

    public static toEntity(activityId: ActivityId, weather: WeatherSnapshot): ActivityWeatherEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.ActivityWeather)),
            RowKey: entGen.String(String(activityId)),
            Weather: entGen.String(JSON.stringify(weather)),
        };
    }
}