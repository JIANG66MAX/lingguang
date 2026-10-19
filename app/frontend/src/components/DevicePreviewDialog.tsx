import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createPreview, revokePreview } from '@/lib/devicePreview';
import { errorMessage } from '@/lib/lingguang';
import '@/pages/device-preview.css';

export default function DevicePreviewDialog({ versionId, blockedReason }: { versionId: number; blockedReason?: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const reason = blockedReason || (versionId <= 0 ? '请先生成并保存应用版本，再创建预览二维码。' : '');
  const create = async () => {
    if (busy || reason) return;
    setBusy(true); setError(''); setNotice('');
    try { setUrl(await createPreview(versionId)); }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (busy || reason) return;
    setBusy(true); setError(''); setNotice('');
    try { await revokePreview(versionId); setUrl(''); setNotice('此版本的分享链接已关闭。'); }
    catch (value) { setError(errorMessage(value)); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNotice('预览链接已复制。'); }
    catch { setNotice('自动复制不可用，请选中下方链接手动复制。'); }
  };
  return <>
    <button onClick={() => setOpen(true)}><QrCode size={15} />扫码预览</button>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
      <DialogContent className="device-share-dialog">
        <DialogHeader><DialogTitle>多终端扫码预览</DialogTitle><DialogDescription>用手机或平板扫码，在真实屏幕上查看当前版本的适配效果。</DialogDescription></DialogHeader>
        {reason && <p role="status" className="device-share-error">{reason}</p>}
        {url ? <><div className="device-qr"><QRCodeSVG value={url} size={220} marginSize={4} level="M" title="当前版本的真机预览二维码" /></div>
          <input className="device-share-url" aria-label="真机预览链接" readOnly value={url} onFocus={event => event.target.select()} />
          <div className="device-share-actions"><button onClick={() => void copy()} disabled={busy}><Copy size={15} />复制链接</button><a href={url} target="_blank" rel="noopener noreferrer">打开预览</a></div></> : !reason && <p>创建二维码后，持有链接的人无需登录即可查看此版本。请勿分享含敏感信息的应用。</p>}
        <p className="device-share-hint">链接固定在当前版本，不会随修改自动更新。重新创建会使旧链接失效。预览隔离运行，不支持外部网络和本地存储。</p>
        {error && <p role="alert" className="device-share-error">{error}</p>}{notice && <p role="status">{notice}</p>}
        <div className="device-share-actions"><button className="device-share-primary" disabled={busy || !!reason} onClick={() => void create()}>{busy && <Loader2 size={15} className="spin" />}{url ? '重新创建二维码' : '创建二维码'}</button><button disabled={busy || !!reason} onClick={() => void revoke()}>关闭此版本分享</button></div>
      </DialogContent>
    </Dialog>
  </>;
}
