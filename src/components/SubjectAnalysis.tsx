import { useMemo, useState } from 'react';
import { School, Personnel, SubjectRequirement, BalanceRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calculateTrazBalance, generateSchoolLessonMaps, TrazResult, SchoolLessonMap } from '../utils/excelImport';

interface Props {
  schools: School[];
  personnel: Personnel[];
  subjectRequirements: SubjectRequirement[];
  balanceRecords?: BalanceRecord[];
}

export default function SubjectAnalysis({ schools, personnel, subjectRequirements, balanceRecords }: Props) {
  // ETL-grade Traz Balance
  const trazResults: TrazResult[] = useMemo(() => 
    balanceRecords ? calculateTrazBalance(balanceRecords, personnel, schools) : [],
  [balanceRecords, personnel, schools]);

  const schoolMaps: SchoolLessonMap[] = useMemo(() =>
    balanceRecords ? generateSchoolLessonMaps(balanceRecords, personnel, schools) : [],
  [balanceRecords, personnel, schools]);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSchool, setFilterSchool] = useState<string>('');

  // Detailed analysis per school
  const schoolAnalysis = useMemo(() => {
    const analysis: Array<{
      school: School;
      subjects: Array<{
        subject: string;
        grade: string;
        field?: string;
        requiredHours: number;
        assignedHours: number;
        gap: number;
        teachers: string[];
        requiredField: string;
      }>;
      totalRequired: number;
      totalAssigned: number;
    }> = [];

    const filteredSchools = schools.filter(s => {
      if (filterType && s.type !== filterType) return false;
      if (filterSchool && s.id !== filterSchool) return false;
      return true;
    });

    for (const school of filteredSchools) {
      const subjects: typeof analysis[0]['subjects'] = [];
      let totalRequired = 0;
      let totalAssigned = 0;

      for (const grade of school.grades) {
        const requirements = subjectRequirements.filter(sr => sr.grade === grade.grade);
        
        for (const req of requirements) {
          const hours = req.hoursPerWeek * grade.classCount;
          const assigned = personnel.flatMap(p =>
            p.assignments.filter(a => a.schoolId === school.id && a.subject === req.subject && a.grade === grade.grade)
          );
          const assignedHours = assigned.reduce((sum, a) => sum + a.hours, 0);
          const teachers = assigned.map(a => {
            const p = personnel.find(pp => pp.id === a.personnelId);
            return p ? `${p.firstName} ${p.lastName}` : '';
          }).filter(Boolean);

          totalRequired += hours;
          totalAssigned += assignedHours;

          subjects.push({
            subject: req.subject,
            grade: grade.grade,
            field: grade.field,
            requiredHours: hours,
            assignedHours,
            gap: hours - assignedHours,
            teachers,
            requiredField: req.requiredTeacherField,
          });
        }
      }

      analysis.push({ school, subjects, totalRequired, totalAssigned });
    }

    return analysis;
  }, [schools, personnel, subjectRequirements, filterType, filterSchool]);

  // County-wide subject summary
  const countySummary = useMemo(() => {
    const summary: Record<string, {
      subject: string;
      totalRequired: number;
      totalAssigned: number;
      teacherCount: number;
      teacherField: string;
      byGender: { male: number; female: number };
    }> = {};

    // Calculate required hours
    for (const school of schools) {
      for (const grade of school.grades) {
        const requirements = subjectRequirements.filter(sr => sr.grade === grade.grade);
        for (const req of requirements) {
          if (!summary[req.subject]) {
            summary[req.subject] = {
              subject: req.subject,
              totalRequired: 0,
              totalAssigned: 0,
              teacherCount: 0,
              teacherField: req.requiredTeacherField,
              byGender: { male: 0, female: 0 },
            };
          }
          summary[req.subject].totalRequired += req.hoursPerWeek * grade.classCount;
        }
      }
    }

    // Calculate assigned hours and teacher counts
    for (const person of personnel) {
      for (const assignment of person.assignments) {
        if (summary[assignment.subject]) {
          summary[assignment.subject].totalAssigned += assignment.hours;
        }
      }
    }

    // Count teachers by field
    for (const person of personnel) {
      if (person.status !== 'فعال' || person.role !== 'معلم') continue;
      // Find subjects that match this person's field
      Object.values(summary).forEach(s => {
        if (s.teacherField === person.field) {
          s.teacherCount++;
          if (person.gender === 'مرد') s.byGender.male++;
          else s.byGender.female++;
        }
      });
    }

    return Object.values(summary).sort((a, b) => (b.totalRequired - b.totalAssigned) - (a.totalRequired - a.totalAssigned));
  }, [schools, personnel, subjectRequirements]);

  const chartData = countySummary.map(s => ({
    name: s.subject,
    'ساعات مورد نیاز': s.totalRequired,
    'ساعات ابلاغ شده': s.totalAssigned,
    'کسری': Math.max(0, s.totalRequired - s.totalAssigned),
  }));

  return (
    <div className="space-y-6">
      {/* County Summary */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 تحلیل ساعات درسی شهرستان سامان</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ right: 20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ساعات مورد نیاز" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="ساعات ابلاغ شده" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="کسری" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* County Summary Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 خلاصه دروس و معلمان شهرستان</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 text-right font-medium text-gray-600">درس</th>
                <th className="py-2 px-3 text-right font-medium text-gray-600">رشته معلم</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">کل ساعات</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">ابلاغ شده</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">کسری</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">تعداد معلم</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">معلم مرد</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">معلم زن</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {countySummary.map((item, i) => {
                const gap = item.totalRequired - item.totalAssigned;
                const needsMore = item.teacherCount * 24 < item.totalRequired;
                return (
                  <tr key={i} className={`border-t border-gray-50 ${gap > 0 ? 'bg-red-50/30' : ''}`}>
                    <td className="py-2 px-3 font-medium">{item.subject}</td>
                    <td className="py-2 px-3 text-xs text-gray-500">{item.teacherField}</td>
                    <td className="py-2 px-3 text-center font-medium">{item.totalRequired}</td>
                    <td className="py-2 px-3 text-center text-indigo-600 font-medium">{item.totalAssigned}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`font-bold ${gap > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {gap}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={needsMore ? 'text-red-500 font-bold' : 'text-green-600 font-medium'}>
                        {item.teacherCount}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-blue-500">{item.byGender.male}</td>
                    <td className="py-2 px-3 text-center text-pink-500">{item.byGender.female}</td>
                    <td className="py-2 px-3 text-center">
                      {gap <= 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">کافی ✅</span>
                      ) : needsMore ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">کمبود نیرو ❌</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">نیاز به ابلاغ ⚠️</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per School Analysis */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700">📋 تحلیل ساعات به تفکیک مدرسه</h3>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">همه دوره‌ها</option>
            <option value="ابتدایی">ابتدایی</option>
            <option value="متوسطه اول">متوسطه اول</option>
            <option value="متوسطه دوم نظری">متوسطه دوم نظری</option>
            <option value="هنرستان">هنرستان</option>
            <option value="کاردانش">کاردانش</option>
          </select>
          <select
            value={filterSchool}
            onChange={e => setFilterSchool(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            <option value="">همه مدارس</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="space-y-4">
          {schoolAnalysis.map(({ school, subjects, totalRequired, totalAssigned }) => (
            <div key={school.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className={`px-4 py-3 flex justify-between items-center ${
                totalAssigned >= totalRequired ? 'bg-green-50' : 'bg-amber-50'
              }`}>
                <div>
                  <span className="font-bold text-gray-800">{school.name}</span>
                  <span className="text-xs text-gray-500 mr-2">({school.type} - {school.gender})</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">نیاز: <strong className="text-gray-700">{totalRequired}</strong></span>
                  <span className="text-gray-500">ابلاغ: <strong className="text-indigo-600">{totalAssigned}</strong></span>
                  <span className="text-gray-500">کسری: <strong className={totalRequired - totalAssigned > 0 ? 'text-red-500' : 'text-green-500'}>{totalRequired - totalAssigned}</strong></span>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-1.5 px-3 text-right text-gray-500">درس</th>
                    <th className="py-1.5 px-3 text-right text-gray-500">پایه</th>
                    <th className="py-1.5 px-3 text-right text-gray-500">رشته</th>
                    <th className="py-1.5 px-3 text-center text-gray-500">نیاز</th>
                    <th className="py-1.5 px-3 text-center text-gray-500">ابلاغ</th>
                    <th className="py-1.5 px-3 text-center text-gray-500">باقیمانده</th>
                    <th className="py-1.5 px-3 text-right text-gray-500">معلم</th>
                    <th className="py-1.5 px-3 text-center text-gray-500">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <tr key={i} className={`border-t border-gray-50 ${s.gap > 0 ? 'bg-red-50/20' : ''}`}>
                      <td className="py-1.5 px-3 font-medium">{s.subject}</td>
                      <td className="py-1.5 px-3">{s.grade}</td>
                      <td className="py-1.5 px-3 text-gray-400">{s.requiredField}</td>
                      <td className="py-1.5 px-3 text-center">{s.requiredHours}</td>
                      <td className="py-1.5 px-3 text-center text-indigo-600">{s.assignedHours}</td>
                      <td className="py-1.5 px-3 text-center">
                        <span className={s.gap > 0 ? 'text-red-500 font-bold' : 'text-green-500'}>{s.gap}</span>
                      </td>
                      <td className="py-1.5 px-3">{s.teachers.join('، ') || '—'}</td>
                      <td className="py-1.5 px-3 text-center">{s.gap <= 0 ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* ETL Traz Balance Dashboard */}
      {trazResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📊 تراز ابلاغ (موتور ETL)</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700">{trazResults.filter(t => t.status === 'کامل').length}</div>
              <div className="text-xs text-green-600">کامل ✅</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{trazResults.filter(t => t.status === 'ناقص').length}</div>
              <div className="text-xs text-amber-600">ناقص ⚠️</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-700">{trazResults.filter(t => t.status === 'اضافه').length}</div>
              <div className="text-xs text-red-600">اضافه ❌</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 text-right">مدرسه</th>
                  <th className="py-2 px-2 text-right">درس</th>
                  <th className="py-2 px-2 text-right">پایه</th>
                  <th className="py-2 px-2 text-center">تراز</th>
                  <th className="py-2 px-2 text-center">موظف</th>
                  <th className="py-2 px-2 text-center">غیرموظف</th>
                  <th className="py-2 px-2 text-center">اجرایی</th>
                  <th className="py-2 px-2 text-center">باقیمانده</th>
                  <th className="py-2 px-2 text-center">وضعیت</th>
                  <th className="py-2 px-2 text-right">معلمان</th>
                </tr>
              </thead>
              <tbody>
                {trazResults.map((t, i) => (
                  <tr key={i} className={`border-t border-gray-50 ${t.status === 'کامل' ? 'bg-green-50/30' : t.status === 'اضافه' ? 'bg-red-50/30' : ''}`}>
                    <td className="py-1.5 px-2 font-medium">{t.schoolName}</td>
                    <td className="py-1.5 px-2">{t.subject}</td>
                    <td className="py-1.5 px-2">{t.grade}</td>
                    <td className="py-1.5 px-2 text-center">{t.requiredHours}</td>
                    <td className="py-1.5 px-2 text-center text-blue-600">{t.hourType.mandatory}</td>
                    <td className="py-1.5 px-2 text-center text-amber-600">{t.hourType.nonMandatory}</td>
                    <td className="py-1.5 px-2 text-center text-purple-600">{t.hourType.executive}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`font-bold ${t.remainingHours > 0 ? 'text-red-500' : t.remainingHours < 0 ? 'text-orange-600' : 'text-green-500'}`}>{t.remainingHours}</span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.status === 'کامل' ? 'bg-green-100 text-green-700' : t.status === 'اضافه' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{t.status}</span>
                    </td>
                    <td className="py-1.5 px-2 text-[10px]">{t.assignedTeachers.join('، ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* School Completion Summary */}
      {schoolMaps.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">📈 خلاصه تکمیل مدارس</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {schoolMaps.map(sm => (
              <div key={sm.schoolCode} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-gray-800">{sm.schoolName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sm.completionPercent >= 100 ? 'bg-green-100 text-green-700' : sm.completionPercent >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {sm.completionPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div className={`h-2 rounded-full ${sm.completionPercent >= 100 ? 'bg-green-500' : sm.completionPercent >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min(sm.completionPercent, 100)}%` }} />
                </div>
                <div className="text-[10px] text-gray-500">{sm.totalAssigned}/{sm.totalRequired} ساعت | {Object.values(sm.gradeSubjects).flat().length} درس</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
