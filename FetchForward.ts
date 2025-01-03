import { MessageBuilder } from "../zeppos/message";

interface FetchParams {
    method?: string;
    url?: string;
    timeout?: number;
    [key: string]: any;
}

interface FetchResponse {
    status: number;
    json: () => Promise<any>;
}

interface FetchRequest {
    package: string;
    data: FetchParams;
}

interface FetchContext {
    response: (data: { data: { status: number; json: any } }) => void;
}

let messageBuilder: MessageBuilder;

export function prepareFetch(builder: MessageBuilder): void {
    messageBuilder = builder;
}

export function clientFetch(url: string, params: FetchParams = {}): Promise<FetchResponse> {
    const fetchData: FetchParams = {
        method: "GET",
        url,
        ...params,
    };

    return messageBuilder.request({
        package: "fetch_fwd",
        data: fetchData
    }, {timeout: params.timeout ?? 120000}).then((r: any) => {
        return {
            status: r.status,
            json: () => Promise.resolve(r.json),
        };
    });
}

export function handleFetchRequest(ctx: FetchContext, request: FetchRequest): void {
    if(request.package !== "fetch_fwd") return;
    const fetchRequest = request.data;

    console.log(fetchRequest.method, fetchRequest.url, fetchRequest);
    const { url, method, ...options } = fetchRequest;
    fetch(url!, { method, ...options }).then((res: any) => {
        let data = res.body;
        if (typeof res.body === 'string') {
            try {
                data = JSON.parse(res.body);
            } catch(e) {
                data = null;
            }
        }

        console.log(res.status, data);
        ctx.response({
            data: {
                status: res.status,
                json: data
            }
        });
    }).catch((e: Error) => {
        ctx.response({
            data: {
                status: 0,
                json: {error: `${e.name}: ${e.message}`}
            }
        });
    });
} 