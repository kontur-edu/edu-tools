import { BrsApi, Discipline } from '../apis/BrsApi.js';
import putMarksToBrsAsync, {
  PutMarksOptions,
  DisciplineConfig,
  ControlActionConfig,
  MarksData,
} from './putMarksToBrsAsync.js';
import buildAutoMarksConfigAsync from './buildAutoMarksConfigAsync.js';
import { ActualStudent } from './readStudentsAsync.js';
import { GoogleApi } from '../apis/GoogleApi.js';

export { PutMarksOptions, DisciplineConfig, ControlActionConfig, MarksData };

export default async function putMarksAutoAsync(
  brsApi: BrsApi,
  googleApi: GoogleApi,
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
