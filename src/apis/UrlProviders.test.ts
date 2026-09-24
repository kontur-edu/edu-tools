import { describe, expect, it } from 'vitest'
import { CorsProxyUrlProvider } from '../helpers/CorsProxyUrlProvider'
import { BrsUrlProvider } from './BrsUrlProvider'
import { ItsUrlProvider } from './ItsUrlProvider'
import { PartnerUrlProvider } from './PartnerUrlProvider'
import { TeamProjectUrlProvider } from './TeamProjectUrlProvider'

// Характеризационные тесты: фиксируют адреса систем во всех *UrlProvider этой папки.
// Поведение proxy проверяется в src/helpers/CorsProxyUrlProvider.test.ts.

describe.each([
  { name: 'BrsUrlProvider', create: (withProxy: boolean) => new BrsUrlProvider(withProxy), url: 'https://brs.urfu.ru' },
  { name: 'ItsUrlProvider', create: (withProxy: boolean) => new ItsUrlProvider(withProxy), url: 'https://its.urfu.ru' },
  {
    name: 'PartnerUrlProvider',
    create: (withProxy: boolean) => new PartnerUrlProvider(withProxy),
    url: 'https://partner.urfu.ru',
  },
  {
    name: 'TeamProjectUrlProvider',
    create: (withProxy: boolean) => new TeamProjectUrlProvider(withProxy),
    url: 'https://teamproject.urfu.ru/api/v2',
  },
])('$name', ({ create, url }) => {
  it('без proxy отдаёт адрес системы', () => {
    expect(create(false).baseUrl).toBe(url)
  })

  it('с proxy отдаёт адрес системы через CORS-proxy', () => {
    expect(create(true).baseUrl).toBe(new CorsProxyUrlProvider(url, true).baseUrl)
  })
})
