# CORS-proxy
Status: Draft (2026-09-23)

Системы УрФУ не отдают CORS-заголовки, а браузер не даёт выставлять `Cookie` в `fetch`. Поэтому web обращается к ним через собственный прокси (`cors-proxy/`, форк `cors-anywhere`).

## Контракт
- URL запроса: `<CORS_PROXY>/<полный URL целевой системы>`.
- Браузер кладёт учётные данные в `X-Cookie` и `X-Authorization`, прокси переносит их в `Cookie` и `Authorization`.
- `Set-Cookie` ответа отдаётся браузеру как `X-Set-Cookie`.
- Подстановку заголовков делает `CorsProxyUrlProvider.prepareHeaders`; каждый `*UrlProvider` включает прокси флагом `withProxy` (web — `true`, Node — `false`).

## Развёртывание
Docker-образ в Yandex Container Registry → Yandex Serverless Container (`cors-proxy/deploy.sh`). Адрес прокси захардкожен в `src/helpers/CorsProxyUrlProvider.ts` и `brs-extensions/src/Constants.ts`.
