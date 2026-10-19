import { useEffect, useRef, useState } from 'react';
import './idea-label.css';
import './scifi.css';
import { ArrowUp, ArrowUpRight, Sparkles, Code2, MessageSquare, Layers, Monitor, Smartphone, Download, History, Plus, ArrowLeft, Loader2, X, Check, Terminal, ChevronRight, Wallet, Coffee, Gamepad2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import DevicePreviewDialog from '@/components/DevicePreviewDialog';
import AuthEntryDialog from '@/components/AuthEntryDialog';
import AccountMenu, { type AccountProfile } from '@/components/AccountMenu';
import GenerationTimeline, { type GenerationProgress, type GenerationStage } from '@/components/GenerationTimeline';
import './generation.css';
import ModelSelector from '@/components/ModelSelector';
import { defaultSelection, generateWithProvider, type ModelSelection } from '@/lib/modelProvider';
import './model-provider.css';
import { validationDiagnostic } from '@/lib/htmlValidation';
import { conversationRows, type ProjectMessage, type RetryRequest } from '@/lib/conversation';
import { currentAccount, independentEntities } from '@/lib/independentAuth';
import { errorMessage, extractHtml, generationInstruction, safePreview, type Project, type Version } from '@/lib/lingguang';

const client = { entities: independentEntities };

const examples = [
  { icon: Wallet, text: '带分类和图表的个人记账本' },
  { icon: Timer, text: '番茄钟 + 待办清单' },
  { icon: Gamepad2, text: '可玩的贪吃蛇小游戏' },
  { icon: Coffee, text: '咖啡店落地页，含菜单和预约表单' },
];
const steps = [
  { icon: MessageSquare, tag: '输入', title: '描述你的灵感', text: '用中文写下你想要的功能和风格，让灵光理解你的想法。' },
  { icon: Code2, tag: '生成', title: '见证应用诞生', text: 'AI 实时编写完整网页代码，把一句话变成可交互的应用。' },
  { icon: Layers, tag: '迭代', title: '让想法更进一步', text: '继续对话，随时调整。每个版本自动存档，可回滚、可导出。' },
];

export default function Index() {
  const [auth, setAuth] = useState<'loading' | 'authenticated' | 'anonymous'>('loading');
  const [authEntryOpen, setAuthEntryOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [provider, setProvider] = useState<ModelSelection>(defaultSelection);
  const [runProvider, setRunProvider] = useState<ModelSelection>(defaultSelection);
  const [prompt, setPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ProjectMessage[]>([]);
  const [visibleMessages, setVisibleMessages] = useState(50);
  const messageCounter = useRef(0);
  const conversationEnd = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [active, setActive] = useState<Version | null>(null);
  const [workspace, setWorkspace] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [mobile, setMobile] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [unsaved, setUnsaved] = useState<Version | null>(null);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lock = useRef(false);

  useEffect(() => { currentAccount().then(user => { setProfile(user); setAuth('authenticated'); }).catch(() => { setProfile(null); setAuth('anonymous'); }); }, []);
  useEffect(() => { sessionStorage.removeItem('lingguang-draft'); }, []);
  useEffect(() => { conversationEnd.current?.scrollIntoView({ block: 'end' }); }, [chatMessages, progress, error]);
  useEffect(() => {
    const updateHeader = () => setHeaderScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);

  const login = () => setAuthEntryOpen(true);
  const saveVersion = async (value: Version) => {
    const res = await client.entities.lingguang_versions.create({ data: { project_id: value.project_id, prompt: value.prompt, html: value.html } });
    const saved = res.data as Version;
    setVersions(current => [...current, saved]); setActive(saved); setUnsaved(null);
  };
  const generate = async (retry?: RetryRequest) => {
    const request = retry?.request ?? prompt.trim();
    if (!request || lock.current || auth === 'loading' || unsaved) return;
    if (auth === 'anonymous') { login(); return; }
    const selectedProvider = { ...provider };
    setRunProvider(selectedProvider);
    const baseHtml = retry ? retry.baseHtml : active?.html ?? null;
    let message: ProjectMessage = retry?.message ?? {
      id: 0, project_id: project?.id ?? 0, content: request,
      created_at: new Date().toISOString(), localKey: `local-${++messageCounter.current}`,
    };
    if (!retry) {
      setChatMessages(current => [...current, message]);
      setPrompt('');
    }
    setRetryRequest(null);
    lock.current = true; setBusy(true); setError(''); setStream(''); setWorkspace(true); setTab('code');
    let stage: GenerationStage = 'prepare';
    let repaired = false;
    const advance = (next: GenerationStage) => {
      stage = next;
      setProgress({ stage, status: next === 'done' ? 'done' : 'running', repaired });
    };
    advance('prepare');
    let target = project;
    let html = '';
    try {
      if (!target) {
        const res = await client.entities.lingguang_projects.create({ data: { title: request.slice(0, 40) } });
        target = res.data as Project; setProject(target);
      }
      if (!message.id) {
        const response = await client.entities.lingguang_messages.create({ data: { project_id: target.id, content: request } });
        const saved = response.data as ProjectMessage;
        message = { ...saved, localKey: message.localKey };
        setChatMessages(current => current.map(row => row.localKey === message.localKey ? message : row));
      }
      const messages = [
        { role: 'system' as const, content: generationInstruction },
        ...(baseHtml ? [{ role: 'assistant' as const, content: baseHtml }] : []),
        { role: 'user' as const, content: request },
      ];
      // 完整接收代码后再校验，避免将流式回调的局部结果当成最终文档。
      advance('generate');
      const result = await generateWithProvider(selectedProvider, messages, setStream);
      if (typeof result !== 'string' || !result.trim()) {
        throw new Error('AI 未返回网页代码，请重试生成。');
      }
      setStream(result);
      advance('validate');
      try {
        html = extractHtml(result);
      } catch (validationError) {
        const diagnostic = validationDiagnostic(validationError, result);
        repaired = true;
        advance('repair');
        setStream(result + '\n\n<!-- 正在修复网页格式，请稍候… -->');
        const repairedCode = await generateWithProvider(selectedProvider, [
            ...messages,
            { role: 'assistant', content: result },
            { role: 'user', content: `上次输出未通过HTML完整性校验，具体诊断：${diagnostic}。请针对诊断修复并输出完整的单文件HTML，从<!DOCTYPE html>开始，到</html>结束。所有style和script标签必须闭合。保留用户要求的全部核心功能，减少冗余注释、重复CSS和大型内联图形，避免输出被截断。优先保证可运行的核心功能。不要解释，不要Markdown。` },
          ], setStream);
        if (typeof repairedCode !== 'string' || !repairedCode.trim()) {
          throw new Error('自动修复未返回网页代码，请重试生成。');
        }
        setStream(repairedCode);
        try { html = extractHtml(repairedCode); }
        catch (repairError) { throw new Error(`自动修复后仍未通过结构检查。首次原因：${diagnostic}。修复后：${validationDiagnostic(repairError, repairedCode)}。本次输出保留在右侧代码中，可点击重试生成。`); }
      }
      const value: Version = { id: 0, project_id: target.id, prompt: request, html };
      setActive(value);
      advance('save');
      try { await saveVersion(value); }
      catch (valueError) { setUnsaved(value); throw new Error(`应用已生成，但版本保存失败：${errorMessage(valueError)}。请点击重新保存。`); }
      advance('done');
      setPrompt(''); setTab('preview'); toast.success('灵感已变成应用，新版本已保存');
    } catch (value) {
      setError(errorMessage(value));
      setProgress({ stage, status: 'failed', repaired });
      if (!html) setRetryRequest({ request, baseHtml, message });
      if (html) setTab('preview');
    }
    finally { lock.current = false; setBusy(false); }
  };
  const retrySave = async () => {
    if (!unsaved || busy) return;
    setBusy(true); setError('');
    setProgress(current => ({ stage: 'save', status: 'running', repaired: current?.repaired ?? false }));
    try {
      await saveVersion(unsaved);
      setProgress(current => ({ stage: 'done', status: 'done', repaired: current?.repaired ?? false }));
      setPrompt(''); toast.success('版本已保存');
    }
    catch (value) {
      setError(errorMessage(value));
      setProgress(current => ({ stage: 'save', status: 'failed', repaired: current?.repaired ?? false }));
    }
    finally { setBusy(false); }
  };
  const loadHistory = async (append = false) => {
    if (auth === 'loading') return;
    if (auth === 'anonymous') { login(); return; }
    setHistoryOpen(true); setHistoryBusy(true); setError('');
    try {
      const res = await client.entities.lingguang_projects.query({ sort: '-created_at', limit: 20, skip: append ? projects.length : 0 });
      const items = res.data.items as Project[]; setProjects(current => append ? [...current, ...items] : items); setMore(items.length === 20);
    } catch (value) { setError(errorMessage(value)); }
    finally { setHistoryBusy(false); }
  };
  const openProject = async (value: Project) => {
    setHistoryBusy(true); setError('');
    try {
      const rows: Version[] = [];
      let skip = 0;
      while (true) {
        const res = await client.entities.lingguang_versions.query({ query: { project_id: value.id }, sort: 'created_at', limit: 20, skip });
        const batch = res.data.items as Version[]; rows.push(...batch); if (batch.length < 20) break; skip += 20;
      }
      const messages: ProjectMessage[] = [];
      let messageSkip = 0;
      while (true) {
        const response = await client.entities.lingguang_messages.query({ query: { project_id: value.id }, sort: 'created_at', limit: 100, skip: messageSkip });
        const batch = response.data.items as ProjectMessage[];
        messages.push(...batch);
        if (batch.length < 100) break;
        messageSkip += 100;
      }
      setChatMessages(messages); setVisibleMessages(50);
      setProgress(null); setRetryRequest(null);
      setProject(value); setVersions(rows); setActive(rows.at(-1) || null); setUnsaved(null); setStream(''); setWorkspace(true); setHistoryOpen(false); setTab('preview'); setPrompt('');
    } catch (err) { setError(errorMessage(err)); }
    finally { setHistoryBusy(false); }
  };
  const rollback = async (value: Version) => {
    if (!project || busy || unsaved) return;
    setBusy(true); setError('');
    try { await saveVersion({ ...value, prompt: `回滚到版本 ${versions.findIndex(row => row.id === value.id) + 1}` }); toast.success('已回滚，原有版本仍然保留'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const newProject = () => {
    if (busy) return;
    if (unsaved && !window.confirm('当前版本尚未保存，离开会丢失生成结果。确定离开？')) return;
    setChatMessages([]); setVisibleMessages(50);
    setProgress(null); setRetryRequest(null);
    setWorkspace(false); setProject(null); setVersions([]); setActive(null); setStream(''); setUnsaved(null); setPrompt(''); setError('');
  };
  const download = () => {
    if (!active) return;
    const url = URL.createObjectURL(new Blob([active.html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `灵光-${project?.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 30) || '应用'}.html`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const promptBox = (compact = false) => <div className={`prompt-box ${compact ? 'compact' : ''}`}>
    <label htmlFor="idea" className={compact ? undefined : 'idea-label'}><Sparkles size={16} />{compact ? '继续完善你的应用' : '描述你的灵光'}<span>{compact ? '对话即迭代' : '用一句话写下你想要的功能和风格，让灵光被读懂'}</span></label>
    <textarea id="idea" ref={input} value={prompt} maxLength={6000} disabled={busy} onChange={event => setPrompt(event.target.value)} placeholder={compact ? '例如：增加深色模式，调整按钮颜色…' : '描述你想要的应用，例如：一个有趣的习惯打卡工具…'} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void generate(); } }} />
    <ModelSelector value={provider} onChange={setProvider} onAuthenticate={login} disabled={busy || auth === 'loading'} authenticated={auth === 'authenticated'} />
    <div className="prompt-bottom"><span><span className="keycap">↵</span> 发送 <i>·</i> Shift + Enter 换行</span><button className="primary" disabled={busy || !prompt.trim() || auth === 'loading' || !!unsaved} onClick={() => void generate()}>{busy ? <Loader2 size={16} className="spin" /> : <ArrowUp size={17} />}{busy ? '正在生成' : compact ? '发送' : '生成应用'}</button></div>
  </div>;

  const chatRows = conversationRows(chatMessages, versions);
  return <div className={workspace ? 'app-shell workspace-shell' : 'app-shell'}>
    <a className="skip" href="#main">跳到主要内容</a>
    <header className={`header${headerScrolled ? ' header-scrolled' : ''}`}><button className="brand" onClick={newProject} disabled={busy}><span className="brand-icon"><Sparkles size={23} /></span><strong>灵光</strong><span className="brand-tag">让灵感，即刻发生</span></button><div className="header-actions">{workspace && <button className="quiet" onClick={newProject} disabled={busy}><Plus size={16} />新建应用</button>}<button className="quiet" onClick={() => void loadHistory()} disabled={busy || auth === 'loading'}><History size={16} /><span>我的创作</span></button>{auth === 'authenticated' && profile ? <AccountMenu profile={profile} busy={busy} /> : <button className="login-button" onClick={login} disabled={auth === 'loading'}>{auth === 'loading' ? '连接中' : '登录 / 注册'}<ArrowUpRight size={15} /></button>}</div></header>
    {!workspace ? <main id="main" className="landing"><section className="hero"><div className="status"><span />AI 代码引擎 · 已就绪<ChevronRight size={13} /></div><h1>一念灵光，<br /><span>即刻成应用。<span className="title-spark">✦</span></span></h1><p className="hero-description">把脑海里一闪而过的灵光，<br className="mobile-break" />变成可运行的现实产品</p>{promptBox()}<div className="examples-caption">没有头绪？试试这些灵感</div><div className="examples">{examples.map(({ icon: Icon, text }) => <button key={text} onClick={() => { setPrompt(text); input.current?.focus(); }}><Icon size={15} />{text}<ArrowUpRight size={12} /></button>)}</div>{error && <div className="error" role="alert">{error}</div>}</section><section className="how"><div className="section-label"><span />从灵感到应用，只需三步<span /></div><div className="steps">{steps.map(({ icon: Icon, tag, title, text }, index) => <article className="step" key={title}><div className="step-top"><div className="step-icon"><Icon size={21} /></div><span>{tag}<b>0{index + 1}</b></span></div><h2>{title}</h2><p>{text}</p></article>)}</div></section><section className="metrics"><div><strong>一句话</strong><span>从灵感到可交互应用</span></div><div><strong>实时<span className="metric-dot" /></strong><span>看得见的代码生成</span></div><div><strong>每一版</strong><span>保存灵感的每一步</span></div></section><footer><span className="footer-brand"><Sparkles size={14} />灵光 · 为每一个好想法而生</span><span>描述 · 创造 · 无限可能</span></footer></main> : <main id="main" className="workspace"><aside className="conversation"><div className="project-heading"><button aria-label="返回首页" onClick={newProject} disabled={busy}><ArrowLeft size={17} /></button><h2>{project?.title || '正在创建应用'}</h2><span className="small-badge">工作台</span></div><div className="conversation-content"><div className="welcome-message"><Sparkles size={19} /><p>你好，我是灵光。你的想法将在这里变成应用。继续对话，让它更接近你的想象。</p></div>{chatRows.length > visibleMessages && <button className="quiet" onClick={() => setVisibleMessages(current => current + 50)}>显示更早的对话（剩余 {chatRows.length - visibleMessages} 条）</button>}{chatRows.slice(-visibleMessages).map(row => <div className="version-message" key={row.key}><p>{row.content}</p><div>{row.version ? <><Check size={14} /><span>版本 {versions.findIndex(version => version.id === row.version?.id) + 1} 已保存</span><button disabled={busy} onClick={() => { setActive(row.version!); setTab('preview'); }}>查看</button>{row.version.id !== versions.at(-1)?.id && <button disabled={busy || !!unsaved} onClick={() => void rollback(row.version!)}>回滚</button>}</> : <span>{row.pending ? busy ? '正在保存提问…' : '提问尚未保存，请重试' : '已发送'}</span>}</div></div>)}{progress && <><p className="generating">本次算力：{runProvider.label} · {runProvider.model}</p><GenerationTimeline progress={progress} /></>}{busy && !progress && <div className="generating"><Loader2 size={16} className="spin" />正在保存版本…</div>}{error && <div className="error generation-error" role="alert"><p>{error}</p>{retryRequest && !unsaved && <button className="generation-retry" disabled={busy || historyBusy} onClick={() => void generate(retryRequest)}>重试生成</button>}{unsaved && <button className="generation-retry" disabled={busy || historyBusy} onClick={() => void retrySave()}>重新保存版本</button>}</div>}<div ref={conversationEnd} /></div><div className="composer">{promptBox(true)}<p>生成浏览器端网页应用。预览隔离运行，导出后支持本地保存；不含服务端功能。</p></div></aside><section className="result"><div className="result-toolbar"><div className="tabs"><button className={tab === 'preview' ? 'selected' : ''} onClick={() => setTab('preview')}><Monitor size={15} />预览</button><button className={tab === 'code' ? 'selected' : ''} onClick={() => setTab('code')}><Code2 size={15} />代码</button><DevicePreviewDialog key={active?.id ?? 0} versionId={active?.id ?? 0} blockedReason={busy ? '正在生成或保存应用，请等待处理完成后创建二维码。' : unsaved ? '应用已经生成，但版本尚未保存。请先点击左侧“重新保存版本”，保存成功后即可扫码预览。' : !active?.id ? '当前没有已保存的应用版本。请先完成生成，或从“我的创作”打开已有版本，再创建预览二维码。' : undefined} /></div><div className="preview-actions"><button className={!mobile ? 'selected' : ''} aria-label="桌面预览" onClick={() => setMobile(false)}><Monitor size={17} /></button><button className={mobile ? 'selected' : ''} aria-label="手机预览" onClick={() => setMobile(true)}><Smartphone size={16} /></button><span className="toolbar-divider" /><button onClick={download} disabled={!active}><Download size={15} />导出</button></div></div>{tab === 'code' ? <pre className="code-view"><code>{busy && progress?.status === 'running' ? stream || '正在等待 AI 返回代码…' : retryRequest ? stream || '本次未返回代码，可点击左侧重试生成。' : active?.html || stream || '生成后在这里查看完整 HTML 代码。'}</code></pre> : <div className="preview-area">{active ? <iframe key={active.id + active.html.length} className={mobile ? 'mobile-preview' : ''} title="生成应用预览" sandbox="allow-scripts" srcDoc={safePreview(active.html)} /> : <div className="empty-preview"><div><Terminal size={32} /></div><h3>{busy ? '你的灵感正在成形' : '从一个想法开始'}</h3><p>{busy ? '切换到代码标签查看已返回的代码，左侧展示当前处理步骤。' : '在左侧描述需求，生成后即可在这里体验。'}</p></div>}</div>}<div className="result-footer"><span><span className="green-dot" />沙箱安全预览</span><span>{progress?.status === 'running' ? '处理进度见左侧步骤' : progress?.status === 'failed' ? '处理未完成 · 可重试' : unsaved ? '尚未保存' : active ? `版本 ${versions.findIndex(value => value.id === active.id) + 1} · HTML` : '等待生成'}</span></div></section></main>}
    <AuthEntryDialog open={authEntryOpen} onOpenChange={setAuthEntryOpen} />
    {historyOpen && <div className="modal-backdrop" onClick={() => !historyBusy && setHistoryOpen(false)}><section className="history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title" onClick={event => event.stopPropagation()}><div className="modal-title"><h2 id="history-title">我的创作</h2><button aria-label="关闭历史" onClick={() => setHistoryOpen(false)}><X size={20} /></button></div><p>每一次灵光乍现，都值得被保存。</p>{error && <div className="error" role="alert">{error}<button onClick={() => void loadHistory()}>重试</button></div>}<div className="project-list">{projects.map(value => <button key={value.id} disabled={historyBusy} onClick={() => void openProject(value)}><span><Code2 size={20} /></span><strong>{value.title}</strong><ArrowUpRight size={18} /></button>)}{!projects.length && !historyBusy && !error && <div className="history-empty"><Layers size={30} /><p>还没有创作，写下你的第一个想法吧。</p></div>}</div>{historyBusy && <div className="generating"><Loader2 size={16} className="spin" />正在读取创作…</div>}{more && <button className="quiet" disabled={historyBusy} onClick={() => void loadHistory(true)}>加载更多</button>}</section></div>}
  </div>;
}
