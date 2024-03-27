import { google } from 'googleapis'
import { GoogleAuth } from './GoogleAuth.js'

export class GoogleApi {
  auth: GoogleAuth

  constructor(auth: GoogleAuth) {
    this.auth = auth
  }

  openSpreadsheet(spreadsheetId: string): Spreadsheet {
    const authClient = this.auth.authClient

    async function readAsync(range: string) {
      const sheets = google.sheets({ version: 'v4', auth: authClient })
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      })
      return response.data as ValueRange
    }

    function writeAsync(range: string, values: any[][], asEnteredByUser = false) {
      const sheets = google.sheets({ version: 'v4', auth: authClient })
      const valueInputOption = asEnteredByUser ? 'USER_ENTERED' : 'RAW'
      const requestBody = {
        values,
      }
      return sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody,
      })
    }

    function appendAsync(range: string, values: any[][], asEnteredByUser = false) {
      const sheets = google.sheets({ version: 'v4', auth: authClient })
      const valueInputOption = asEnteredByUser ? 'USER_ENTERED' : 'RAW'
      const requestBody = {
        values,
      }
      return sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption,
        requestBody,
      })
    }

    return {
      readAsync,
      writeAsync,
      appendAsync,
    }
  }
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
