import { createClient } from '@metagptx/web-sdk';

export const client = createClient();
export interface Project { id: number; title: string; }
export interface Version { id: number; project_id: number; prompt: string; html: string; created_at?: string; }
export function errorMessage(error: unknown): string {
  const value = error as { data?: { detail?: unknown }; response?: { data?: { detail?: unknown } }; message?: string };
  const detail = value?.response?.data?.detail ?? value?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return '填写内容不符合要求，请检查邮箱和密码。';
  return value?.message || '暂时无法完成操作，请重试。';
}
export { extractHtml } from './htmlValidation';
export function safePreview(html: string): string {
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; font-src data:; connect-src \'none\'; form-action \'none\';">';
  return html.replace(/<head[^>]*>/i, (head) => head + policy);
}
export const generationInstruction = `你是灵光网页应用工程师。根据用户需求输出完整单文件HTML，从<!DOCTYPE html>开始到</html>结束。不要Markdown和解释。控制输出长度，避免冗长注释、重复样式及大型内联图形，优先实现完整核心功能；输出前检查html、body、style、script真实标签已闭合，不省略代码或用占位符代替实现。内嵌所有CSS和JavaScript，界面中文，视觉精致，自适应屏幕。实现所有按钮和核心交互，使用localStorage保存必要的本地数据，图形用CSS或内联SVG。不能使用外部依赖、外部图片、网络请求或后端；需要服务端的功能明确说明不可用，不模拟成功。不要表单跳转。小游戏需要键盘和触屏支持。后续修改时保留原有功能，输出修改后的完整HTML。`;
