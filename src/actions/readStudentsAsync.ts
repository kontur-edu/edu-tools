import { StudentFailure } from '../apis/BrsApi.js'
import { readCsvFile } from '../apis/NodeCsvFile.js'
import { NodeGoogleApi } from '../apis/NodeGoogleApi.js'
import { parseStudentFailure } from '../helpers/BrsHelpers.js'

export interface ActualStudent {
  fullName: string
  groupName: string
  id: string | null
  failure: StudentFailure | null
  properties: string[]
}

export async function fromSpreadsheetAsync(
  googleApi: NodeGoogleApi,
  spreadsheetId: string,
  readRange: string,
  fullNameIndex = 0,
  groupNameIndex = 1,
  idIndex: number | null = null,
  failureIndex: number | null = null,
) {
  const sheet = googleApi.openSpreadsheet(spreadsheetId)

  const rows = (await sheet.readAsync(readRange)).values || []

  const result: ActualStudent[] = []
  for (const row of rows) {
    const fullName = row[fullNameIndex]
    const groupName = row[groupNameIndex]
    const id = idIndex !== null ? row[idIndex] : null
    const failure = failureIndex !== null ? parseStudentFailure(row[failureIndex]) : null
    if (fullName && groupName) {
      result.push({
        fullName,
        groupName,
        id: id,
        failure: failure,
        properties: row,
      })
    }
  }
  return result
}

export function fromCvs(
  filePath: string,
  skipHeader = false,
  fullNameIndex = 0,
  groupNameIndex = 1,
  idIndex: number | null = null,
  failureIndex: number | null = null,
): ActualStudent[] {
  const rows = readCsvFile(filePath)
    .slice(skipHeader ? 1 : 0)
    .filter((columns) => columns.some((it) => it !== ''))
  const result = []
  for (const columns of rows) {
    if (columns.length <= fullNameIndex || columns.length <= groupNameIndex) {
      throw new Error(`Can't parse line of actual students file`)
    }
    result.push({
      fullName: columns[fullNameIndex],
      groupName: columns[groupNameIndex],
      id: idIndex !== null ? columns[idIndex] : null,
      failure: failureIndex !== null ? parseStudentFailure(columns[failureIndex]) : null,
      properties: columns,
    })
  }
  return result
}
