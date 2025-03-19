import { StudentFailure, TermType } from './apis/BrsApi.js';
import putMarksToBrsManualAsync, {
  DisciplineConfig,
  ControlActionConfig,
} from './actions/putMarksToBrsManualAsync.js';
import putMarksToBrsAutoAsync from './actions/putMarksToBrsAutoAsync.js';
import * as readStudents from './actions/readStudentsAsync.js';
import { BrsApi } from './apis/BrsApi.js';
import { BrsAuth } from './apis/BrsAuth.js';
import { FileApi } from './apis/FileApi.js';
import { GoogleApi } from './apis/GoogleApi.js';
import { GoogleAuth } from './apis/GoogleAuth.js';

async function runPutMarksForSample() {
  const login = 'login';
  const sid = 'sid';
  const dataCsv = './data/students2.csv'

  const fileApi = new FileApi();
  const actualStudents = readStudents.fromCvs(
    fileApi,
    dataCsv,
    true,
    1,
    0
  );

  // Подсказка: 0.Группа, 1.Фамилия и имя, 2.ЛР, 3.ДР1, 4.ДР2, 5.ДР3, 6.КР, 7.Экзамен
  const controlActionConfigs: ControlActionConfig[] = [
    {
      controlActions: ['Выполнение лабораторных работ и защита отчетов'],
      propertyIndex: 2,
    }, // Практики и активности
    {
      controlActions: ['домашняя работа'],
      matchIndex: 0,
      matchCount: 3,
      propertyIndex: 3,
    }, // Упражнения
    {
      controlActions: ['домашняя работа'],
      matchIndex: 1,
      matchCount: 3,
      propertyIndex: 4,
    }, // Упражнения
    {
      controlActions: ['домашняя работа'],
      matchIndex: 2,
      matchCount: 3,
      propertyIndex: 5,
    }, // Упражнения
    {
      controlActions: ['контрольная работа'],
      propertyIndex: 6,
    }, // Упражнения
    {
      controlActions: ['экзамен'],
      propertyIndex: 7,
    }, // Экзамен
  ];

  const disciplineConfig = {
    name: 'Крутой курс по программированию',
    isModule: false,
    year: 2018,
    termType: TermType.Spring,
    course: 1,
    defaultStudentFailure: StudentFailure.NoFailure,
  } as DisciplineConfig;

  const brsApi = new BrsApi(new BrsAuth(login, sid));
  await putMarksToBrsManualAsync(
    brsApi,
    { actualStudents, disciplineConfig, controlActionConfigs },
    {
      save: true,
      verbose: true,
    }
  );
}

async function runPutMarksAutoForSample() {
  const login = 'login';
  const sid = 'sid';
  const secretName = 'username-from-brs.json';
  // Пример таблицы для автоматической конфигурации
  // https://docs.google.com/spreadsheets/d/1Owzl3JfmFASIdC7ZMMw-0kkA3pwFSab1QdVO5dhZoxY/edit?usp=sharing
  const spreadsheetId = '1Owzl3JfmFASIdC7ZMMw-0kkA3pwFSab1QdVO5dhZoxY';
  const sheetName = 'БРС';

  const brsApi = new BrsApi(new BrsAuth(login, sid));
  const googleApi = new GoogleApi(await GoogleAuth.createAsync('ask-if-not-saved'));
  await putMarksToBrsAutoAsync(
    brsApi,
    googleApi,
    spreadsheetId,
    sheetName,
    {
      save: true,
      verbose: true,
    },
    (discipline) => discipline.group !== 'BAD-140934'
  );
}
