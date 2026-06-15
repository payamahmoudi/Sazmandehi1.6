import * as XLSX from 'xlsx';
import { School, Personnel, BalanceRecord, GradeInfo, SubjectRequirement, ScheduleEntry } from '../types';

// ━━━━━━━━ CORE EXCEL FUNCTIONS ━━━━━━━━

export function parseExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function getSheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames;
}

export function sheetToJson(workbook: XLSX.WorkBook, sheetName: string): any[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// Helper: read cell value with multiple possible column names
function cell(row: any, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return String(v).trim();
  }
  return '';
}

function cellNum(row: any, ...keys: string[]): number {
  const v = cell(row, ...keys);
  return parseInt(v) || 0;
}

// ━━━━━━━━ SHEET 1: SCHOOLS PARSER ━━━━━━━━

export function parseSchoolsSheet(rows: any[]): School[] {
  const schools: School[] = [];
  for (const row of rows) {
    const name = cell(row, 'نام مدرسه', 'نام', 'مدرسه');
    if (!name) continue;
    const code = cell(row, 'کد مدرسه', 'کد', 'کد واحد سازمانی', 'کد سازمانی');

    const typeStr = cell(row, 'دوره تحصیلی', 'دوره', 'مقطع', 'نوع');
    let type: School['type'] = 'ابتدایی';
    if (typeStr.includes('متوسطه اول') || typeStr.includes('راهنمایی')) type = 'متوسطه اول';
    else if (typeStr.includes('غیردولتی') || typeStr.includes('غیر دولتی')) type = 'غیردولتی';
    else if (typeStr.includes('مرکز تابعه') || typeStr.includes('تابعه')) type = 'مرکز تابعه';
    else if (typeStr.includes('هنرستان')) type = 'هنرستان';
    else if (typeStr.includes('کاردانش')) type = 'کاردانش';
    else if (typeStr.includes('متوسطه دوم') || typeStr.includes('دبیرستان')) type = 'متوسطه دوم نظری';
    else if (typeStr.includes('استثنایی')) type = 'استثنایی';

    const genderStr = cell(row, 'جنسیت', 'نوع جنسیتی');
    let gender: School['gender'] = 'مختلط';
    if (genderStr.includes('پسر')) gender = 'پسرانه';
    else if (genderStr.includes('دختر')) gender = 'دخترانه';

    const locationStr = cell(row, 'محل استقرار', 'محل', 'شهری/روستایی');
    const location = locationStr.includes('روستا') ? 'روستایی' as const : 'شهری' as const;

    const classCount = cellNum(row, 'تعداد کلاس', 'کلاس');
    const studentCount = cellNum(row, 'تعداد دانش‌آموز', 'دانش آموز', 'تعداد دانش آموز');

    // Build grades from dedicated columns OR auto-distribute
    const grades: GradeInfo[] = [];
    // Check for per-grade columns like "کلاس_اول", "دانش‌آموز_اول" etc.
    const gradeNames = type === 'ابتدایی' ? ['اول','دوم','سوم','چهارم','پنجم','ششم'] :
      type === 'متوسطه اول' ? ['هفتم','هشتم','نهم'] : ['دهم','یازدهم','دوازدهم'];
    
    let hasGradeDetail = false;
    for (const gn of gradeNames) {
      const cls = cellNum(row, `کلاس_${gn}`, `کلاس ${gn}`, `تعداد کلاس ${gn}`);
      const stu = cellNum(row, `دانش‌آموز_${gn}`, `دانش آموز ${gn}`, `تعداد دانش آموز ${gn}`);
      const field = cell(row, `رشته_${gn}`, `رشته ${gn}`);
      if (cls > 0 || stu > 0) {
        hasGradeDetail = true;
        grades.push({ grade: gn, classCount: cls || 1, studentCount: stu, field: field || undefined });
      }
    }
    
    if (!hasGradeDetail && classCount > 0) {
      const perGrade = Math.ceil(classCount / gradeNames.length);
      const perStudent = Math.ceil(studentCount / gradeNames.length);
      gradeNames.forEach(g => grades.push({ grade: g, classCount: perGrade, studentCount: perStudent }));
    }

    schools.push({
      id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      code: code || `M-${Date.now()}`,
      name, type, gender, location,
      region: cell(row, 'منطقه', 'ناحیه') || 'سامان',
      classCount: hasGradeDetail ? grades.reduce((s, g) => s + g.classCount, 0) : classCount,
      studentCount: hasGradeDetail ? grades.reduce((s, g) => s + g.studentCount, 0) : studentCount,
      grades,
      needsManager: true,
      needsAssistant: classCount >= 6,
      fields: cell(row, 'رشته', 'رشته‌ها') ? [cell(row, 'رشته', 'رشته‌ها')] : undefined,
    });
  }
  return schools;
}

// ━━━━━━━━ SHEET 2: PERSONNEL PARSER ━━━━━━━━

