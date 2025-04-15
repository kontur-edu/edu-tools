import { CorsProxyUrlProvider } from "../helpers/CorsProxyUrlProvider";

const BRS_BASE_URL = "https://brs.urfu.ru";

export class BrsUrlProvider extends CorsProxyUrlProvider {
    constructor(withProxy: boolean) {
        super(BRS_BASE_URL, withProxy)
    }
}
