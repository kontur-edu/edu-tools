const ITS_BASE_URL = 'https://its.urfu.ru'
const CORS_PROXY = "https://bbamc5stve2edro7t455.containers.yandexcloud.net";

export class ItsUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${ITS_BASE_URL}` : ITS_BASE_URL;
    }
}
