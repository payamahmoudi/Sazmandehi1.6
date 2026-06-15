import { useState } from 'react';
import { School, Personnel, GradeInfo, EXECUTIVE_ROLES } from '../types';
import SearchableSelect from './SearchableSelect';

interface Props {
  schools: School[];
  personnel: Personnel[];
  onUpdateSchools: (schools: School[]) => void;
  onAssignManager: (schoolId: string, personnelId: string) => void;
  onAssignAssistant: (schoolId: string, personnelId: string) => void;
  onAssignExecutiveRole: (schoolId: string, personnelId: string, roleKey: string, roleLabel: string) => void;
}

export default function SchoolsManager({ schools, personnel, onUpdateSchools, onAssignManager, onAssignAssistant, onAssignExecutiveRole }: Props) {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSchools = schools.filter(s => {
    if (filterType && s.type !== filterType) return false;
    if (filterGender && s.gender !== filterGender) return false;
    if (searchTerm && !`${s.name} ${s.code}`.includes(searchTerm)) return false;
    return true;
  });

  const schoolTypes = ['ابتدایی', 'متوسطه اول', 'متوسطه دوم نظری', 'هنرستان', 'کاردانش', 'استثنایی'];
  const genderTypes = ['پسرانه', 'دخترانه', 'مختلط'];

  const availableManagers = personnel.filter(p => 
    (p.role === 'مدیر' || p.role === 'معلم') && p.status === 'فعال' && !p.isLocked
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 جستجوی نام یا کد مدرسه..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
          >
            <option value="">همه دوره‌ها</option>
            {schoolTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterGender}
            onChange={e => setFilterGender(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
          >
            <option value="">همه جنسیت‌ها</option>
            {genderTypes.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors flex items-center gap-1"
          >
            <span>+</span> افزودن مدرسه
          </button>
        </div>
      </div>

      {/* Schools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchools.map(school => (
          <SchoolCard
            key={school.id}
            school={school}
            personnel={personnel}
            onSelect={() => setSelectedSchool(school)}
            onDelete={() => {
              if (confirm(`آیا از حذف مدرسه "${school.name}" مطمئن هستید؟`)) {
                onUpdateSchools(schools.filter(s => s.id !== school.id));
              }
            }}
          />
        ))}
      </div>

      {/* School Detail Modal */}
      {selectedSchool && (
        <SchoolDetailModal
          school={selectedSchool}
          personnel={personnel}
          availableManagers={availableManagers}
          onClose={() => setSelectedSchool(null)}
          onUpdate={(updated) => {
            onUpdateSchools(schools.map(s => s.id === updated.id ? updated : s));
            setSelectedSchool(updated);
          }}
          onAssignManager={onAssignManager}
          onAssignAssistant={onAssignAssistant}
          onAssignExecutiveRole={onAssignExecutiveRole}
        />
      )}

      {/* Add School Modal */}
      {showAddForm && (
        <AddSchoolModal
          onClose={() => setShowAddForm(false)}
          onAdd={(school) => {
            onUpdateSchools([...schools, school]);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

function SchoolCard({ school, personnel, onSelect, onDelete }: {
  school: School;
  personnel: Personnel[];
  onSelect: () => void;
  onDelete: () => void;
}) {
  const manager = personnel.find(p => p.id === school.managerId);
  const assistant = personnel.find(p => p.id === school.assistantId);
  const assignedPersonnel = personnel.filter(p => p.assignments.some(a => a.schoolId === school.id));

  const typeColorMap: Record<string, string> = {
    'ابتدایی': 'border-blue-300 bg-blue-50',
    'متوسطه اول': 'border-green-300 bg-green-50',
    'متوسطه دوم نظری': 'border-purple-300 bg-purple-50',
    'هنرستان': 'border-orange-300 bg-orange-50',
    'کاردانش': 'border-amber-300 bg-amber-50',
    'استثنایی': 'border-rose-300 bg-rose-50',
    'غیردولتی': 'border-cyan-300 bg-cyan-50',
    'مرکز تابعه': 'border-teal-300 bg-teal-50',
  };
  const typeColor = typeColorMap[school.type] || 'border-gray-300 bg-gray-50';

  return (
    <div className={`bg-white rounded-xl border-2 ${typeColor} p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer`} onClick={onSelect}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800">{school.name}</h3>
          <div className="mt-0.5 text-xs text-gray-400">کد: {school.code} | {school.location || 'شهری'}</div>
          <div className="flex gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{school.type}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{school.gender}</span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-400 hover:text-red-600 text-sm"
          title="حذف"
        >
          🗑️
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="text-lg font-bold text-indigo-600">{school.classCount}</div>
          <div className="text-[10px] text-gray-400">کلاس</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="text-lg font-bold text-emerald-600">{school.studentCount}</div>
          <div className="text-[10px] text-gray-400">دانش‌آموز</div>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="text-lg font-bold text-amber-600">{assignedPersonnel.length}</div>
          <div className="text-[10px] text-gray-400">نیرو</div>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-1">
          <span>{manager ? '✅' : '❌'}</span>
          <span className="text-gray-500">مدیر:</span>
          <span className={manager ? 'text-green-700 font-medium' : 'text-red-400'}>
            {manager ? `${manager.firstName} ${manager.lastName}` : 'تعیین نشده'}
          </span>
        </div>
        {school.needsAssistant && (
          <div className="flex items-center gap-1">
            <span>{assistant ? '✅' : '❌'}</span>
            <span className="text-gray-500">معاون:</span>
            <span className={assistant ? 'text-green-700 font-medium' : 'text-red-400'}>
              {assistant ? `${assistant.firstName} ${assistant.lastName}` : 'تعیین نشده'}
            </span>
          </div>
        )}
      </div>

      {school.fields && school.fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {school.fields.map(f => (
            <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{f}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolDetailModal({ school, personnel, availableManagers, onClose, onUpdate, onAssignManager, onAssignExecutiveRole }: {
  school: School;
  personnel: Personnel[];
  availableManagers: Personnel[];
  onClose: () => void;
  onUpdate: (school: School) => void;
  onAssignManager: (schoolId: string, personnelId: string) => void;
  onAssignAssistant: (schoolId: string, personnelId: string) => void;
  onAssignExecutiveRole: (schoolId: string, personnelId: string, roleKey: string, roleLabel: string) => void;
}) {
  const assignedPersonnel = personnel.filter(p => p.assignments.some(a => a.schoolId === school.id));
  const [editingGrades, setEditingGrades] = useState(false);
  const [grades, setGrades] = useState<GradeInfo[]>(school.grades);

  const handleSaveGrades = () => {
    const totalClasses = grades.reduce((sum, g) => sum + g.classCount, 0);
    const totalStudents = grades.reduce((sum, g) => sum + g.studentCount, 0);
    onUpdate({ ...school, grades, classCount: totalClasses, studentCount: totalStudents });
    setEditingGrades(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 rounded-t-2xl flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">📋 جزئیات مدرسه {school.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoBox label="دوره" value={school.type} />
            <InfoBox label="جنسیت" value={school.gender} />
            <InfoBox label="تعداد کلاس" value={school.classCount.toString()} />
            <InfoBox label="تعداد دانش‌آموز" value={school.studentCount.toString()} />
          </div>

          {/* Extended Info - Editable */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <h3 className="font-semibold text-gray-700 mb-3 text-sm">اطلاعات تکمیلی</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className="text-[10px] text-gray-400">کد فضا</label><input defaultValue={school.spaceCode || ''} onBlur={e => onUpdate({ ...school, spaceCode: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div><label className="text-[10px] text-gray-400">شناسه ملی مدرسه</label><input defaultValue={school.nationalId || ''} onBlur={e => onUpdate({ ...school, nationalId: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div><label className="text-[10px] text-gray-400">محل استقرار</label>
                <select defaultValue={school.location || 'شهری'} onChange={e => onUpdate({ ...school, location: e.target.value as any })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs bg-white">
                  <option value="شهری">شهری</option><option value="روستایی">روستایی</option>
                </select>
              </div>
              <div><label className="text-[10px] text-gray-400">کد پستی</label><input defaultValue={school.postalCode || ''} onBlur={e => onUpdate({ ...school, postalCode: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div><label className="text-[10px] text-gray-400">تلفن مدرسه</label><input defaultValue={school.phone || ''} onBlur={e => onUpdate({ ...school, phone: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div><label className="text-[10px] text-gray-400">موبایل مدیر</label><input defaultValue={(school as any).managerPhone || ''} onBlur={e => onUpdate({ ...school, managerPhone: e.target.value } as any)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div><label className="text-[10px] text-gray-400">منطقه</label><input defaultValue={school.region || ''} onBlur={e => onUpdate({ ...school, region: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
              <div className="col-span-2"><label className="text-[10px] text-gray-400">آدرس</label><input defaultValue={school.address || ''} onBlur={e => onUpdate({ ...school, address: e.target.value })} className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs" /></div>
            </div>
          </div>

          {/* Executive Roles */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">عوامل اجرایی مدرسه</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* Standard roles */}
              {EXECUTIVE_ROLES.map(role => {
                const currentPersonId = (school as any)[role.key];
                const currentPerson = currentPersonId ? personnel.find(p => p.id === currentPersonId) : null;
                return (
                  <div key={role.key} className="border border-gray-200 rounded-lg p-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      {role.label} {role.required && <span className="text-red-400">*</span>}
                    </label>
                    <SearchableSelect
                      value={currentPersonId || ''}
                      onChange={v => {
                        if (v) {
                          if (role.key === 'managerId') onAssignManager(school.id, v);
                          else onAssignExecutiveRole(school.id, v, role.key, role.label);
                        }
                      }}
                      placeholder={`جستجوی نیرو برای ${role.label}...`}
                      options={availableManagers.filter(p => p.role !== role.label).concat(currentPerson ? [currentPerson] : []).filter((p, i, a) => a.findIndex(x => x.id === p.id) === i).map(p => ({
                        value: p.id,
                        label: `${p.firstName} ${p.lastName}`,
                        description: `${p.field} - ${p.gender}`,
                      }))}
                    />
                  </div>
                );
              })}
              {/* Custom roles from school.executiveRoles */}
              {(school.executiveRoles || []).filter(r => !EXECUTIVE_ROLES.some(er => er.label === r)).map(customRole => (
                <div key={customRole} className="border border-indigo-200 rounded-lg p-2 bg-indigo-50">
                  <label className="block text-xs text-indigo-600 mb-1">{customRole} (دستی)</label>
                  <SearchableSelect
                    value=""
                    onChange={v => { if (v) onAssignExecutiveRole(school.id, v, `custom_${customRole}` as any, customRole); }}
                    placeholder={`جستجوی نیرو برای ${customRole}...`}
                    options={availableManagers.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}`, description: `${p.field} - ${p.gender}` }))}
                  />
                </div>
              ))}
            </div>
            {/* Add custom executive role */}
            <div className="mt-3 flex gap-2">
              <input
                placeholder="افزودن عنوان دلخواه (مثلاً معاون فناوری)"
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-xs"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      onUpdate({ ...school, executiveRoles: [...(school.executiveRoles || []), val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <button type="button" onClick={() => {
                const input = document.querySelector<HTMLInputElement>('[placeholder*="عنوان دلخواه"]');
                if (input?.value.trim()) {
                  onUpdate({ ...school, executiveRoles: [...(school.executiveRoles || []), input.value.trim()] });
                  input.value = '';
                }
              }} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded text-xs">+ افزودن</button>
            </div>
            {/* Show custom roles with remove */}
            {(school.executiveRoles || []).filter(r => !EXECUTIVE_ROLES.some(er => er.label === r)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(school.executiveRoles || []).filter(r => !EXECUTIVE_ROLES.some(er => er.label === r)).map(r => (
                  <span key={r} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">
                    {r}
                    <button onClick={() => onUpdate({ ...school, executiveRoles: (school.executiveRoles || []).filter(x => x !== r) })} className="text-red-400 hover:text-red-600">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Grades */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">پایه‌ها و کلاس‌ها</h3>
              <div className="flex gap-2">
                {editingGrades && (
                  <button
                    onClick={() => setGrades(prev => [...prev, { grade: school.type === 'ابتدایی' ? 'اول-دوم' : 'دهم', classCount: 1, studentCount: 0, field: '' }])}
                    className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200"
                  >
                    ➕ ردیف جدید
                  </button>
                )}
                <button
                  onClick={() => editingGrades ? handleSaveGrades() : setEditingGrades(true)}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200"
                >
                  {editingGrades ? '💾 ذخیره' : '✏️ ویرایش'}
                </button>
              </div>
            </div>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-3 text-right text-gray-600">پایه</th>
                  <th className="py-2 px-3 text-center text-gray-600">تعداد کلاس</th>
                  <th className="py-2 px-3 text-center text-gray-600">تعداد دانش‌آموز</th>
                  {school.type === 'هنرستان' || school.type === 'کاردانش' || school.type === 'متوسطه دوم نظری' ? (
                    <th className="py-2 px-3 text-center text-gray-600">رشته</th>
                  ) : null}
                  {editingGrades && <th className="py-2 px-3 text-center text-gray-600">حذف</th>}
                </tr>
              </thead>
              <tbody>
                {(editingGrades ? grades : school.grades).map((g, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-2 px-3 font-medium">
                      {editingGrades ? (
                        <input
                          value={g.grade}
                          onChange={e => {
                            const newGrades = [...grades];
                            newGrades[i] = { ...g, grade: e.target.value };
                            setGrades(newGrades);
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="مثلاً اول-دوم یا هفتم"
                        />
                      ) : g.grade}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {editingGrades ? (
                        <input
                          type="number"
                          min={0}
                          value={g.classCount}
                          onChange={e => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            if (val === 0 && g.classCount > 0) {
                              if (!confirm(`⚠️ با صفر کردن تعداد کلاس پایه «${g.grade}»، تمام ابلاغ‌ها و برنامه‌های درسی این پایه حذف خواهند شد. ادامه می‌دهید؟`)) return;
                            }
                            const newGrades = [...grades];
                            newGrades[i] = { ...g, classCount: val };
                            setGrades(newGrades);
                          }}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                      ) : g.classCount}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {editingGrades ? (
                        <input
                          type="number"
                          min={0}
                          value={g.studentCount}
                          onChange={e => {
                            const newGrades = [...grades];
                            newGrades[i] = { ...g, studentCount: Math.max(0, parseInt(e.target.value) || 0) };
                            setGrades(newGrades);
                          }}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                      ) : g.studentCount}
                    </td>
                    {(school.type === 'هنرستان' || school.type === 'کاردانش' || school.type === 'متوسطه دوم نظری') && (
                      <td className="py-2 px-3 text-center text-xs">{g.field || '—'}</td>
                    )}
                    {editingGrades && (
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => {
                          if (!confirm(`⚠️ آیا از حذف پایه «${g.grade}» مطمئن هستید?\n\nتمام داده‌های این پایه شامل ابلاغ معلمان، برنامه درسی و تراز ساعات حذف خواهند شد.`)) return;
                          setGrades(grades.filter((_, j) => j !== i));
                        }} className="text-red-400 hover:text-red-600 text-sm" title="حذف پایه">🗑️</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Assigned Personnel */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">نیروهای ابلاغ شده به این مدرسه</h3>
            {assignedPersonnel.length > 0 ? (
              <div className="space-y-2">
                {assignedPersonnel.map(p => {
                  const schoolAssignments = p.assignments.filter(a => a.schoolId === school.id);
                  return (
                    <div key={p.id} className={`border rounded-lg p-3 ${p.isLocked ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{p.firstName} {p.lastName}</span>
                          <span className="text-xs text-gray-500 mr-2">({p.field})</span>
                          {p.isLocked && <span className="text-xs text-green-600 mr-2">🔒 قفل شده</span>}
                        </div>
                        <span className="text-sm text-gray-500">
                          {schoolAssignments.reduce((sum, a) => sum + a.hours, 0)} ساعت
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {schoolAssignments.map(a => (
                          <span key={a.id} className={`text-[10px] px-2 py-0.5 rounded-full ${
                            a.isMandatory ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {a.subject} - {a.grade} ({a.hours}س) {a.isMandatory ? 'موظف' : 'غیرموظف'}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">هنوز نیرویی به این مدرسه ابلاغ نشده است.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSchoolModal({ onClose, onAdd }: { onClose: () => void; onAdd: (school: School) => void }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<School['type']>('ابتدایی');
  const [gender, setGender] = useState<School['gender']>('مختلط');
  const [classCount, setClassCount] = useState(6);
  const [studentCount, setStudentCount] = useState(0);
  const [region, setRegion] = useState('سامان');
  const [location, setLocation] = useState<'شهری' | 'روستایی'>('شهری');
  const [spaceCode, setSpaceCode] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [execRoles, setExecRoles] = useState<string[]>(['مدیر']);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customExecRole, setCustomExecRole] = useState('');

  const allRoleOptions = ['مدیر', 'معاون آموزشی', 'معاون پرورشی', 'معاون اجرایی', 'معاون فناوری', 'سرپرست بخش', 'معاون فنی', 'مشاور', 'مربی بهداشت', 'سرایدار', 'خدمتگزار'];

  const handleSubmit = () => {
    if (!name) { alert('نام مدرسه الزامی است'); return; }
    if (!code) { alert('کد مدرسه الزامی است'); return; }
    const grades: GradeInfo[] = [];
    if (type === 'ابتدایی') {
      ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم'].forEach(g => {
        grades.push({ grade: g, classCount: Math.ceil(classCount / 6), studentCount: Math.ceil(studentCount / 6) });
      });
    } else if (type === 'متوسطه اول') {
      ['هفتم', 'هشتم', 'نهم'].forEach(g => {
        grades.push({ grade: g, classCount: Math.ceil(classCount / 3), studentCount: Math.ceil(studentCount / 3) });
      });
    } else {
      ['دهم', 'یازدهم', 'دوازدهم'].forEach(g => {
        grades.push({ grade: g, classCount: Math.ceil(classCount / 3), studentCount: Math.ceil(studentCount / 3) });
      });
    }
    onAdd({
      id: `s-${Date.now()}`, code, name, type, gender, region, location, classCount, studentCount, grades,
      needsManager: true, needsAssistant: classCount >= 6, executiveRoles: execRoles,
      spaceCode: spaceCode || undefined, address: address || undefined,
      nationalId: nationalId || undefined, postalCode: postalCode || undefined, phone: phone || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-800 mb-4">➕ افزودن مدرسه جدید</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="نام مدرسه *" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="کد واحد سازمانی *" value={code} onChange={e => setCode(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={type} onChange={e => setType(e.target.value as School['type'])} className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white">
              <option value="ابتدایی">ابتدایی</option><option value="متوسطه اول">متوسطه اول</option>
              <option value="متوسطه دوم نظری">متوسطه دوم نظری</option><option value="هنرستان">هنرستان</option>
              <option value="کاردانش">کاردانش</option><option value="استثنایی">استثنایی</option>
              <option value="غیردولتی">غیردولتی</option><option value="مرکز تابعه">مرکز تابعه</option>
            </select>
            <select value={gender} onChange={e => setGender(e.target.value as School['gender'])} className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white">
              <option value="پسرانه">پسرانه</option><option value="دخترانه">دخترانه</option><option value="مختلط">مختلط</option>
            </select>
            <select value={location} onChange={e => setLocation(e.target.value as any)} className="px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white">
              <option value="شهری">شهری</option><option value="روستایی">روستایی</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-[10px] text-gray-500">کلاس</label><input type="number" value={classCount} onChange={e => setClassCount(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-gray-500">دانش‌آموز</label><input type="number" value={studentCount} onChange={e => setStudentCount(parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" /></div>
            <div><label className="text-[10px] text-gray-500">منطقه</label><input value={region} onChange={e => setRegion(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm" /></div>
          </div>

          {/* Executive Roles */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-gray-600">عوامل اجرایی</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {allRoleOptions.map(role => (
                <button key={role} type="button" onClick={() => {
                  setExecRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
                }} className={`px-2 py-1 rounded text-[10px] border transition-colors ${execRoles.includes(role) ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  {execRoles.includes(role) ? '✓ ' : '+ '}{role}
                </button>
              ))}
              {/* Custom roles already added */}
              {execRoles.filter(r => !allRoleOptions.includes(r)).map(r => (
                <button key={r} type="button" onClick={() => setExecRoles(prev => prev.filter(x => x !== r))} className="px-2 py-1 rounded text-[10px] border bg-indigo-100 border-indigo-300 text-indigo-700">✓ {r} ✕</button>
              ))}
            </div>
            <div className="flex gap-1 mt-2">
              <input placeholder="عنوان دلخواه (مثلاً معاون فناوری)" value={customExecRole} onChange={e => setCustomExecRole(e.target.value)} className="flex-1 px-2 py-1 border border-gray-200 rounded text-[10px]" />
              <button type="button" onClick={() => {
                if (customExecRole.trim() && !execRoles.includes(customExecRole.trim())) {
                  setExecRoles(prev => [...prev, customExecRole.trim()]);
                  setCustomExecRole('');
                }
              }} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px]">+ افزودن</button>
            </div>
          </div>

          {/* Advanced optional fields */}
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-indigo-600 hover:text-indigo-800">
            {showAdvanced ? '▲ بستن اطلاعات تکمیلی' : '▼ اطلاعات تکمیلی (اختیاری)'}
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <input placeholder="کد فضا" value={spaceCode} onChange={e => setSpaceCode(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              <input placeholder="شناسه ملی مدرسه" value={nationalId} onChange={e => setNationalId(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              <input placeholder="کد پستی" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              <input placeholder="تلفن مدرسه" value={phone} onChange={e => setPhone(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded text-xs" />
              <input placeholder="آدرس" value={address} onChange={e => setAddress(e.target.value)} className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-xs" />
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold text-gray-800 mt-1">{value}</div>
    </div>
  );
}
