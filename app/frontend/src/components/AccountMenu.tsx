import { useState } from 'react';
import { LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/lingguang';
import { logoutAccount } from '@/lib/independentAuth';
import './AccountMenu.css';

export interface AccountProfile {
  id: string;
  email: string;
  name?: string | null;
}

export default function AccountMenu({ profile, busy }: { profile: AccountProfile; busy: boolean }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const logout = async () => {
    if (busy || loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutAccount();
      window.location.reload();
    } catch (error) {
      toast.error(errorMessage(error));
      setLoggingOut(false);
    }
  };

  return <div className="account-menu" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.stopPropagation(); } }}>
    <button className="user-button" aria-label="查看我的账号信息" aria-expanded={open} aria-controls="account-info" onClick={() => setOpen(true)}><User size={18} /></button>
    {open && <section className="account-panel" id="account-info" aria-label="我的账号信息">
      <div className="account-panel-heading"><span><User size={19} /></span><div><strong>{profile.name?.trim() || '灵光用户'}</strong><small>已登录</small></div></div>
      <dl><dt>账号邮箱</dt><dd>{profile.email || '未提供邮箱'}</dd></dl>
      <button className="account-logout" onClick={() => void logout()} disabled={busy || loggingOut}><LogOut size={15} />{loggingOut ? '正在退出…' : '退出登录'}</button>
    </section>}
  </div>;
}
