const PARTNER_BASE_URL = 'https://partner.urfu.ru'
const CORS_PROXY = "https://bbamc5stve2edro7t455.containers.yandexcloud.net";

export class PartnerUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${PARTNER_BASE_URL}` : PARTNER_BASE_URL;
    }
}
