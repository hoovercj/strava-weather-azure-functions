import { Context, HttpRequest } from 'azure-functions-ts-essentials';

export async function run(context: Context, req: HttpRequest) {
    context.res = {
        status: 200,
        body: '',
    };
};