export function parsePersonnelSheet(rows: any[]): Personnel[] {
  const personnel: Personnel[] = [];
  for (const row of rows) {
    const firstName = cell(row, 'نام', 'اسم');
    const lastName = cell(row, 'نام خانوادگی', 'فامیل', 'فامیلی');
    if (!firstName && !lastName) continue;

    const genderStr = cell(row, 'جنسیت', 'جنس');
    const gender: Personnel['gender'] = genderStr.includes('زن') || genderStr.includes('خانم') ? 'زن' : 'مرد';

    const statusStr = cell(row, 'وضعیت', 'حالت');
    let status: Personnel['status'] = 'فعال';
    if (statusStr.includes('زایمان')) status = 'مرخصی زایمان';
    else if (statusStr.includes('مأموریت') || statusStr.includes('ماموریت')) status = 'مأموریت';
    else if (statusStr.includes('بازنشست')) status = 'بازنشسته';

    const roleStr = cell(row, 'سمت', 'نقش', 'پست');
    let role: Personnel['role'] = 'معلم';
    if (roleStr.includes('مدیر')) role = 'مدیر';
    else if (roleStr.includes('معاون پرورشی')) role = 'معاون پرورشی';
    else if (roleStr.includes('معاون اجرایی')) role = 'معاون اجرایی';
    else if (roleStr.includes('معاون آموزشی') || roleStr.includes('معاون')) role = 'معاون آموزشی';
    else if (roleStr.includes('سرپرست')) role = 'سرپرست بخش';
    else if (roleStr.includes('معاون فنی')) role = 'معاون فنی';
    else if (roleStr.includes('سرایدار')) role = 'سرایدار';
    else if (roleStr.includes('خدمتگزار')) role = 'خدمتگزار';

    const serviceYears = cellNum(row, 'سنوات خدمت', 'سنوات', 'سابقه');
    
    personnel.push({
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      firstName, lastName,
      nationalCode: cell(row, 'کد ملی', 'کدملی', 'شماره ملی'),
      personnelCode: cell(row, 'کد پرسنلی', 'کدپرسنلی', 'شماره پرسنلی', 'پرسنلی') || undefined,
      fatherName: cell(row, 'نام پدر') || undefined,
      phoneNumber: cell(row, 'شماره همراه', 'تلفن', 'موبایل') || undefined,
      fieldDegree: cell(row, 'رشته تحصیلی') || undefined,
      fieldEmployment: cell(row, 'رشته استخدامی') || undefined,
      employmentDate: cell(row, 'تاریخ استخدام') || undefined,
      birthDate: cell(row, 'تاریخ تولد') || undefined,
      serviceYears: serviceYears || undefined,
      lastOrganizationScore: cellNum(row, 'امتیاز سازماندهی', 'آخرین امتیاز') || undefined,
      reducedHours: serviceYears >= 20,
      gender,
      field: cell(row, 'رشته', 'رشته تحصیلی', 'تخصص', 'رشته به کارگیری'),
      degree: cell(row, 'مدرک', 'مدرک تحصیلی'),
      employmentType: cell(row, 'نوع استخدام', 'استخدام'),
      status,
      maxHours: cellNum(row, 'ساعت موظف', 'ساعات موظف') || 24,
      assignedHours: cellNum(row, 'ساعات ابلاغ', 'ساعت ابلاغ'),
      nonMandatoryHours: cellNum(row, 'ساعات غیرموظف'),
      isLocked: status === 'مرخصی زایمان',
      assignments: [],
      role,
    });
  }
  return personnel;
}

// ━━━━━━━━ SHEET 3: BALANCE (TRAZ) PARSER ━━━━━━━━

export function parseBalanceSheet(rows: any[]): BalanceRecord[] {
  const records: BalanceRecord[] = [];
  for (const row of rows) {
    const schoolName = cell(row, 'نام مدرسه', 'مدرسه');
    if (!schoolName) continue;
    // Support both old 'درس' and new 'رشته تدریس' column names
    const subject = cell(row, 'رشته تدریس', 'درس', 'نام درس', 'عنوان درس');
    const grade = cell(row, 'پایه');
    if (!subject || !grade) continue;

    records.push({
      schoolId: cell(row, 'کد مدرسه') || '',
      schoolName,
      subject, grade,
      totalHours: cellNum(row, 'ساعت کل', 'کل ساعات', 'تراز', 'ساعت'),
      assignedHours: cellNum(row, 'ساعات ابلاغ شده', 'ابلاغ شده'),
      remainingHours: cellNum(row, 'باقیمانده', 'مانده'),
      category: (cell(row, 'نوع درس', 'دسته درس', 'گروه تدریس') as any) || undefined,
    });
  }
  return records;
}

// ━━━━━━━━ SHEET 4: SCHEDULE PARSER ━━━━━━━━

