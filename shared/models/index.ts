export type UserId = number;
export type ActivityId = number;
export type AuthToken = string;

export enum PartitionKeys {
    ActivityWeather = 'activityWeather',
    ProcessedActivities = 'processedActivities',
    TokenToUser = 'tokenToUser',
}