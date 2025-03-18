import { Semester, TeamProjectApiV2, Workspace } from '../apis/TeamProjectApiV2.js'
import { TableTaskValue } from './TableTask.js'

export class WorkspaceInfo {
  url: string | null
  name: string | null
  number: number | null
  id: string | null
  key: string | null

  constructor(url: string | null, name: string | null, number: number | null, id: string | null, key: string | null) {
    this.url = url
    this.name = name
    this.number = number
    this.id = id
    this.key = key
  }

  static extractFromRow(row: { [key: string]: string }): WorkspaceInfo | null {
    const projectUrl = TableTaskValue.extract(row, 'projectUrl').getString()
    const projectName = TableTaskValue.extract(row, 'projectName').getString()
    const projectInstanceNumber = TableTaskValue.extract(row, 'projectInstanceNumber').getInt()

    const projectIdMatch =
      projectUrl && projectUrl.match(/https:\/\/teamproject.urfu.ru\/#\/([0-9abcdefABCDEF\-]+)(\/[a-zA-Z0-9])?/)
    const projectId = (projectIdMatch && projectIdMatch[1]) || null
    const key = buildKey(projectName, projectInstanceNumber, projectId)

    if (key) {
      const info = new WorkspaceInfo(projectUrl, projectName, projectInstanceNumber, projectId, key)
      return info
    }

    return null
  }

  checkMatch(workspace: Workspace) {
    return this.id ? this.id === workspace.id : this.key === buildKeyForWorkspace(workspace)
  }

  static async getWorkspacesByInfosAsync(
    teamProjectApi: TeamProjectApiV2,
    academicYear: number,
    semester: Semester,
    infos: Array<WorkspaceInfo>,
  ) {
    const pageSize = 100
    const workspaces: Workspace[] = []
    let pageNumber = 1
    let total = pageSize
    while ((pageNumber - 1) * pageSize < total) {
      const r = await teamProjectApi.getWorkspacesAsync('active', academicYear, semester, pageNumber, pageSize)
      if (r) {
        workspaces.push(...r.items)
        total = r.total
      }
      pageNumber++
    }

    const keySet: { [k: string]: boolean } = {}
    for (const info of infos) {
      if (info.id) {
        keySet[info.id] = true
      } else if (info.key) {
        keySet[info.key] = true
      }
    }
    const result = workspaces.filter((it) => keySet[it.id] || keySet[buildKeyForWorkspace(it)])

    return result
  }
}

function buildKey(name: string | null, number: number | null, id: string | null): string | null {
  return name && number ? `${name} (${number})` : id
}

function buildKeyForWorkspace(workspace: Workspace): string {
  return workspace.title && workspace.instanceNumber ? `${workspace.title} (${workspace.instanceNumber})` : workspace.id
}
