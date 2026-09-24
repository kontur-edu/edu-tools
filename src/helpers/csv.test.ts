import { describe, expect, it } from 'vitest'
import { formatCsv, parseCsv } from './csv'

describe('parseCsv', () => {
  it('разбирает строки и значения через запятую', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('значение в кавычках может содержать запятую, удвоенную кавычку и перевод строки', () => {
    expect(parseCsv('"1, 2","say ""hi""","line1\nline2",x')).toEqual([['1, 2', 'say "hi"', 'line1\nline2', 'x']])
  })

  it('понимает переводы строк \\r\\n, в том числе внутри кавычек', () => {
    expect(parseCsv('a,"b\r\nc"\r\nd,e')).toEqual([
      ['a', 'b\r\nc'],
      ['d', 'e'],
    ])
  })

  it('игнорирует BOM в начале текста', () => {
    expect(parseCsv('﻿$keys,$values')).toEqual([['$keys', '$values']])
  })

  it('завершающий перевод строки не создаёт лишнюю строку', () => {
    expect(parseCsv('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('сохраняет пустые ячейки и пустые строки в середине, чтобы номера строк совпадали с листом', () => {
    expect(parseCsv('a,,\n\n,b')).toEqual([['a', '', ''], [''], ['', 'b']])
  })

  it('пустой текст — пустая сетка', () => {
    expect(parseCsv('')).toEqual([])
  })
})

describe('formatCsv', () => {
  it('берёт в кавычки только значения с запятой, кавычкой или переводом строки', () => {
    expect(formatCsv([['plain', '1, 2', 'say "hi"', 'a\nb', ''], ['x']])).toBe('plain,"1, 2","say ""hi""","a\nb",\nx')
  })

  it('не добавляет BOM', () => {
    expect(formatCsv([['a']]).charCodeAt(0)).not.toBe(0xfeff)
  })

  it('круговая конвертация сохраняет значения ячеек', () => {
    const grid = [['$keys', '$values', '$Name'], ['task', 'X', 'Иванов, Иван'], [''], ['', '', '"q"\r\nw']]
    expect(parseCsv(formatCsv(grid))).toEqual(grid)
  })
})
