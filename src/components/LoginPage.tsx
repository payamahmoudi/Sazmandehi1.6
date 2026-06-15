import { useState } from 'react';

interface Props {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; message: string }>;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    document.documentElement.classList.remove('dark');
    const result = await onLogin(username, password);
    setMessage(result.message);
    setLoading(false);
  };

  return (
    <div className={`min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 md:p-6 ${loading ? 'opacity-50' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#4f46e5_0,transparent_34%),radial-gradient(circle_at_bottom_right,#0f766e_0,transparent_30%)] opacity-40" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 text-3xl shadow-lg shadow-indigo-500/30">🎓</div>
          <h1 className="text-2xl font-bold">سامانه ساماندهی سال 1406-1405</h1>
          <p className="mt-2 text-sm text-slate-300">ورود کاربران</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">نام کاربری</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/90 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="نام کاربری"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/90 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="رمز عبور"
            />
          </div>
          {message && <div className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-100">{message}</div>}
          <button className="w-full rounded-xl bg-indigo-500 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400">
            ورود به سامانه
          </button>
        </form>

        <div className="mt-6 rounded-2xl bg-slate-900/60 p-4 text-xs text-slate-300 text-center">
          <div className="text-slate-400">برای دریافت دسترسی با مدیر سامانه تماس بگیرید.</div>
        </div>
      </div>
    </div>
  );
}