import { describe, expect, it } from 'vitest'
import JustDate from './JustDate'

// Характеризационные тесты: фиксируют текущее поведение JustDate.

describe('JustDate', () => {
  it('форматирует дату как YYYY-MM-DD с ведущими нулями', () => {
    expect(new JustDate(2026, 9, 1).toDashedString()).toBe('2026-09-01')
  })

  it('разбирает формат DD.MM.YYYY', () => {
    expect(JustDate.fromString('01.09.2026')).toEqual(new JustDate(2026, 9, 1))
  })

  it('разбирает формат YYYY-MM-DD', () => {
    expect(JustDate.fromString('2026-09-01')).toEqual(new JustDate(2026, 9, 1))
  })

  it('обрезает крайние пробелы и понимает части без ведущих нулей', () => {
    expect(JustDate.fromString(' 1.9.2026 ')).toEqual(new JustDate(2026, 9, 1))
  })

  it('проходит круг «строка → дата → строка» без потерь', () => {
    expect(JustDate.fromString('2026-12-31').toDashedString()).toBe('2026-12-31')
  })

  it('не валидирует дату: несуществующий день и мусор дают поля как есть или NaN', () => {
    expect(JustDate.fromString('31.02.2026')).toEqual(new JustDate(2026, 2, 31))
    expect(JustDate.fromString('завтра')).toEqual(new JustDate(NaN, NaN, NaN))
  })
})
