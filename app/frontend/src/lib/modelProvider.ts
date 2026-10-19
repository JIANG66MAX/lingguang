import { invoke } from './independentAuth';
import { assembleGeneration, type GenerationSegment } from './generationSegments';

export type ProviderProtocol = 'chat' | 'responses' | 'anthropic';
export interface ModelSelection {
  provider: 'atoms' | 'external';
  model: string;
  label: string;
  configId?: number;
}
export interface ProviderConfig {
  id: number;
  name: string;
  base_url: string;
  model: string;
  protocol: ProviderProtocol;
  configured: boolean;
}
export interface ConfigList { items: ProviderConfig[]; storage_ready: boolean; }
export interface ConfigInput {
  name: string;
  base_url: string;
  model: string;
  protocol: ProviderProtocol;
  api_key?: string;
}
export interface ModelMessage { role: 'system' | 'user' | 'assistant'; content: string; }
export const builtInModels = ['gpt-5.4', 'gpt-5.5', 'claude-opus-4.6', 'deepseek-v4-flash', 'deepseek-v4-pro', 'gemini-3.1-pro-preview'];
export const defaultSelection: ModelSelection = { provider: 'atoms', model: 'gpt-5.4', label: 'Atoms 内置算力' };
export const catalogCheckedAt = '2026-10-18';
export const providerPresets: (Omit<ConfigInput, 'api_key'> & { models: string[]; hint: string; sources: string[] })[] = [
  { name: 'OpenAI', base_url: 'https://api.openai.com/v1', model: 'gpt-6.1-sol', protocol: 'responses',
    models: ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
    hint: '官方 Responses 接口。默认 GPT-6.1 Sol；Astra 面向复杂任务，Luna 面向高频任务。仅列出文本生成型号，不混入图像、音频或已关闭模型。',
    sources: ['https://developers.openai.com/api/docs/models', 'https://developers.openai.com/api/reference/resources/responses/methods/create', 'https://developers.openai.com/api/docs/quickstart'] },
  { name: 'DeepSeek', base_url: 'https://api.deepseek.com', model: 'deepseek-flash', protocol: 'chat',
    models: ['deepseek-flash', 'deepseek-v4-pro'],
    hint: '官方当前提供这两个模型 ID，均支持思考与非思考模式。deepseek-flash 当前指向 V4.1 Flash；旧 deepseek-v4-flash 别名已转向新模型，不作为独立型号重复列出。不要填展示版本名 DeepSeek-V4.1-Flash-1017。',
    sources: ['https://api-docs.deepseek.com/', 'https://api-docs.deepseek.com/quick_start/pricing'] },
  { name: '通义千问（百炼）', base_url: '', model: 'qwen3.8-max', protocol: 'chat',
    models: ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash', 'deepseek-v4-pro-0813', 'deepseek-v4.1-flash', 'glm-5.2', 'ZHIPU/GLM-5.3', 'kimi-k3'],
    hint: '前三项为千问文本模型，其他为百炼托管模型（ID 不等于原厂 ID）。地址按 API Key 的地域与业务空间填写，例如北京 https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1 或新加坡 https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1；必须替换 {WorkspaceId}。旧 dashscope 域名仍可用，官方建议迁移专属域名。地域可用模型不同，请以控制台为准。',
    sources: ['https://www.alibabacloud.com/help/en/model-studio/models', 'https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope'] },
  { name: 'Google Gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash', protocol: 'chat',
    models: ['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    hint: '使用官方 OpenAI 兼容接口，不是原生 generateContent。含最新稳定型号和带 preview 后缀的预览型号；2.5 系列新项目访问受限。未列出 Live、TTS、图像或已关闭的 2.0 系列。',
    sources: ['https://ai.google.dev/gemini-api/docs/models', 'https://ai.google.dev/gemini-api/docs/openai'] },
  { name: 'Anthropic Claude', base_url: 'https://api.anthropic.com/v1', model: 'claude-sonnet-5-5', protocol: 'anthropic',
    models: ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-sonnet-5', 'claude-opus-5', 'claude-opus-4-8', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    hint: '官方 Messages 接口。Sonnet 适合代码与代理任务，Haiku 面向高频低延迟，Opus/Fable 面向复杂任务。这里是 Anthropic 原厂 ID：例如 claude-opus-4-6 使用连字符，不是内置路由的 claude-opus-4.6。未列入受限研究型号 Mythos。',
    sources: ['https://platform.claude.com/docs/en/about-claude/models/overview', 'https://platform.claude.com/docs/en/api/messages/create'] },
];
export const protocolPaths: Record<ProviderProtocol, string> = { chat: '/chat/completions', responses: '/responses', anthropic: '/messages' };
export const selectionForConfig = (config: ProviderConfig): ModelSelection => ({ provider: 'external', configId: config.id, label: config.name, model: config.model });
export async function listProviderConfigs(): Promise<ConfigList> {
  const response = await invoke('/api/v1/model-provider/configs');
  return response.data as ConfigList;
}
export async function saveProviderConfig(data: ConfigInput, id?: number): Promise<ProviderConfig> {
  const response = await invoke(`/api/v1/model-provider/configs${id ? `/${id}` : ''}`, id ? 'PUT' : 'POST', data);
  return response.data as ProviderConfig;
}
export async function deleteProviderConfig(id: number): Promise<void> {
  await invoke(`/api/v1/model-provider/configs/${id}`, 'DELETE');
}
export async function generateWithProvider(selection: ModelSelection, messages: ModelMessage[], onProgress?: (content: string) => void): Promise<string> {
  if (selection.provider === 'external' && !selection.configId) throw new Error('请先保存并选择个人算力配置。');
  const url = selection.provider === 'atoms' ? '/api/v1/model-provider/builtin-generate' : '/api/v1/model-provider/generate';
  const settings = selection.provider === 'atoms' ? { model: selection.model } : { config_id: selection.configId };
  return assembleGeneration(async partial => {
    const response = await invoke(url, 'POST', { ...settings, messages, partial }, 30000);
    return response.data as GenerationSegment;
  }, onProgress);
}
