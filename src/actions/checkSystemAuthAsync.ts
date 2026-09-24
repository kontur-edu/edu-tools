import { BrsApi, TermType } from '../apis/BrsApi'
import { ItsApiV2 } from '../apis/ItsApiV2'
import { PartnerApi } from '../apis/PartnerApi'
import { TeamProjectApiV2 } from '../apis/TeamProjectApiV2'

/**
 * Пробные запросы на чтение для проверки учётных данных систем УрФУ.
 * Общие для web (сторы) и CLI (`auth check`). Возвращают `false`, если система ответила,
 * но данные не приняла; сетевые и прочие исключения пробрасываются — их классифицирует вызывающий.
 */
export async function checkBrsAuthAsync(api: BrsApi): Promise<boolean> {
  const result = await api.getDisciplinesAsync(2025, TermType.Fall, 1, false)
  return result !== null
}

export async function checkItsAuthAsync(api: ItsApiV2): Promise<boolean> {
  await api.getProjectListAsync([], [], [])
  return true
}

export async function checkTeamProjectAuthAsync(api: TeamProjectApiV2): Promise<boolean> {
  const result = await api.getWorkspacesAsync('active', 2000, 1, 1, 10)
  return result !== null
}

export async function checkPartnerAuthAsync(api: PartnerApi): Promise<boolean> {
  const result = await api.getProjectAsync(26654)
  return result !== null
}
