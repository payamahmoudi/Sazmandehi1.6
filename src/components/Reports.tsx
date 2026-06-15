import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { School, Personnel } from '../types';

interface Props {
  schools: School[];
  personnel: Personnel[];
}

export default function Reports({ schools, personnel }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeReport, setActiveReport] = useState<'personnel' | 'schools' | 'classes' | 'assignments'>('personnel');
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterGender, setFilterGender] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterSchoolGender, setFilterSchoolGender] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };
  const sortIcon = (col: string) => sortCol === col ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const downloadExcel = (data: any[], sheetName: string, fileName: string) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  // Personnel report with filters and sort
  const personnelReport = useMemo(() => {
    let result = personnel.filter(p => {
      if (searchTerm && !`${p.firstName} ${p.lastName} ${p.nationalCode} ${p.personnelCode || ''} ${p.field} ${p.role}`.includes(searchTerm)) return false;
      if (filterGender && p.gender !== filterGender) return false;
      if (filterRole && p.role !== filterRole) return false;
      if (filterField && p.field !== filterField) return false;
      if (filterStatus === 'تکمیل' && !p.isLocked) return false;
      if (filterStatus === 'ناقص' && (p.isLocked || p.assignedHours === 0)) return false;
      if (filterStatus === 'بدون ابلاغ' && p.assignedHours > 0) return false;
      return true;
    });
    if (sortCol) {
      result = [...result].sort((a, b) => {
        let va: any, vb: any;
        if (sortCol === 'name') { va = a.lastName; vb = b.lastName; }
        else if (sortCol === 'hours') { va = a.assignedHours; vb = b.assignedHours; }
        else if (sortCol === 'field') { va = a.field; vb = b.field; }
        else { va = ''; vb = ''; }
        const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fa');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [personnel, searchTerm, filterGender, filterRole, filterField, filterStatus, sortCol, sortDir]);

  // Schools report with filters
  const schoolsReport = useMemo(() => {
    return schools.filter(s => {
      if (searchTerm && !`${s.name} ${s.code} ${s.type} ${s.gender} ${s.location || ''}`.includes(searchTerm)) return false;
      if (filterType && s.type !== filterType) return false;
      if (filterSchoolGender && s.gender !== filterSchoolGender) return false;
      if (filterLocation && (s.location || 'شهری') !== filterLocation) return false;
      return true;
    });
  }, [schools, searchTerm, filterType, filterSchoolGender, filterLocation]);

  // Stats
  const stats = useMemo(() => {
    const maleP = personnel.filter(p => p.gender === 'مرد').length;
    const femaleP = personnel.filter(p => p.gender === 'زن').length;
    const totalStudents = schools.reduce((s, sc) => s + sc.studentCount, 0);
    const totalClasses = schools.reduce((s, sc) => s + sc.classCount, 0);
    const byField: Record<string, { male: number; female: number; total: number }> = {};
    personnel.forEach(p => {
      if (!byField[p.field]) byField[p.field] = { male: 0, female: 0, total: 0 };
      byField[p.field].total++;
      if (p.gender === 'مرد') byField[p.field].male++;
      else byField[p.field].female++;
    });
    const byRole: Record<string, number> = {};
    personnel.forEach(p => { byRole[p.role] = (byRole[p.role] || 0) + 1; });
    const byType: Record<string, { count: number; students: number; classes: number }> = {};
    schools.forEach(s => {
      if (!byType[s.type]) byType[s.type] = { count: 0, students: 0, classes: 0 };
      byType[s.type].count++;
      byType[s.type].students += s.studentCount;
      byType[s.type].classes += s.classCount;
    });
    return { maleP, femaleP, totalStudents, totalClasses, byField, byRole, byType };
  }, [personnel, schools]);

  const reportTabs = [
    { id: 'personnel' as const, label: 'گزارش نیروها', icon: '👥' },
    { id: 'schools' as const, label: 'گزارش مدارس', icon: '🏫' },
    { id: 'classes' as const, label: 'کلاس‌ها و دانش‌آموزان', icon: '📚' },
    { id: 'assignments' as const, label: 'گزارش ابلاغ‌ها', icon: '📝' },
  ];

  return (
    <div className="space-y-4">
      {/* Report tabs */}
      <div className="flex flex-wrap gap-2">
        {reportTabs.map(t => (
          <button key={t.id} onClick={() => setActiveReport(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === t.id ? 'bg-indigo-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="🔍 جستجو..." className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg text-sm" />
          {(activeReport === 'personnel' || activeReport === 'assignments') && (
            <>
              <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه جنسیت‌ها</option><option value="مرد">مرد</option><option value="زن">زن</option>
              </select>
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه نقش‌ها</option><option value="معلم">معلم</option><option value="مدیر">مدیر</option><option value="معاون آموزشی">معاون آموزشی</option>
              </select>
              <select value={filterField} onChange={e => setFilterField(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه رشته‌ها</option>
                {[...new Set(personnel.map(p => p.field))].sort().map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه وضعیت‌ها</option><option value="تکمیل">تکمیل</option><option value="ناقص">ناقص</option><option value="بدون ابلاغ">بدون ابلاغ</option>
              </select>
            </>
          )}
          {(activeReport === 'schools' || activeReport === 'classes') && (
            <>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه مقاطع</option><option value="ابتدایی">ابتدایی</option><option value="متوسطه اول">متوسطه اول</option><option value="متوسطه دوم نظری">متوسطه دوم</option><option value="هنرستان">هنرستان</option>
              </select>
              <select value={filterSchoolGender} onChange={e => setFilterSchoolGender(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه جنسیت‌ها</option><option value="پسرانه">پسرانه</option><option value="دخترانه">دخترانه</option><option value="مختلط">مختلط</option>
              </select>
              <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                <option value="">همه محل‌ها</option><option value="شهری">شهری</option><option value="روستایی">روستایی</option>
              </select>
              {activeReport === 'classes' && (
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white">
                  <option value="">همه پایه‌ها</option>
                  {[...new Set(schools.flatMap(s => s.grades.map(g => g.grade)))].sort().map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 text-center">
          <div className="text-2xl font-bold text-indigo-700">{personnel.length}</div>
          <div className="text-xs text-indigo-500">کل نیروها (♂{stats.maleP} ♀{stats.femaleP})</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 text-center">
          <div className="text-2xl font-bold text-emerald-700">{schools.length}</div>
          <div className="text-xs text-emerald-500">مدارس و مراکز</div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-center">
          <div className="text-2xl font-bold text-amber-700">{stats.totalStudents.toLocaleString('fa-IR')}</div>
          <div className="text-xs text-amber-500">دانش‌آموز</div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 text-center">
          <div className="text-2xl font-bold text-rose-700">{stats.totalClasses}</div>
          <div className="text-xs text-rose-500">کلاس</div>
        </div>
      </div>

      {/* Personnel Report */}
      {activeReport === 'personnel' && (
        <div className="space-y-4">
          {/* By field summary */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">تفکیک نیروها بر اساس رشته و جنسیت</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {Object.entries(stats.byField).sort((a, b) => b[1].total - a[1].total).map(([field, data]) => (
                <div key={field} className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
                  <div className="text-xs font-bold text-slate-700 truncate">{field}</div>
                  <div className="text-lg font-bold">{data.total}</div>
                  <div className="flex justify-center gap-2 text-[10px]"><span className="text-blue-500">♂{data.male}</span><span className="text-pink-500">♀{data.female}</span></div>
                </div>
              ))}
            </div>
          </div>
          {/* By role */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">تفکیک نیروها بر اساس نقش</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRole).map(([role, count]) => (
                <div key={role} className="bg-indigo-50 rounded-lg px-3 py-1.5 border border-indigo-200 text-xs"><span className="font-bold text-indigo-700">{count}</span> {role}</div>
              ))}
            </div>
          </div>
          {/* Full table */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">لیست نیروها ({personnelReport.length} نفر)</h3>
              <button onClick={() => downloadExcel(personnelReport.map(p => ({
                'نام': p.firstName, 'نام خانوادگی': p.lastName, 'جنسیت': p.gender, 'رشته': p.field,
                'نقش': p.role, 'وضعیت': p.isLocked ? 'تکمیل' : p.assignedHours > 0 ? 'ناقص' : 'بدون ابلاغ',
                'ابلاغ موظف': p.assignedHours, 'غیرموظف': p.nonMandatoryHours,
                'محل خدمت': p.assignments.map(a => a.schoolName).filter((v,i,a) => a.indexOf(v) === i).join('، '),
              })), 'نیروها', 'گزارش_نیروها')} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">📥 دانلود اکسل</button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 text-right">#</th>
                  <th className="py-2 px-2 text-right cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('name')}>نام{sortIcon('name')}</th>
                  <th className="py-2 px-2 text-right">جنسیت</th>
                  <th className="py-2 px-2 text-right cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('field')}>رشته{sortIcon('field')}</th>
                  <th className="py-2 px-2 text-right">نقش</th>
                  <th className="py-2 px-2 text-center">وضعیت</th>
                  <th className="py-2 px-2 text-center cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('hours')}>ابلاغ موظف{sortIcon('hours')}</th>
                  <th className="py-2 px-2 text-center">غیرموظف</th>
                  <th className="py-2 px-2 text-right">محل خدمت</th>
                </tr>
              </thead>
              <tbody>
                {personnelReport.map((p, i) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-1.5 px-2">{p.gender}</td>
                    <td className="py-1.5 px-2">{p.field}</td>
                    <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">{p.role}</span></td>
                    <td className="py-1.5 px-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] ${p.isLocked ? 'bg-green-100 text-green-700' : p.assignedHours > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.isLocked ? 'تکمیل' : p.assignedHours > 0 ? 'ناقص' : 'بدون ابلاغ'}</span></td>
                    <td className="py-1.5 px-2 text-center font-medium">{p.assignedHours}</td>
                    <td className="py-1.5 px-2 text-center">{p.nonMandatoryHours}</td>
                    <td className="py-1.5 px-2 text-[10px]">{p.assignments.map(a => a.schoolName).filter((v, i, a) => a.indexOf(v) === i).join('، ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schools Report */}
      {activeReport === 'schools' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">تفکیک مدارس بر اساس مقطع</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="font-bold text-sm text-slate-700">{type}</div>
                  <div className="text-xs text-slate-500 mt-1">{data.count} مدرسه | {data.students} دانش‌آموز | {data.classes} کلاس</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700">لیست مدارس ({schoolsReport.length} مدرسه)</h3>
              <button onClick={() => downloadExcel(schoolsReport.map(s => ({
                'کد': s.code, 'نام': s.name, 'مقطع': s.type, 'جنسیت': s.gender,
                'محل': s.location || 'شهری', 'کلاس': s.classCount, 'دانش‌آموز': s.studentCount,
                'مدیر': personnel.find(p => p.id === s.managerId)?.firstName + ' ' + (personnel.find(p => p.id === s.managerId)?.lastName || '') || '—',
              })), 'مدارس', 'گزارش_مدارس')} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">📥 دانلود اکسل</button>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 text-right">#</th>
                  <th className="py-2 px-2 text-right">کد</th>
                  <th className="py-2 px-2 text-right">نام</th>
                  <th className="py-2 px-2 text-right">مقطع</th>
                  <th className="py-2 px-2 text-right">جنسیت</th>
                  <th className="py-2 px-2 text-right">محل</th>
                  <th className="py-2 px-2 text-center">کلاس</th>
                  <th className="py-2 px-2 text-center">دانش‌آموز</th>
                  <th className="py-2 px-2 text-right">مدیر</th>
                </tr>
              </thead>
              <tbody>
                {schoolsReport.map((s, i) => {
                  const manager = personnel.find(p => p.id === s.managerId);
                  return (
                    <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                      <td className="py-1.5 px-2">{s.code}</td>
                      <td className="py-1.5 px-2 font-medium">{s.name}</td>
                      <td className="py-1.5 px-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">{s.type}</span></td>
                      <td className="py-1.5 px-2">{s.gender}</td>
                      <td className="py-1.5 px-2">{s.location || 'شهری'}</td>
                      <td className="py-1.5 px-2 text-center font-medium">{s.classCount}</td>
                      <td className="py-1.5 px-2 text-center font-medium">{s.studentCount}</td>
                      <td className="py-1.5 px-2 text-[10px]">{manager ? `${manager.firstName} ${manager.lastName}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Classes Report */}
      {activeReport === 'classes' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">تفکیک کلاس‌ها و دانش‌آموزان</h3>
            <button onClick={() => downloadExcel(schoolsReport.flatMap(s => s.grades.map(g => ({
              'مدرسه': s.name, 'مقطع': s.type, 'جنسیت': s.gender,
              'پایه': g.grade, 'رشته': g.field || '', 'کلاس': g.classCount, 'دانش‌آموز': g.studentCount,
            }))), 'کلاس‌ها', 'گزارش_کلاس‌ها')} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">📥 دانلود اکسل</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-2 text-right">مدرسه</th>
                <th className="py-2 px-2 text-right">مقطع</th>
                <th className="py-2 px-2 text-right">جنسیت</th>
                <th className="py-2 px-2 text-right">پایه</th>
                <th className="py-2 px-2 text-right">رشته</th>
                <th className="py-2 px-2 text-center">کلاس</th>
                <th className="py-2 px-2 text-center">دانش‌آموز</th>
              </tr>
            </thead>
            <tbody>
              {schoolsReport.flatMap(s =>
                s.grades
                  .filter(g => !filterGrade || g.grade === filterGrade)
                  .map((g, gi) => (
                    <tr key={`${s.id}-${gi}`} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-medium">{s.name}</td>
                      <td className="py-1.5 px-2">{s.type}</td>
                      <td className="py-1.5 px-2">{s.gender}</td>
                      <td className="py-1.5 px-2">{g.grade}</td>
                      <td className="py-1.5 px-2">{g.field || '—'}</td>
                      <td className="py-1.5 px-2 text-center font-medium">{g.classCount}</td>
                      <td className="py-1.5 px-2 text-center font-medium">{g.studentCount}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Assignments Report */}
      {activeReport === 'assignments' && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">گزارش ابلاغ‌های صادرشده</h3>
            <button onClick={() => {
              const data = personnel.flatMap(p => p.assignments.filter(a => {
                if (!searchTerm) return true;
                return `${p.firstName} ${p.lastName} ${a.schoolName} ${a.subject}`.includes(searchTerm);
              }).map(a => ({
                'نیرو': `${p.firstName} ${p.lastName}`, 'رشته': p.field,
                'مدرسه': a.schoolName, 'درس': a.subject, 'پایه': a.grade,
                'ساعت': a.hours, 'نوع': a.assignmentType || (a.isMandatory ? 'موظف' : 'غیرموظف'),
                'تاریخ ثبت': new Date(a.createdAt).toLocaleDateString('fa-IR'),
              })));
              downloadExcel(data, 'ابلاغ‌ها', 'گزارش_ابلاغ‌ها');
            }} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">📥 دانلود اکسل</button>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-2 text-right">#</th>
                <th className="py-2 px-2 text-right">نیرو</th>
                <th className="py-2 px-2 text-right">رشته</th>
                <th className="py-2 px-2 text-right">مدرسه</th>
                <th className="py-2 px-2 text-right">درس</th>
                <th className="py-2 px-2 text-right">پایه</th>
                <th className="py-2 px-2 text-center">ساعت</th>
                <th className="py-2 px-2 text-center">نوع</th>
                <th className="py-2 px-2 text-center">تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody>
              {personnel.flatMap(p =>
                p.assignments.filter(a => {
                  if (!searchTerm) return true;
                  return `${p.firstName} ${p.lastName} ${a.schoolName} ${a.subject} ${a.grade}`.includes(searchTerm);
                }).map((a, i) => (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
                    <td className="py-1.5 px-2 font-medium">{p.firstName} {p.lastName}</td>
                    <td className="py-1.5 px-2">{p.field}</td>
                    <td className="py-1.5 px-2">{a.schoolName}</td>
                    <td className="py-1.5 px-2">{a.subject}</td>
                    <td className="py-1.5 px-2">{a.grade}</td>
                    <td className="py-1.5 px-2 text-center font-medium">{a.hours}</td>
                    <td className="py-1.5 px-2 text-center"><span className={`px-1 py-0.5 rounded text-[10px] ${a.isMandatory ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{a.isMandatory ? 'موظف' : 'غیرموظف'}</span></td>
                    <td className="py-1.5 px-2 text-center text-[10px] text-gray-400">{new Date(a.createdAt).toLocaleDateString('fa-IR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
