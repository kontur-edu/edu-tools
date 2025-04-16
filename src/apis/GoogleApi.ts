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

export async function getSheetNameAsync(
  googleApi: GoogleApi,
  spreadsheetId: string,
  sheetId: string | null
): Promise<string | null> {
  try {
    const meta = await googleApi.openSpreadsheet(spreadsheetId).getMetaAsync();
    const sheets = meta.sheets.map((it) => it.properties);
    const maybeSheet = sheetId
      ? sheets.filter((s) => s.sheetId.toString() === sheetId)[0]
      : sheets[0];
    if (!maybeSheet) {
      return null;
    }
    return maybeSheet.title;
  } catch (e: any) {
    return null;
  }
}

export function parseSpreadsheetUrl(url: string): { spreadsheetId: string; sheetId: string | null } | null {
  const regExp = /d\/(?<spreadsheetId>[a-zA-Z0-9-_]+)\/edit(\?gid=(?<querySheetId>[0-9]+))?(#gid=(?<hashSheetId>[0-9]+))?/;
  const spreadsheetInfo = url.match(regExp);

  if (!spreadsheetInfo?.groups || !spreadsheetInfo.groups.spreadsheetId) {
    return null;
  }

  const spreadsheetId = spreadsheetInfo.groups.spreadsheetId;
  const sheetId = spreadsheetInfo.groups.hashSheetId || spreadsheetInfo.groups.querySheetId || null;

  return { spreadsheetId, sheetId };
}
