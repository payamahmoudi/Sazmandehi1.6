import { useMemo, useState } from 'react';
import { School, Personnel } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  schools: School[];
  personnel: Personnel[];
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

type DetailKey = 'schools' | 'personnel' | 'students' | 'classes' | null;

export default function Dashboard({ schools, personnel }: Props) {
  const [showDetail, setShowDetail] = useState<DetailKey>(null);
  const stats = useMemo(() => {
    const totalSchools = schools.length;
    const totalPersonnel = personnel.length;
    const totalStudents = schools.reduce((sum, s) => sum + s.studentCount, 0);
    const totalClasses = schools.reduce((sum, s) => sum + s.classCount, 0);
    const boySchools = schools.filter(s => s.gender === 'پسرانه').length;
    const girlSchools = schools.filter(s => s.gender === 'دخترانه').length;
    const mixedSchools = schools.filter(s => s.gender === 'مختلط').length;
    const schoolByTypeAndGender: Record<string, { پسرانه: number; دخترانه: number; مختلط: number }> = {};
    schools.forEach(s => {
      if (!schoolByTypeAndGender[s.type]) schoolByTypeAndGender[s.type] = { پسرانه: 0, دخترانه: 0, مختلط: 0 };
      schoolByTypeAndGender[s.type][s.gender]++;
    });
    const classesByType: Record<string, number> = {};
    schools.forEach(s => {
      classesByType[s.type] = (classesByType[s.type] || 0) + s.classCount;
    });
    const studentsByGender = { male: 0, female: 0 };
    // approximate: half of mixed go to each
    schools.forEach(s => {
      if (s.gender === 'پسرانه') studentsByGender.male += s.studentCount;
      else if (s.gender === 'دخترانه') studentsByGender.female += s.studentCount;
      else { studentsByGender.male += Math.round(s.studentCount / 2); studentsByGender.female += Math.floor(s.studentCount / 2); }
    });
    const male = personnel.filter(p => p.gender === 'مرد').length;
    const female = personnel.filter(p => p.gender === 'زن').length;
    const locked = personnel.filter(p => p.isLocked).length;
    const partial = personnel.filter(p => !p.isLocked && p.assignedHours > 0).length;
    const unassigned = personnel.filter(p => p.assignedHours === 0 && p.status === 'فعال').length;
    const onLeave = personnel.filter(p => p.status === 'مرخصی زایمان').length;

    const fieldMap: Record<string, number> = {};
    personnel.forEach(p => {
      fieldMap[p.field] = (fieldMap[p.field] || 0) + 1;
    });

    const typeMap: Record<string, number> = {};
    schools.forEach(s => {
      typeMap[s.type] = (typeMap[s.type] || 0) + 1;
    });

    return {
      totalSchools, totalPersonnel, totalStudents, totalClasses,
      male, female, locked, partial, unassigned, onLeave,
      fieldMap, typeMap, schoolByTypeAndGender, classesByType, studentsByGender, boySchools, girlSchools, mixedSchools,
    };
  }, [schools, personnel]);

  const genderData = [
    { name: 'مرد', value: stats.male },
    { name: 'زن', value: stats.female },
  ];

  const fieldData = Object.entries(stats.fieldMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const typeData = Object.entries(stats.typeMap).map(([name, value]) => ({ name, value }));

  const assignmentData = [
    { name: 'تکمیل شده', value: stats.locked, color: '#10b981' },
    { name: 'ناقص', value: stats.partial, color: '#f59e0b' },
    { name: 'بدون ابلاغ', value: stats.unassigned, color: '#ef4444' },
    { name: 'مرخصی', value: stats.onLeave, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-6">
      {/* Detail panels */}
      {showDetail === 'schools' && (
        <div className="bg-white rounded-xl border border-indigo-100 p-4 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">🏫 تفکیک مدارس بر اساس دوره و جنسیت</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(stats.schoolByTypeAndGender).map(([type, genders]) => (
              <div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="font-bold text-indigo-700 mb-2">{type}</div>
                <div className="flex gap-2 text-xs">
                  <span>پسرانه: {genders.پسرانه}</span>
                  <span>دخترانه: {genders.دخترانه}</span>
                  <span>مختلط: {genders.مختلط}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowDetail(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">✕ بستن</button>
        </div>
      )}
      {showDetail === 'personnel' && (
        <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">👥 تفکیک نیروها بر اساس رشته و جنسیت</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
            {Object.entries(stats.fieldMap).map(([field, count]) => {
              const m = personnel.filter(p => p.field === field && p.gender === 'مرد').length;
              const f = personnel.filter(p => p.field === field && p.gender === 'زن').length;
              return (<div key={field} className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center"><div className="font-bold text-emerald-700 text-xs">{field}</div><div className="text-lg font-bold">{count}</div><div className="flex justify-center gap-2 text-[10px]"><span>♂ {m}</span><span>♀ {f}</span></div></div>);
            })}
          </div>
          <button onClick={() => setShowDetail(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">✕ بستن</button>
        </div>
      )}
      {showDetail === 'students' && (
        <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">🎓 تفکیک دانش‌آموزان بر اساس دوره و جنسیت</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(stats.classesByType).map(([type]) => {
              const ts = schools.filter(s => s.type === type);
              const ms = ts.filter(s => s.gender === 'پسرانه').reduce((s, c) => s + c.studentCount, 0) + ts.filter(s => s.gender === 'مختلط').reduce((s, c) => s + Math.round(c.studentCount / 2), 0);
              const fs = ts.filter(s => s.gender === 'دخترانه').reduce((s, c) => s + c.studentCount, 0) + ts.filter(s => s.gender === 'مختلط').reduce((s, c) => s + Math.floor(c.studentCount / 2), 0);
              return (<div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200"><div className="font-bold text-amber-700 mb-1">{type}</div><div className="text-xs">پسر: {ms} | دختر: {fs}</div></div>);
            })}
          </div>
          <button onClick={() => setShowDetail(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">✕ بستن</button>
        </div>
      )}
      {showDetail === 'classes' && (
        <div className="bg-white rounded-xl border border-rose-100 p-4 shadow-sm animate-fade-in">
          <h3 className="font-semibold text-sm mb-3">📚 تفکیک کلاس‌ها بر اساس مقطع</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {Object.entries(stats.classesByType).map(([type, c]) => (<div key={type} className="bg-slate-50 rounded-lg p-3 border border-slate-200"><div className="font-bold text-rose-700 mb-1">{type}</div><div className="text-lg font-bold">{c}</div><div className="text-xs text-gray-500">کلاس</div></div>))}
          </div>
          <button onClick={() => setShowDetail(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">✕ بستن</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setShowDetail(showDetail === 'schools' ? null : 'schools')} className="block">
          <StatCard 
            title="مراکز و مدارس" 
            value={stats.totalSchools} 
            icon="🏫" 
            color="from-indigo-500 to-indigo-600"
            tooltip={`${stats.boySchools} پسرانه | ${stats.girlSchools} دخترانه | ${stats.mixedSchools} مختلط`}
          />
        </button>
        <button onClick={() => setShowDetail(showDetail === 'personnel' ? null : 'personnel')} className="block">
          <StatCard 
            title="کل نیروها" 
            value={stats.totalPersonnel} 
            icon="👥" 
            color="from-emerald-500 to-emerald-600"
            tooltip={`${stats.male} آقا | ${stats.female} خانم`}
          />
        </button>
        <button onClick={() => setShowDetail(showDetail === 'students' ? null : 'students')} className="block">
          <StatCard 
            title="دانش‌آموزان" 
            value={stats.totalStudents} 
            icon="🎓" 
            color="from-amber-500 to-amber-600"
            tooltip={`♂ ${stats.studentsByGender.male} پسر | ♀ ${stats.studentsByGender.female} دختر`}
          />
        </button>
        <button onClick={() => setShowDetail(showDetail === 'classes' ? null : 'classes')} className="block">
          <StatCard 
            title="کلاس‌ها" 
            value={stats.totalClasses} 
            icon="📚" 
            color="from-rose-500 to-rose-600"
          />
        </button>
      </div>

      {/* Assignment Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assignmentData.map(item => (
          <div key={item.name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">{item.name}</div>
            <div className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</div>
            <div className="text-xs text-gray-400">نفر</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gender Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">توزیع جنسیتی نیروها</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell fill="#6366f1" />
                <Cell fill="#ec4899" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* School Types */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">مدارس بر حسب دوره</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Assignment Status Pie */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">وضعیت ابلاغ نیروها</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={assignmentData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {assignmentData.map((item, i) => <Cell key={i} fill={item.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Personnel by Field */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">نیروها بر حسب رشته تدریس</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fieldData} layout="vertical" margin={{ right: 30 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} name="تعداد" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Schools Summary Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">خلاصه وضعیت مدارس</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 px-3 text-right font-medium text-gray-600">نام مدرسه</th>
              <th className="py-2 px-3 text-right font-medium text-gray-600">دوره</th>
              <th className="py-2 px-3 text-right font-medium text-gray-600">جنسیت</th>
              <th className="py-2 px-3 text-center font-medium text-gray-600">کلاس</th>
              <th className="py-2 px-3 text-center font-medium text-gray-600">دانش‌آموز</th>
              <th className="py-2 px-3 text-center font-medium text-gray-600">مدیر</th>
              <th className="py-2 px-3 text-center font-medium text-gray-600">معاون</th>
            </tr>
          </thead>
          <tbody>
            {schools.map(s => {
              const manager = personnel.find(p => p.id === s.managerId);
              const assistant = personnel.find(p => p.id === s.assistantId);
              return (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-3 font-medium">{s.name}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      s.type === 'ابتدایی' ? 'bg-blue-100 text-blue-700' :
                      s.type === 'متوسطه اول' ? 'bg-green-100 text-green-700' :
                      s.type === 'هنرستان' ? 'bg-orange-100 text-orange-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>{s.type}</span>
                  </td>
                  <td className="py-2 px-3">{s.gender}</td>
                  <td className="py-2 px-3 text-center">{s.classCount}</td>
                  <td className="py-2 px-3 text-center">{s.studentCount}</td>
                  <td className="py-2 px-3 text-center">
                    {manager ? (
                      <span className="text-green-600">✅ {manager.firstName} {manager.lastName}</span>
                    ) : (
                      <span className="text-red-400">❌ ندارد</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">
                    {s.needsAssistant ? (
                      assistant ? (
                        <span className="text-green-600">✅ {assistant.firstName} {assistant.lastName}</span>
                      ) : (
                        <span className="text-red-400">❌ ندارد</span>
                      )
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, tooltip }: { title: string; value: number; icon: string; color: string; tooltip?: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white shadow-lg cursor-pointer hover:scale-[1.02] transition-transform relative group`} title={tooltip}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs opacity-80">{title}</div>
          <div className="text-3xl font-bold mt-1">{value.toLocaleString('fa-IR')}</div>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
      {tooltip && (
        <div className="hidden group-hover:block absolute -bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg z-50">
          {tooltip}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
        </div>
      )}
    </div>
  );
}
