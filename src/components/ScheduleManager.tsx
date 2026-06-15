import { useMemo, useState } from 'react';
import { Personnel, School, ScheduleEntry } from '../types';
import SearchableSelect from './SearchableSelect';

interface Props {
  schools: School[];
  personnel: Personnel[];
  scheduleEntries: ScheduleEntry[];
  onUpdateScheduleEntries: (entries: ScheduleEntry[]) => void;
}

const DAYS: ScheduleEntry['day'][] = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه'];

export default function ScheduleManager({ schools, personnel, scheduleEntries, onUpdateScheduleEntries }: Props) {
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [day, setDay] = useState<ScheduleEntry['day']>('شنبه');
  const [time, setTime] = useState('۸:۰۰ تا ۹:۳۰');
  const [search, setSearch] = useState('');

  const schoolOptions = schools.map(s => ({ value: s.id, label: `${s.name} (${s.code})`, description: `${s.type} - ${s.gender}` }));
  // Only show personnel who have assignments in the selected school
  const selectedSchool = schools.find(s => s.id === selectedSchoolId);
  const personnelOptions = useMemo(() => {
    if (!selectedSchoolId) return personnel.map(p => ({ value: p.id, label: `${p.firstName} ${p.lastName}`, description: `${p.field} - ${p.role}` }));
    const assignedIds = new Set(personnel.filter(p => p.assignments.some(a => a.schoolId === selectedSchoolId)).map(p => p.id));
    return personnel.filter(p => assignedIds.has(p.id)).map(p => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName}`,
      description: `${p.field} - ${p.role} - ${selectedSchool?.name || ''}`,
    }));
  }, [selectedSchoolId, personnel, selectedSchool]);

  // Grades and subjects from school data
  const gradeOptions = useMemo(() => {
    if (!selectedSchool) return [];
    return selectedSchool.grades.map(g => ({ value: g.grade, label: `${g.grade}${g.field ? ` (${g.field})` : ''}` }));
  }, [selectedSchool]);

  const subjectOptions = useMemo(() => {
    if (!selectedSchoolId) return [];
    // Get subjects from assignments in this school
    const fromAssignments = [...new Set(personnel.flatMap(p => p.assignments.filter(a => a.schoolId === selectedSchoolId).map(a => a.subject)))];
    return fromAssignments.map(s => ({ value: s, label: s }));
  }, [selectedSchoolId, personnel]);

  const filteredEntries = useMemo(() => scheduleEntries.filter(e => {
    if (!search) return true;
    return `${e.schoolName} ${e.personnelName} ${e.subject} ${e.grade} ${e.day} ${e.time}`.includes(search);
  }), [scheduleEntries, search]);

  const addEntry = () => {
    const school = schools.find(s => s.id === selectedSchoolId);
    const person = personnel.find(p => p.id === selectedPersonnelId);
    if (!school || !person || !subject || !grade || !time) {
      alert('لطفاً همه فیلدها را کامل کنید.');
      return;
    }
    const entry: ScheduleEntry = {
      id: `sch-${Date.now()}`,
      schoolId: school.id,
      schoolName: school.name,
      personnelId: person.id,
      personnelName: `${person.firstName} ${person.lastName}`,
      subject,
      grade,
      day,
      time,
    };
    onUpdateScheduleEntries([entry, ...scheduleEntries]);
    setSubject('');
    setGrade('');
    setTime('۸:۰۰ تا ۹:۳۰');
  };

  const removeEntry = (id: string) => {
    if (!confirm('این مورد از برنامه هفتگی حذف شود؟')) return;
    onUpdateScheduleEntries(scheduleEntries.filter(e => e.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📅 ثبت برنامه هفتگی مدارس</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">مدرسه</label>
            <SearchableSelect value={selectedSchoolId} options={schoolOptions} onChange={setSelectedSchoolId} placeholder="جستجوی مدرسه..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">نیرو</label>
            <SearchableSelect value={selectedPersonnelId} options={personnelOptions} onChange={setSelectedPersonnelId} placeholder="جستجوی نیرو..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">روز هفته</label>
            <SearchableSelect value={day} options={DAYS.map(d => ({ value: d, label: d }))} onChange={v => setDay(v as ScheduleEntry['day'])} placeholder="انتخاب روز..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">درس</label>
            <SearchableSelect value={subject} onChange={setSubject} options={subjectOptions} placeholder="جستجوی درس..." disabled={!selectedSchoolId} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">پایه</label>
            <SearchableSelect value={grade} onChange={setGrade} options={gradeOptions} placeholder="جستجوی پایه..." disabled={!selectedSchoolId} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">بازه زمانی</label>
            <input value={time} onChange={e => setTime(e.target.value)} placeholder="مثلاً ۸:۰۰ تا ۹:۳۰" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
        </div>
        <button onClick={addEntry} className="mt-4 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">➕ افزودن به برنامه</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">لیست برنامه هفتگی</h3>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو در برنامه..." className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-2 text-right">مدرسه</th>
                <th className="py-2 px-2 text-right">نیرو</th>
                <th className="py-2 px-2 text-right">درس</th>
                <th className="py-2 px-2 text-right">پایه</th>
                <th className="py-2 px-2 text-right">روز</th>
                <th className="py-2 px-2 text-right">زمان</th>
                <th className="py-2 px-2 text-center">حذف</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => (
                <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 px-2 font-medium">{entry.schoolName}</td>
                  <td className="py-1.5 px-2">{entry.personnelName}</td>
                  <td className="py-1.5 px-2">{entry.subject}</td>
                  <td className="py-1.5 px-2">{entry.grade}</td>
                  <td className="py-1.5 px-2">{entry.day}</td>
                  <td className="py-1.5 px-2">{entry.time}</td>
                  <td className="py-1.5 px-2 text-center"><button onClick={() => removeEntry(entry.id)} className="text-red-400 hover:text-red-600">❌</button></td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">برنامه‌ای ثبت نشده است.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
