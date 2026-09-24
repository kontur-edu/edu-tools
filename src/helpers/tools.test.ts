import { describe, expect, it } from 'vitest'
import {
  buildFormData,
  compareNormalized,
  escapeRegExp,
  fixSpaces,
  normalizeString,
  parseAnyFloat,
  replaceAll,
  startsWithNormalized,
} from './tools'

// Характеризационные тесты: фиксируют текущее поведение хелперов.

const NBSP = String.fromCharCode(0xa0)

describe('fixSpaces', () => {
  it('заменяет любые пробельные символы (NBSP, таб, перевод строки) обычным пробелом', () => {
    expect(fixSpaces(`Иванов${NBSP}Иван\tИванович\nx`)).toBe('Иванов Иван Иванович x')
  })

  it('не схлопывает подряд идущие пробелы', () => {
    expect(fixSpaces(`a ${NBSP}b`)).toBe('a  b')
  })

  it('пустую строку возвращает как есть', () => {
    expect(fixSpaces('')).toBe('')
  })
})

describe('normalizeString', () => {
  it('приводит к нижнему регистру, заменяет ё на е и убирает всё, кроме букв, цифр и точки', () => {
    expect(normalizeString('Ёлкин  Пётр, МЕН-210201 (ИРИТ-РТФ)!')).toBe('елкинпетрмен210201иритртф')
  })

  it('сохраняет точки и латиницу', () => {
    expect(normalizeString('Web Dev 2.0')).toBe('webdev2.0')
  })

  it('пустую строку возвращает как есть', () => {
    expect(normalizeString('')).toBe('')
  })
})

describe('compareNormalized', () => {
  it('считает равными строки, отличающиеся регистром, ё/е, пробелами и пунктуацией', () => {
    expect(compareNormalized('Ёжиков Семён', 'ежиков-семен')).toBe(true)
  })

  it('различает строки с разными буквами', () => {
    expect(compareNormalized('Иванов', 'Иванова')).toBe(false)
  })
})

describe('startsWithNormalized', () => {
  it('сравнивает префикс после нормализации обеих строк', () => {
    expect(startsWithNormalized('Основы программирования (часть 1)', 'ОСНОВЫ ПРОГРАММ')).toBe(true)
  })

  it('возвращает false, если префикс не совпадает', () => {
    expect(startsWithNormalized('Основы программирования', 'Программирование')).toBe(false)
  })
})

describe('parseAnyFloat', () => {
  it('понимает десятичную запятую', () => {
    expect(parseAnyFloat('12,5')).toBe(12.5)
  })

  it('понимает десятичную точку', () => {
    expect(parseAnyFloat('12.5')).toBe(12.5)
  })

  it('заменяет только первую запятую и отбрасывает хвост, как parseFloat', () => {
    expect(parseAnyFloat('1,5,7')).toBe(1.5)
    expect(parseAnyFloat('40 баллов')).toBe(40)
  })

  it('даёт NaN для пустой строки и нечисла', () => {
    expect(parseAnyFloat('')).toBeNaN()
    expect(parseAnyFloat('н/я')).toBeNaN()
  })
})

describe('replaceAll', () => {
  it('заменяет все вхождения, трактуя образец буквально, а не как регулярное выражение', () => {
    expect(replaceAll('a.b.c', '.', '-')).toBe('a-b-c')
    expect(replaceAll('1+1=2', '1+1', 'x')).toBe('x=2')
  })
})

describe('escapeRegExp', () => {
  it('экранирует спецсимволы регулярных выражений', () => {
    expect(escapeRegExp('a.b*c(d)')).toBe('a\\.b\\*c\\(d\\)')
  })
})

describe('buildFormData', () => {
  it('собирает x-www-form-urlencoded строку с URL-кодированием ключей и значений', () => {
    expect(buildFormData({ name: 'Иван Иванов', mark: 5, 'a&b': 'c=d' })).toBe(
      'name=%D0%98%D0%B2%D0%B0%D0%BD%20%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2&mark=5&a%26b=c%3Dd',
    )
  })
})
