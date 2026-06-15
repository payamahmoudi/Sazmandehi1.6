import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import Dashboard from './components/Dashboard';
import SchoolsManager from './components/SchoolsManager';
import PersonnelManager from './components/PersonnelManager';
import AssignmentManager from './components/AssignmentManager';
import SubjectAnalysis from './components/SubjectAnalysis';
import ImportExport from './components/ImportExport';
import LoginPage from './components/LoginPage';
import AdminPanel from './components/AdminPanel';
import RegulationsModal from './components/RegulationsModal';
import Reports from './components/Reports';
import ScheduleManager from './components/ScheduleManager';
import { useAuth } from './auth/useAuth';
import { useHistory } from './store/useHistory';
import BackupManager from './components/BackupManager';
import { AccessTab } from './types';

type TabType = 'dashboard' | 'schools' | 'personnel' | 'assignments' | 'analysis' | 'import' | 'admin' | 'history' | 'reports' | 'schedule';

const allTabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: '📊' },
  { id: 'schools', label: 'مدارس', icon: '🏫' },
  { id: 'personnel', label: 'نیروها', icon: '👥' },
  { id: 'assignments', label: 'ابلاغ‌ها', icon: '📝' },
  { id: 'analysis', label: 'تحلیل دروس', icon: '📈' },
  { id: 'reports', label: 'گزارشات', icon: '📋' },
  { id: 'schedule', label: 'برنامه هفتگی', icon: '📅' },
  { id: 'import', label: 'ورود/خروج', icon: '📂' },
  { id: 'history', label: 'تاریخچه', icon: '🕐' },
];

