export function fixSpaces(str: string) {
  return str && str.replace(/[\s]/g, ' ')
}

export function normalizeString(str: string) {
  return (
    str &&
    str
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^A-Za-zА-ЯЁа-яё0-9]/g, '')
  )
}

export function compareNormalized(s1: string, s2: string) {
  return normalizeString(s1) === normalizeString(s2)
}

export function startsWithNormalized(str: string, prefix: string) {
  return normalizeString(str).startsWith(normalizeString(prefix))
}

export function parseAnyFloat(s: string) {
  return parseFloat(s && s.replace(',', '.'))
}

export function replaceAll(str: string, find: string, replace: string) {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace)
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function buildFormData(data: { [key: string]: any }): string {
  return Object.keys(data)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key].toString())}`)
    .join('&')
}
