import { CorsProxyUrlProvider } from '../helpers/CorsProxyUrlProvider'

const PARTNER_BASE_URL = 'https://partner.urfu.ru'

export class PartnerUrlProvider extends CorsProxyUrlProvider {
    constructor(withProxy: boolean) {
        super(PARTNER_BASE_URL, withProxy)
    }
}
