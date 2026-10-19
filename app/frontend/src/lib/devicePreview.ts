import { invoke } from './independentAuth';

export async function createPreview(versionId: number): Promise<string> {
  const response = await invoke('/api/v1/lingguang-preview/share', 'POST', { version_id: versionId });
  return `${window.location.origin}/device-preview#${response.data.token}`;
}
export async function revokePreview(versionId: number): Promise<void> {
  await invoke('/api/v1/lingguang-preview/revoke', 'POST', { version_id: versionId });
}
export async function readPreview(token: string): Promise<string> {
  const response = await invoke('/api/v1/lingguang-preview/view', 'POST', { token });
  if (typeof response.data.html !== 'string' || !response.data.html) throw new Error('预览内容不可用。');
  return response.data.html;
}
