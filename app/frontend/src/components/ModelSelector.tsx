import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Loader2, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { errorMessage } from '@/lib/lingguang';
import { builtInModels, catalogCheckedAt, defaultSelection, deleteProviderConfig, listProviderConfigs, protocolPaths, providerPresets, saveProviderConfig, selectionForConfig, type ConfigInput, type ModelSelection, type ProviderConfig, type ProviderProtocol } from '@/lib/modelProvider';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Props {
  value: ModelSelection;
  onChange: (selection: ModelSelection) => void;
  disabled: boolean;
  onAuthenticate: () => void;
  authenticated: boolean;
}
interface ConfigForm extends ConfigInput { id?: number; hint: string; models: string[]; sources?: string[]; }
const emptyForm = (): ConfigForm => ({ name: '', base_url: '', model: '', protocol: 'chat', api_key: '', hint: '可连接支持以下协议的第三方平台或代理服务。平台、模型与接口必须相互匹配。', models: [] });

export default function ModelSelector({ value, onChange, disabled, authenticated, onAuthenticate }: Props) {
  const [open, setOpen] = useState(false);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const operationLock = useRef(false);
  const changeRef = useRef(onChange);
  const selectionRef = useRef(value);
  changeRef.current = onChange;
  selectionRef.current = value;

  useEffect(() => {
    if (!open || !authenticated) return;
    let cancelled = false;
    setLoading(true); setError(''); setStorageReady(false);
    listProviderConfigs()
      .then(data => {
        if (cancelled) return;
        setConfigs(data.items); setStorageReady(data.storage_ready);
        const selected = selectionRef.current;
        if (data.storage_ready && selected.provider === 'external') {
          const config = data.items.find(item => item.id === selected.configId);
          changeRef.current(config ? selectionForConfig(config) : defaultSelection);
        }
      })
      .catch(reason => { if (!cancelled) setError(errorMessage(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, authenticated, loadRevision]);

  const close = () => { if (operationLock.current) return; setOpen(false); setForm(null); setError(''); setNotice(''); };
  const startForm = (next: ConfigForm) => { setShowKey(false); setForm(next); setError(''); setNotice(''); };
  const updateForm = (update: Partial<ConfigForm>) => setForm(current => current ? { ...current, ...update } : current);
  const savedFormKey = !!form?.id && configs.some(config => config.id === form.id && config.configured);
  const missingKey = !!form && !form.api_key?.trim() && !savedFormKey;
  const completionHint = form
    ? missingKey ? 'API Key 为必填项，请填写后保存配置。' : '请先点击“保存并选择”，保存成功后才能完成选择；或取消本次编辑。'
    : value.provider === 'external' && (!authenticated || loading || !storageReady || !configs.some(config => config.id === value.configId && config.configured))
      ? '请先登录并选择已保存 API Key 的可用个人配置。' : '';
  const complete = () => { if (saving || completionHint) return; close(); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form || operationLock.current) return;
    if (!authenticated) { setError('请先登录，再保存个人算力配置。'); return; }
    if (missingKey) { setError('API Key 为必填项，请填写后再保存。'); return; }
    operationLock.current = true; setSaving(true); setError(''); setNotice('');
    const data: ConfigInput = { name: form.name.trim(), base_url: form.base_url.trim(), model: form.model.trim(), protocol: form.protocol,
      ...(form.api_key?.trim() ? { api_key: form.api_key.trim() } : {}) };
    try {
      const saved = await saveProviderConfig(data, form.id);
      setConfigs(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.id - b.id));
      setStorageReady(true);
      onChange(selectionForConfig(saved)); setForm(null);
      setNotice('配置已加密保存并选中；模型可用性将在生成时确认。');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { operationLock.current = false; setSaving(false); }
  };
  const remove = async (config: ProviderConfig) => {
    if (operationLock.current || !window.confirm(`删除“${config.name} · ${config.model}”及其 API Key？`)) return;
    operationLock.current = true; setSaving(true); setError(''); setNotice('');
    try {
      await deleteProviderConfig(config.id);
      setConfigs(current => current.filter(item => item.id !== config.id));
      if (value.configId === config.id) onChange(defaultSelection);
      if (form?.id === config.id) setForm(null);
      setNotice('配置及个人 Key 已删除。');
    } catch (reason) { setError(errorMessage(reason)); }
    finally { operationLock.current = false; setSaving(false); }
  };
  return <>
    <button type="button" className="model-selector-trigger" disabled={disabled} onClick={() => setOpen(true)}><Settings2 size={14} /><span>{value.label} · {value.model}</span><ChevronDown size={13} /></button>
    <Dialog open={open} onOpenChange={next => { if (next) setOpen(true); else close(); }}>
      <DialogContent className="model-config-dialog">
        <DialogTitle>选择生成算力</DialogTitle>
        <DialogDescription>生成和自动修复使用同一选择。个人算力直接调用你的平台，不会自动切换到内置算力。</DialogDescription>
        <section className="provider-section"><h3>内置模型 <small>使用内置 AI 接口</small></h3>
          <div className="model-options" role="group" aria-label="内置模型">{builtInModels.map(model => <button type="button" key={model} aria-pressed={value.provider === 'atoms' && value.model === model} className={value.provider === 'atoms' && value.model === model ? 'selected' : ''} disabled={saving} onClick={() => onChange({ provider: 'atoms', label: 'Atoms 内置算力', model })}><span>{model}</span></button>)}</div>
        </section>
        <section className="provider-section"><h3>我的个人算力 <small>可保存多个配置</small></h3>
          {!authenticated ? <div className="provider-login"><p>登录后可保存和选择个人平台。API Key 不存入浏览器。</p><button className="primary" onClick={() => { close(); onAuthenticate(); }}>登录 / 注册后配置</button></div> : <>
            {loading ? <p className="provider-state"><Loader2 size={14} className="spin" />正在读取配置…</p> : configs.length ? <div className="saved-configs">{configs.map(config => <div key={config.id} className={`saved-config${value.provider === 'external' && value.configId === config.id ? ' selected' : ''}`}>
              <button className="config-choice" aria-pressed={value.provider === 'external' && value.configId === config.id} disabled={saving || !storageReady} onClick={() => onChange(selectionForConfig(config))}><strong>{config.name}</strong><small>{config.model} · Key 已保存</small></button>
              <button className="config-icon" aria-label={`编辑 ${config.name}`} disabled={saving || !storageReady} onClick={() => { const preset = providerPresets.find(item => item.name === config.name || (item.base_url && item.base_url === config.base_url)); startForm({ ...config, api_key: '', hint: `编辑时 Key 留空保留；已有模型不会自动替换。${preset?.hint ?? ''}`, models: preset?.models ?? [], sources: preset?.sources }); }}><Pencil size={15} /></button>
              <button className="config-icon delete-config" aria-label={`删除 ${config.name}`} disabled={saving} onClick={() => void remove(config)}><Trash2 size={15} /></button>
            </div>)}</div> : <p className="provider-state">还没有个人配置，选择下方平台或新增自定义。</p>}
            {!loading && !storageReady && <p className="provider-warning">暂不能读取或保存个人配置，请确认服务端加密配置可用后重试。</p>}
          </>}
          <div className="provider-presets">{providerPresets.map(preset => <button key={preset.name} disabled={saving || loading} onClick={() => startForm({ ...preset, api_key: '' })}><Plus size={13} />{preset.name}</button>)}<button className="custom-provider" disabled={saving || loading} onClick={() => startForm(emptyForm())}><Plus size={14} />新增自定义</button></div>
        </section>
        {form && <form className="provider-key-section" onSubmit={event => void save(event)}>
          <h3>{form.id ? '编辑配置' : '新增个人算力'}</h3><p>{form.hint}</p>
          {!!form.sources?.length && <p>官方文档核对：{catalogCheckedAt} · {form.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#bad7ff', textDecoration: 'underline', marginRight: 10 }}>官方资料 {index + 1}</a>)}<br />文档列出不等于你的 Key 已获权限，实际可用性取决于账户、地域与平台版本。</p>}
          {!!form.models.length && <div><p>点击填写模型 ID（共 {form.models.length} 个，也可手动输入）</p><div className="provider-presets" role="group" aria-label="平台模型 ID">{form.models.map(model => <button key={model} type="button" aria-pressed={form.model === model} disabled={saving} onClick={() => updateForm({ model })} style={{ borderColor: form.model === model ? '#69a9ff' : undefined, overflowWrap: 'anywhere', maxWidth: '100%' }}>{model}</button>)}</div></div>}
          <div className="provider-form-grid">
            <label htmlFor="provider-name">平台 / 配置名称<input id="provider-name" required maxLength={80} value={form.name} onChange={event => updateForm({ name: event.target.value })} placeholder="如：我的 DeepSeek 编程模型" disabled={saving} /></label>
            <label htmlFor="provider-protocol">接口协议<select id="provider-protocol" value={form.protocol} onChange={event => updateForm({ protocol: event.target.value as ProviderProtocol })} disabled={saving}><option value="chat">OpenAI Chat Completions 兼容</option><option value="responses">OpenAI Responses</option><option value="anthropic">Anthropic Messages</option></select></label>
            <label className="full-width" htmlFor="provider-url">API 基础地址<input id="provider-url" type="url" required maxLength={500} value={form.base_url} onChange={event => updateForm({ base_url: event.target.value })} placeholder="https://你的平台域名/v1" disabled={saving} /><small>仅支持 HTTPS 公网接口（443端口）。自动拼接 {protocolPaths[form.protocol]}，不要填完整请求地址。</small></label>
            <label htmlFor="provider-model">模型 ID<input id="provider-model" required maxLength={150} list="provider-model-suggestions" value={form.model} onChange={event => updateForm({ model: event.target.value })} placeholder="填写平台实际可用模型 ID" disabled={saving} /><datalist id="provider-model-suggestions">{form.models.map(model => <option key={model} value={model} />)}</datalist></label>
            <div className="provider-key-field"><label htmlFor="provider-key">API Key{savedFormKey ? '（已保存，留空保留）' : '（必填）'}</label><div className="provider-key-input"><input id="provider-key" type={showKey ? 'text' : 'password'} required={!savedFormKey} aria-invalid={missingKey} aria-describedby={missingKey ? 'provider-key-required' : undefined} maxLength={4096} autoComplete="off" spellCheck={false} autoCapitalize="none" value={form.api_key ?? ''} onChange={event => updateForm({ api_key: event.target.value })} placeholder={form.id ? '不显示原 Key，填写则替换' : '输入你自己的平台 API Key'} disabled={saving} /><button type="button" className="provider-key-toggle" aria-label={showKey ? '隐藏 API Key' : '显示 API Key'} aria-pressed={showKey} aria-controls="provider-key" title={showKey ? '隐藏 API Key' : '显示 API Key'} disabled={saving} onClick={() => setShowKey(current => !current)}>{showKey ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          </div>
          {missingKey && <p id="provider-key-required" className="provider-warning" role="status">API Key 为必填项，未填写时无法保存或完成选择。</p>}
          {!authenticated ? <p className="provider-warning">可以先填写；登录后才能加密保存。关闭弹窗或跳转登录会清空未保存的 Key。</p> : loading ? <p className="provider-state">可以填写，正在检查服务端保存状态…</p> : null}
          <p className="key-safety">Key 仅在服务端按用户加密保存，不回传明文。预设是可编辑示例，不保证账户拥有对应模型；不支持原生 Gemini、Azure 专用鉴权等其他协议。</p>
          <div className="provider-key-actions"><button type="submit" className="primary" disabled={saving || missingKey}>{saving && <Loader2 size={14} className="spin" />}{saving ? '正在保存…' : '保存并选择'}</button><button type="button" className="quiet provider-cancel" disabled={saving} onClick={() => setForm(null)}>取消</button></div>
        </form>}
        {error && <div className="provider-warning" role="alert">{error}{!form && <button className="quiet" disabled={saving || loading} onClick={() => setLoadRevision(current => current + 1)}>重新读取</button>}</div>}
        {notice && <p className="provider-notice" role="status">{notice}</p>}
        {completionHint && <p id="provider-completion-hint" className="provider-warning" role="status">{completionHint}</p>}
        <button type="button" className="primary provider-done" disabled={saving || !!completionHint} aria-describedby={completionHint ? 'provider-completion-hint' : undefined} onClick={complete}>完成选择</button>
      </DialogContent>
    </Dialog>
  </>;
}
