import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const DAYS_IN_MONTH = [31,31,31,31,31,31,30,30,30,30,30,29];

function getCurrentPersianDate(): { y: number; m: number; d: number } {
  const now = new Date();
  const parts = now.toLocaleDateString('fa-IR-u-nu-latn').split('/');
  return { y: parseInt(parts[0]) || 1405, m: parseInt(parts[1]) || 7, d: parseInt(parts[2]) || 1 };
}

export default function PersianDatePicker({ value, onChange, placeholder = 'انتخاب تاریخ', label }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const current = getCurrentPersianDate();
  const parsed = value ? value.split('/').map(Number) : [];
  const [viewYear, setViewYear] = useState(parsed[0] || current.y);
  const [viewMonth, setViewMonth] = useState((parsed[1] || current.m) - 1);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const daysCount = DAYS_IN_MONTH[viewMonth] || 30;
  const selectedDay = parsed[0] === viewYear && parsed[1] === viewMonth + 1 ? parsed[2] : -1;

  const select = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}/${m}/${d}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && <label className="block text-[10px] text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-right flex justify-between items-center hover:border-indigo-300"
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>{value || placeholder}</span>
        <span className="text-gray-400 text-xs">📅</span>
      </button>
      
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white rounded-xl border border-gray-200 shadow-xl p-3 animate-fade-in">
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 text-sm">◀</button>
            <div className="text-sm font-bold text-gray-700">{MONTHS[viewMonth]} {viewYear}</div>
            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-full hover:bg-gray-100 text-sm">▶</button>
          </div>
          
          {/* Year quick select */}
          <div className="flex gap-1 justify-center mb-2">
            {[current.y - 1, current.y, current.y + 1].map(y => (
              <button key={y} type="button" onClick={() => setViewYear(y)}
                className={`px-2 py-0.5 rounded text-[10px] ${viewYear === y ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {y}
              </button>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {['ش','ی','د','س','چ','پ','ج'].map(d => (
              <div key={d} className="text-center text-[9px] text-gray-400 py-1">{d}</div>
            ))}
            {Array.from({ length: daysCount }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                type="button"
                onClick={() => select(day)}
                className={`w-8 h-8 rounded-full text-xs transition-colors ${
                  day === selectedDay ? 'bg-indigo-600 text-white font-bold' :
                  day === current.d && viewMonth === current.m - 1 && viewYear === current.y ? 'bg-indigo-100 text-indigo-700 font-bold' :
                  'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          
          {/* Quick actions */}
          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => { onChange(`${current.y}/${String(current.m).padStart(2,'0')}/${String(current.d).padStart(2,'0')}`); setOpen(false); }}
              className="flex-1 py-1 text-[10px] bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">امروز</button>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="flex-1 py-1 text-[10px] bg-gray-50 text-gray-500 rounded hover:bg-gray-100">پاک کردن</button>
          </div>
        </div>
      )}
    </div>
  );
}
