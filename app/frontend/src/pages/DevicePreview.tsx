import { useEffect, useState } from 'react';
import { readPreview } from '@/lib/devicePreview';
import { errorMessage, safePreview } from '@/lib/lingguang';
import './device-preview.css';

export default function DevicePreview() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const token = window.location.hash.slice(1);
    setHtml(''); setError('');
    const load = async () => {
      try {
        if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('预览链接无效，请扫描完整二维码。');
        const content = await readPreview(token);
        if (!disposed) { setHtml(content); timer = setTimeout(() => void load(), 30000); }
      } catch (value) {
        if (!disposed) { setHtml(''); setError(errorMessage(value)); }
      }
    };
    void load();
    return () => { disposed = true; clearTimeout(timer); };
  }, [attempt]);
  return <main className="device-preview-page">{html ? <iframe title="真机应用预览" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={safePreview(html)} /> : <section className="device-preview-state"><h1>灵光 · 真机预览</h1>{error ? <><p role="alert">{error}</p><button onClick={() => setAttempt(value => value + 1)}>重新加载</button></> : <p role="status">正在加载应用…</p>}<p>此页面仅用于预览分享的应用，不提供账号或项目访问。</p></section>}</main>;
}
