import { useState } from 'react';
import { regulations } from '../data/regulations';

interface Props {
  onClose: () => void;
}

export default function RegulationsModal({ onClose }: Props) {
  const [activeGrade, setActiveGrade] = useState('ابتدایی');
  const activeReg = regulations.find(r => r.grade === activeGrade);
  const tabLabels: Record<string, string> = {
    'ابتدایی': 'ابتدایی',
    'متوسطه اول': 'متوسطه اول',
    'متوسطه دوم نظری': 'متوسطه دوم',
    'هنرستان': 'هنرستان',
    'ابلاغ': 'ضوابط ابلاغ',
    'مراکز': 'مراکز تابعه',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b p-4 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-gray-800">📋 ضوابط ساماندهی 1406-1405</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {regulations.map(r => (
              <button key={r.grade} onClick={() => setActiveGrade(r.grade)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeGrade === r.grade ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {tabLabels[r.grade] || r.grade}
              </button>
            ))}
          </div>
          {activeReg && (
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <h3 className="font-bold text-gray-800 mb-4">{activeReg.title}</h3>
              <div className="space-y-0">
                {activeReg.items.map((item, i) =>
                  item.label === '' && item.value === '' ? <div key={i} className="h-3" /> :
                  item.value === '' ? <div key={i} className="py-1.5 font-semibold text-indigo-700 text-sm border-b border-indigo-100">{item.label}</div> :
                  <div key={i} className="py-1.5 flex items-start gap-2 text-sm border-b border-slate-100">
                    <span className="min-w-[180px] text-gray-600 font-medium text-xs">{item.label}</span>
                    <span className="text-gray-800 text-xs">{item.value}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>⚠️</strong> این ضوابط بر اساس ابلاغ سال جاری است. در صورت تغییر توسط وزارت یا اداره کل، موارد را ویرایش کنید.
          </div>
        </div>
      </div>
    </div>
  );
}
