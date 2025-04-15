const CORS_PROXY = "https://bbamc5stve2edro7t455.containers.yandexcloud.net";

export class CorsProxyUrlProvider {
    private readonly withProxy: boolean;
    private readonly serviceUrl: string;

    constructor(serviceUrl: string, withProxy: boolean) {
        this.serviceUrl = serviceUrl
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${this.serviceUrl}` : this.serviceUrl;
    }

    prepareHeaders(headers: {[P in string]: string}): {[P in string]: string} {
        if (!this.withProxy) {
            return headers
        }

        const result = { ...headers }
        result['X-Cookie'] = result['Cookie']
        delete result['Cookie']
        result['X-Authorization'] = result['Authorization']
        delete result['Authorization']
        return result
    }
}
