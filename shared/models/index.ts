import { ActivityId, AuthToken, UserId } from '../models';
import { TableUtilities } from 'azure-storage';

export type UserId = number;
export type ActivityId = number;
export type AuthToken = string;

export enum PartitionKeys {
    ActivityWeather = 'activityWeather',
    ProcessedActivities = 'processedActivities',
    TokenToUser = 'tokenToUser',
    UserSettings = 'userSettings',
}

export interface UserIdToTokenEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    Token: TableUtilities.entityGenerator.EntityProperty<string>;
}

export interface TokenToUserIdEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export interface ProcessedActivityEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export interface UserSettingsEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserSettings: TableUtilities.entityGenerator.EntityProperty<string>;
}

const entGen = TableUtilities.entityGenerator;

export class TokenToUserIdModel {
    constructor(public token: AuthToken, public userId: UserId) {
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
    constructor(public userId: UserId, public userSettings: any) {
    }

    public static fromEntity(entity: UserSettingsEntity): UserSettingsModel {
        return new UserSettingsModel(Number(entity.RowKey._), JSON.parse(entity.UserSettings._));
    }

    public static toEntity(userId: UserId, userSettings: any): UserSettingsEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.UserSettings)),
            RowKey: entGen.String(String(userId)),
            UserSettings: entGen.String(JSON.stringify(userSettings)),
        };
    }
}