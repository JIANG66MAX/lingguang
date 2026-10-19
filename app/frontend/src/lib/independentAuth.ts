import { createClient } from '@metagptx/web-sdk';

const sdk = createClient();
let csrf = '';
export interface IndependentUser { id: string; email: string; name?: string | null; }
export async function invoke(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: object, timeout = 30000) {
  return sdk.apiCall.invoke({ url, method, data, options: { withCredentials: true, timeout, headers: { 'X-Lingguang-CSRF': csrf } } });
}
export async function loginUnifiedAccount(): Promise<void> {
  sessionStorage.setItem('lingguang-unified-pending', '1');
  try { await sdk.auth.toLogin(); }
  catch (error) { sessionStorage.removeItem('lingguang-unified-pending'); throw error; }
}
export async function currentAccount(): Promise<IndependentUser> {
  if (sessionStorage.getItem('lingguang-unified-pending') === '1') {
    await sdk.auth.me();
    const result = await invoke('/api/v1/lingguang-auth/unified-session', 'POST');
    csrf = result.data.csrf;
    sessionStorage.removeItem('lingguang-unified-pending');
    return result.data.user;
  }
  const response = await invoke('/api/v1/lingguang-auth/me');
  csrf = response.data.csrf;
  return response.data.user;
}
export async function loginAccount(email: string, password: string): Promise<IndependentUser> {
  sessionStorage.removeItem('lingguang-unified-pending');
  const response = await invoke('/api/v1/lingguang-auth/login', 'POST', { email, password });
  csrf = response.data.csrf;
  return response.data.user;
}
export async function registerAccount(email: string, password: string, confirm_password: string): Promise<string> {
  const response = await invoke('/api/v1/lingguang-auth/register', 'POST', { email, password, confirm_password });
  return response.data.message;
}
export async function accountConfigured(): Promise<boolean> {
  return (await invoke('/api/v1/lingguang-auth/status')).data.configured;
}
export async function logoutAccount(): Promise<void> {
  await invoke('/api/v1/lingguang-auth/logout', 'POST');
  sessionStorage.removeItem('lingguang-unified-pending');
  csrf = '';
}
function entity(name: string) {
  const url = `/api/v1/entities/${name}`;
  return {
    create: ({ data }: { data: object }) => invoke(url, 'POST', data),
    query: (options: { query?: object; sort?: string; limit?: number; skip?: number }) => invoke(url, 'GET', { ...options, ...(options.query ? { query: JSON.stringify(options.query) } : {}) }),
  };
}
export const independentEntities = {
  lingguang_projects: entity('lingguang_projects'),
  lingguang_versions: entity('lingguang_versions'),
  lingguang_messages: entity('lingguang_messages'),
};
