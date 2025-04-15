const TEAM_PROJECT_BASE_URL = 'https://teamproject.urfu.ru/api/v2'
const CORS_PROXY = "https://bbamc5stve2edro7t455.containers.yandexcloud.net";

export class TeamProjectUrlProvider {
    private readonly withProxy: boolean;

    constructor(withProxy: boolean) {
        this.withProxy = withProxy;
    }

    get baseUrl() {
        return this.withProxy ? `${CORS_PROXY}/${TEAM_PROJECT_BASE_URL}` : TEAM_PROJECT_BASE_URL;
    }
}
