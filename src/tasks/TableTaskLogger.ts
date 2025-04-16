export interface TableTaskLogger {
  log(message?: string): void
}

export class ConsoleTableTaskLogger implements TableTaskLogger {
  log(message?: string): void {
    if (message) {
      console.log(message)
    } else {
      console.log()
    }
  }
}

export class CustomTableTaskLogger implements TableTaskLogger {
  constructor(private readonly appendText: (message?: string) => void) {
  }

  log(message?: string): void {
    if (message) {
      this.appendText(message)
    } else {
      this.appendText()
    }
  }
}
