import { PartnerAuth } from "./PartnerAuth"
import { PartnerUrlProvider } from "./PartnerUrlProvider"

export class PartnerApi {
  private readonly auth: PartnerAuth
  private readonly urlProvider: PartnerUrlProvider

  constructor(auth: PartnerAuth, urlProvider: PartnerUrlProvider) {
    this.auth = auth
    this.urlProvider = urlProvider
  }

  async getProjectAsync(id: number): Promise<Project | null> {
    const uri = `/learning/request/${id}/`
    const cookieHeader = `key=${this.auth.key}`
    const response = await fetch(this.urlProvider.baseUrl + uri, {
      method: 'GET',
      headers: this.urlProvider.prepareHeaders({
        Cookie: cookieHeader,
      }),
    })
    if (response.status === 200) {
      return (await response.json()) as Project
    }
    return null
  }
}

export type HtmlString = string
export type DateString = string
export type DateTimeString = string
export type Id = number

export type ProjectRoleType = 'MCUR' | 'RROP'
export type DifficultyType = 'TYPA' | 'TYPB' | 'TYPC'
export type WorkType = 'APPL' | 'DSCV'

interface Project {
  id: Id
  name: string
  date: string
  goal: HtmlString
  result: HtmlString
  description: HtmlString
  criteria: HtmlString
  request_status: string
  partner: Partner
  uid: string
  req_files: []
  proj_files: []
  manager: Manager
  max_copies: 5
  rop_status: string
  req_name: string
  req_goal: HtmlString
  req_result: HtmlString
  req_description: HtmlString
  req_criteria: HtmlString
  programs: Array<ProgramProject>
  isInvited: boolean
  bef_status: string
  edited: boolean
  passport_created: null
  semester: 6
  exp_date: DateTimeString
  partner_comments: ''
  passport_date: DateTimeString
  passport_deadline: DateString
  send_message: null
  can_offer_program: null
  participation_requests: []
  participation_status: 'participates'
  available_actions: object
  read_only: false
  current_main_role_offer: null
  impl_avail_actions: []
  messages: []
  offers: []
  is_expired: boolean
  informers: []
  read_marks: []
  comments: []
  changed_fields: object
  updated_fields: object
  kernel: boolean
  are_all_curators_assigned: boolean
  programs_of_participating_rops: []
  cancel_comment: string
  statuses: []
  semester_obj: Semester
  locations: Array<Location>
  ext_curator: null
  default_location: boolean
  has_ext_curators: boolean
  contract: null
}

interface Partner {
  id: Id
  name: string
  short_name: string
  law_address: string
  post_address: string
  inn: string
  ogrn: string
  phone: null
  www: string
  head: string
  head_position: string
  head_base: string
  requisits: string
  default: boolean
}

interface Manager {
  id: Id
  username: string
  email: string
  first_name: string
  last_name: string
  middle_name: string
  phone: string
  sam_login: string
  related_projects_count: number
  degree: string
  initials: string
  qualification: string
  categories: Array<string>
  fio: string
  letters: string
  partner: Id
}

interface Program {
  id: Id
  name: string
  area: {
    id: number
    name: string
    uid: string
  }
  uid: string
  level: 'LBAK'
}

interface ProgramProject {
  id: Id
  program: Program
  work_type: WorkType
  project_short_name: string
  student_diploma_name: string
  description: HtmlString
  result: HtmlString
  criteria: HtmlString
  difficulty_type: DifficultyType
  experts: string
  students: number
  max_copies: number
  professional_competence_group_text: HtmlString
  key_words: string
  is_main: boolean
  roles: Array<ProjectRole>
  proj_cost_items: []
  resources: []
  compet_roles: Array<CompetentionRole>
  course: Array<string>
  semestr: string
  status: string
  send_message: null
  available_actions: object
  published: DateTimeString
  rop_participation_status: boolean
  its_result: null
}

interface ProjectRole {
  id: Id
  user: User
  role: ProjectRoleType
  offered_change_teacher: boolean
}

interface CompetentionRole {
  id: Id
  role: CompetentionRoleCaption
  description: HtmlString
  quantity: number
}

interface CompetentionRoleCaption {
  name: string
}

interface User {
  first_name: string
  middle_name: string
  last_name: string
  email: string
  phone: string
  user_id: Id
  id: Id
}

interface Semester {
  id: Id
  period: string
  year: string
  deadline: DateString
  start_date: DateString
  finish_date: DateString
  is_coming: boolean
  is_actual: boolean
  is_current: boolean
}

interface Location {
  id: Id
  region: string
  city: string
  street: string
  building: string
  place: string
  place_size: null
}
