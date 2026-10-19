export interface GenerationSegment { content: string; complete: boolean; }

export function appendSegment(previous: string, next: string): string {
  if (!previous) return next;
  // 仅去除较长、完全一致的边界重叠，避免误删常见HTML标签。
  for (let size = Math.min(previous.length, next.length, 2000); size >= 40; size--) {
    if (previous.endsWith(next.slice(0, size))) return previous + next.slice(size);
  }
  return previous + next;
}

export async function assembleGeneration(
  request: (partial: string) => Promise<GenerationSegment>,
  onProgress?: (content: string) => void,
): Promise<string> {
  let content = '';
  for (let segment = 0; segment < 32; segment++) {
    const result = await request(content);
    if (typeof result.content !== 'string' || !result.content || typeof result.complete !== 'boolean') {
      throw new Error('生成接口未返回有效代码段，请重试。');
    }
    const combined = appendSegment(content, result.content);
    if (combined === content) throw new Error('模型续写没有进展，请重试生成。');
    if (combined.length > 500000) throw new Error('生成代码超过接收上限，请拆分需求后重试。');
    content = combined;
    onProgress?.(content);
    if (result.complete) return content;
  }
  throw new Error('分段生成仍未完成，已接收代码保留，请重试或拆分需求。');
}
