import type { Version } from './lingguang';

export interface ProjectMessage {
  id: number;
  project_id: number;
  content: string;
  created_at?: string;
  localKey?: string;
}
export interface RetryRequest {
  request: string;
  baseHtml: string | null;
  message: ProjectMessage;
}
export function conversationRows(messages: ProjectMessage[], versions: Version[]) {
  const remaining = [...versions];
  const rows = messages.map(message => {
    const index = remaining.findIndex(version => version.prompt === message.content && (!version.created_at || !message.created_at || version.created_at >= message.created_at));
    const version = index >= 0 ? remaining.splice(index, 1)[0] : undefined;
    return { key: message.localKey ?? `message-${message.id}`, content: message.content, created_at: message.created_at, version, pending: message.id === 0 };
  });
  for (const version of remaining) rows.push({ key: `version-${version.id}`, content: version.prompt, created_at: version.created_at, version, pending: false });
  return rows.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
}