function usePersianDate() {
  const [dateStr, setDateStr] = useState('');
  useEffect(() => {
    const update = () => {
      setDateStr(new Date().toLocaleDateString('fa-IR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);
  return dateStr;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showRegulations, setShowRegulations] = useState(false);
  const auth = useAuth();
  const persianDate = usePersianDate();
  // Filter tabs based on user access
  const userAllowedTabs = auth.currentUser?.allowedTabs as AccessTab[] | undefined;
  const isAdmin = auth.currentUser?.role === 'admin';
  
  const tabs = isAdmin
    ? [...allTabs, { id: 'admin' as TabType, label: 'مدیریت کاربران', icon: '🔐' }]
    : allTabs.filter(t => !userAllowedTabs || userAllowedTabs.includes(t.id as AccessTab));

  const store = useStore(auth.currentUser?.id || 'guest');
  const history = useHistory(auth.currentUser?.id || 'guest');

  // Warn before closing browser
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'آیا مطمئن هستید؟ در صورت خروج بدون پشتیبان‌گیری، داده‌ها ممکن است از دست برود.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Auto logout after 30 minutes inactivity
  useEffect(() => {
    let timeoutId: number;
    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        alert('به دلیل ۳۰ دقیقه عدم فعالیت، برای حفظ امنیت از سامانه خارج شدید.');
        auth.logout();
      }, 30 * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      window.clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [auth]);

  // Wrap store actions with history logging
  const loggedAddAssignment = (...args: Parameters<typeof store.addAssignment>) => {
    const person = store.personnel.find(p => p.id === args[0]);
    const school = store.schools.find(s => s.id === args[1]);
    history.addEntry('ثبت ابلاغ', `${person?.firstName} ${person?.lastName} → ${school?.name} | ${args[2]} | ${args[3]} ساعت`);
    store.addAssignment(...args);
  };
  const loggedRemoveAssignment = (...args: Parameters<typeof store.removeAssignment>) => {
    const person = store.personnel.find(p => p.id === args[0]);
    history.addEntry('حذف ابلاغ', `${person?.firstName} ${person?.lastName}`);
    store.removeAssignment(...args);
  };

  const loggedAddPersonnel = (...args: Parameters<typeof store.addPersonnel>) => {
    history.addEntry('افزودن نیرو', `${args[0].firstName} ${args[0].lastName}`);
    store.addPersonnel(...args);
  };
  const loggedRemovePersonnel = (...args: Parameters<typeof store.removePersonnel>) => {
    const person = store.personnel.find(p => p.id === args[0]);
    history.addEntry('حذف نیرو', `${person?.firstName} ${person?.lastName}`);
    store.removePersonnel(...args);
  };
  const loggedAssignManager = (...args: Parameters<typeof store.assignManager>) => {
    const person = store.personnel.find(p => p.id === args[1]);
    const school = store.schools.find(s => s.id === args[0]);
    history.addEntry('انتصاب مدیر', `${person?.firstName} ${person?.lastName} → ${school?.name}`);
    store.assignManager(...args);
  };
  const loggedAssignExecutiveRole = (...args: Parameters<typeof store.assignExecutiveRole>) => {
    const person = store.personnel.find(p => p.id === args[1]);
    const school = store.schools.find(s => s.id === args[0]);
    history.addEntry(`انتصاب ${args[3]}`, `${person?.firstName} ${person?.lastName} → ${school?.name}`);
    store.assignExecutiveRole(...args);
  };

  const isDark = auth.theme === 'dark';
  const minBg = isDark ? 'bg-slate-900' : 'bg-slate-50';

  // Apply dark class to html element for global CSS
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (auth.loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">🎓</div>
          <p className="text-slate-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!auth.currentUser) {
    return <LoginPage onLogin={auth.login} />;
  }

  return (
    <div className={`flex min-h-screen w-full ${minBg} transition-colors duration-200`}>
      {/* Impersonation banner */}
      {auth.impersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-purple-600 text-white px-4 py-2 text-center text-sm flex justify-between items-center">
          <span>👁️ در حال مشاهده پنل: <strong>{auth.impersonating.fullName}</strong></span>
          <button onClick={auth.stopImpersonating} className="px-3 py-1 bg-white text-purple-700 rounded text-xs font-bold hover:bg-purple-100">
            ↩ بازگشت به پنل مدیر
          </button>
        </div>
      )}
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0 md:w-16'} bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-300 flex flex-col fixed h-full z-40 overflow-hidden`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-lg shadow-lg flex-shrink-0">
              🎓
            </div>
            {sidebarOpen && (
              <div className="animate-fade-in">
                <h1 className="font-bold text-sm leading-tight">سامانه ساماندهی</h1>
                <p className="text-[10px] text-slate-400">نظام ساماندهی نیروی انسانی</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span className="text-lg flex-shrink-0">{tab.icon}</span>
              {sidebarOpen && <span className="animate-fade-in">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* Toggle */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors text-sm"
          >
            <span className={`transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}`}>◀</span>
            {sidebarOpen && <span>بستن منو</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? 'md:mr-64' : 'md:mr-16'} ${auth.impersonating ? 'pt-10' : ''}`}>
        {/* Top Bar */}
        <header className="bg-white border-gray-100 border-b px-3 md:px-6 py-3 sticky top-0 z-20 shadow-sm transition-colors">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              {/* Mobile menu button */}
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <span className="text-xl md:text-2xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
              <div className="min-w-0">
                <h2 className="font-bold text-gray-800 text-sm md:text-base truncate">{tabs.find(t => t.id === activeTab)?.label}</h2>
                <p className="text-[10px] md:text-xs text-gray-400 truncate">{persianDate} | {auth.currentUser.panelTitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
              <button onClick={() => setShowRegulations(true)} className="hidden md:block rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100">
                📋 ضوابط
              </button>
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>{store.personnel.length} نیرو</span>
                <span className="text-gray-300">|</span>
                <span>{store.schools.length} مدرسه</span>
              </div>
              <div className="hidden md:block bg-gradient-to-r from-indigo-50 to-purple-50 px-2 py-1 rounded-lg">
                <span className="text-[10px] md:text-xs font-medium text-indigo-700">{auth.currentUser.fullName}</span>
              </div>
              <button onClick={() => auth.changeTheme(auth.theme === 'dark' ? 'light' : 'dark')}
                className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">
                {isDark ? '☀️' : '🌙'}
              </button>
              <button
                onClick={() => {
                  if (confirm('آیا از خروج مطمئن هستید؟\n\n⚠️ قبل از خروج، از بخش «ورود/خروج» پشتیبان بگیرید تا داده‌ها از دست نرود.')) {
                    auth.logout();
                  }
                }}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                خروج
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-3 md:p-6 animate-fade-in">
          {activeTab === 'dashboard' && (
            <Dashboard schools={store.schools} personnel={store.personnel} />
          )}
          {activeTab === 'schools' && (
            <SchoolsManager
              schools={store.schools}
              personnel={store.personnel}
              onUpdateSchools={(newSchools) => {
                if (newSchools.length > store.schools.length) history.addEntry('افزودن مدرسه', newSchools[newSchools.length - 1]?.name || '');
                else if (newSchools.length < store.schools.length) history.addEntry('حذف مدرسه', '');
                else history.addEntry('ویرایش مدارس', '');
                store.updateSchools(newSchools);
              }}
              onAssignManager={loggedAssignManager}
              onAssignAssistant={store.assignAssistant}
              onAssignExecutiveRole={(schoolId, personnelId, roleKey, roleLabel) => loggedAssignExecutiveRole(schoolId, personnelId, roleKey as any, roleLabel)}
            />
          )}
          {activeTab === 'personnel' && (
            <PersonnelManager
              personnel={store.personnel}
              schools={store.schools}
              subjectRequirements={store.subjectRequirements}
              balanceRecords={store.balanceRecords}
              onUpdatePersonnel={store.updatePersonnel}
              onAddPersonnel={loggedAddPersonnel}
              onRemovePersonnel={loggedRemovePersonnel}
              onRemoveAssignment={loggedRemoveAssignment}
              onAddAssignment={loggedAddAssignment}
            />
          )}
          {activeTab === 'assignments' && (
            <AssignmentManager
              schools={store.schools}
              personnel={store.personnel}
              subjectRequirements={store.subjectRequirements}
              onAddAssignment={loggedAddAssignment}
              onRemoveAssignment={loggedRemoveAssignment}
              onEditAssignment={store.editAssignment}
              organization={auth.currentUser.organization}
            />
          )}
          {activeTab === 'analysis' && (
            <SubjectAnalysis
              schools={store.schools}
              personnel={store.personnel}
              subjectRequirements={store.subjectRequirements}
              balanceRecords={store.balanceRecords}
            />
          )}
          {activeTab === 'import' && (
            <>
              <ImportExport
                schools={store.schools}
                personnel={store.personnel}
                balanceRecords={store.balanceRecords}
                onImport={store.importData}
                onReset={store.resetData}
              />
              <div className="mt-6">
                <BackupManager userId={auth.currentUser.id} userName={auth.currentUser.fullName} userLogin={auth.currentUser.username} isAdmin={auth.currentUser.id === 'admin-master-paya'} />
              </div>
            </>
          )}
          {activeTab === 'admin' && auth.currentUser.role === 'admin' && (
            <AdminPanel
              users={auth.users}
              currentUser={auth.currentUser}
              onAddUser={auth.addUser}
              onUpdateUser={auth.updateUser}
              onRemoveUser={auth.removeUser}
              onImpersonate={auth.impersonate}
            />
          )}
          {activeTab === 'reports' && (
            <Reports schools={store.schools} personnel={store.personnel} />
          )}
          {activeTab === 'schedule' && (
            <ScheduleManager
              schools={store.schools}
              personnel={store.personnel}
              scheduleEntries={store.scheduleEntries}
              onUpdateScheduleEntries={store.updateScheduleEntries}
            />
          )}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">🕐 آخرین تغییرات سامانه</h3>
                  {history.entries.length > 0 && (
                    <button onClick={() => { if (confirm('تمام سوابق پاک شود؟')) history.clearHistory(); }} className="text-xs text-red-400 hover:text-red-600">🗑️ پاک کردن همه</button>
                  )}
                </div>
                {history.entries.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">هیچ سابقه‌ای ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2">
                    {history.entries.map(entry => {
                      const d = new Date(entry.timestamp);
                      const dateStr = d.toLocaleDateString('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={entry.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">{entry.action}</span>
                              <span className="text-[10px] text-gray-400">{dateStr}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{entry.detail}</p>
                          </div>
                          <div className="flex gap-1 mr-3">
                            {(
                              <button onClick={() => {
                                if (confirm('بازگشت به این نقطه؟')) {
                                  history.undoEntry(entry.id);
                                }
                              }} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] hover:bg-amber-200">↩ بازگشت</button>
                            )}
                            <button onClick={() => history.removeEntry(entry.id)} className="px-2 py-1 bg-red-50 text-red-400 rounded text-[10px] hover:bg-red-100">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                ⚠️ بازگشت به هر نقطه، تمام تغییرات بعد از آن را حذف می‌کند. حداکثر ۵۰ سابقه اخیر ذخیره می‌شود.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-100 bg-white px-3 md:px-6 py-3 text-center text-[10px] md:text-xs text-gray-400">
          سامانه ساماندهی نیروی انسانی - سال تحصیلی 1406-1405 | طراح: پایا محمودی
        </footer>
      </main>



      {showRegulations && <RegulationsModal onClose={() => setShowRegulations(false)} />}
    </div>
  );
}
