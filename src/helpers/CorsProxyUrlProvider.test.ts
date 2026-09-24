import { describe, expect, it } from 'vitest'
import { CorsProxyUrlProvider } from './CorsProxyUrlProvider'

// Характеризационные тесты: фиксируют текущее поведение CORS-proxy.

const CORS_PROXY = 'https://bbamc5stve2edro7t455.containers.yandexcloud.net'
const SERVICE_URL = 'https://example.org'

const createProvider = (withProxy: boolean) => new CorsProxyUrlProvider(SERVICE_URL, withProxy)

describe('CorsProxyUrlProvider.baseUrl', () => {
  it('без proxy отдаёт адрес сервиса', () => {
    expect(createProvider(false).baseUrl).toBe(SERVICE_URL)
  })

  it('с proxy дописывает адрес сервиса к адресу CORS-proxy', () => {
    expect(createProvider(true).baseUrl).toBe(`${CORS_PROXY}/${SERVICE_URL}`)
  })
})

describe('CorsProxyUrlProvider.prepareHeaders', () => {
  const headers = { Cookie: 'sid=1', Authorization: 'Bearer t', Accept: 'application/json' }

  it('без proxy возвращает заголовки без изменений', () => {
    expect(createProvider(false).prepareHeaders(headers)).toStrictEqual(headers)
  })

  it('с proxy переносит Cookie и Authorization в X-Cookie и X-Authorization, не меняя исходный объект', () => {
    const original = { ...headers }
    expect(createProvider(true).prepareHeaders(headers)).toStrictEqual({
      'X-Cookie': 'sid=1',
      'X-Authorization': 'Bearer t',
      Accept: 'application/json',
    })
    expect(headers).toStrictEqual(original)
  })

  it('с proxy добавляет X-заголовки со значением undefined, даже если исходных заголовков не было', () => {
    expect(createProvider(true).prepareHeaders({ Accept: 'text/html' })).toStrictEqual({
      Accept: 'text/html',
      'X-Cookie': undefined,
      'X-Authorization': undefined,
    })
  })
})
