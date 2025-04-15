import { BrsApi, Discipline } from '../apis/BrsApi.js';
import putMarksToBrsAsync, {
  PutMarksOptions,
  DisciplineConfig,
  ControlActionConfig,
  MarksData,
} from './putMarksToBrsAsync.js';
import buildAutoMarksConfigAsync from './buildAutoMarksConfigAsync.js';
import { ActualStudent } from './readStudentsAsync.js';
import { NodeGoogleApi } from '../apis/NodeGoogleApi.js';

export type { PutMarksOptions, DisciplineConfig, ControlActionConfig, MarksData };

export default async function putMarksAutoAsync(
  brsApi: BrsApi,
  googleApi: NodeGoogleApi,
  spreadsheetId: string,
  sheetName: string,
  options: PutMarksOptions,
  isSuitableDiscipline: ((d: Discipline) => boolean) | null = null,
  isSuitableActualStudent: ((s: ActualStudent) => boolean) | null = null,
) {
  const marksData = await buildAutoMarksConfigAsync(
    googleApi,
    spreadsheetId,
    sheetName,
    isSuitableDiscipline,
    isSuitableActualStudent
  );

  try {
    await putMarksToBrsAsync(brsApi, marksData, options);
  } catch (e) {
    console.log(e);
  }
}
