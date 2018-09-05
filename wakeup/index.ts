import { Context, HttpRequest } from 'azure-functions-ts-essentials';

export function run(context: Context, req: HttpRequest) {
    context.res = {
        status: 200,
        body: '',
    };
    context.done();
};
