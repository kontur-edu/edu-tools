export interface GoogleApi {
  openSpreadsheet(spreadsheetId: string): Spreadsheet
}

export interface Spreadsheet {
  readAsync: (range: string) => Promise<ValueRange>
  writeAsync: (range: string, values: any[][], asEnteredByUser?: boolean) => Promise<any>
  appendAsync: (range: string, values: any[][], asEnteredByUser?: boolean) => Promise<any>
}

export interface ValueRange {
  majorDimension?: string
  range?: string
  values?: any[][]
}
