import { useState, useCallback, useEffect, useMemo } from 'react';
import { School, Personnel, Assignment, SubjectRequirement, BalanceRecord, ScheduleEntry } from '../types';
import { sampleSchools, samplePersonnel, sampleSubjectRequirements, sampleBalanceRecords } from '../data/sampleData';

// Calculate max hours based on role and conditions
export function getMaxHoursForRole(person: Personnel): number {
  const role = person.role;
  if (role === 'سرایدار' || role === 'خدمتگزار') return 44;
  if (role === 'مدیر' || role === 'معاون آموزشی' || role === 'معاون پرورشی' || role === 'معاون اجرایی' || role === 'معاون فنی' || role === 'سرپرست بخش') return 36;
  if (person.reducedHours || (person.serviceYears && person.serviceYears >= 20)) return 20;
  return 24;
}

// Check compliance with regulations and return warnings (not blocking)
export function checkRegulationWarnings(person: Personnel, newHours: number, isMandatory: boolean): string[] {
  const warnings: string[] = [];
  const role = person.role;
  const maxH = getMaxHoursForRole(person);
  const totalAfter = isMandatory ? person.assignedHours + newHours : person.assignedHours;
  const isReduced = person.reducedHours || (person.serviceYears && person.serviceYears >= 20);
  const isExecutive = ['مدیر', 'معاون آموزشی', 'معاون پرورشی', 'معاون اجرایی', 'معاون فنی', 'سرپرست بخش'].includes(role);

  if (isMandatory && totalAfter > maxH) {
    warnings.push(`⚠️ ساعات موظف (${totalAfter}) از سقف مجاز (${maxH}) بیشتر شده است.`);
  }

  if (isReduced && !isExecutive && isMandatory && totalAfter > 20) {
    warnings.push(`📉 این نیرو مشمول تقلیل ساعت است (سابقه≥۲۰ سال). سقف مجاز ۲۰ ساعت. فعلی: ${totalAfter} ساعت.`);
  }

  if (isExecutive && isReduced) {
    warnings.push(`ℹ️ قانون تقلیل ساعت شامل پست اجرایی (${role}) نمی‌شود. سقف همچنان ${maxH} ساعت.`);
  }

  if (role === 'سرایدار') {
    warnings.push(`ℹ️ سرایدار ملزم به بیتوته و حضور ۴۴ ساعته + ایام تعطیل.`);
  }

  return warnings;
}

export function getAssignmentStatus(person: Personnel): { isComplete: boolean; label: string; color: string; detail: string } {
  const maxH = getMaxHoursForRole(person);
  const a = person.assignedHours;
  if (person.status === 'مرخصی زایمان') return { isComplete: true, label: 'مرخصی زایمان', color: 'purple', detail: `مرخصی` };
  if (a >= maxH) return { isComplete: true, label: 'تکمیل ✅', color: 'green', detail: `${a}/${maxH} ساعت` };
  if (a > 0) return { isComplete: false, label: `ناقص (${maxH - a}س)`, color: 'amber', detail: `${a}/${maxH} ساعت` };
  return { isComplete: false, label: 'بدون ابلاغ', color: 'red', detail: `0/${maxH} ساعت` };
}

