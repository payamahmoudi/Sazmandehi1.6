import { useState } from 'react';
import { UserAccount, AccessTab } from '../types';

interface Props {
  users: UserAccount[];
  currentUser: UserAccount;
  onAddUser: (input: any) => Promise<{ ok: boolean; message: string }>;
  onUpdateUser: (userId: string, updates: any) => Promise<void> | void;
  onRemoveUser: (userId: string) => Promise<{ ok: boolean; message: string }>;
  onImpersonate?: (userId: string) => void;
}

const ALL_TABS: { id: AccessTab; label: string }[] = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'schools', label: 'مدارس' },
  { id: 'personnel', label: 'نیروها' },
  { id: 'assignments', label: 'ابلاغ‌ها' },
  { id: 'analysis', label: 'تحلیل دروس' },
  { id: 'reports', label: 'گزارشات' },
  { id: 'schedule', label: 'برنامه هفتگی' },
  { id: 'import', label: 'ورود/خروج' },
  { id: 'history', label: 'تاریخچه' },
];

export default function AdminPanel({ users, currentUser, onAddUser, onUpdateUser, onRemoveUser, onImpersonate }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [panelTitle, setPanelTitle] = useState('پنل اختصاصی ساماندهی');
  const [role, setRole] = useState<UserAccount['role']>('user');
  const [expirationDays, setExpirationDays] = useState(30);
  const [province, setProvince] = useState('چهارمحال و بختیاری');
  const [office, setOffice] = useState('شهرستان سامان');
  const [message, setMessage] = useState('');
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [newPassword1, setNewPassword1] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [allowedTabs, setAllowedTabs] = useState<AccessTab[]>(['dashboard', 'reports']);
  const [editingAccessUserId, setEditingAccessUserId] = useState<string | null>(null);

  const createUser = async () => {
    if (!username || !password || !fullName) {
      setMessage('نام، نام کاربری و رمز عبور الزامی است.');
      return;
    }
    const result = await onAddUser({
      username, password, full_name: fullName, panel_title: panelTitle, role, is_active: true,
      expiration_days: expirationDays > 0 ? expirationDays : undefined,
      allowed_tabs: role === 'admin' ? undefined : allowedTabs,
      province,
      office,
    });
    setMessage(result.message);
    if (result.ok) {
      setUsername(''); setPassword(''); setFullName('');
      setPanelTitle('پنل اختصاصی ساماندهی'); setRole('user');
      setAllowedTabs(['dashboard', 'reports']);
    }
  };

  const changePassword = () => {
    if (!newPassword1 || newPassword1 !== newPassword2) {
      setMessage('رمز عبور جدید و تکرار آن باید یکسان باشد.');
      return;
    }
    if (newPassword1.length < 6) {
      setMessage('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }
    onUpdateUser(currentUser.id, { password: newPassword1 });
    setMessage('✅ رمز عبور با موفقیت تغییر کرد.');
    setNewPassword1(''); setNewPassword2('');
    setChangePasswordVisible(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-xl font-bold">🔐 پنل مدیریت کاربران</h2>
        <p className="mt-2 text-sm text-slate-300">مدیریت کاربران، سطح دسترسی، تمدید و تنظیمات</p>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700">👤 {currentUser.fullName} - تغییر رمز عبور</h3>
          <button onClick={() => setChangePasswordVisible(!changePasswordVisible)} className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">
            {changePasswordVisible ? '❌ بستن' : '🔑 تغییر رمز'}
          </button>
        </div>
        {changePasswordVisible && (
          <div className="flex flex-wrap gap-3 items-end">
            <input type="password" value={newPassword1} onChange={e => setNewPassword1(e.target.value)} placeholder="رمز عبور جدید" className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1" />
            <input type="password" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} placeholder="تکرار رمز" className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1" />
            <button onClick={changePassword} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">ذخیره</button>
          </div>
        )}
      </div>

      {/* Create User */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">➕ ایجاد کاربر جدید</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="نام و نام خانوادگی" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="نام کاربری" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="رمز عبور" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={panelTitle} onChange={e => setPanelTitle(e.target.value)} placeholder="عنوان پنل" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={province} onChange={e => setProvince(e.target.value)} placeholder="استان" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={office} onChange={e => setOffice(e.target.value)} placeholder="منطقه/شهرستان" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input type="number" value={expirationDays} onChange={e => setExpirationDays(parseInt(e.target.value) || 0)} placeholder="مدت اعتبار (روز)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <select value={role} onChange={e => setRole(e.target.value as UserAccount['role'])} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="user">کاربر عادی</option>
            <option value="admin">مدیر سامانه</option>
          </select>
        </div>

        {/* Access tabs for new user */}
        {role === 'user' && (
          <div className="mt-3 border border-gray-200 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-600 mb-2 block">سطح دسترسی کاربر:</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TABS.map(tab => (
                <button key={tab.id} type="button" onClick={() => {
                  setAllowedTabs(prev => prev.includes(tab.id) ? prev.filter(t => t !== tab.id) : [...prev, tab.id]);
                }} className={`px-2 py-1 rounded text-[10px] border transition-colors ${allowedTabs.includes(tab.id) ? 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {allowedTabs.includes(tab.id) ? '✓' : '✕'} {tab.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">بخش‌هایی که سبز هستند برای کاربر قابل مشاهده خواهند بود.</p>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button onClick={createUser} className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">ثبت کاربر</button>
          {message && <span className="text-sm text-gray-500">{message}</span>}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm overflow-x-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">فهرست کاربران</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-2 text-right text-gray-600 text-xs">نام</th>
              <th className="py-2 px-2 text-right text-gray-600 text-xs">کاربری</th>
              <th className="py-2 px-2 text-right text-gray-600 text-xs">استان / منطقه</th>
              <th className="py-2 px-2 text-center text-gray-600 text-xs">نقش</th>
              <th className="py-2 px-2 text-center text-gray-600 text-xs">اعتبار</th>
              <th className="py-2 px-2 text-center text-gray-600 text-xs">دسترسی</th>
              <th className="py-2 px-2 text-center text-gray-600 text-xs">فعال</th>
              <th className="py-2 px-2 text-center text-gray-600 text-xs">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const isMaster = user.id === 'admin-master-paya';
              const userTabs = user.allowedTabs || (user.role === 'admin' ? ALL_TABS.map(t => t.id) : ['dashboard', 'reports']);
              return (
                <tr key={user.id} className={`border-t border-gray-50 ${isMaster ? 'bg-indigo-50' : ''}`}>
                  <td className="py-2 px-2"><input value={user.fullName} onChange={e => onUpdateUser(user.id, { fullName: e.target.value })} className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs" disabled={isMaster} /></td>
                  <td className="py-2 px-2"><input value={user.username} onChange={e => onUpdateUser(user.id, { username: e.target.value })} className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs" disabled={isMaster} /></td>
                  <td className="py-2 px-2 text-[10px]">
                    <input value={user.organization?.province?.replace('استان ', '') || ''} onChange={e => onUpdateUser(user.id, { organization: { ...user.organization!, province: `استان ${e.target.value}` } })} placeholder="استان" className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] mb-0.5" />
                    <input value={user.organization?.office?.replace('اداره آموزش و پرورش ', '') || ''} onChange={e => onUpdateUser(user.id, { organization: { ...user.organization!, office: `اداره آموزش و پرورش ${e.target.value}` } })} placeholder="منطقه" className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px]" />
                  </td>
                  <td className="py-2 px-2 text-center">
                    <select value={user.role} onChange={e => onUpdateUser(user.id, { role: e.target.value as UserAccount['role'] })} className="px-1 py-0.5 border border-gray-200 rounded bg-white text-[10px]" disabled={isMaster}>
                      <option value="user">کاربر</option>
                      <option value="admin">مدیر</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <input type="number" value={user.expirationDays || 0} onChange={e => onUpdateUser(user.id, { expirationDays: parseInt(e.target.value) || 0 })} className="w-12 px-1 py-0.5 border border-gray-200 rounded text-center text-[10px]" disabled={isMaster} />
                  </td>
                  <td className="py-2 px-2 text-center">
                    {isMaster ? (
                      <span className="text-[10px] text-indigo-500">🔒 همه</span>
                    ) : (
                      <button onClick={() => setEditingAccessUserId(editingAccessUserId === user.id ? null : user.id)} className="text-[10px] text-indigo-600 hover:text-indigo-800">
                        ⚙️ تنظیم ({userTabs.length}/{ALL_TABS.length})
                      </button>
                    )}
                    {editingAccessUserId === user.id && !isMaster && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {ALL_TABS.map(tab => (
                          <button key={tab.id} type="button" onClick={() => {
                            const current = user.allowedTabs || ['dashboard', 'reports'];
                            const updated = current.includes(tab.id) ? current.filter(t => t !== tab.id) : [...current, tab.id];
                            onUpdateUser(user.id, { allowedTabs: updated });
                          }} className={`px-1 py-0.5 rounded text-[9px] border ${userTabs.includes(tab.id) ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-50 border-red-200 text-red-400'}`}>
                            {userTabs.includes(tab.id) ? '✓' : '✕'} {tab.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button onClick={() => onUpdateUser(user.id, { isActive: !user.isActive })} disabled={isMaster} className={`px-2 py-0.5 rounded-full text-[10px] ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} disabled:opacity-50`}>
                      {user.isActive ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex gap-1 justify-center">
                      {onImpersonate && !isMaster && user.id !== currentUser.id && (
                        <button onClick={() => onImpersonate(user.id)} className="text-indigo-500 hover:text-indigo-700 text-[10px]" title="مشاهده پنل کاربر">👁️ پنل</button>
                      )}
                      <button onClick={async () => { if (confirm(`حذف ${user.fullName}?`)) { const r = await onRemoveUser(user.id); setMessage(r.message); } }} disabled={isMaster} className="text-red-500 disabled:opacity-30 text-[10px]">حذف</button>
                    </div>
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
