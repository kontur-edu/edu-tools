export default class JustDate {
  year: number;
  month: number;
  day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  toDashedString() {
    return `${this.year}-${this.month.toString().padStart(2, '0')}-${this.day
      .toString()
      .padStart(2, '0')}`;
  }
}
