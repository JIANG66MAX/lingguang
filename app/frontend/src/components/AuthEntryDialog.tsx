import { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/lingguang';
import { accountConfigured, loginAccount, registerAccount, loginUnifiedAccount } from '@/lib/independentAuth';
import './auth-entry.css';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }
export default function AuthEntryDialog({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setMode('login'); setPassword(''); setConfirmPassword(''); setError(''); setNotice(''); setConfigured(null);
    accountConfigured().then(value => { if (active) setConfigured(value); }).catch(() => { if (active) setError('无法检查账号服务状态，仍可提交重试。'); });
    return () => { active = false; };
  }, [open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (mode === 'register' && password !== confirmPassword) { setError('两次密码不一致。'); return; }
    lock.current = true; setPending(true); setError(''); setNotice('');
    try {
      if (mode === 'register') {
        const message = await registerAccount(email.trim(), password, confirmPassword);
        setNotice(message); setMode('login'); setPassword(''); setConfirmPassword('');
      } else {
        await loginAccount(email.trim(), password);
        setPassword(''); window.location.reload();
      }
    } catch (reason) { setError(errorMessage(reason)); }
    finally { lock.current = false; setPending(false); }
  };
  const unifiedLogin = async () => {
    if (lock.current) return;
    lock.current = true; setPending(true); setError(''); setNotice('');
    try { await loginUnifiedAccount(); }
    catch (reason) { setError(`无法打开统一认证页面：${errorMessage(reason)}`); }
    finally { lock.current = false; setPending(false); }
  };
  const switchMode = (next: 'login' | 'register') => { setMode(next); setPassword(''); setConfirmPassword(''); setError(''); setNotice(''); };
  return <Dialog open={open} onOpenChange={next => { if (!lock.current) { if (!next) { setPassword(''); setConfirmPassword(''); } onOpenChange(next); } }}>
    <DialogContent className="auth-entry-dialog">
      <DialogTitle>{mode === 'login' ? '登录灵光' : '注册灵光账号'}</DialogTitle>
      <DialogDescription>可使用灵光独立账号，或前往统一认证页面登录统一账号。</DialogDescription>
      <div className="auth-entry-modes" role="group" aria-label="选择登录或注册">
        <button type="button" aria-pressed={mode === 'login'} disabled={pending} onClick={() => switchMode('login')}><LogIn size={18} />登录</button>
        <button type="button" aria-pressed={mode === 'register'} disabled={pending} onClick={() => switchMode('register')}><UserPlus size={18} />注册</button>
      </div>
      <button type="button" className="auth-entry-continue" disabled={pending} onClick={() => void unifiedLogin()}><LogIn size={16} />统一账号登录</button>
      <p className="auth-entry-note">此按钮前往统一认证页面完成登录，使用统一账号自己的创作数据，不与下方独立账号合并。</p>
      <form className="auth-entry-form" onSubmit={event => void submit(event)}>
        <label htmlFor="auth-email">邮箱<input id="auth-email" type="email" autoComplete="email" maxLength={254} required disabled={pending} value={email} onChange={event => setEmail(event.target.value)} placeholder="输入邮箱地址" /></label>
        <label htmlFor="auth-password">密码<input id="auth-password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : 1} maxLength={128} required disabled={pending} value={password} onChange={event => setPassword(event.target.value)} placeholder={mode === 'register' ? '至少8位，需符合安全强度规则' : '输入密码'} /></label>
        {mode === 'register' && <label htmlFor="auth-confirm">确认密码<input id="auth-confirm" type="password" autoComplete="new-password" maxLength={128} required disabled={pending} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="再次输入密码" /></label>}
        <p className="auth-entry-note">新账号从空白创作空间开始。即使邮箱相同，也不会继承原统一账号的项目、对话或个人算力密钥。密码由独立认证服务管理，不存入灵光数据库。</p>
        {configured === false && <p className="auth-entry-error" role="status">独立账号服务尚未配置，请管理员补充 Auth0 配置后使用。</p>}
        {error && <p className="auth-entry-error" role="alert">{error}</p>}
        {notice && <p className="auth-entry-notice" role="status">{notice}</p>}
        <button type="submit" className="auth-entry-continue" disabled={pending}>{pending && <Loader2 size={16} className="spin" />}{pending ? '正在处理…' : mode === 'login' ? '登录' : '创建灵光账号'}</button>
      </form>
    </DialogContent>
  </Dialog>;
}