function loadFromStorage(storageKey: string) {
  try {
    const data = localStorage.getItem(storageKey);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(storageKey: string, data: any) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch { /* ignore */ }
  // Also save to backend (fire-and-forget)
  import('../services/api').then(({ apiSaveWorkspace }) => {
    apiSaveWorkspace(data).catch(() => {});
  }).catch(() => {});
}

export function useStore(workspaceId = 'admin-paya') {
  const storageKey = useMemo(() => `saman-edu-data-${workspaceId}`, [workspaceId]);
  const stored = loadFromStorage(storageKey);

  const [schools, setSchools] = useState<School[]>(stored?.schools || sampleSchools);
  const [personnel, setPersonnel] = useState<Personnel[]>(stored?.personnel || samplePersonnel);
  const [subjectRequirements, setSubjectRequirements] = useState<SubjectRequirement[]>(
    stored?.subjectRequirements || sampleSubjectRequirements
  );
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>(
    stored?.balanceRecords || sampleBalanceRecords
  );
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(
    stored?.scheduleEntries || []
  );

  // Load from backend on startup
  useEffect(() => {
    import('../services/api').then(({ apiGetWorkspace }) => {
      apiGetWorkspace().then((res: any) => {
        if (res?.data) {
          const d = res.data;
          if (d.schools) setSchools(d.schools);
          if (d.personnel) setPersonnel(d.personnel);
          if (d.subjectRequirements) setSubjectRequirements(d.subjectRequirements);
          if (d.balanceRecords) setBalanceRecords(d.balanceRecords);
          if (d.scheduleEntries) setScheduleEntries(d.scheduleEntries);
          // Also cache locally
          saveToStorage(storageKey, d);
        }
      }).catch(() => {}); // Use local data if backend unavailable
    }).catch(() => {});
  }, [storageKey]);

  useEffect(() => {
    const next = loadFromStorage(storageKey);
    setSchools(next?.schools || sampleSchools);
    setPersonnel(next?.personnel || samplePersonnel);
    setSubjectRequirements(next?.subjectRequirements || sampleSubjectRequirements);
    setBalanceRecords(next?.balanceRecords || sampleBalanceRecords);
    setScheduleEntries(next?.scheduleEntries || []);
  }, [storageKey]);

  const save = useCallback((s: School[], p: Personnel[], sr: SubjectRequirement[], br: BalanceRecord[], se: ScheduleEntry[] = scheduleEntries) => {
    saveToStorage(storageKey, { schools: s, personnel: p, subjectRequirements: sr, balanceRecords: br, scheduleEntries: se });
  }, [storageKey, scheduleEntries]);

  const getSubjectCapacity = useCallback((schoolId: string, subject: string, grade: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return 0;

    const byBalance = balanceRecords.find(r => (r.schoolId === schoolId || r.schoolName === school.name) && r.subject === subject && r.grade === grade);
    if (byBalance) return byBalance.totalHours;

    const req = subjectRequirements.find(r => r.subject === subject && r.grade === grade);
    if (!req) return Infinity;
    const gradeInfo = school.grades.find(g => g.grade === grade);
    const classCount = gradeInfo?.classCount || 1;
    return req.hoursPerWeek * classCount;
  }, [schools, balanceRecords, subjectRequirements]);

  const getAssignedSubjectHours = useCallback((schoolId: string, subject: string, grade: string, excludeAssignmentId?: string) => {
    return personnel.flatMap(p => p.assignments)
      .filter(a => a.schoolId === schoolId && a.subject === subject && a.grade === grade && a.id !== excludeAssignmentId)
      .reduce((sum, a) => sum + a.hours, 0);
  }, [personnel]);

  const updateSchools = useCallback((newSchools: School[]) => {
    setSchools(newSchools);
    save(newSchools, personnel, subjectRequirements, balanceRecords);
  }, [personnel, subjectRequirements, balanceRecords, save]);

  const updatePersonnel = useCallback((newPersonnel: Personnel[]) => {
    setPersonnel(newPersonnel);
    save(schools, newPersonnel, subjectRequirements, balanceRecords);
  }, [schools, subjectRequirements, balanceRecords, save]);

  const updateSubjectRequirements = useCallback((newSR: SubjectRequirement[]) => {
    setSubjectRequirements(newSR);
    save(schools, personnel, newSR, balanceRecords);
  }, [schools, personnel, balanceRecords, save]);

  const updateBalanceRecords = useCallback((newBR: BalanceRecord[]) => {
    setBalanceRecords(newBR);
    save(schools, personnel, subjectRequirements, newBR);
  }, [schools, personnel, subjectRequirements, save]);

  const addAssignment = useCallback((
    personnelId: string,
    schoolId: string,
    subject: string,
    hours: number,
    isMandatory: boolean,
    grade: string,
    startDate?: string,
    endDate?: string,
    assignmentType?: string
  ) => {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;

    const person = personnel.find(p => p.id === personnelId);
    if (!person) return;

    const effectiveMaxHours = getMaxHoursForRole(person);
    const regWarnings = checkRegulationWarnings(person, hours, isMandatory);
    
    if (isMandatory && person.assignedHours + hours > effectiveMaxHours) {
      const warningText = regWarnings.join('\n');
      const proceed = confirm(`${warningText}\n\nساعات موظف ${person.firstName} ${person.lastName} (${person.assignedHours + hours}) از سقف مجاز (${effectiveMaxHours}) بیشتر می‌شود.\n\nآیا همچنان می‌خواهید ابلاغ را ثبت کنید؟`);
      if (!proceed) return;
    } else if (regWarnings.length > 0) {
      // Show warnings but don't block
      const warningText = regWarnings.join('\n');
      if (!confirm(`${warningText}\n\nآیا ابلاغ ثبت شود؟`)) return;
    }

    const subjectCapacity = getSubjectCapacity(schoolId, subject, grade);
    const alreadyAssigned = getAssignedSubjectHours(schoolId, subject, grade);
    if (Number.isFinite(subjectCapacity) && alreadyAssigned + hours > subjectCapacity) {
      const remaining = subjectCapacity - alreadyAssigned;
      const schoolName = school.name;
      const otherOpenSubjects = (() => {
        const subjectRows = subjectRequirements
          .filter(r => school.grades.some(g => g.grade === r.grade))
          .map(r => {
            const cap = getSubjectCapacity(schoolId, r.subject, r.grade);
            const used = getAssignedSubjectHours(schoolId, r.subject, r.grade);
            return { subject: r.subject, grade: r.grade, remaining: cap - used };
          })
          .filter(r => r.remaining > 0)
          .slice(0, 8)
          .map(r => `• ${r.subject} - پایه ${r.grade}: ${r.remaining} ساعت`)
          .join('\n');
        return subjectRows;
      })();
      alert(`در مدرسه ${schoolName} برای درس «${subject}» در پایه «${grade}» دیگر ساعت خالی وجود ندارد.\nباقیمانده این درس: ${Math.max(0, remaining)} ساعت\n\nساعت‌های خالی سایر دروس این مدرسه:\n${otherOpenSubjects || 'موردی یافت نشد.'}`);
      return;
    }

    const assignment: Assignment = {
      id: `a-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      personnelId,
      schoolId,
      schoolName: school.name,
      schoolCode: school.code,
      subject,
      hours,
      isMandatory,
      assignmentType: (assignmentType as any) || (isMandatory ? 'موظف' : 'غیرموظف'),
      grade,
      createdAt: new Date().toISOString(),
      startDate,
      endDate,
    };

    const newPersonnel = personnel.map(p => {
      if (p.id === personnelId) {
        const newAssignments = [...p.assignments, assignment];
        const newAssignedHours = isMandatory ? p.assignedHours + hours : p.assignedHours;
        const newNonMandatoryHours = !isMandatory ? p.nonMandatoryHours + hours : p.nonMandatoryHours;
        const maxH = getMaxHoursForRole(p);
        const isLocked = newAssignedHours >= maxH; // سبز فقط وقتی ساعت موظف طبق ضوابط تکمیل شده
        return {
          ...p,
          assignments: newAssignments,
          assignedHours: newAssignedHours,
          nonMandatoryHours: newNonMandatoryHours,
          isLocked,
        };
      }
      return p;
    });

    setPersonnel(newPersonnel);
    save(schools, newPersonnel, subjectRequirements, balanceRecords);
  }, [schools, personnel, subjectRequirements, balanceRecords, save]);

  const removeAssignment = useCallback((personnelId: string, assignmentId: string) => {
    const newPersonnel = personnel.map(p => {
      if (p.id === personnelId) {
        const assignment = p.assignments.find(a => a.id === assignmentId);
        if (!assignment) return p;
        const newAssignments = p.assignments.filter(a => a.id !== assignmentId);
        const newAssignedHours = assignment.isMandatory ? p.assignedHours - assignment.hours : p.assignedHours;
        const newNonMandatoryHours = !assignment.isMandatory ? p.nonMandatoryHours - assignment.hours : p.nonMandatoryHours;
        return {
          ...p,
          assignments: newAssignments,
          assignedHours: newAssignedHours,
          nonMandatoryHours: newNonMandatoryHours,
          isLocked: newAssignedHours >= getMaxHoursForRole(p),
        };
      }
      return p;
    });
    setPersonnel(newPersonnel);
    save(schools, newPersonnel, subjectRequirements, balanceRecords);
  }, [personnel, schools, subjectRequirements, balanceRecords, save]);

  const editAssignment = useCallback((personnelId: string, assignmentId: string, updates: { subject?: string; hours?: number; isMandatory?: boolean; grade?: string }) => {
    const newPersonnel = personnel.map(p => {
      if (p.id === personnelId) {
        const oldAssignment = p.assignments.find(a => a.id === assignmentId);
        if (!oldAssignment) return p;
        
        const oldHours = oldAssignment.hours;
        const oldIsMandatory = oldAssignment.isMandatory;
        const newHours = updates.hours ?? oldHours;
        const newIsMandatory = updates.isMandatory ?? oldIsMandatory;
        
        // Calculate the hour difference
        let diffAssigned = 0;
        let diffNonMandatory = 0;
        
        if (oldIsMandatory && newIsMandatory) {
          diffAssigned = newHours - oldHours;
        } else if (oldIsMandatory && !newIsMandatory) {
          diffAssigned = -oldHours;
          diffNonMandatory = newHours;
        } else if (!oldIsMandatory && newIsMandatory) {
          diffNonMandatory = -oldHours;
          diffAssigned = newHours;
        } else {
          diffNonMandatory = newHours - oldHours;
        }

        const newAssigned = p.assignedHours + diffAssigned;
        const newNonMandatory = p.nonMandatoryHours + diffNonMandatory;
        const maxH = getMaxHoursForRole(p);
        
        if (newIsMandatory && newAssigned > maxH) {
          alert(`ساعات موظف ${p.firstName} ${p.lastName} نمی‌تواند بیشتر از ${maxH} ساعت باشد.`);
          return p;
        }

        const targetSchoolId = oldAssignment.schoolId;
        const targetSubject = updates.subject ?? oldAssignment.subject;
        const targetGrade = updates.grade ?? oldAssignment.grade;
        const subjectCapacity = getSubjectCapacity(targetSchoolId, targetSubject, targetGrade);
        const alreadyAssigned = getAssignedSubjectHours(targetSchoolId, targetSubject, targetGrade, assignmentId);
        if (Number.isFinite(subjectCapacity) && alreadyAssigned + newHours > subjectCapacity) {
          alert(`در این مدرسه برای درس «${targetSubject}» در پایه «${targetGrade}» دیگر ساعت خالی وجود ندارد.`);
          return p;
        }

        const newAssignments = p.assignments.map(a => {
          if (a.id === assignmentId) {
            return {
              ...a,
              subject: updates.subject ?? a.subject,
              hours: newHours,
              isMandatory: newIsMandatory,
              grade: updates.grade ?? a.grade,
            };
          }
          return a;
        });

        return {
          ...p,
          assignments: newAssignments,
          assignedHours: newAssigned,
          nonMandatoryHours: newNonMandatory,
          isLocked: newAssigned >= p.maxHours,
        };
      }
      return p;
    });
    setPersonnel(newPersonnel);
    save(schools, newPersonnel, subjectRequirements, balanceRecords);
  }, [personnel, schools, subjectRequirements, balanceRecords, save]);

  const assignManager = useCallback((schoolId: string, personnelId: string) => {
    const school = schools.find(s => s.id === schoolId);
    const newSchools = schools.map(s => s.id === schoolId ? { ...s, managerId: personnelId } : s);
    const newPersonnel = personnel.map(p => {
      if (p.id !== personnelId) return p;
      const maxH = 36; // مدیر ۳۶ ساعت
      const assignment: Assignment = {
        id: `a-mgr-${Date.now()}`, personnelId, schoolId, schoolName: school?.name || '',
        schoolCode: school?.code, subject: 'مدیریت', hours: maxH, isMandatory: true,
        assignmentType: 'موظف', grade: '-', createdAt: new Date().toISOString(),
      };
      return { ...p, role: 'مدیر' as const, maxHours: maxH, isLocked: true, assignedHours: maxH, assignments: [...p.assignments, assignment] };
    });
    setSchools(newSchools);
    setPersonnel(newPersonnel);
    save(newSchools, newPersonnel, subjectRequirements, balanceRecords);
  }, [schools, personnel, subjectRequirements, balanceRecords, save]);

  const assignAssistant = useCallback((schoolId: string, personnelId: string) => {
    const school = schools.find(s => s.id === schoolId);
    const newSchools = schools.map(s => s.id === schoolId ? { ...s, assistantId: personnelId } : s);
    const newPersonnel = personnel.map(p => {
      if (p.id !== personnelId) return p;
      const maxH = 36;
      const assignment: Assignment = {
        id: `a-ast-${Date.now()}`, personnelId, schoolId, schoolName: school?.name || '',
        schoolCode: school?.code, subject: 'معاونت', hours: maxH, isMandatory: true,
        assignmentType: 'موظف', grade: '-', createdAt: new Date().toISOString(),
      };
      return { ...p, role: 'معاون آموزشی' as const, maxHours: maxH, isLocked: true, assignedHours: maxH, assignments: [...p.assignments, assignment] };
    });
    setSchools(newSchools);
    setPersonnel(newPersonnel);
    save(newSchools, newPersonnel, subjectRequirements, balanceRecords);
  }, [schools, personnel, subjectRequirements, balanceRecords, save]);

  const assignExecutiveRole = useCallback((schoolId: string, personnelId: string, roleKey: string, roleLabel: string) => {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;
    const schoolName = school.name;
    
    // Update school - for standard keys store personnelId, for custom keys just log
    const newSchools = schools.map(s => {
      if (s.id !== schoolId) return s;
      if (!roleKey.startsWith('custom_')) {
        return { ...s, [roleKey]: personnelId };
      }
      return s;
    }) as School[];
    
    const isService = roleLabel === 'خدمتگزار' || roleLabel === 'سرایدار';
    const maxH = isService ? 44 : 36;
    
    const newPersonnel = personnel.map(p => {
      if (p.id !== personnelId) return p;
      // تدریس عوامل اجرایی فقط برای نیروهایی که هم پست اجرایی دارند و هم تدریس
      // برای سرایدار/خدمتگزار و مدیر/معاون بدون تدریس = موظف
      const assignment: Assignment = {
        id: `a-exec-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
        personnelId, schoolId, schoolName, schoolCode: school.code,
        subject: roleLabel, hours: maxH, isMandatory: true,
        assignmentType: 'موظف', grade: '-', createdAt: new Date().toISOString(),
      };
      // Map role label to valid Personnel role
      const validRoles: Personnel['role'][] = ['معلم', 'مدیر', 'معاون آموزشی', 'معاون پرورشی', 'معاون اجرایی', 'سرپرست بخش', 'معاون فنی', 'سرایدار', 'خدمتگزار', 'سایر'];
      const mappedRole = validRoles.includes(roleLabel as any) ? roleLabel as Personnel['role'] : 'سایر';
      return { ...p, role: mappedRole, maxHours: maxH, isLocked: true, assignedHours: maxH, assignments: [...p.assignments, assignment] };
    });
    setSchools(newSchools);
    setPersonnel(newPersonnel);
    save(newSchools, newPersonnel, subjectRequirements, balanceRecords);
  }, [schools, personnel, subjectRequirements, balanceRecords, save]);

  const addSchool = useCallback((school: School) => {
    const newSchools = [...schools, school];
    updateSchools(newSchools);
  }, [schools, updateSchools]);

  const removeSchool = useCallback((schoolId: string) => {
    const newSchools = schools.filter(s => s.id !== schoolId);
    updateSchools(newSchools);
  }, [schools, updateSchools]);

  const addPersonnel = useCallback((person: Personnel) => {
    const newPersonnel = [...personnel, person];
    updatePersonnel(newPersonnel);
  }, [personnel, updatePersonnel]);

  const removePersonnel = useCallback((personnelId: string) => {
    const newPersonnel = personnel.filter(p => p.id !== personnelId);
    updatePersonnel(newPersonnel);
  }, [personnel, updatePersonnel]);

  const updateScheduleEntries = useCallback((newEntries: ScheduleEntry[]) => {
    setScheduleEntries(newEntries);
    save(schools, personnel, subjectRequirements, balanceRecords, newEntries);
  }, [schools, personnel, subjectRequirements, balanceRecords, save]);

  const importData = useCallback((data: { schools?: School[], personnel?: Personnel[], subjectRequirements?: SubjectRequirement[], balanceRecords?: BalanceRecord[], scheduleEntries?: ScheduleEntry[] }) => {
    const newSchools = data.schools || schools;
    const newPersonnel = data.personnel || personnel;
    // If new subject requirements came from balance sheet, MERGE with existing (don't lose old ones)
    let newSR = subjectRequirements;
    if (data.subjectRequirements && data.subjectRequirements.length > 0) {
      const existingKeys = new Set(subjectRequirements.map(s => `${s.subject}|${s.grade}`));
      const merged = [...subjectRequirements];
      for (const req of data.subjectRequirements) {
        const key = `${req.subject}|${req.grade}`;
        if (existingKeys.has(key)) {
          // Update existing
          const idx = merged.findIndex(s => `${s.subject}|${s.grade}` === key);
          if (idx >= 0) merged[idx] = { ...merged[idx], ...req };
        } else {
          merged.push(req);
        }
      }
      newSR = merged;
    }
    const newBR = data.balanceRecords || balanceRecords;
    const newSE = data.scheduleEntries || scheduleEntries;
    setSchools(newSchools);
    setPersonnel(newPersonnel);
    setSubjectRequirements(newSR);
    setBalanceRecords(newBR);
    setScheduleEntries(newSE);
    save(newSchools, newPersonnel, newSR, newBR, newSE);
  }, [schools, personnel, subjectRequirements, balanceRecords, scheduleEntries, save]);

  const resetData = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSchools(sampleSchools);
    setPersonnel(samplePersonnel);
    setSubjectRequirements(sampleSubjectRequirements);
    setBalanceRecords(sampleBalanceRecords);
  }, [storageKey]);

  return {
    schools,
    personnel,
    subjectRequirements,
    balanceRecords,
    scheduleEntries,
    updateSchools,
    updatePersonnel,
    updateSubjectRequirements,
    updateBalanceRecords,
    updateScheduleEntries,
    addAssignment,
    removeAssignment,
    editAssignment,
    assignManager,
    assignAssistant,
    assignExecutiveRole,
    addSchool,
    removeSchool,
    addPersonnel,
    removePersonnel,
    importData,
    resetData,
  };
}
