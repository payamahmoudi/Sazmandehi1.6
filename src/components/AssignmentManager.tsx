import { useState, useMemo, useRef } from 'react';
import { Personnel, School, SubjectRequirement, Assignment } from '../types';
import SearchableSelect from './SearchableSelect';
import PrintNotice from './PrintNotice';
import PersianDatePicker from './PersianDatePicker';
import { getMaxHoursForRole } from '../store/useStore';

interface Props {
  schools: School[];
  personnel: Personnel[];
  subjectRequirements: SubjectRequirement[];
  onAddAssignment: (personnelId: string, schoolId: string, subject: string, hours: number, isMandatory: boolean, grade: string, startDate?: string, endDate?: string, assignmentType?: string) => void;
  onRemoveAssignment: (personnelId: string, assignmentId: string) => void;
  onEditAssignment: (personnelId: string, assignmentId: string, updates: { subject?: string; hours?: number; isMandatory?: boolean; grade?: string }) => void;
  organization?: { ministry: string; province: string; office: string };
}

export default function AssignmentManager({ schools, personnel, subjectRequirements, onAddAssignment, onRemoveAssignment, onEditAssignment, organization }: Props) {
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [hours, setHours] = useState(0);
  const [isMandatory, setIsMandatory] = useState(true);
  const [assignmentType, setAssignmentType] = useState<string>('موظف');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingAssignment, setEditingAssignment] = useState<{ personnelId: string; assignment: any } | null>(null);
  const [noticeData, setNoticeData] = useState<{ assignment?: Assignment; person: Personnel; school: School; number: string } | null>(null);
  const [customSubject, setCustomSubject] = useState('');
  const [selectedShortageSubject, setSelectedShortageSubject] = useState<string>('');

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const selectedPerson = personnel.find(p => p.id === selectedPersonnelId);

  const schoolOptions = useMemo(() => schools.map(s => ({
    value: s.id,
    label: `${s.name} (${s.code})`,
    description: `${s.type} - ${s.gender} - ${s.classCount} کلاس`,
  })), [schools]);

  const gradeOptions = useMemo(() => selectedSchool?.grades.map(g => ({
    value: g.grade,
    label: `${g.grade}${g.field ? ` (${g.field})` : ''}`,
    description: `${g.classCount} کلاس - ${g.studentCount} دانش‌آموز`,
  })) || [], [selectedSchool]);

  // Get available subjects for selected school
  const availableSubjects = useMemo(() => {
    if (!selectedSchool) return [];
    const schoolGrades = selectedSchool.grades.map(g => g.grade);
    return subjectRequirements.filter(sr => schoolGrades.includes(sr.grade));
  }, [selectedSchool, subjectRequirements]);

  // Get available personnel for the selected school and subject
  const availablePersonnel = useMemo(() => {
    if (!selectedSchool) return personnel.filter(p => p.status === 'فعال' && !p.isLocked);
    
    return personnel.filter(p => {
      if (p.status !== 'فعال') return false;
      if (isMandatory && p.isLocked) return false;
      // Gender match
      if (selectedSchool.gender === 'پسرانه' && p.gender === 'زن') {
        // Allow if school type is ابتدایی and grade is اول or دوم
        if (selectedSchool.type !== 'ابتدایی') return false;
      }
      if (selectedSchool.gender === 'دخترانه' && p.gender === 'مرد') {
        if (selectedSchool.type !== 'ابتدایی') return false;
      }
      return true;
    });
  }, [selectedSchool, personnel, isMandatory]);

  // Get subjects that belong to THIS school only (from assignments already made in this school)
  const allSubjectsFromBalance = useMemo(() => {
    if (!selectedSchool) return [];
    const schoolGrades = new Set(selectedSchool.grades.map(g => g.grade));
    // Only subjects from assignments in this school AND matching grades
    const schoolAssignments = personnel.flatMap(p => p.assignments.filter(a => a.schoolId === selectedSchool.id && schoolGrades.has(a.grade)));
    return [...new Set(schoolAssignments.map(a => a.subject))];
  }, [selectedSchool, personnel]);

  const subjectOptions = useMemo(() => {
    if (!selectedSchool) return [{ value: '__custom__', label: '➕ درس دلخواه' }];
    const schoolGrades = new Set(selectedSchool.grades.map(g => g.grade));
    
    // Filter subjectRequirements: only grades that exist in THIS school
    const fromReqs = [...new Set(
      availableSubjects
        .filter(s => schoolGrades.has(s.grade) && (!selectedGrade || s.grade === selectedGrade))
        .map(s => s.subject)
    )];
    const combined = [...new Set([...fromReqs, ...allSubjectsFromBalance])];
    return [
      ...combined.map(subject => ({ value: subject, label: subject })),
      { value: 'مدیریت', label: 'مدیریت' },
      { value: 'معاونت', label: 'معاونت' },
      { value: 'مرخصی زایمان', label: 'مرخصی زایمان' },
      { value: '__custom__', label: '➕ درس دلخواه (تایپ کنید)' },
    ];
  }, [availableSubjects, selectedGrade, allSubjectsFromBalance, selectedSchool]);

  const personnelOptions = useMemo(() => availablePersonnel.map(p => {
    const maxH = getMaxHoursForRole(p);
    const remaining = maxH - p.assignedHours;
    const reduced = p.reducedHours || (p.serviceYears && p.serviceYears >= 20);
    return {
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
      description: `${p.field} - ${p.gender} - کد ملی: ${p.nationalCode || 'ثبت نشده'}${p.personnelCode ? ` - کد پرسنلی: ${p.personnelCode}` : ''} - باقی‌مانده: ${remaining} از ${maxH} ساعت${reduced ? ' 📉تقلیل' : ''}`,
    };
  }), [availablePersonnel]);

  // Calculate school's total required hours and assigned hours
  const schoolHoursSummary = useMemo(() => {
    if (!selectedSchool) return [];
    
    const summary: Array<{
      subject: string;
      grade: string;
      field?: string;
      requiredHours: number;
      assignedHours: number;
      remaining: number;
      requiredField: string;
      assignedTo: string[];
    }> = [];

    const schoolGrades = selectedSchool.grades;
    
    for (const grade of schoolGrades) {
      const requirements = subjectRequirements.filter(sr => sr.grade === grade.grade);
      
      for (const req of requirements) {
        const totalHours = req.hoursPerWeek * grade.classCount;
        const assigned = personnel.flatMap(p => 
          p.assignments.filter(a => a.schoolId === selectedSchool.id && a.subject === req.subject && a.grade === grade.grade)
        );
        const assignedHours = assigned.reduce((sum, a) => sum + a.hours, 0);
        const assignedNames = assigned.map(a => {
          const person = personnel.find(p => p.id === a.personnelId);
          return person ? `${person.firstName} ${person.lastName} (${a.hours}س)` : '';
        });

        summary.push({
          subject: req.subject,
          grade: grade.grade,
          field: grade.field,
          requiredHours: totalHours,
          assignedHours,
          remaining: totalHours - assignedHours,
          requiredField: req.requiredTeacherField,
          assignedTo: assignedNames,
        });
      }
    }

    return summary;
  }, [selectedSchool, personnel, subjectRequirements]);

  const handleAssign = () => {
    const finalSubject = selectedSubject === '__custom__' ? customSubject.trim() : selectedSubject;
    if (!selectedSchoolId || !selectedPersonnelId || !finalSubject || hours <= 0) {
      alert('لطفاً تمامی فیلدها را پر کنید.');
      return;
    }

    if (editingAssignment) {
      if (!confirm('آیا از ویرایش این ابلاغ مطمئن هستید؟')) return;
      onEditAssignment(editingAssignment.personnelId, editingAssignment.assignment.id, {
        subject: finalSubject,
        hours,
        isMandatory,
        grade: selectedGrade,
      });
      setEditingAssignment(null);
    } else {
      // Save current values before reset
      const savedHours = hours;
      const savedSubject = finalSubject;
      const savedGrade = selectedGrade;
      const savedMandatory = isMandatory;
      
      onAddAssignment(selectedPersonnelId, selectedSchoolId, finalSubject, hours, isMandatory, selectedGrade, startDate || undefined, endDate || undefined, assignmentType);
      
      // Show print notice with saved values
      const school = schools.find(s => s.id === selectedSchoolId);
      const person = personnel.find(p => p.id === selectedPersonnelId);
      if (school && person) {
        const newAssignment: Assignment = {
          id: `a-print-${Date.now()}`,
          personnelId: selectedPersonnelId,
          schoolId: selectedSchoolId,
          schoolName: school.name,
          schoolCode: school.code,
          subject: savedSubject,
          hours: savedHours,
          isMandatory: savedMandatory,
          assignmentType: assignmentType as any,
          grade: savedGrade,
          createdAt: new Date().toISOString(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        };
        // Combine existing assignments with the new one
        const allAssignments = [...person.assignments, newAssignment];
        const randNum = Math.floor(1000 + Math.random() * 9000);
        setNoticeData({ person: { ...person, assignments: allAssignments }, school, number: `3124/${randNum}` });
      }
    }
    setHours(0);
  };

  const startEdit = (personnelId: string, assignment: any) => {
    setEditingAssignment({ personnelId, assignment });
    setSelectedSchoolId(assignment.schoolId);
    setSelectedSubject(assignment.subject);
    setSelectedGrade(assignment.grade);
    setHours(assignment.hours);
    setIsMandatory(assignment.isMandatory);
    setSelectedPersonnelId(personnelId);
  };

  const cancelEdit = () => {
    setEditingAssignment(null);
    setHours(0);
    setSelectedSubject('');
    setSelectedGrade('');
  };

  // Format date
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // Summary: all schools hours overview
  const allSchoolsSummary = useMemo(() => {
    const subjectTotals: Record<string, { required: number; assigned: number; teacherCount: number }> = {};
    
    for (const school of schools) {
      for (const grade of school.grades) {
        const requirements = subjectRequirements.filter(sr => sr.grade === grade.grade);
        for (const req of requirements) {
          const key = `${req.subject}`;
          if (!subjectTotals[key]) subjectTotals[key] = { required: 0, assigned: 0, teacherCount: 0 };
          subjectTotals[key].required += req.hoursPerWeek * grade.classCount;
        }
      }
    }

    // Count assigned hours and teachers
    for (const person of personnel) {
      for (const assignment of person.assignments) {
        const key = assignment.subject;
        if (subjectTotals[key]) {
          subjectTotals[key].assigned += assignment.hours;
        }
      }
    }

    // Count teachers by field
    const teachersByField: Record<string, number> = {};
    personnel.forEach(p => {
      if (p.status === 'فعال' && p.role === 'معلم') {
        teachersByField[p.field] = (teachersByField[p.field] || 0) + 1;
      }
    });

    return { subjectTotals, teachersByField };
  }, [schools, personnel, subjectRequirements]);

  const shortageSchools = useMemo(() => {
    if (!selectedShortageSubject) return [] as Array<{ schoolId: string; schoolName: string; grade: string; remaining: number; field?: string }>;
    const rows: Array<{ schoolId: string; schoolName: string; grade: string; remaining: number; field?: string }> = [];
    for (const school of schools) {
      for (const grade of school.grades) {
        const reqs = subjectRequirements.filter(sr => sr.grade === grade.grade && sr.subject === selectedShortageSubject);
        for (const req of reqs) {
          const required = req.hoursPerWeek * grade.classCount;
          const assigned = personnel.flatMap(p => p.assignments).filter(a => a.schoolId === school.id && a.subject === req.subject && a.grade === grade.grade).reduce((s, a) => s + a.hours, 0);
          const remaining = required - assigned;
          if (remaining > 0) rows.push({ schoolId: school.id, schoolName: school.name, grade: grade.grade, remaining, field: grade.field });
        }
      }
    }
    return rows;
  }, [selectedShortageSubject, schools, subjectRequirements, personnel]);

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 خلاصه ساعات درسی شهرستان</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 text-right text-gray-600">درس</th>
                <th className="py-2 px-3 text-center text-gray-600">کل ساعات مورد نیاز</th>
                <th className="py-2 px-3 text-center text-gray-600">ساعات ابلاغ شده</th>
                <th className="py-2 px-3 text-center text-gray-600">کسری ساعات</th>
                <th className="py-2 px-3 text-center text-gray-600">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allSchoolsSummary.subjectTotals).map(([subject, data]) => (
                <tr key={subject} onClick={() => setSelectedShortageSubject(subject)} className="border-t border-gray-50 cursor-pointer hover:bg-indigo-50">
                  <td className="py-2 px-3 font-medium">{subject}</td>
                  <td className="py-2 px-3 text-center">{data.required}</td>
                  <td className="py-2 px-3 text-center text-indigo-600">{data.assigned}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={data.required - data.assigned > 0 ? 'text-red-500 font-medium' : 'text-green-500'}>
                      {data.required - data.assigned}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {data.assigned >= data.required ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">تکمیل ✅</span>
                    ) : data.assigned > 0 ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">ناقص ⚠️</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">خالی ❌</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedShortageSubject && (
        <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-indigo-700">مدارس دارای کسری برای درس «{selectedShortageSubject}»</h3>
            <button onClick={() => setSelectedShortageSubject('')} className="text-xs text-gray-400 hover:text-gray-600">✕ بستن</button>
          </div>
          {shortageSchools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {shortageSchools.map((row, i) => (
                <button key={`${row.schoolId}-${row.grade}-${i}`} onClick={() => {
                  setSelectedSchoolId(row.schoolId);
                  setSelectedGrade(row.grade);
                  setSelectedSubject(selectedShortageSubject);
                  setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }} className="text-right rounded-lg border border-indigo-200 bg-indigo-50 p-3 hover:bg-indigo-100 transition-colors">
                  <div className="font-medium text-indigo-800">{row.schoolName}</div>
                  <div className="text-xs text-indigo-600 mt-1">پایه: {row.grade}{row.field ? ` (${row.field})` : ''}</div>
                  <div className="text-xs text-red-500 mt-1">کسری: {row.remaining} ساعت</div>
                  <div className="text-[10px] text-gray-500 mt-2">برای ثبت ابلاغ روی این کارت کلیک کنید</div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">برای این درس کسری فعالی پیدا نشد.</p>
          )}
        </div>
      )}

      {/* Assignment Form */}
      <div ref={formRef} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📝 صدور ابلاغ جدید</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* School Selection */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">مدرسه</label>
            <SearchableSelect
              value={selectedSchoolId}
              options={schoolOptions}
              onChange={value => { setSelectedSchoolId(value); setSelectedSubject(''); setSelectedGrade(''); setSelectedPersonnelId(''); }}
              placeholder="جستجوی نام مدرسه..."
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">پایه</label>
            <SearchableSelect
              value={selectedGrade}
              onChange={value => { setSelectedGrade(value); setSelectedSubject(''); }}
              options={gradeOptions}
              placeholder="جستجوی پایه..."
              disabled={!selectedSchool}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">درس</label>
            <SearchableSelect
              value={selectedSubject}
              onChange={v => { setSelectedSubject(v); if (v !== '__custom__') setCustomSubject(''); }}
              options={subjectOptions}
              placeholder="جستجوی درس..."
              disabled={!selectedSchool}
            />
            {selectedSubject === '__custom__' && (
              <input
                placeholder="نام درس دلخواه را تایپ کنید..."
                value={customSubject}
                onChange={e => setCustomSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm bg-indigo-50"
              />
            )}
          </div>

          {/* Personnel */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">نیرو</label>
            <SearchableSelect
              value={selectedPersonnelId}
              onChange={setSelectedPersonnelId}
              options={personnelOptions}
              placeholder="جستجوی نام، کد ملی، کد پرسنلی یا رشته..."
            />
          </div>

          {/* Hours */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">ساعت</label>
            <input
              type="number"
              min={0}
              max={30}
              value={hours}
              onChange={e => setHours(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              placeholder="تعداد ساعات"
            />
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">نوع ابلاغ</label>
            <div className="flex gap-1">
              {(['موظف', 'غیرموظف', 'تدریس عوامل اجرایی'] as const).map(t => (
                <button key={t} onClick={() => {
                  setAssignmentType(t);
                  setIsMandatory(t === 'موظف' || t === 'تدریس عوامل اجرایی');
                }} className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors ${
                  assignmentType === t ? (t === 'غیرموظف' ? 'bg-amber-500 text-white' : t === 'تدریس عوامل اجرایی' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-100 text-gray-600'
                }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <PersianDatePicker value={startDate} onChange={setStartDate} label="تاریخ شروع ابلاغ" placeholder="انتخاب تاریخ شروع" />
          </div>
          <div>
            <PersianDatePicker value={endDate} onChange={setEndDate} label="تاریخ پایان ابلاغ" placeholder="انتخاب تاریخ پایان" />
          </div>
        </div>

        {/* Selected person info */}
        {selectedPerson && (
          <div className={`rounded-lg p-3 mb-4 border ${
            selectedPerson.isLocked ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium">{selectedPerson.firstName} {selectedPerson.lastName}</span>
                <span className="text-xs text-gray-500 mr-2">
                  ({selectedPerson.field} | {selectedPerson.gender} | {selectedPerson.employmentType})
                </span>
              </div>
              <div className="text-sm">
                <span className="text-indigo-600 font-medium">{selectedPerson.assignedHours}</span>
                <span className="text-gray-400"> / </span>
                <span className="text-gray-600">{selectedPerson.maxHours}</span>
                <span className="text-xs text-gray-400 mr-1">ساعت</span>
                {selectedPerson.isLocked && <span className="mr-1 text-green-500">🔒</span>}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {editingAssignment && (
            <button
              onClick={cancelEdit}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              ❌ انصراف از ویرایش
            </button>
          )}
          <button
            onClick={handleAssign}
            disabled={!selectedSchoolId || !selectedPersonnelId || hours <= 0}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingAssignment ? '✏️ ویرایش ابلاغ' : '✅ ثبت ابلاغ'}
          </button>
        </div>
        {editingAssignment && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            ⚠️ در حال ویرایش ابلاغ هستید. پس از تأیید، تغییرات اعمال خواهد شد.
          </div>
        )}
      </div>

      {/* School Detail Hours */}
      {selectedSchool && schoolHoursSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            📋 جدول ساعات مدرسه {selectedSchool.name}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-right text-gray-600">درس</th>
                  <th className="py-2 px-3 text-right text-gray-600">پایه</th>
                  <th className="py-2 px-3 text-right text-gray-600">رشته مورد نیاز</th>
                  <th className="py-2 px-3 text-center text-gray-600">ساعات مورد نیاز</th>
                  <th className="py-2 px-3 text-center text-gray-600">ابلاغ شده</th>
                  <th className="py-2 px-3 text-center text-gray-600">باقیمانده</th>
                  <th className="py-2 px-3 text-right text-gray-600">نیروهای ابلاغ شده</th>
                  <th className="py-2 px-3 text-center text-gray-600">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {schoolHoursSummary.map((item, i) => (
                  <tr key={i} className={`border-t border-gray-50 ${item.remaining > 0 ? 'bg-red-50/30' : 'bg-green-50/30'}`}>
                    <td className="py-2 px-3 font-medium">{item.subject}</td>
                    <td className="py-2 px-3">{item.grade} {item.field ? `(${item.field})` : ''}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{item.requiredField}</td>
                    <td className="py-2 px-3 text-center font-medium">{item.requiredHours}</td>
                    <td className="py-2 px-3 text-center text-indigo-600 font-medium">{item.assignedHours}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={item.remaining > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>
                        {item.remaining}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs">{item.assignedTo.join('، ') || '—'}</td>
                    <td className="py-2 px-3 text-center">
                      {item.remaining <= 0 ? '✅' : '❌'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All assignments list */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 لیست کل ابلاغ‌های صادر شده</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 text-right text-gray-600">#</th>
                <th className="py-2 px-3 text-right text-gray-600">نام نیرو</th>
                <th className="py-2 px-3 text-right text-gray-600">مدرسه</th>
                <th className="py-2 px-3 text-right text-gray-600">درس</th>
                <th className="py-2 px-3 text-right text-gray-600">پایه</th>
                <th className="py-2 px-3 text-center text-gray-600">ساعت</th>
                <th className="py-2 px-3 text-center text-gray-600">نوع</th>
                <th className="py-2 px-3 text-center text-gray-600">تاریخ ثبت</th>
                <th className="py-2 px-3 text-center text-gray-600">ویرایش</th>
                <th className="py-2 px-3 text-center text-gray-600">چاپ</th>
                <th className="py-2 px-3 text-center text-gray-600">حذف</th>
              </tr>
            </thead>
            <tbody>
              {personnel.flatMap(p =>
                p.assignments.map((a, i) => {
                  const isNew = Date.now() - new Date(a.createdAt).getTime() < 24 * 60 * 60 * 1000;
                  return (
                  <tr key={a.id} className={`border-t border-gray-50 hover:bg-gray-50 ${isNew ? 'bg-blue-50/40' : ''}`}>
                    <td className="py-2 px-3 text-gray-400">{i + 1}{isNew && <span className="mr-1 text-blue-500" title="ابلاغ جدید">🆕</span>}</td>
                    <td className="py-2 px-3 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-2 px-3">{a.schoolName}</td>
                    <td className="py-2 px-3">{a.subject}</td>
                    <td className="py-2 px-3">{a.grade}</td>
                    <td className="py-2 px-3 text-center font-medium">{a.hours}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.isMandatory ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {a.isMandatory ? 'موظف' : 'غیرموظف'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-xs text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => startEdit(p.id, a)}
                        className="text-indigo-400 hover:text-indigo-700 text-xs font-medium"
                        title="ویرایش ابلاغ"
                      >
                        ✏️
                      </button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => {
                        const schoolObj = schools.find(s => s.id === a.schoolId) || schools[0];
                        setNoticeData({ person: p, school: schoolObj, number: '' });
                      }} className="text-emerald-400 hover:text-emerald-600" title="چاپ ابلاغ">🖨️</button>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => { if (confirm('حذف این ابلاغ؟')) onRemoveAssignment(p.id, a.id); }}
                        className="text-red-400 hover:text-red-600"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
              {personnel.every(p => p.assignments.length === 0) && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-400">هیچ ابلاغی ثبت نشده است</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {noticeData && (
        <PrintNotice
          person={noticeData.person}
          school={noticeData.school}
          allAssignments={noticeData.person.assignments}
          noticeNumber={noticeData.number}
          organization={organization}
          onClose={() => setNoticeData(null)}
        />
      )}
    </div>
  );
}
