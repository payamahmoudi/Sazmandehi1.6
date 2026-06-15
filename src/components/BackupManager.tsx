import { useRef, useState } from 'react';
import { exportEncryptedBackup, importEncryptedBackup } from '../utils/crypto';

interface Props {
  userId: string;
  userName: string;
  userLogin?: string;
  isAdmin?: boolean;
}

export default function BackupManager({ userId, userName, userLogin, isAdmin }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);

  const handleExport = () => {
    exportEncryptedBackup(userId, userName, userLogin);
    setMessage('✅ فایل پشتیبان رمزنگاری‌شده دانلود شد.');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage('⏳ در حال بازیابی...');
    const result = await importEncryptedBackup(file, userId, userLogin);
    setMessage(result.message);
    setImporting(false);
    if (result.ok) {
      setTimeout(() => window.location.reload(), 1500);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">🔐 پشتیبان‌گیری رمزنگاری‌شده</h3>
      <p className="text-xs text-gray-500 mb-4">
        {isAdmin ? (
          <>فایل پشتیبان رمزنگاری شده است. به عنوان <strong>مدیر اصلی سامانه</strong> می‌توانید فایل پشتیبان <strong>تمام کاربران</strong> را باز و بازیابی کنید.</>
        ) : (
          <>فایل پشتیبان فقط با حساب کاربری <strong>{userName}</strong> قابل بازیابی است. هیچ‌کس دیگری (به جز مدیر اصلی سامانه) نمی‌تواند محتوای آن را بخواند.</>
        )}
      </p>

      <div className="flex flex-wrap gap-3 mb-3">
        <button onClick={handleExport} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2">
          📥 دانلود پشتیبان رمزنگاری‌شده
        </button>
        <input ref={fileRef} type="file" accept={`.saman${userLogin ? `,.${userLogin}` : ''}`} onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50">
          📤 بازیابی از فایل پشتیبان
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-2 text-sm ${message.includes('✅') || message.includes('موفقیت') ? 'bg-green-50 text-green-700 border border-green-200' : message.includes('⏳') ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="text-xs font-semibold text-slate-700 mb-2">📋 راهنمای پشتیبان‌گیری</h4>
        <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal list-inside">
          <li>بر روی دکمه <strong>«دانلود پشتیبان رمزنگاری‌شده»</strong> کلیک کنید.</li>
          <li>فایل پشتیبان را در محل امنی ذخیره کنید.</li>
          <li>برای بازیابی، فایل پشتیبان را بارگذاری کنید.</li>
        </ol>
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-700">
          ⚠️ <strong>نکات مهم:</strong>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            <li>فایل پشتیبان رمزنگاری شده و فقط با حساب شما{isAdmin ? ' یا مدیر اصلی سامانه' : ''} قابل باز شدن است.</li>
            <li>به صورت منظم پشتیبان بگیرید.</li>
            <li>هر کاربر فقط داده‌های خودش را می‌بیند و بازیابی می‌کند.</li>
            <li>قبل از بستن مرورگر یا خاموش کردن کامپیوتر، پشتیبان بگیرید.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
