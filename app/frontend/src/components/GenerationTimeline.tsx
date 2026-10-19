import { Check, Circle, Loader2, X } from 'lucide-react';

export type GenerationStage = 'prepare' | 'generate' | 'validate' | 'repair' | 'save' | 'done';
export interface GenerationProgress {
  stage: GenerationStage;
  status: 'running' | 'failed' | 'done';
  repaired: boolean;
}
const stages = [
  { id: 'prepare', title: '准备需求', detail: '创建项目并整理本次需求与已有代码' },
  { id: 'generate', title: '生成代码', detail: 'AI 正在编写完整网页，请稍候' },
  { id: 'validate', title: '检查完整性', detail: '检查 HTML、页面内容及代码标签闭合' },
  { id: 'repair', title: '自动修复', detail: '发现代码不完整，正在修复并重新检查' },
  { id: 'save', title: '保存版本', detail: '将通过检查的代码保存到创作历史' },
] as const;

export default function GenerationTimeline({ progress }: { progress: GenerationProgress }) {
  const current = progress.stage === 'done' ? stages.length : stages.findIndex(step => step.id === progress.stage);
  const label = progress.status === 'done' ? '生成完成' : progress.status === 'failed' ? '处理暂停' : '正在处理';
  return <section className="generation-timeline" aria-label="应用生成步骤">
    <div className="generation-heading"><SparkleMark /><strong>{label}</strong><span>{progress.status === 'done' ? '已保存' : `${Math.min(current + 1, stages.length)} / ${stages.length}`}</span></div>
    <ol>{stages.map((step, index) => {
      const skipped = step.id === 'repair' && !progress.repaired && current > index;
      const state = skipped ? 'skipped' : index < current ? 'done' : index === current ? progress.status : 'pending';
      return <li key={step.id} className={`generation-step is-${state}`} aria-current={index === current ? 'step' : undefined}>
        <span className="generation-marker">{state === 'done' ? <Check size={13} /> : state === 'running' ? <Loader2 size={13} className="spin" /> : state === 'failed' ? <X size={13} /> : <Circle size={10} />}</span>
        <div><strong>{step.title}</strong><small>{skipped ? '代码完整，无需修复' : state === 'pending' && step.id === 'repair' ? '仅在检查不通过时执行' : state === 'running' ? step.detail : state === 'failed' ? '此步骤未完成，可在下方重试' : state === 'done' ? '已完成' : '等待前序步骤'}</small></div>
        <span className="generation-state">{({ done: '完成', running: '进行中', failed: '失败', pending: '待处理', skipped: '跳过' })[state]}</span>
      </li>;
    })}</ol>
    <p role="status" aria-live="polite">{progress.status === 'done' ? '新版本已保存，可在右侧预览。' : progress.status === 'failed' ? '本次处理未完成，错误详情及重试入口见下方。' : stages[current]?.detail}</p>
  </section>;
}
function SparkleMark() { return <span className="generation-dot" aria-hidden="true" />; }
