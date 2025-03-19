import { BrsApi } from '../apis/BrsApi.js';
import { Discipline, StudentFailure } from '../apis/BrsApi.js';
import putMarksForDisciplineAsync, {
  PutMarksOptions,
  ControlActionConfig,
} from './putMarksForDisciplineAsync.js';
import { compareNormalized } from '../helpers/tools.js';
import { ActualStudent } from './readStudentsAsync.js';

export { PutMarksOptions, ControlActionConfig };

export default async function putMarksToBrsAsync(
  brsApi: BrsApi,
  marksData: MarksData,
  options: PutMarksOptions
) {
  const { actualStudents, disciplineConfig, controlActionConfigs } = marksData;
  const disciplines = await getSuitableDisciplinesAsync(brsApi, disciplineConfig);

  for (const discipline of disciplines) {
    await putMarksForDisciplineAsync(
      brsApi,
      discipline,
      actualStudents.filter((s) =>
        compareNormalized(s.groupName, discipline.group)
      ),
      disciplineConfig.defaultStudentFailure,
      controlActionConfigs,
      options
    );
  }
}

async function getSuitableDisciplinesAsync(brsApi: BrsApi, disciplineConfig: DisciplineConfig) {
  const allDisciplines = await brsApi.getDisciplinesAsync(
    disciplineConfig.year,
    disciplineConfig.termType,
    disciplineConfig.course,
    disciplineConfig.isModule
  );
  const disciplines = allDisciplines.filter(
    (d) =>
      compareNormalized(d.discipline, disciplineConfig.name) &&
      (!disciplineConfig.isSuitableDiscipline ||
        disciplineConfig.isSuitableDiscipline(d))
  );
  return disciplines;
}

export interface MarksData {
  actualStudents: ActualStudent[];
  disciplineConfig: DisciplineConfig;
  controlActionConfigs: ControlActionConfig[];
}

export interface DisciplineConfig {
  name: string;
  year: number;
  termType: number;
  course: number;
  isModule: boolean;
  defaultStudentFailure: StudentFailure;
  isSuitableDiscipline: ((d: Discipline) => boolean) | null;
}
