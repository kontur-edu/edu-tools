import { CorsProxyUrlProvider } from "../helpers/CorsProxyUrlProvider";

const TEAM_PROJECT_BASE_URL = 'https://teamproject.urfu.ru/api/v2'

export class TeamProjectUrlProvider extends CorsProxyUrlProvider {
    constructor(withProxy: boolean) {
        super(TEAM_PROJECT_BASE_URL, withProxy)
    }
}
