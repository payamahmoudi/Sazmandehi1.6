// School/Center types
export const EXECUTIVE_ROLES = [
  { key: 'managerId', label: 'مدیر', required: true },
  { key: 'assistantEducationId', label: 'معاون آموزشی', required: false },
  { key: 'assistantCulturalId', label: 'معاون پرورشی', required: false },
  { key: 'assistantExecutiveId', label: 'معاون اجرایی', required: false },
  { key: 'technicalSupervisorId', label: 'سرپرست بخش', required: false },
  { key: 'technicalAssistantId', label: 'معاون فنی', required: false },
  { key: 'janitorId', label: 'سرایدار', required: false },
  { key: 'servantId', label: 'خدمتگزار', required: false },
] as const;

export type ExecutiveRoleKey = typeof EXECUTIVE_ROLES[number]['key'];

// Dependency type - attached / independent / main
export type DependencyType = 'مستقل' | 'ضمیمه‌دار' | 'ضمیمه';

export type SchoolNature = 'عادی' | 'مدرسه قرآن' | 'نمونه دولتی' | 'شاهد' | 'استعدادهای درخشان' | 'هیأت امنایی' | 'خیریه' | 'شبانه‌روزی' | 'عشایری' | 'بین‌الملل';

export type SchoolOwnership = 'دولتی' | 'غیردولتی' | 'دولتی‌مشارکتی';

export type SchoolLocation = 'شهری' | 'روستایی' | 'عشایری';

export type SchoolShift = 'ثابت صبح' | 'ثابت بعدازظهر' | 'دوقوقته' | 'چرخشی';

export interface School {
  id: string;
  code: string;
  spaceCode?: string;
  name: string;
  type: 'ابتدایی' | 'متوسطه اول' | 'متوسطه دوم نظری' | 'هنرستان' | 'کاردانش' | 'استثنایی' | 'غیردولتی' | 'مرکز تابعه';
  gender: 'پسرانه' | 'دخترانه' | 'مختلط';
  region: string;
  location?: SchoolLocation;
  nature?: SchoolNature;
  ownership?: SchoolOwnership;
  dependencyType?: DependencyType;
  mainUnitCode?: string;
  subsidiaryCodes?: string[];
  shift?: SchoolShift;
  address?: string;
  nationalId?: string;
  postalCode?: string;
  phone?: string;
  managerPhone?: string;
  establishmentDate?: string;
  status?: 'فعال' | 'غیرفعال';
  classCount: number;
  studentCount: number;
  grades: GradeInfo[];
  fields?: string[];
  needsManager: boolean;
  needsAssistant: boolean;
  managerId?: string;
  assistantId?: string;
  assistantEducationId?: string;
  assistantCulturalId?: string;
  assistantExecutiveId?: string;
  technicalSupervisorId?: string;
  technicalAssistantId?: string;
  janitorId?: string;
  servantId?: string;
  executiveRoles?: string[];
}

export interface GradeInfo {
  grade: string;
  classCount: number;
  studentCount: number;
  field?: string;
}

export interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  nationalCode: string;
  personnelCode?: string;
  fatherName?: string;
  fieldDegree?: string;
  fieldEmployment?: string;
  phoneNumber?: string;
  employmentDate?: string;
  birthDate?: string;
  serviceYears?: number;
  lastOrganizationScore?: number;
  gender: 'مرد' | 'زن';
  field: string;
  degree: string;
  employmentType: string;
  status: 'فعال' | 'مرخصی زایمان' | 'مأموریت' | 'بازنشسته' | 'سایر';
  maxHours: number;
  assignedHours: number;
  nonMandatoryHours: number;
  isLocked: boolean;
  assignments: Assignment[];
  role: 'معلم' | 'مدیر' | 'معاون آموزشی' | 'معاون پرورشی' | 'معاون اجرایی' | 'سرپرست بخش' | 'معاون فنی' | 'سرایدار' | 'خدمتگزار' | 'سایر';
  reducedHours?: boolean; // true if service >= 20 years or age >= 50
}

export type AssignmentType = 'موظف' | 'غیرموظف' | 'تدریس عوامل اجرایی';

export interface Assignment {
  id: string;
  personnelId: string;
  schoolId: string;
  schoolName: string;
  schoolCode?: string;
  subject: string;
  hours: number;
  isMandatory: boolean;
  assignmentType?: AssignmentType;
  grade: string;
  isMaternityLeave?: boolean;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export interface SubjectRequirement {
  subject: string;
  grade: string;
  hoursPerWeek: number;
  field?: string;
  requiredTeacherField: string;
  requiredGender?: 'مرد' | 'زن' | 'هردو';
  category?: 'عمومی' | 'تخصصی' | 'اجرایی';
}

export interface BalanceRecord {
  schoolId: string;
  schoolName: string;
  subject: string;
  grade: string;
  totalHours: number;
  assignedHours: number;
  remainingHours: number;
  category?: 'عمومی' | 'تخصصی' | 'اجرایی';
}

export interface ScheduleEntry {
  id: string;
  schoolId: string;
  schoolName: string;
  personnelId: string;
  personnelName: string;
  subject: string;
  grade: string;
  day: 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه';
  time: string;
  isFullTime?: boolean;
}

export interface OrganizationInfo {
  ministry: string;
  province: string;
  office: string;
}

export type AccessTab = 'dashboard' | 'schools' | 'personnel' | 'assignments' | 'analysis' | 'import' | 'history' | 'reports' | 'schedule';

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  fullName: string;
  role: 'admin' | 'user';
  panelTitle: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  expirationDays?: number;
  province?: string;
  office?: string;
  organization?: OrganizationInfo;
  allowedTabs?: AccessTab[];
}