export function parseScheduleSheet(rows: any[]): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  for (const row of rows) {
    const schoolName = cell(row, 'مدرسه', 'نام مدرسه', 'کد مدرسه');
    const personnelName = cell(row, 'نام معلم', 'نام نیرو', 'معلم');
    const subject = cell(row, 'درس');
    const grade = cell(row, 'پایه');
    const day = cell(row, 'روز هفته', 'روز') as ScheduleEntry['day'];
    const time = cell(row, 'بازه زمانی', 'ساعت حضور', 'ساعت');
    if (!schoolName || !personnelName || !subject || !day || !time) continue;
    entries.push({
      id: `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      schoolId: cell(row, 'کد مدرسه') || '',
      schoolName, personnelId: '', personnelName,
      subject, grade, day, time,
    });
  }
  return entries;
}

// ━━━━━━━━ BALANCE → SUBJECT REQUIREMENTS ━━━━━━━━

export function balanceToSubjectRequirements(records: BalanceRecord[], schools: School[]): SubjectRequirement[] {
  const reqs: SubjectRequirement[] = [];
  const seen = new Set<string>();
  for (const rec of records) {
    const school = schools.find(s => s.name === rec.schoolName || s.code === rec.schoolName || s.code === rec.schoolId);
    const gradeInfo = school?.grades.find(g => g.grade === rec.grade);
    const classCount = gradeInfo?.classCount || 1;
    const hoursPerWeek = classCount > 0 ? Math.round(rec.totalHours / classCount) : rec.totalHours;
    const key = `${rec.subject}|${rec.grade}`;
    if (seen.has(key)) continue;
    seen.add(key);
    reqs.push({
      subject: rec.subject, grade: rec.grade,
      hoursPerWeek: hoursPerWeek || rec.totalHours,
      field: (rec as any).field || undefined,
      requiredTeacherField: rec.subject,
      category: rec.category,
    });
  }
  return reqs;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRAZ BALANCE ENGINE (ETL-grade)
// Inspired by Python Pandas ETL Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TrazResult {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  subject: string;
  grade: string;
  category: string;
  requiredHours: number;
  assignedHours: number;
  remainingHours: number;
  status: 'کامل' | 'ناقص' | 'اضافه';
  assignedTeachers: string[];
  hourType: { mandatory: number; nonMandatory: number; executive: number };
}

// School-level aggregation: lessons per grade (like Python's StrID_lesson)
export interface SchoolLessonMap {
  schoolCode: string;
  schoolName: string;
  gradeSubjects: Record<string, string[]>; // grade -> [subject1, subject2, ...]
  totalRequired: number;
  totalAssigned: number;
  completionPercent: number;
}

export function calculateTrazBalance(
  balance: BalanceRecord[],
  personnel: Personnel[],
  schools: School[]
): TrazResult[] {
  // Pre-compute assignment index for O(1) lookup instead of O(n²)
  const assignmentIndex: Record<string, { hours: number; type: string; teacher: string }[]> = {};
  for (const p of personnel) {
    for (const a of p.assignments) {
      const aSchool = schools.find(s => s.id === a.schoolId);
      if (!aSchool) continue;
      const key = `${aSchool.code}|${a.subject}|${a.grade}`;
      if (!assignmentIndex[key]) assignmentIndex[key] = [];
      assignmentIndex[key].push({
        hours: a.hours,
        type: a.assignmentType || (a.isMandatory ? 'موظف' : 'غیرموظف'),
        teacher: `${p.firstName} ${p.lastName}`,
      });
    }
  }

  const results: TrazResult[] = [];
  for (const rec of balance) {
    const school = schools.find(s => s.name === rec.schoolName || s.code === rec.schoolId || s.code === rec.schoolName);
    const schoolCode = school?.code || rec.schoolId || '';
    const key = `${schoolCode}|${rec.subject}|${rec.grade}`;
    const assignments = assignmentIndex[key] || [];

    const mandatory = assignments.filter(a => a.type === 'موظف').reduce((s, a) => s + a.hours, 0);
    const nonMandatory = assignments.filter(a => a.type === 'غیرموظف').reduce((s, a) => s + a.hours, 0);
    const executive = assignments.filter(a => a.type === 'تدریس عوامل اجرایی').reduce((s, a) => s + a.hours, 0);
    const totalAssigned = mandatory + nonMandatory + executive;
    const remaining = rec.totalHours - totalAssigned;

    results.push({
      schoolId: school?.id || '',
      schoolName: rec.schoolName,
      schoolCode,
      subject: rec.subject,
      grade: rec.grade,
      category: rec.category || 'عمومی',
      requiredHours: rec.totalHours,
      assignedHours: totalAssigned,
      remainingHours: remaining,
      status: remaining === 0 ? 'کامل' : remaining > 0 ? 'ناقص' : 'اضافه',
      assignedTeachers: [...new Set(assignments.map(a => a.teacher))],
      hourType: { mandatory, nonMandatory, executive },
    });
  }
  return results;
}

// Generate school-level lesson map (like Python's generate_star_separated_classes)
export function generateSchoolLessonMaps(
  balance: BalanceRecord[],
  personnel: Personnel[],
  schools: School[]
): SchoolLessonMap[] {
  const traz = calculateTrazBalance(balance, personnel, schools);
  const schoolMap: Record<string, SchoolLessonMap> = {};

  for (const t of traz) {
    if (!schoolMap[t.schoolCode]) {
      schoolMap[t.schoolCode] = {
        schoolCode: t.schoolCode, schoolName: t.schoolName,
        gradeSubjects: {}, totalRequired: 0, totalAssigned: 0, completionPercent: 0,
      };
    }
    const sm = schoolMap[t.schoolCode];
    if (!sm.gradeSubjects[t.grade]) sm.gradeSubjects[t.grade] = [];
    sm.gradeSubjects[t.grade].push(t.subject);
    sm.totalRequired += t.requiredHours;
    sm.totalAssigned += t.assignedHours;
  }

  return Object.values(schoolMap).map(sm => ({
    ...sm,
    completionPercent: sm.totalRequired > 0 ? Math.round((sm.totalAssigned / sm.totalRequired) * 100) : 0,
  }));
}

// ━━━━━━━━ CROSS-VALIDATION (Enhanced) ━━━━━━━━

export interface ValidationError {
  sheet: string;
  row: number;
  message: string;
  severity: 'error' | 'warning';
}

export function validateImportData(
  schools: School[], personnel: Personnel[], balance: BalanceRecord[], schedule: ScheduleEntry[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const schoolNames = new Set(schools.map(s => s.name));
  const schoolCodes = new Set(schools.map(s => s.code));
  const personnelNames = new Set(personnel.map(p => `${p.firstName} ${p.lastName}`));

  // 1. Validate balance → schools
  balance.forEach((b, i) => {
    if (!schoolNames.has(b.schoolName) && !schoolCodes.has(b.schoolId) && !schoolCodes.has(b.schoolName)) {
      errors.push({ sheet: 'تراز ابلاغ', row: i + 2, message: `مدرسه «${b.schoolName}» در شیت مدارس یافت نشد.`, severity: 'error' });
    }
    if (b.totalHours <= 0) {
      errors.push({ sheet: 'تراز ابلاغ', row: i + 2, message: `ساعت کل درس «${b.subject}» صفر یا منفی است.`, severity: 'error' });
    }
    // Check grade matches school type
    const school = schools.find(s => s.name === b.schoolName || s.code === b.schoolId || s.code === b.schoolName);
    if (school) {
      const validGrades = school.grades.map(g => g.grade);
      if (validGrades.length > 0 && !validGrades.includes(b.grade)) {
        errors.push({ sheet: 'تراز ابلاغ', row: i + 2, message: `پایه «${b.grade}» در مدرسه «${b.schoolName}» (${school.type}) وجود ندارد.`, severity: 'warning' });
      }
    }
  });

  // 2. Validate schedule → schools & personnel
  schedule.forEach((s, i) => {
    if (!schoolNames.has(s.schoolName) && !schoolCodes.has(s.schoolId)) {
      errors.push({ sheet: 'برنامه هفتگی', row: i + 2, message: `مدرسه «${s.schoolName}» یافت نشد.`, severity: 'error' });
    }
    if (!personnelNames.has(s.personnelName)) {
      errors.push({ sheet: 'برنامه هفتگی', row: i + 2, message: `نیروی «${s.personnelName}» در شیت نیروها یافت نشد.`, severity: 'warning' });
    }
  });

  // 3. Duplicate school codes
  const codeCounts: Record<string, number> = {};
  schools.forEach(s => { codeCounts[s.code] = (codeCounts[s.code] || 0) + 1; });
  Object.entries(codeCounts).filter(([, c]) => c > 1).forEach(([code]) => {
    errors.push({ sheet: 'مدارس', row: 0, message: `کد مدرسه «${code}» تکراری است.`, severity: 'error' });
  });

  // 4. Duplicate national codes
  const ncCounts: Record<string, number> = {};
  personnel.forEach(p => { if (p.nationalCode) ncCounts[p.nationalCode] = (ncCounts[p.nationalCode] || 0) + 1; });
  Object.entries(ncCounts).filter(([, c]) => c > 1).forEach(([nc]) => {
    errors.push({ sheet: 'نیروها', row: 0, message: `کد ملی «${nc}» تکراری است.`, severity: 'error' });
  });

  // 5. Check personnel hours consistency
  personnel.forEach((p, i) => {
    if (p.role === 'معلم' && p.maxHours !== 24 && p.maxHours !== 20) {
      errors.push({ sheet: 'نیروها', row: i + 2, message: `ساعت موظف ${p.firstName} ${p.lastName} (${p.maxHours}) غیراستاندارد. معلم: ۲۴ یا ۲۰`, severity: 'warning' });
    }
  });

  // 6. Cross-validate balance subjects with school grades (ETL-grade check)
  const schoolGradeMap: Record<string, Set<string>> = {};
  schools.forEach(s => {
    schoolGradeMap[s.code] = new Set(s.grades.map(g => g.grade));
    schoolGradeMap[s.name] = new Set(s.grades.map(g => g.grade));
  });
  balance.forEach((b, i) => {
    const key = b.schoolId || b.schoolName;
    const validGrades = schoolGradeMap[key];
    if (validGrades && !validGrades.has(b.grade)) {
      errors.push({ sheet: 'تراز ابلاغ', row: i + 2, message: `پایه «${b.grade}» برای مدرسه «${b.schoolName}» معتبر نیست. (پایه‌ها: ${[...validGrades].join('، ')})`, severity: 'error' });
    }
  });

  // 7. Check for over-assignment (ETL Traz Balance)
  if (balance.length > 0) {
    const traz = calculateTrazBalance(balance, personnel, schools);
    const overAssigned = traz.filter(t => t.status === 'اضافه');
    overAssigned.forEach(t => {
      errors.push({ sheet: 'تراز ابلاغ', row: 0, message: `⛔ اضافه‌ابلاغ: ${t.subject} پایه ${t.grade} در ${t.schoolName} (${Math.abs(t.remainingHours)} ساعت اضافه)`, severity: 'error' });
    });
  }

  return errors;
}

// ━━━━━━━━ EXPORT: FULL DATA ━━━━━━━━

export function exportToExcel(schools: School[], personnel: Personnel[], _balanceRecords: BalanceRecord[], scheduleEntries: ScheduleEntry[] = []) {
  const wb = XLSX.utils.book_new();

  const schoolData = schools.map(s => {
    const mgr = personnel.find(p => p.id === s.managerId);
    return {
      'کد مدرسه': s.code, 'نام مدرسه': s.name, 'دوره تحصیلی': s.type,
      'جنسیت': s.gender, 'محل استقرار': s.location || 'شهری', 'منطقه': s.region,
      'تعداد کلاس': s.classCount, 'تعداد دانش‌آموز': s.studentCount,
      'عوامل اجرایی': (s.executiveRoles || []).join('، '),
      'رشته': s.fields?.join('، ') || '',
      'کد فضا': s.spaceCode || '', 'شناسه ملی': s.nationalId || '',
      'کد پستی': s.postalCode || '', 'تلفن': s.phone || '',
      'موبایل مدیر': (s as any).managerPhone || '', 'آدرس': s.address || '',
      'مدیر': mgr ? `${mgr.firstName} ${mgr.lastName}` : '',
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(schoolData), 'مدارس');

  const personnelData = personnel.map(p => ({
    'نام': p.firstName, 'نام خانوادگی': p.lastName, 'کد ملی': p.nationalCode,
    'کد پرسنلی': p.personnelCode || '', 'نام پدر': p.fatherName || '', 'جنسیت': p.gender,
    'رشته': p.field, 'رشته تحصیلی': p.fieldDegree || '', 'رشته استخدامی': p.fieldEmployment || '',
    'مدرک تحصیلی': p.degree, 'نوع استخدام': p.employmentType, 'وضعیت': p.status,
    'نقش': p.role, 'سنوات خدمت': p.serviceYears || '',
    'تاریخ استخدام': p.employmentDate || '', 'تاریخ تولد': p.birthDate || '',
    'شماره همراه': p.phoneNumber || '', 'امتیاز سازماندهی': p.lastOrganizationScore || '',
    'ساعات موظف': p.maxHours, 'ساعات ابلاغ شده': p.assignedHours, 'ساعات غیرموظف': p.nonMandatoryHours,
    'محل خدمت': p.assignments.map(a => a.schoolName).filter((v, i, a) => a.indexOf(v) === i).join('، '),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(personnelData), 'نیروها');

  const assignmentData = personnel.flatMap(p => p.assignments.map(a => ({
    'کد ملی': p.nationalCode, 'نام': `${p.firstName} ${p.lastName}`,
    'کد مدرسه': schools.find(s => s.id === a.schoolId)?.code || '', 'مدرسه': a.schoolName,
    'درس': a.subject, 'پایه': a.grade, 'ساعت': a.hours, 'نوع': a.isMandatory ? 'موظف' : 'غیرموظف',
    'تاریخ ثبت': new Date(a.createdAt).toLocaleDateString('fa-IR'),
  })));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assignmentData), 'ابلاغ‌ها');

  const scheduleData = scheduleEntries.map(s => ({
    'کد مدرسه': s.schoolId, 'مدرسه': s.schoolName,
    'نام معلم': s.personnelName, 'درس': s.subject,
    'پایه': s.grade, 'روز هفته': s.day, 'بازه زمانی': s.time,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(scheduleData), 'برنامه هفتگی');

  // Sheet 5: Live Traz Balance Report (ETL-grade)
  const trazResults = calculateTrazBalance(_balanceRecords, personnel, schools);
  if (trazResults.length > 0) {
    const trazData = trazResults.map(t => ({
      'کد مدرسه': t.schoolCode, 'مدرسه': t.schoolName,
      'درس': t.subject, 'پایه': t.grade, 'نوع': t.category,
      'ساعت تراز': t.requiredHours,
      'موظف': t.hourType.mandatory,
      'غیرموظف': t.hourType.nonMandatory,
      'تدریس اجرایی': t.hourType.executive,
      'جمع ابلاغ': t.assignedHours,
      'باقیمانده': t.remainingHours,
      'وضعیت': t.status,
      'معلمان': t.assignedTeachers.join('، '),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trazData), 'گزارش تراز');
  }

  // Sheet 6: School Completion Summary
  const schoolMaps = generateSchoolLessonMaps(_balanceRecords, personnel, schools);
  if (schoolMaps.length > 0) {
    const summaryData = schoolMaps.map(sm => ({
      'کد مدرسه': sm.schoolCode, 'مدرسه': sm.schoolName,
      'کل ساعت تراز': sm.totalRequired, 'کل ابلاغ شده': sm.totalAssigned,
      'درصد تکمیل': `${sm.completionPercent}%`,
      'تعداد دروس': Object.values(sm.gradeSubjects).flat().length,
      'تعداد پایه‌ها': Object.keys(sm.gradeSubjects).length,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'خلاصه مدارس');
  }

  XLSX.writeFile(wb, 'سازماندهی_نیروی_انسانی_1406-1405.xlsx');
}

// ━━━━━━━━ EXPORT: SMART TEMPLATE ━━━━━━━━

export function exportTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // ━━━ Sheet 0: Master Data (پایگاه مرجع) ━━━
  // Table 1: Majors (رشته‌های استخدامی)
  const majorsData = [
    { 'کد رشته استخدامی': 1001, 'رشته استخدام / بکارگیری': 'آموزگار ابتدایی' },
    { 'کد رشته استخدامی': 1002, 'رشته استخدام / بکارگیری': 'دبیر ریاضی' },
    { 'کد رشته استخدامی': 1003, 'رشته استخدام / بکارگیری': 'دبیر فارسی و ادبیات' },
    { 'کد رشته استخدامی': 1004, 'رشته استخدام / بکارگیری': 'دبیر علوم تجربی' },
    { 'کد رشته استخدامی': 1005, 'رشته استخدام / بکارگیری': 'دبیر تربیت بدنی' },
    { 'کد رشته استخدامی': 1006, 'رشته استخدام / بکارگیری': 'دبیر عربی' },
    { 'کد رشته استخدامی': 1007, 'رشته استخدام / بکارگیری': 'دبیر زبان انگلیسی' },
    { 'کد رشته استخدامی': 1008, 'رشته استخدام / بکارگیری': 'دبیر فیزیک' },
    { 'کد رشته استخدامی': 1009, 'رشته استخدام / بکارگیری': 'دبیر شیمی' },
    { 'کد رشته استخدامی': 1010, 'رشته استخدام / بکارگیری': 'دبیر تاریخ' },
    { 'کد رشته استخدامی': 1011, 'رشته استخدام / بکارگیری': 'هنرآموز الکترونیک' },
    { 'کد رشته استخدامی': 1012, 'رشته استخدام / بکارگیری': 'مدیریت آموزشی' },
    { 'کد رشته استخدامی': 1013, 'رشته استخدام / بکارگیری': 'مشاور' },
    { 'کد رشته استخدامی': 1014, 'رشته استخدام / بکارگیری': 'مربی بهداشت' },
  ];

  // Table 2: Subjects (رشته‌های تدریس / دروس)
  const subjectsData = [
    { 'کد گروه': 1, 'گروه تدریس': 'آموزش ابتدایی', 'کد رشته تدریس': 1010, 'رشته تدریس': 'پایه اول ابتدایی' },
    { 'کد گروه': 1, 'گروه تدریس': 'آموزش ابتدایی', 'کد رشته تدریس': 1011, 'رشته تدریس': 'پایه دوم ابتدایی' },
    { 'کد گروه': 1, 'گروه تدریس': 'آموزش ابتدایی', 'کد رشته تدریس': 1015, 'رشته تدریس': 'پایه پنجم ابتدایی' },
    { 'کد گروه': 2, 'گروه تدریس': 'ریاضی', 'کد رشته تدریس': 1020, 'رشته تدریس': 'ریاضی' },
    { 'کد گروه': 3, 'گروه تدریس': 'فارسی', 'کد رشته تدریس': 1021, 'رشته تدریس': 'فارسی' },
    { 'کد گروه': 4, 'گروه تدریس': 'علوم', 'کد رشته تدریس': 1022, 'رشته تدریس': 'علوم تجربی' },
    { 'کد گروه': 5, 'گروه تدریس': 'تربیت بدنی', 'کد رشته تدریس': 1023, 'رشته تدریس': 'تربیت بدنی' },
    { 'کد گروه': 7, 'گروه تدریس': 'عمومی', 'کد رشته تدریس': 1024, 'رشته تدریس': 'آمادگی دفاعی' },
    { 'کد گروه': 7, 'گروه تدریس': 'عمومی', 'کد رشته تدریس': 1025, 'رشته تدریس': 'تفکر و سبک زندگی' },
    { 'کد گروه': 6, 'گروه تدریس': 'زبان', 'کد رشته تدریس': 1026, 'رشته تدریس': 'عربی' },
    { 'کد گروه': 6, 'گروه تدریس': 'زبان', 'کد رشته تدریس': 1027, 'رشته تدریس': 'زبان انگلیسی' },
    { 'کد گروه': 8, 'گروه تدریس': 'فنی و حرفه‌ای', 'کد رشته تدریس': 1030, 'رشته تدریس': 'مدارهای الکتریکی' },
    { 'کد گروه': 4, 'گروه تدریس': 'علوم', 'کد رشته تدریس': 1031, 'رشته تدریس': 'زیست شناسی' },
    { 'کد گروه': 4, 'گروه تدریس': 'علوم', 'کد رشته تدریس': 1032, 'رشته تدریس': 'شیمی' },
    { 'کد گروه': 4, 'گروه تدریس': 'علوم', 'کد رشته تدریس': 1033, 'رشته تدریس': 'زمین شناسی' },
  ];

  // Table 3: Matrix (صلاحیت تدریس)
  const matrixData = [
    { 'کد رشته تدریس': 1010, 'رشته تدریس': 'پایه اول ابتدایی', 'کد رشته استخدامی مجاز': 1001, 'رشته استخدامی مجاز': 'آموزگار ابتدایی' },
    { 'کد رشته تدریس': 1011, 'رشته تدریس': 'پایه دوم ابتدایی', 'کد رشته استخدامی مجاز': 1001, 'رشته استخدامی مجاز': 'آموزگار ابتدایی' },
    { 'کد رشته تدریس': 1015, 'رشته تدریس': 'پایه پنجم ابتدایی', 'کد رشته استخدامی مجاز': 1001, 'رشته استخدامی مجاز': 'آموزگار ابتدایی' },
    { 'کد رشته تدریس': 1020, 'رشته تدریس': 'ریاضی', 'کد رشته استخدامی مجاز': 1002, 'رشته استخدامی مجاز': 'دبیر ریاضی' },
    { 'کد رشته تدریس': 1021, 'رشته تدریس': 'فارسی', 'کد رشته استخدامی مجاز': 1003, 'رشته استخدامی مجاز': 'دبیر فارسی و ادبیات' },
    { 'کد رشته تدریس': 1022, 'رشته تدریس': 'علوم تجربی', 'کد رشته استخدامی مجاز': 1004, 'رشته استخدامی مجاز': 'دبیر علوم تجربی' },
    { 'کد رشته تدریس': 1023, 'رشته تدریس': 'تربیت بدنی', 'کد رشته استخدامی مجاز': 1005, 'رشته استخدامی مجاز': 'دبیر تربیت بدنی' },
    { 'کد رشته تدریس': 1024, 'رشته تدریس': 'آمادگی دفاعی', 'کد رشته استخدامی مجاز': 1005, 'رشته استخدامی مجاز': 'دبیر تربیت بدنی' },
    { 'کد رشته تدریس': 1026, 'رشته تدریس': 'عربی', 'کد رشته استخدامی مجاز': 1006, 'رشته استخدامی مجاز': 'دبیر عربی' },
    { 'کد رشته تدریس': 1027, 'رشته تدریس': 'زبان انگلیسی', 'کد رشته استخدامی مجاز': 1007, 'رشته استخدامی مجاز': 'دبیر زبان انگلیسی' },
    { 'کد رشته تدریس': 1030, 'رشته تدریس': 'مدارهای الکتریکی', 'کد رشته استخدامی مجاز': 1011, 'رشته استخدامی مجاز': 'هنرآموز الکترونیک' },
    // نمونه: یک رشته استخدامی → چند درس (دبیر علوم تجربی)
    { 'کد رشته تدریس': 1022, 'رشته تدریس': 'علوم تجربی', 'کد رشته استخدامی مجاز': 1004, 'رشته استخدامی مجاز': 'دبیر علوم تجربی' },
    { 'کد رشته تدریس': 1031, 'رشته تدریس': 'زیست شناسی', 'کد رشته استخدامی مجاز': 1004, 'رشته استخدامی مجاز': 'دبیر علوم تجربی' },
    { 'کد رشته تدریس': 1032, 'رشته تدریس': 'شیمی', 'کد رشته استخدامی مجاز': 1004, 'رشته استخدامی مجاز': 'دبیر علوم تجربی' },
    { 'کد رشته تدریس': 1033, 'رشته تدریس': 'زمین شناسی', 'کد رشته استخدامی مجاز': 1004, 'رشته استخدامی مجاز': 'دبیر علوم تجربی' },
  ];

  const sMaster = XLSX.utils.json_to_sheet([
    ...majorsData.map((m, i) => ({
      'کد رشته استخدامی': m['کد رشته استخدامی'],
      'رشته استخدام / بکارگیری': m['رشته استخدام / بکارگیری'],
      ...(i < subjectsData.length ? {
        '': '', // separator
        'کد گروه': subjectsData[i]['کد گروه'],
        'گروه تدریس': subjectsData[i]['گروه تدریس'],
        'کد رشته تدریس': subjectsData[i]['کد رشته تدریس'],
        'رشته تدریس': subjectsData[i]['رشته تدریس'],
      } : {}),
      ...(i < matrixData.length ? {
        ' ': '', // separator
        'کد درس (صلاحیت)': matrixData[i]['کد رشته تدریس'],
        'درس': matrixData[i]['رشته تدریس'],
        'کد استخدامی مجاز': matrixData[i]['کد رشته استخدامی مجاز'],
        'رشته مجاز': matrixData[i]['رشته استخدامی مجاز'],
      } : {}),
    })),
  ]);

  // Sheet 1: Schools
  const s1 = XLSX.utils.json_to_sheet([
    { 'کد مدرسه': 11001, 'نام مدرسه': 'شهید جعفرزاده', 'دوره تحصیلی': 'ابتدایی', 'جنسیت': 'دخترانه', 'محل استقرار': 'شهری', 'منطقه': 'سامان', 'تعداد کلاس': 6, 'تعداد دانش‌آموز': 145, 'رشته': '' },
    { 'کد مدرسه': 12001, 'نام مدرسه': 'فرزانگان', 'دوره تحصیلی': 'متوسطه اول', 'جنسیت': 'دخترانه', 'محل استقرار': 'شهری', 'منطقه': 'سامان', 'تعداد کلاس': 6, 'تعداد دانش‌آموز': 170, 'رشته': '' },
    { 'کد مدرسه': 14001, 'نام مدرسه': 'هنرستان شهید چمران', 'دوره تحصیلی': 'هنرستان', 'جنسیت': 'پسرانه', 'محل استقرار': 'شهری', 'منطقه': 'سامان', 'تعداد کلاس': 4, 'تعداد دانش‌آموز': 80, 'رشته': 'الکترونیک، مکانیک' },
  ]);

  // Sheet 2: Personnel (with major code auto-lookup)
  const s2 = XLSX.utils.json_to_sheet([
    { 'نام': 'فاطمه', 'نام خانوادگی': 'احمدی', 'کد ملی': '4620000000', 'کد پرسنلی': '100001', 'جنسیت': 'زن', 'رشته استخدام / بکارگیری': 'آموزگار ابتدایی', 'کد رشته استخدامی': 1001, 'مدرک تحصیلی': 'لیسانس', 'نوع استخدام': 'رسمی', 'وضعیت': 'فعال', 'سمت': 'معلم', 'سنوات خدمت': 15, 'ساعت موظف': 24 },
    { 'نام': 'حسین', 'نام خانوادگی': 'کریمی', 'کد ملی': '4620000001', 'کد پرسنلی': '100002', 'جنسیت': 'مرد', 'رشته استخدام / بکارگیری': 'دبیر ریاضی', 'کد رشته استخدامی': 1002, 'مدرک تحصیلی': 'لیسانس', 'نوع استخدام': 'رسمی', 'وضعیت': 'فعال', 'سمت': 'معلم', 'سنوات خدمت': 22, 'ساعت موظف': 20 },
    { 'نام': 'محمدرضا', 'نام خانوادگی': 'جعفری', 'کد ملی': '4620000002', 'کد پرسنلی': '100003', 'جنسیت': 'مرد', 'رشته استخدام / بکارگیری': 'مدیریت آموزشی', 'کد رشته استخدامی': 1012, 'مدرک تحصیلی': 'فوق لیسانس', 'نوع استخدام': 'رسمی', 'وضعیت': 'فعال', 'سمت': 'مدیر', 'سنوات خدمت': 25, 'ساعت موظف': 36 },
  ]);

  // Sheet 3: Balance (Traz) with subject codes and compliance check
  const s3 = XLSX.utils.json_to_sheet([
    { 'کد مدرسه': 11001, 'نام مدرسه': 'شهید جعفرزاده', 'رشته تدریس': 'پایه اول ابتدایی', 'کد رشته تدریس': 1010, 'گروه تدریس': 'آموزش ابتدایی', 'کد گروه': 1, 'پایه': 'اول', 'نوع درس': 'عمومی', 'ساعت کل': 24, 'ابلاغ شده': 0, 'باقیمانده': 24 },
    { 'کد مدرسه': 11001, 'نام مدرسه': 'شهید جعفرزاده', 'رشته تدریس': 'پایه دوم ابتدایی', 'کد رشته تدریس': 1011, 'گروه تدریس': 'آموزش ابتدایی', 'کد گروه': 1, 'پایه': 'دوم', 'نوع درس': 'عمومی', 'ساعت کل': 24, 'ابلاغ شده': 0, 'باقیمانده': 24 },
    { 'کد مدرسه': 11001, 'نام مدرسه': 'شهید جعفرزاده', 'رشته تدریس': 'تربیت بدنی', 'کد رشته تدریس': 1023, 'گروه تدریس': 'تربیت بدنی', 'کد گروه': 5, 'پایه': 'اول', 'نوع درس': 'تخصصی', 'ساعت کل': 2, 'ابلاغ شده': 0, 'باقیمانده': 2 },
    { 'کد مدرسه': 12001, 'نام مدرسه': 'فرزانگان', 'رشته تدریس': 'ریاضی', 'کد رشته تدریس': 1020, 'گروه تدریس': 'ریاضی', 'کد گروه': 2, 'پایه': 'هفتم', 'نوع درس': 'عمومی', 'ساعت کل': 10, 'ابلاغ شده': 0, 'باقیمانده': 10 },
    { 'کد مدرسه': 12001, 'نام مدرسه': 'فرزانگان', 'رشته تدریس': 'فارسی', 'کد رشته تدریس': 1021, 'گروه تدریس': 'فارسی', 'کد گروه': 3, 'پایه': 'هفتم', 'نوع درس': 'عمومی', 'ساعت کل': 10, 'ابلاغ شده': 0, 'باقیمانده': 10 },
    { 'کد مدرسه': 12001, 'نام مدرسه': 'فرزانگان', 'رشته تدریس': 'آمادگی دفاعی', 'کد رشته تدریس': 1024, 'گروه تدریس': 'عمومی', 'کد گروه': 7, 'پایه': 'هفتم', 'نوع درس': 'عمومی', 'ساعت کل': 2, 'ابلاغ شده': 0, 'باقیمانده': 2 },
    { 'کد مدرسه': 14001, 'نام مدرسه': 'هنرستان شهید چمران', 'رشته تدریس': 'مدارهای الکتریکی', 'کد رشته تدریس': 1030, 'گروه تدریس': 'فنی و حرفه‌ای', 'کد گروه': 8, 'پایه': 'دهم', 'نوع درس': 'تخصصی', 'ساعت کل': 6, 'ابلاغ شده': 0, 'باقیمانده': 6 },
  ]);

  // Sheet 4: Schedule (unchanged)
  const s4 = XLSX.utils.json_to_sheet([
    { 'کد مدرسه': 12001, 'مدرسه': 'فرزانگان', 'نام معلم': 'حسین کریمی', 'درس': 'ریاضی', 'پایه': 'هفتم', 'روز هفته': 'شنبه', 'بازه زمانی': '۸:۰۰ تا ۹:۳۰' },
    { 'کد مدرسه': 12001, 'مدرسه': 'فرزانگان', 'نام معلم': 'حسین کریمی', 'درس': 'ریاضی', 'پایه': 'هشتم', 'روز هفته': 'یکشنبه', 'بازه زمانی': '۸:۰۰ تا ۹:۳۰' },
  ]);

  // Sheet 5: Guide
  const s5 = XLSX.utils.json_to_sheet([
    { 'عنوان': '📌 سال تحصیلی', 'توضیح': '1406-1405', 'مثال': '' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ شیت پایگاه مرجع ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': 'جدول ۱: رشته‌های استخدامی', 'توضیح': 'کد ۴ رقمی + نام رشته. برای لیست کشویی نیروها.', 'مثال': '1001 = آموزگار ابتدایی' },
    { 'عنوان': 'جدول ۲: رشته‌های تدریس', 'توضیح': 'کد گروه + گروه + کد درس + نام درس. برای لیست کشویی تراز.', 'مثال': '1020 = ریاضی' },
    { 'عنوان': 'جدول ۳: صلاحیت تدریس', 'توضیح': 'کدام رشته استخدامی مجاز به تدریس کدام درس است.', 'مثال': 'ریاضی ← دبیر ریاضی' },
    { 'عنوان': '💡 نکته', 'توضیح': 'می‌توانید ردیف‌های جدید به هر جدول اضافه کنید.', 'مثال': '' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ صلاحیت تدریس چند درسی ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '❓ اگر یک معلم چند درس تدریس کند؟', 'توضیح': 'در جدول صلاحیت (جدول ۳)، برای هر درس یک ردیف جدا بنویسید', 'مثال': '' },
    { 'عنوان': 'مثال: دبیر علوم تجربی', 'توضیح': 'این معلم مجوز تدریس ۴ درس را دارد:', 'مثال': '' },
    { 'عنوان': '  ردیف ۱', 'توضیح': 'کد درس: 1022 (علوم تجربی) ← کد مجاز: 1004 (دبیر علوم)', 'مثال': 'متوسطه اول' },
    { 'عنوان': '  ردیف ۲', 'توضیح': 'کد درس: 1031 (زیست شناسی) ← کد مجاز: 1004 (دبیر علوم)', 'مثال': 'متوسطه دوم' },
    { 'عنوان': '  ردیف ۳', 'توضیح': 'کد درس: 1032 (شیمی) ← کد مجاز: 1004 (دبیر علوم)', 'مثال': 'متوسطه دوم' },
    { 'عنوان': '  ردیف ۴', 'توضیح': 'کد درس: 1033 (زمین شناسی) ← کد مجاز: 1004 (دبیر علوم)', 'مثال': 'متوسطه دوم' },
    { 'عنوان': '💡 خلاصه', 'توضیح': 'هر ردیف جدول صلاحیت = یک مجوز تدریس. یک معلم می‌تواند چند ردیف داشته باشد.', 'مثال': '' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ شیت مدارس ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': 'کد مدرسه', 'توضیح': 'عدد یکتا (از سامانه سیدا)', 'مثال': '11001' },
    { 'عنوان': 'دوره تحصیلی', 'توضیح': 'ابتدایی | متوسطه اول | متوسطه دوم نظری | هنرستان | کاردانش', 'مثال': 'ابتدایی' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ شیت نیروها ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': 'رشته استخدام / بکارگیری', 'توضیح': '⭐ از لیست کشویی پایگاه مرجع انتخاب کنید', 'مثال': 'آموزگار ابتدایی' },
    { 'عنوان': 'کد رشته استخدامی', 'توضیح': '🔄 خودکار پر می‌شود (XLOOKUP از پایگاه مرجع)', 'مثال': '1001' },
    { 'عنوان': 'ساعت موظف', 'توضیح': 'معلم:۲۴ | تقلیل(≥۲۰سال):۲۰ | مدیر/معاون:۳۶ | خدمتگزار:۴۴', 'مثال': '24' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ شیت تراز ابلاغ ⭐ ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '⚠️ مهم‌ترین شیت', 'توضیح': 'سامانه دروس قابل ابلاغ را فقط از این شیت می‌خواند', 'مثال': '' },
    { 'عنوان': 'رشته تدریس', 'توضیح': '⭐ از لیست کشویی پایگاه مرجع انتخاب کنید', 'مثال': 'ریاضی' },
    { 'عنوان': 'کد رشته تدریس', 'توضیح': '🔄 خودکار (XLOOKUP)', 'مثال': '1020' },
    { 'عنوان': 'گروه تدریس', 'توضیح': '🔄 خودکار (XLOOKUP)', 'مثال': 'ریاضی' },
    { 'عنوان': 'کد گروه', 'توضیح': '🔄 خودکار (XLOOKUP)', 'مثال': '2' },
    { 'عنوان': 'ساعت کل', 'توضیح': 'تعداد ساعت هفتگی تراز', 'مثال': '10' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ فرمول‌های هوشمند ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '🔄 کد رشته استخدامی', 'توضیح': 'رشته استخدامی نیرو را انتخاب کنید → کد خودکار پر می‌شود', 'مثال': 'نیاز به وارد کردن دستی نیست' },
    { 'عنوان': '🔄 کد رشته تدریس', 'توضیح': 'درس را در تراز انتخاب کنید → کد و گروه خودکار پر می‌شود', 'مثال': 'نیاز به وارد کردن دستی نیست' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ چگونه بفهمم نیرو کم یا زیاد دارم؟ ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': 'سامانه محاسبه می‌کند', 'توضیح': 'ساعات تراز هر درس رو با ابلاغ‌های ثبت‌شده مقایسه می‌کنه', 'مثال': 'کامل ✅ / ناقص ⚠️ / اضافه ❌' },
    { 'عنوان': '', 'توضیح': '', 'مثال': '' },
    { 'عنوان': '━━ شیت برنامه هفتگی ━━', 'توضیح': '', 'مثال': '' },
    { 'عنوان': 'اختیاری', 'توضیح': 'برنامه حضور معلمان. این شیت تغییر نمی‌کند.', 'مثال': '' },
    { 'عنوان': 'روز هفته', 'توضیح': 'شنبه | یکشنبه | دوشنبه | سه‌شنبه | چهارشنبه', 'مثال': 'شنبه' },
  ]);

  sMaster['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 3 }, { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 3 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 22 }];
  s1['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 28 }];
  s2['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 10 }];
  s3['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  s4['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
  s5['!cols'] = [{ wch: 30 }, { wch: 75 }, { wch: 28 }];

  XLSX.utils.book_append_sheet(wb, sMaster, 'پایگاه مرجع');
  XLSX.utils.book_append_sheet(wb, s1, 'مدارس');
  XLSX.utils.book_append_sheet(wb, s2, 'نیروها');
  XLSX.utils.book_append_sheet(wb, s3, 'تراز ابلاغ');
  XLSX.utils.book_append_sheet(wb, s4, 'برنامه هفتگی');
  XLSX.utils.book_append_sheet(wb, s5, 'راهنما');

  XLSX.writeFile(wb, 'قالب_ساماندهی_1406-1405.xlsx');
}
