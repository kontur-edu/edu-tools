import { CorsProxyUrlProvider } from "../helpers/CorsProxyUrlProvider";

const ITS_BASE_URL = 'https://its.urfu.ru'

export class ItsUrlProvider extends CorsProxyUrlProvider {
    constructor(withProxy: boolean) {
        super(ITS_BASE_URL, withProxy)
    }
}
