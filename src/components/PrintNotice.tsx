import { Personnel, School } from '../types';

interface Props {
  person: Personnel;
  school: School;
  allAssignments: { id: string; schoolName: string; schoolCode?: string; subject: string; grade: string; hours: number; isMandatory: boolean; assignmentType?: string; startDate?: string; endDate?: string }[];
  noticeNumber: string;
  onClose: () => void;
  onContinue?: () => void;
  organization?: { ministry: string; province: string; office: string };
}

export default function PrintNotice({ person, school, allAssignments, noticeNumber, onClose, onContinue, organization }: Props) {
  const persianDate = new Date().toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  const finalNumber = noticeNumber || `3124/${Math.floor(1000 + Math.random() * 9000)}`;
  const totalHours = allAssignments.reduce((s, a) => s + a.hours, 0);

  const hoursBySchool: Record<string, { name: string; h: number }> = {};
  allAssignments.forEach(a => {
    const k = a.schoolName;
    if (!hoursBySchool[k]) hoursBySchool[k] = { name: k, h: 0 };
    hoursBySchool[k].h += a.hours;
  });
  const mainSchool = Object.values(hoursBySchool).sort((a, b) => b.h - a.h)[0]?.name || school.name;

  const M = organization?.ministry || 'وزارت آموزش و پرورش';
  const P = organization?.province || 'استان چهارمحال و بختیاری';
  const O = organization?.office || 'اداره آموزش و پرورش شهرستان سامان';

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return alert('لطفاً popup را فعال کنید.');

    const n = allAssignments.length;
    // Dynamic font sizes based on number of assignments
    const hdrF = n <= 2 ? 14 : n <= 4 ? 12 : 10;   // header
    const subF = n <= 2 ? 12 : n <= 4 ? 11 : 9;     // sub-header
    const offF = n <= 2 ? 11 : n <= 4 ? 10 : 8;     // office
    const titF = n <= 2 ? 15 : n <= 4 ? 13 : 11;    // title
    const infoF = n <= 2 ? 11 : n <= 4 ? 10 : 8;    // info table
    const tblF = n <= 2 ? 11 : n <= 4 ? 9 : 7;      // assignments table
    const sigF = n <= 2 ? 9 : n <= 4 ? 8 : 7;       // signature
    const pad = n <= 2 ? 3 : n <= 4 ? 2 : 1;        // cell padding
    const sigMT = n <= 2 ? 16 : n <= 4 ? 12 : 8;    // signature margin-top
    const dateCol = allAssignments.some(a => a.startDate || a.endDate);

    const rows = allAssignments.map((a, i) =>
      `<tr><td style="border:1px solid #888;padding:${pad}px 4px;text-align:center">${i+1}</td>` +
      `<td style="border:1px solid #888;padding:${pad}px 4px">${a.schoolName}${a.schoolCode ? ` (${a.schoolCode})` : ''}</td>` +
      `<td style="border:1px solid #888;padding:${pad}px 4px">${a.subject}</td>` +
      `<td style="border:1px solid #888;padding:${pad}px 4px;text-align:center">${a.grade}</td>` +
      `<td style="border:1px solid #888;padding:${pad}px 4px;text-align:center;font-weight:bold">${a.hours}</td>` +
      `<td style="border:1px solid #888;padding:${pad}px 4px;text-align:center">${a.assignmentType || (a.isMandatory?'موظف':'غیرموظف')}</td>` +
      (dateCol ? `<td style="border:1px solid #888;padding:${pad}px 4px;text-align:center;font-size:${tblF-1}px">${a.startDate||''} ${a.endDate ? '- '+a.endDate : ''}</td>` : '') +
      `</tr>`
    ).join('');

    const thStyle = `border:1px solid #888;padding:${pad}px 4px;background:#d1d5db;font-weight:bold;text-align:center`;
    const dateTH = dateCol ? `<th style="${thStyle}">مدت</th>` : '';
    const colSpan = dateCol ? 4 : 3;

    const copyHTML = (label: string) => `
<div style="width:184mm;height:93mm;margin:0 auto;padding:6px 10px;border-bottom:2px dashed #999;position:relative;box-sizing:border-box;overflow:hidden">
  <div style="position:absolute;top:4px;left:10px;font-size:${sigF}px;color:#1e40af;border:1px solid #1e40af;padding:1px 6px;border-radius:3px;font-weight:bold">${label}</div>
  <div style="text-align:center;margin-bottom:3px">
    <div style="font-size:${hdrF}px;font-weight:bold;margin:0">${M}</div>
    <div style="font-size:${subF}px;margin:1px 0">${P}</div>
    <div style="font-size:${offF}px;margin:0;color:#333">${O}</div>
  </div>
  <div style="text-align:center;border-top:2px solid #000;border-bottom:2px solid #000;padding:3px 0;margin:2px 0">
    <span style="font-size:${titF}px;font-weight:bold">ابلاغ سال تحصیلی 1406-1405</span>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:${infoF}px;margin:3px 0">
    <tr>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold;width:15%">شماره</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;width:35%">${finalNumber}</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold;width:15%">تاریخ</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;width:35%">${persianDate}</td>
    </tr>
    <tr>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold">نام و نام خانوادگی</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;font-weight:bold">${person.firstName} ${person.lastName}</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold">کد ملی</td>
      <td style="border:1px solid #666;padding:${pad}px 5px">${person.nationalCode||'—'}</td>
    </tr>
    <tr>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold">رشته به کارگیری</td>
      <td style="border:1px solid #666;padding:${pad}px 5px">${person.field}</td>
      <td style="border:1px solid #666;padding:${pad}px 5px;background:#eee;font-weight:bold">واحد سازمانی اصلی</td>
      <td style="border:1px solid #666;padding:${pad}px 5px">${mainSchool}</td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;font-size:${tblF}px;margin:2px 0">
    <thead><tr><th style="${thStyle}">#</th><th style="${thStyle}">مدرسه (کد)</th><th style="${thStyle}">درس</th><th style="${thStyle}">پایه</th><th style="${thStyle}">ساعت</th><th style="${thStyle}">نوع ابلاغ</th>${dateTH}</tr></thead>
    <tbody>${rows}
      <tr><td colspan="${colSpan + 1}" style="border:1px solid #888;padding:${pad}px 4px;font-weight:bold;text-align:left;font-size:${tblF+1}px">مجموع ساعات</td>
      <td colspan="${dateCol ? 3 : 2}" style="border:1px solid #888;padding:${pad}px 4px;font-weight:bold;color:#1e40af;font-size:${tblF+2}px;text-align:center">${totalHours} ساعت</td></tr>
    </tbody>
  </table>
  <div style="display:flex;justify-content:space-between;margin-top:${sigMT > 8 ? 4 : 2}px;text-align:center">
    <div style="width:30%"><div style="border-top:1.5px solid #333;margin-top:${sigMT}px;padding-top:2px;font-size:${sigF}px">امضاء ابلاغ‌گیرنده</div></div>
    <div style="width:30%"><div style="border-top:1.5px solid #333;margin-top:${sigMT}px;padding-top:2px;font-size:${sigF}px">امضاء مدیر مدرسه</div></div>
    <div style="width:30%"><div style="border-top:1.5px solid #333;margin-top:${sigMT}px;padding-top:2px;font-size:${sigF}px">امضاء رئیس اداره</div></div>
  </div>
</div>`;

    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>ابلاغ ${person.firstName} ${person.lastName}</title>
<style>@page{margin:0;size:A4 portrait}body{font-family:Tahoma,Arial,sans-serif;direction:rtl;margin:0;padding:0}td,th{line-height:1.4}</style>
</head><body>${copyHTML('نسخه معلم')}${copyHTML('نسخه مدیر')}${copyHTML('نسخه اداره')}</body></html>`);
    w.document.close();
    setTimeout(() => { (window as any).__allowPrint = true; w.focus(); w.print(); (window as any).__allowPrint = false; }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">🖨️ چاپ ابلاغ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-4 border text-center">
            <div className="font-bold text-sm">{M}</div>
            <div className="text-xs text-gray-500">{P}</div>
            <div className="text-xs text-gray-500">{O}</div>
            <div className="border-t border-b py-2 my-2 font-bold">ابلاغ سال تحصیلی 1406-1405</div>
            <div className="grid grid-cols-2 gap-1 text-xs text-right">
              <div>نیرو: <strong>{person.firstName} {person.lastName}</strong></div>
              <div>واحد اصلی: <strong>{mainSchool}</strong></div>
              <div>رشته: <strong>{person.field}</strong></div>
              <div>شماره: <strong>{finalNumber}</strong></div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
            <strong className="text-blue-700">📋 ابلاغ‌ها ({totalHours} ساعت):</strong>
            <div className="mt-2 space-y-1">
              {allAssignments.map(a => (
                <div key={a.id} className="flex justify-between bg-white rounded px-2 py-1 border border-blue-100 text-blue-800">
                  <span>{a.schoolName}{a.schoolCode ? ` (${a.schoolCode})` : ''} - {a.subject} ({a.grade})</span>
                  <span className="flex gap-2">
                    <span>{a.hours}س</span>
                    <span className={`px-1 rounded text-[9px] ${a.assignmentType === 'تدریس عوامل اجرایی' ? 'bg-purple-100 text-purple-700' : a.isMandatory ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.assignmentType || (a.isMandatory ? 'موظف' : 'غیرموظف')}
                    </span>
                    {a.startDate && <span className="text-[9px] text-gray-400">{a.startDate}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">⚠️ سه نسخه عمودی A4 با نقطه چین</div>
          
          {/* Completion status */}
          {person.isLocked ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              ✅ ابلاغ این نیرو <strong>تکمیل</strong> شده است. ({totalHours} ساعت از {person.maxHours} ساعت موظف)
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
              ⏳ ابلاغ ناقص: {person.maxHours - person.assignedHours} ساعت کسری برای تکمیل وجود دارد.
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handlePrint} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">🖨️ چاپ</button>
          {onContinue && !person.isLocked && (
            <button onClick={() => { onClose(); onContinue(); }} className="px-4 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm">➕ ثبت ابلاغ بیشتر</button>
          )}
          <button onClick={onClose} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">بستن</button>
        </div>
      </div>
    </div>
  );
}
