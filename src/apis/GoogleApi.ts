export interface GoogleApi {
  openSpreadsheet(spreadsheetId: string): Spreadsheet
}

export interface Spreadsheet {
  getMetaAsync: () => Promise<SpreadsheetMeta>
  readAsync: (range: string) => Promise<ValueRange>
  writeAsync: (range: string, values: any[][], asEnteredByUser?: boolean) => Promise<any>
  appendAsync: (range: string, values: any[][], asEnteredByUser?: boolean) => Promise<any>
}

export interface ValueRange {
  majorDimension?: string
  range?: string
  values?: any[][]
}

export interface SpreadsheetMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: SpreadsheetProperties;
  sheets: Sheet[];
}

export interface SpreadsheetProperties {
  title: string;
}

export interface Sheet {
  properties: SheetProperties;
}

export interface SheetProperties {
  hidden: boolean;
  index: number;
  sheetId: number;
  sheetType: string;
  title: string;
}
