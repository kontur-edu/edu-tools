import { BrsApi } from '../apis/BrsApi.js';
import putMarksToBrsAsync, {
  PutMarksOptions,
  DisciplineConfig,
  ControlActionConfig,
  MarksData,
} from './putMarksToBrsAsync.js';

export type { PutMarksOptions, DisciplineConfig, ControlActionConfig, MarksData };

export default async function putMarksToBrsManualAsync(
  brsApi: BrsApi,
  marksData: MarksData,
  options: PutMarksOptions
) {
  try {
    await putMarksToBrsAsync(brsApi, marksData, options);
  } catch (e) {
    console.log(e);
  }
}
