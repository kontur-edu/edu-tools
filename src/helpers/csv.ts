// CSV codec: текст ⇄ сетка значений по правилам Table sources (RFC 4180, разделитель `,`).
// Без файловой системы: работает и в браузере, и в Node.

export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false
  let lineStart = true

  for (let i = 0; i < text.length; i++) {
    lineStart = false
    const c = text[i]
    if (quoted) {
      if (c !== '"') {
        value += c
      } else if (text[i + 1] === '"') {
        value += '"'
        i++
      } else {
        quoted = false
      }
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(value)
      value = ''
    } else if (c === '\n' || (c === '\r' && text[i + 1] === '\n')) {
      if (c === '\r') i++
      row.push(value)
      rows.push(row)
      row = []
      value = ''
      lineStart = true
    } else {
      value += c
    }
  }
  // Завершающий перевод строки (или пустой текст) не начинает новую строку.
  if (!lineStart) {
    row.push(value)
    rows.push(row)
  }

  return rows
}

export function formatCsv(grid: string[][]): string {
  return grid.map((row) => row.map(formatValue).join(',')).join('\n')
}

function formatValue(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}
