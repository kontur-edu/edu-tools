export default class JustDate {
  year: number
  month: number
  day: number

  constructor(year: number, month: number, day: number) {
    this.year = year
    this.month = month
    this.day = day
  }

  toDashedString() {
    return `${this.year}-${this.month.toString().padStart(2, '0')}-${this.day.toString().padStart(2, '0')}`
  }

  static fromString(str: string): JustDate {
    return str.indexOf('-') >= 0 ? this.fromDashedString(str) : this.fromCommonString(str)
  }

  static fromCommonString(str: string): JustDate {
    const parts = str.trim().split('.')
    const year = parseInt(parts[2], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[0], 10)
    return new JustDate(year, month, day)
  }

  static fromDashedString(str: string): JustDate {
    const parts = str.trim().split('-')
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    return new JustDate(year, month, day)
  }
}
