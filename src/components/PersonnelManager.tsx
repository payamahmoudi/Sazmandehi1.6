import { useState, useMemo } from 'react';
import { Personnel, School, SubjectRequirement, BalanceRecord } from '../types';
import { getMaxHoursForRole } from '../store/useStore';
import SearchableSelect from './SearchableSelect';
import PrintNotice from './PrintNotice';
import PersianDatePicker from './PersianDatePicker';

interface Props {
  personnel: Personnel[];
  schools: School[];
  subjectRequirements: SubjectRequirement[];
  balanceRecords: BalanceRecord[];
  onUpdatePersonnel: (personnel: Personnel[]) => void;
  onAddPersonnel: (person: Personnel) => void;
  onRemovePersonnel: (id: string) => void;
  onRemoveAssignment: (personnelId: string, assignmentId: string) => void;
  onAddAssignment: (personnelId: string, schoolId: string, subject: string, hours: number, isMandatory: boolean, grade: string, startDate?: string, endDate?: string, assignmentType?: string) => void;
}

export default function PersonnelManager({ personnel, schools, subjectRequirements, balanceRecords, onUpdatePersonnel, onAddPersonnel, onRemovePersonnel, onRemoveAssignment, onAddAssignment }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterField, setFilterField] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'field'>('name');

  const fields = useMemo(() => [...new Set(personnel.map(p => p.field))].sort(), [personnel]);

  const filtered = useMemo(() => {
    let result = personnel.filter(p => {
      if (searchTerm && !`${p.firstName} ${p.lastName} ${p.nationalCode} ${p.personnelCode || ''}`.includes(searchTerm)) return false;
      if (filterGender && p.gender !== filterGender) return false;
      if (filterField && p.field !== filterField) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterRole && p.role !== filterRole) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return `${a.lastName}`.localeCompare(`${b.lastName}`, 'fa');
      if (sortBy === 'hours') return b.assignedHours - a.assignedHours;
      return a.field.localeCompare(b.field, 'fa');
    });

    return result;
  }, [personnel, searchTerm, filterGender, filterField, filterStatus, filterRole, sortBy]);

  // Summary stats
  const summary = useMemo(() => {
    const byField: Record<string, { male: number; female: number; total: number }> = {};
    personnel.forEach(p => {
      if (!byField[p.field]) byField[p.field] = { male: 0, female: 0, total: 0 };
      byField[p.field].total++;
      if (p.gender === 'مرد') byField[p.field].male++;
      else byField[p.field].female++;
    });
    return byField;
  }, [personnel]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">خلاصه نیروها به تفکیک رشته و جنسیت</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Object.entries(summary).map(([field, data]) => (
            <div key={field} className="border border-gray-100 rounded-lg p-2 text-center bg-gray-50">
              <div className="text-xs font-medium text-gray-700 truncate" title={field}>{field}</div>
              <div className="text-lg font-bold text-indigo-600">{data.total}</div>
              <div className="flex justify-center gap-2 text-[10px]">
                <span className="text-blue-500">♂ {data.male}</span>
                <span className="text-pink-500">♀ {data.female}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 جستجوی نام، کد ملی یا کد پرسنلی..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
          />
          <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">همه جنسیت‌ها</option>
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
          </select>
          <select value={filterField} onChange={e => setFilterField(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">همه رشته‌ها</option>
            {fields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">همه وضعیت‌ها</option>
            <option value="فعال">فعال</option>
            <option value="مرخصی زایمان">مرخصی زایمان</option>
            <option value="مأموریت">مأموریت</option>
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">همه نقش‌ها</option>
            <option value="معلم">معلم</option>
            <option value="مدیر">مدیر</option>
            <option value="معاون آموزشی">معاون آموزشی</option>
            <option value="معاون پرورشی">معاون پرورشی</option>
            <option value="معاون اجرایی">معاون اجرایی</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="name">مرتب‌سازی: نام</option>
            <option value="hours">مرتب‌سازی: ساعات</option>
            <option value="field">مرتب‌سازی: رشته</option>
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"
          >
            <span>+</span> افزودن نیرو
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          نمایش {filtered.length} از {personnel.length} نفر
        </div>
      </div>

      {/* Personnel Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-3 px-3 text-right font-medium text-gray-600 w-8">#</th>
              <th className="py-3 px-3 text-right font-medium text-gray-600">نام و نام خانوادگی</th>
              <th className="py-3 px-3 text-right font-medium text-gray-600">جنسیت</th>
              <th className="py-3 px-3 text-right font-medium text-gray-600">رشته</th>
              <th className="py-3 px-3 text-right font-medium text-gray-600">نقش</th>
              <th className="py-3 px-3 text-right font-medium text-gray-600">وضعیت</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">ساعت موظف</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">ابلاغ شده</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">کسری</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">غیرموظف</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">وضعیت ابلاغ</th>
              <th className="py-3 px-3 text-center font-medium text-gray-600">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, index) => {
              const effectiveMax = getMaxHoursForRole(p);
              const remaining = effectiveMax - p.assignedHours;
              return (
                <tr
                  key={p.id}
                  className={`border-t border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                    p.isLocked ? 'bg-green-50' :
                    p.status === 'مرخصی زایمان' ? 'bg-purple-50' :
                    p.assignedHours === 0 ? 'bg-red-50/30' : ''
                  }`}
                  onClick={() => setSelectedPerson(p)}
                >
                  <td className="py-2 px-3 text-gray-400">{index + 1}</td>
                  <td className="py-2 px-3 font-medium">
                    {p.firstName} {p.lastName}
                    {p.isLocked && <span className="mr-1 text-green-500">🔒</span>}
                    {(p.reducedHours || (p.serviceYears && p.serviceYears >= 20)) && <span className="mr-1 text-xs text-orange-500" title="مشمول تقلیل ساعت">📉</span>}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-block w-2 h-2 rounded-full ml-1 ${p.gender === 'مرد' ? 'bg-blue-400' : 'bg-pink-400'}`} />
                    {p.gender}
                  </td>
                  <td className="py-2 px-3 text-xs">{p.field}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.role === 'مدیر' ? 'bg-amber-100 text-amber-700' :
                      p.role.includes('معاون') ? 'bg-blue-100 text-blue-700' :
                      p.role === 'سرایدار' || p.role === 'خدمتگزار' ? 'bg-slate-100 text-slate-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{p.role}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.status === 'فعال' ? 'bg-green-100 text-green-700' :
                      p.status === 'مرخصی زایمان' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{p.status}</span>
                  </td>
                  <td className="py-2 px-3 text-center font-medium">{effectiveMax}</td>
                  <td className="py-2 px-3 text-center font-medium text-indigo-600">{p.assignedHours}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-medium ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {remaining}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center text-amber-600">{p.nonMandatoryHours}</td>
                  <td className="py-2 px-3 text-center">
                    {p.isLocked ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">✅ تکمیل</span>
                    ) : p.assignedHours > 0 ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs">⏳ ناقص</span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">❌ بدون ابلاغ</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('حذف این نیرو؟')) onRemovePersonnel(p.id); }}
                      className="text-red-400 hover:text-red-600"
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Person Detail Modal - use fresh data from personnel array */}
      {selectedPerson && (
        <PersonDetailModal
          person={personnel.find(p => p.id === selectedPerson.id) || selectedPerson}
          schools={schools}
          personnel={personnel}
          subjectRequirements={subjectRequirements}
          balanceRecords={balanceRecords}
          onClose={() => setSelectedPerson(null)}
          onUpdate={(updated) => {
            onUpdatePersonnel(personnel.map(p => p.id === updated.id ? updated : p));
            setSelectedPerson(updated);
          }}
          onRemoveAssignment={onRemoveAssignment}
          onAddAssignment={onAddAssignment}
        />
      )}

      {/* Add Person Modal */}
      {showAddForm && (
        <AddPersonModal
          onClose={() => setShowAddForm(false)}
          onAdd={(person) => { onAddPersonnel(person); setShowAddForm(false); }}
          existingFields={fields}
        />
      )}
    </div>
  );
}

function PersonDetailModal({ person, schools, personnel, subjectRequirements, balanceRecords, onClose, onUpdate, onRemoveAssignment, onAddAssignment }: {
  person: Personnel;
  schools: School[];
  personnel: Personnel[];
  subjectRequirements: SubjectRequirement[];
  balanceRecords: BalanceRecord[];
  onClose: () => void;
  onUpdate: (person: Personnel) => void;
  onRemoveAssignment: (personnelId: string, assignmentId: string) => void;
  onAddAssignment: (personnelId: string, schoolId: string, subject: string, hours: number, isMandatory: boolean, grade: string, startDate?: string, endDate?: string, assignmentType?: string) => void;
}) {
  const remaining = person.maxHours - person.assignedHours;
  const [printPerson, setPrintPerson] = useState<Personnel | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [hours, setHours] = useState('');
  const [mandatory, setMandatory] = useState(true);
  const [pAssignType, setPAssignType] = useState<string>('موظف');
  const [pStartDate, setPStartDate] = useState('');
  const [pEndDate, setPEndDate] = useState('');
  const schoolOptions = schools.map(s => ({ value: s.id, label: `${s.name} (${s.code})`, description: `${s.type} - ${s.gender}` }));
  const selectedSchool = schools.find(s => s.id === schoolId);
  const gradeOptions = selectedSchool ? selectedSchool.grades.map(g => ({ value: g.grade, label: `${g.grade}${g.field ? ` (${g.field})` : ''}` })) : [];

  // Get subjects with available hours for the selected school+grade
  const subjectOptionsWithHours = useMemo(() => {
    if (!selectedSchool || !grade) return [];
    const results: { value: string; label: string; description: string }[] = [];

    // From balance records
    const fromBalance = balanceRecords.filter(r =>
      (r.schoolName === selectedSchool.name || r.schoolId === selectedSchool.id) && r.grade === grade
    );
    for (const br of fromBalance) {
      const assigned = personnel.flatMap(p => p.assignments)
        .filter(a => a.schoolId === selectedSchool.id && a.subject === br.subject && a.grade === grade)
        .reduce((s, a) => s + a.hours, 0);
      const remaining = br.totalHours - assigned;
      results.push({
        value: br.subject,
        label: br.subject,
        description: `تراز: ${br.totalHours}س | ابلاغ‌شده: ${assigned}س | ${remaining > 0 ? `باقیمانده: ${remaining}س ✅` : '❌ پر شده'}`,
      });
    }

    // From subject requirements (if not already in balance)
    const balanceSubjects = new Set(fromBalance.map(b => b.subject));
    const fromReqs = subjectRequirements.filter(sr => sr.grade === grade && !balanceSubjects.has(sr.subject));
    for (const req of fromReqs) {
      const gradeInfo = selectedSchool.grades.find(g => g.grade === grade);
      const totalH = req.hoursPerWeek * (gradeInfo?.classCount || 1);
      const assigned = personnel.flatMap(p => p.assignments)
        .filter(a => a.schoolId === selectedSchool.id && a.subject === req.subject && a.grade === grade)
        .reduce((s, a) => s + a.hours, 0);
      const rem = totalH - assigned;
      results.push({
        value: req.subject,
        label: req.subject,
        description: `نیاز: ${totalH}س | ابلاغ‌شده: ${assigned}س | ${rem > 0 ? `باقیمانده: ${rem}س ✅` : '❌ پر شده'}`,
      });
    }

    // Add custom option
    results.push({ value: '__custom__', label: '➕ درس دلخواه (تایپ کنید)', description: '' });
    return results;
  }, [selectedSchool, grade, balanceRecords, subjectRequirements, personnel]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className={`sticky top-0 border-b p-4 rounded-t-2xl flex justify-between items-center ${
          person.isLocked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
        }`}>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {person.firstName} {person.lastName}
              {person.isLocked && <span className="mr-2 text-green-500">🔒</span>}
            </h2>
            <span className="text-xs text-gray-500">{person.field} | {person.gender} | {person.employmentType}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <div className="text-xs text-indigo-500">ساعت موظف</div>
              <div className="text-2xl font-bold text-indigo-700">{person.maxHours}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-xs text-blue-500">ابلاغ موظف</div>
              <div className="text-2xl font-bold text-blue-700">{person.assignedHours}</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${remaining > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className={`text-xs ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>کسری ساعت</div>
              <div className={`text-2xl font-bold ${remaining > 0 ? 'text-red-700' : 'text-green-700'}`}>{remaining}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-xs text-amber-500">غیرموظف</div>
              <div className="text-2xl font-bold text-amber-700">{person.nonMandatoryHours}</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>تکمیل ابلاغ</span>
              <span>{Math.round((person.assignedHours / person.maxHours) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  person.assignedHours >= person.maxHours ? 'bg-green-500' :
                  person.assignedHours > 0 ? 'bg-amber-500' : 'bg-red-300'
                }`}
                style={{ width: `${Math.min((person.assignedHours / person.maxHours) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Assignment by Personnel */}
          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/40">
            <h3 className="font-semibold text-indigo-700 mb-3">ثبت ابلاغ بر مبنای این نیرو</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500">مدرسه</label>
                <SearchableSelect value={schoolId} onChange={setSchoolId} options={schoolOptions} placeholder="جستجوی مدرسه..." />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">پایه</label>
                <SearchableSelect value={grade} onChange={setGrade} options={gradeOptions} placeholder="جستجوی پایه..." disabled={!selectedSchool} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">درس (با ساعت موجود)</label>
                <SearchableSelect
                  value={subject}
                  onChange={setSubject}
                  placeholder="جستجوی درس..."
                  disabled={!selectedSchool || !grade}
                  options={subjectOptionsWithHours}
                />
                {subject === '__custom__' && <input placeholder="نام درس..." onChange={e => setSubject(e.target.value)} className="mt-1 w-full px-3 py-1.5 border border-indigo-200 rounded text-xs bg-indigo-50" />}
              </div>
              <div>
                <label className="text-[10px] text-gray-500">ساعت</label>
                <input value={hours} onChange={e => setHours(e.target.value)} type="number" min={0} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <PersianDatePicker value={pStartDate} onChange={setPStartDate} label="تاریخ شروع" placeholder="شروع ابلاغ" />
              <PersianDatePicker value={pEndDate} onChange={setPEndDate} label="تاریخ پایان" placeholder="پایان ابلاغ" />
            </div>
            <div className="flex gap-1 mt-3">
              {(['موظف', 'غیرموظف', 'تدریس عوامل اجرایی'] as const).map(t => (
                <button key={t} type="button" onClick={() => {
                  setPAssignType(t);
                  setMandatory(t === 'موظف' || t === 'تدریس عوامل اجرایی');
                }} className={`flex-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                  pAssignType === t ? (t === 'غیرموظف' ? 'bg-amber-500 text-white' : t === 'تدریس عوامل اجرایی' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white') : 'bg-gray-100 text-gray-500'
                }`}>{t}</button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (!schoolId || !grade || !subject || !hours) return alert('لطفاً همه فیلدها را تکمیل کنید.');
                  onAddAssignment(person.id, schoolId, subject, parseInt(hours), mandatory, grade, pStartDate || undefined, pEndDate || undefined, pAssignType);
                  setSchoolId(''); setGrade(''); setSubject(''); setHours('');
                }}
                className="px-4 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
              >
                ➕ ثبت
              </button>
            </div>
          </div>

          {/* Assignments with print */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">ابلاغ‌های صادر شده</h3>
              {person.assignments.length > 0 && (
                <button onClick={() => setPrintPerson(person)} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200">🖨️ چاپ همه ابلاغ‌ها</button>
              )}
            </div>
            {person.assignments.length > 0 ? (
              <div className="space-y-2">
                {person.assignments.map(a => {
                  const aSchool = schools.find(s => s.id === a.schoolId);
                  return (
                    <div key={a.id} className={`border rounded-lg p-3 flex justify-between items-center ${
                      a.isMandatory ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div>
                        <div className="font-medium text-sm">{aSchool?.name || a.schoolName}</div>
                        <div className="text-xs text-gray-500">
                          {a.subject} | پایه {a.grade} | {a.hours} ساعت | {a.isMandatory ? 'موظف' : 'غیرموظف'}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          if (confirm('آیا این ابلاغ حذف شود؟')) onRemoveAssignment(person.id, a.id);
                        }} className="text-red-400 hover:text-red-600 text-sm" title="حذف">❌</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">هیچ ابلاغی صادر نشده است.</p>
            )}
          </div>

          {/* Quick Edit Status */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-3">تنظیمات سریع</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">وضعیت</label>
                <select value={person.status} onChange={e => onUpdate({ ...person, status: e.target.value as Personnel['status'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="فعال">فعال</option>
                  <option value="مرخصی زایمان">مرخصی زایمان</option>
                  <option value="مأموریت">مأموریت</option>
                  <option value="بازنشسته">بازنشسته</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">نقش</label>
                <select value={person.role} onChange={e => onUpdate({ ...person, role: e.target.value as Personnel['role'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="معلم">معلم</option>
                  <option value="مدیر">مدیر</option>
                  <option value="معاون آموزشی">معاون آموزشی</option>
                  <option value="معاون پرورشی">معاون پرورشی</option>
                  <option value="معاون اجرایی">معاون اجرایی</option>
                  <option value="سرپرست بخش">سرپرست بخش</option>
                  <option value="معاون فنی">معاون فنی</option>
                  <option value="سرایدار">سرایدار</option>
                  <option value="خدمتگزار">خدمتگزار</option>
                  <option value="سایر">سایر</option>
                </select>
              </div>
            </div>
          </div>

          {/* Extra Info */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">مشخصات تکمیلی</h3>
              <span className="text-[10px] text-green-600">✅ تغییرات خودکار ذخیره می‌شوند</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400">نام پدر</label>
                <input value={person.fatherName || ''} onChange={e => onUpdate({ ...person, fatherName: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">شماره همراه</label>
                <input value={person.phoneNumber || ''} onChange={e => onUpdate({ ...person, phoneNumber: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">رشته تحصیلی</label>
                <input value={person.fieldDegree || ''} onChange={e => onUpdate({ ...person, fieldDegree: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">رشته استخدامی</label>
                <input value={person.fieldEmployment || ''} onChange={e => onUpdate({ ...person, fieldEmployment: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">تاریخ استخدام</label>
                <input value={person.employmentDate || ''} onChange={e => onUpdate({ ...person, employmentDate: e.target.value })} placeholder="۱۳۸۵/۰۶/۰۱" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">تاریخ تولد</label>
                <input value={person.birthDate || ''} onChange={e => onUpdate({ ...person, birthDate: e.target.value })} placeholder="۱۳۶۰/۰۳/۱۵" className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">سنوات خدمت (سال)</label>
                <input type="number" value={person.serviceYears ?? ''} onChange={e => onUpdate({ ...person, serviceYears: e.target.value ? parseInt(e.target.value) : undefined, reducedHours: (parseInt(e.target.value) || 0) >= 20 })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-400">آخرین امتیاز سازماندهی</label>
                <input type="number" value={person.lastOrganizationScore ?? ''} onChange={e => onUpdate({ ...person, lastOrganizationScore: e.target.value ? parseInt(e.target.value) : undefined })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
            </div>
            {(person.reducedHours || (person.serviceYears && person.serviceYears >= 20)) && (
              <div className="mt-3 text-xs text-orange-600 bg-orange-50 rounded px-3 py-2 border border-orange-200">
                📉 مشمول تقلیل ساعت: حداکثر ساعت موظف ۲۰ ساعت (سنوات ≥ ۲۰ سال)
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Print from profile */}
      {printPerson && (
        <PrintNotice
          person={printPerson}
          school={schools[0]}
          allAssignments={printPerson.assignments}
          noticeNumber=""
          onClose={() => setPrintPerson(null)}
        />
      )}
    </div>
  );
}

function AddPersonModal({ onClose, onAdd, existingFields }: {
  onClose: () => void;
  onAdd: (person: Personnel) => void;
  existingFields: string[];
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [personnelCode, setPersonnelCode] = useState('');
  const [gender, setGender] = useState<Personnel['gender']>('مرد');
  const [field, setField] = useState('');
  const [customField, setCustomField] = useState('');
  const [degree, setDegree] = useState('لیسانس');
  const [employmentType, setEmploymentType] = useState('رسمی');
  const [role, setRole] = useState<Personnel['role']>('معلم');
  const [showExtra, setShowExtra] = useState(false);
  const [fatherName, setFatherName] = useState('');
  const [fieldDegree, setFieldDegree] = useState('');
  const [fieldEmployment, setFieldEmployment] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [employmentDate, setEmploymentDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [serviceYears, setServiceYears] = useState<number | undefined>(undefined);
  const [lastScore, setLastScore] = useState<number | undefined>(undefined);

  const handleSubmit = () => {
    if (!firstName || !lastName) { alert('نام و نام خانوادگی الزامی است'); return; }
    const finalField = field === '__custom__' ? customField : field;
    if (!finalField) { alert('رشته به کارگیری الزامی است'); return; }

    onAdd({
      id: `p-${Date.now()}`,
      firstName, lastName, nationalCode, personnelCode, gender,
      field: finalField, degree, employmentType,
      status: 'فعال',
      maxHours: 24,
      assignedHours: 0,
      nonMandatoryHours: 0,
      isLocked: false,
      assignments: [],
      role,
      fatherName: fatherName || undefined,
      fieldDegree: fieldDegree || undefined,
      fieldEmployment: fieldEmployment || undefined,
      phoneNumber: phoneNumber || undefined,
      employmentDate: employmentDate || undefined,
      birthDate: birthDate || undefined,
      serviceYears,
      lastOrganizationScore: lastScore,
      reducedHours: (serviceYears || 0) >= 20,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">➕ افزودن نیروی جدید</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="نام *" value={firstName} onChange={e => setFirstName(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="نام خانوادگی *" value={lastName} onChange={e => setLastName(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="کد ملی" value={nationalCode} onChange={e => setNationalCode(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="کد پرسنلی" value={personnelCode} onChange={e => setPersonnelCode(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <select value={gender} onChange={e => setGender(e.target.value as Personnel['gender'])} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="مرد">مرد</option>
            <option value="زن">زن</option>
          </select>
          <select value={field} onChange={e => setField(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">رشته به کارگیری *</option>
            {existingFields.map(f => <option key={f} value={f}>{f}</option>)}
            <option value="__custom__">سایر (دستی وارد کنید)</option>
          </select>
          {field === '__custom__' && (
            <input placeholder="نام رشته" value={customField} onChange={e => setCustomField(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          )}
          <div className="grid grid-cols-2 gap-3">
            <select value={degree} onChange={e => setDegree(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="دیپلم">دیپلم</option>
              <option value="فوق دیپلم">فوق دیپلم</option>
              <option value="لیسانس">لیسانس</option>
              <option value="فوق لیسانس">فوق لیسانس</option>
              <option value="دکتری">دکتری</option>
            </select>
            <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="رسمی">رسمی</option>
              <option value="پیمانی">پیمانی</option>
              <option value="قراردادی">قراردادی</option>
              <option value="حق‌التدریس">حق‌التدریس</option>
            </select>
          </div>
          <select value={role} onChange={e => setRole(e.target.value as Personnel['role'])} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="معلم">معلم / دبیر</option>
            <option value="مدیر">مدیر</option>
            <option value="معاون آموزشی">معاون آموزشی</option>
            <option value="معاون پرورشی">معاون پرورشی</option>
            <option value="معاون اجرایی">معاون اجرایی</option>
            <option value="سرپرست بخش">سرپرست بخش</option>
            <option value="معاون فنی">معاون فنی</option>
            <option value="سرایدار">سرایدار</option>
            <option value="خدمتگزار">خدمتگزار</option>
            <option value="سایر">سایر</option>
          </select>

          {/* Extra fields toggle */}
          <button type="button" onClick={() => setShowExtra(!showExtra)} className="text-xs text-indigo-600 hover:text-indigo-800 w-full text-right">
            {showExtra ? '▲ بستن مشخصات تکمیلی' : '▼ مشخصات تکمیلی (اختیاری)'}
          </button>
          {showExtra && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="نام پدر" value={fatherName} onChange={e => setFatherName(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                <input placeholder="شماره همراه" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="رشته تحصیلی" value={fieldDegree} onChange={e => setFieldDegree(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
                <input placeholder="رشته استخدامی" value={fieldEmployment} onChange={e => setFieldEmployment(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400">تاریخ استخدام</label>
                  <input placeholder="مثلاً ۱۳۸۵/۰۶/۰۱" value={employmentDate} onChange={e => setEmploymentDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">تاریخ تولد</label>
                  <input placeholder="مثلاً ۱۳۶۰/۰۳/۱۵" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400">سنوات خدمت (سال)</label>
                  <input type="number" placeholder="مثلاً ۲۲" value={serviceYears ?? ''} onChange={e => setServiceYears(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400">آخرین امتیاز سازماندهی</label>
                  <input type="number" placeholder="مثلاً ۸۵" value={lastScore ?? ''} onChange={e => setLastScore(e.target.value ? parseInt(e.target.value) : undefined)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" />
                </div>
              </div>
              {(serviceYears || 0) >= 20 && (
                <div className="text-[10px] text-orange-600 bg-orange-50 rounded px-2 py-1 border border-orange-200">
                  📉 سنوات خدمت ≥ ۲۰ سال: مشمول تقلیل ساعت (حداکثر ۲۰ ساعت موظف)
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">افزودن</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">انصراف</button>
          </div>
        </div>
      </div>
    </div>
  );
}
