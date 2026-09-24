import { GoogleApi, Spreadsheet, SpreadsheetMeta, ValueRange } from './GoogleApi'

declare global {
  interface Window {
    gapi: any
  }
}

export class BrowserGoogleApi implements GoogleApi {
  private accessToken: string
  private isInitialized = false

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async initializeGapi() {
    if (this.isInitialized) return

    if (!window.gapi) {
      throw new Error('Google API не загружен')
    }

    // Инициализация клиента
    await new Promise<void>((resolve) => {
      window.gapi.load('client', resolve)
    })

    // Загрузка Sheets API
    await window.gapi.client.load('sheets', 'v4')

    // Установка токена
    window.gapi.client.setToken({
      access_token: this.accessToken,
    })

    this.isInitialized = true
  }

  openSpreadsheet(spreadsheetId: string): Spreadsheet {
    return {
      getMetaAsync: () => this.getMetaAsync(spreadsheetId),
      readAsync: (range: string) => this.readRange(spreadsheetId, range),
      writeAsync: (range: string, values: any[][], asEnteredByUser?: boolean) =>
        this.writeRange(spreadsheetId, range, values, asEnteredByUser),
      appendAsync: (range: string, values: any[][], asEnteredByUser?: boolean) =>
        this.appendRange(spreadsheetId, range, values, asEnteredByUser),
    }
  }

  private async getMetaAsync(spreadsheetId: string): Promise<SpreadsheetMeta> {
    await this.initializeGapi()
    const response = await window.gapi.client.sheets.spreadsheets.get({ spreadsheetId })
    return response.result as SpreadsheetMeta
  }

  private async readRange(spreadsheetId: string, range: string): Promise<ValueRange> {
    await this.initializeGapi()
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      // Отображаемые значения (строки, как их видит пользователь): на них опирается разбор задания.
      valueRenderOption: 'FORMATTED_VALUE',
    })
    return response.result
  }

  private async writeRange(spreadsheetId: string, range: string, values: any[][], asEnteredByUser?: boolean) {
    await this.initializeGapi()
    const response = await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: asEnteredByUser ? 'USER_ENTERED' : 'RAW',
      resource: {
        values,
      },
    })
    return response.result
  }

  private async appendRange(spreadsheetId: string, range: string, values: any[][], asEnteredByUser?: boolean) {
    await this.initializeGapi()
    const response = await window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: asEnteredByUser ? 'USER_ENTERED' : 'RAW',
      resource: {
        values,
      },
    })
    return response.result
  }
}
