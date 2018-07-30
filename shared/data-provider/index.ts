import {
    ActivityId,
    ActivityWeatherEntity,
    AuthToken,
    IUserSettings,
    UserId,
    UserSettingsEntity,
    UserSettingsModel,
} from '../models';
import {
    PartitionKeys,
    TokenToUserIdModel, TokenToUserIdEntity,
    ProcessedActivityModel, ProcessedActivityEntity,
} from '../models';

import * as azure from 'azure-storage';

export interface ErrorResultResponse<T> {
    error: Error;
    result: T;
    response: azure.ServiceResponse;
}

export interface ErrorOrResponse {
    error: Error;
    response: azure.ServiceResponse;
}

export class DataProvider {

    private static TABLE_NAME = 'StravaWeatherman';
    private storage: azure.TableService;

    public async init() {
        const credentials = process.env.AzureWebJobsStorage;
        this.storage = azure.createTableService(credentials);
        return new Promise<ErrorResultResponse<azure.TableService.TableResult>>((resolve, reject) => {
            this.storage.createTableIfNotExists(DataProvider.TABLE_NAME, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    public getWeatherForActivityId = async (activityId: ActivityId): Promise<ActivityWeatherEntity> => {
        const response = await this.retrieveEntity<ActivityWeatherEntity>(PartitionKeys.ActivityWeather, String(activityId));

        return response
            && response.result;
    }

    public getUserIdForToken = async (token: AuthToken): Promise<UserId> => {
        const response = await this.retrieveEntity<TokenToUserIdEntity>(PartitionKeys.TokenToUser, token);

        return response
            && response.result
            && TokenToUserIdModel.fromEntity(response.result).userId;
    }

    public getUserSettings = async (userId: UserId): Promise<IUserSettings> => {
        const response = await this.retrieveEntity<UserSettingsEntity>(PartitionKeys.UserSettings, String(userId));

        return response
            && response.result
            && UserSettingsModel.fromEntity(response.result).userSettings;
    }

    public getProcessedActivities = async (userId: UserId): Promise<ActivityId[]> => {
        const query = new azure.TableQuery()
            .where('UserId eq ?', userId)
            .and('PartitionKey eq ?', PartitionKeys.ProcessedActivities);

        const response = await this.queryEntities<ProcessedActivityEntity>(query);
        return response
            && response.result
            && response.result.entries
            && response.result.entries
                .map(ProcessedActivityModel.fromEntity)
                .map(model => model.activityId);
    }

    public storeUserIdForToken = async (token: AuthToken, userId: UserId): Promise<void> => {
        const tokenToUserIdEntity = TokenToUserIdModel.toEntity(token, userId);

        await this.storeEntity(tokenToUserIdEntity)
    }

    public storeProcessedActivity = async (activityId: ActivityId, userId: UserId): Promise<void> => {
        const activityEntity = ProcessedActivityModel.toEntity(activityId, userId);
        await this.storeEntity(activityEntity);
    }

    public storeUserSettings = async (userId: UserId, userSettings: IUserSettings) => {
        const userSettingsEntity = UserSettingsModel.toEntity(userId, userSettings)
        return await this.storeEntity<any>(userSettingsEntity);
    }

    public async deleteEntity<T>(entity: T) {
        return new Promise<ErrorOrResponse>((resolve, reject) => {
            this.storage.deleteEntity<T>(DataProvider.TABLE_NAME, entity, (error, response) => {
                resolve({error, response});
            });
        });
    }

    private async storeEntity<T>(entity: T) {
        return new Promise<ErrorResultResponse<azure.TableService.EntityMetadata>>((resolve, reject) => {
            this.storage.insertOrReplaceEntity<T>(DataProvider.TABLE_NAME, entity, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    private async retrieveEntity<T>(partitionKey: PartitionKeys, id: string) {
        return new Promise<ErrorResultResponse<T>>((resolve, reject) => {
            this.storage.retrieveEntity<T>(DataProvider.TABLE_NAME, String(partitionKey), id, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    private async queryEntities<T>(query: azure.TableQuery, continuationToken?: azure.TableService.TableContinuationToken) {
        let result = await new Promise<ErrorResultResponse<azure.TableService.QueryEntitiesResult<T>>>((resolve, reject) => {

            this.storage.queryEntities<T>(DataProvider.TABLE_NAME, query, continuationToken, null, (error, result, response) => {
                console.log(`Query Entities Reults:\n${JSON.stringify(result.entries)}`);
                resolve({error, result, response});
            });
        });

        // If there is a continuation token, query recursively until they are all found
        // Replace the result object with a the continued result object with augmented entries
        if (result
            && result.result
            && result.result.continuationToken) {
            const continuedResult = await this.queryEntities<T>(query, result.result.continuationToken);

            continuedResult.result.entries.push(...result.result.entries);
            result = continuedResult;
        }

        return result;
    }
}