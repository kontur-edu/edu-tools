const BRS_BASE_URL = "https://brs.urfu.ru";
const CORS_PROXY = "https://bbamc5stve2edro7t455.containers.yandexcloud.net";

export class BrsUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${BRS_BASE_URL}` : BRS_BASE_URL;
    }
}
