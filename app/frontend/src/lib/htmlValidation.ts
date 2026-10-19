import { parse, type DefaultTreeAdapterMap } from 'parse5';

export class HtmlValidationError extends Error {
  constructor(public readonly reason: string, public readonly raw: string) {
    super(`${reason}（返回 ${raw.length.toLocaleString()} 字符）`);
    this.name = 'HtmlValidationError';
  }
}

export function extractHtml(raw: string): string {
  const fail = (reason: string): never => { throw new HtmlValidationError(reason, raw); };
  if (!raw.trim()) fail('AI 未返回网页代码');
  const cleaned = raw.replace(/^\s*```(?:html)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const document = parse(cleaned, { sourceCodeLocationInfo: true });
  const elements: DefaultTreeAdapterMap['element'][] = [];
  const walk = (node: DefaultTreeAdapterMap['node']) => {
    if ('tagName' in node) elements.push(node);
    if ('childNodes' in node) node.childNodes.forEach(walk);
    if ('content' in node && node.tagName === 'template') walk(node.content);
  };
  walk(document);
  const root = elements.find(node => node.tagName === 'html');
  const body = elements.find(node => node.tagName === 'body');
  // 浏览器会自动补全缺失标签，因此必须核对原始源码位置，而非仅检查解析后的DOM。
  if (!root?.sourceCodeLocation?.startTag) fail('未找到实际的 <html> 起始标签，输出可能不是完整网页');
  if (!root?.sourceCodeLocation?.endTag) fail('缺少 </html> 结束标签，输出可能被截断');
  if (!body?.sourceCodeLocation?.startTag) fail('缺少 <body> 页面内容标签');
  if (!body?.sourceCodeLocation?.endTag) fail('缺少 </body> 结束标签，页面内容未完整闭合');
  for (const element of elements) {
    if (element.tagName !== 'script' && element.tagName !== 'style') continue;
    if (!element.sourceCodeLocation?.endTag) {
      fail(`<${element.tagName}> 未闭合，位置：第 ${element.sourceCodeLocation?.startLine ?? '?'} 行`);
    }
  }
  const location = root!.sourceCodeLocation!;
  const start = cleaned.search(/<!doctype\s+html\s*>/i);
  return cleaned.slice(start >= 0 && start < location.startOffset ? start : location.startOffset, location.endTag!.endOffset);
}

export function validationDiagnostic(error: unknown, raw: string): string {
  const reason = error instanceof HtmlValidationError ? error.reason : error instanceof Error ? error.message : '未通过 HTML 结构检查';
  const tail = raw.trim().slice(-180);
  return `${reason}。返回长度：${raw.length.toLocaleString()} 字符。代码结尾：${tail || '（空）'}`;
}
