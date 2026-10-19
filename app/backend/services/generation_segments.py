"""在缓冲网关内按时间预算接收模型文本，不创建后台任务。"""
import asyncio
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)
SEGMENT_SECONDS = 18
CLEANUP_SECONDS = 1


def continuation_messages(messages: list[dict], partial: str) -> list[dict]:
    if not partial:
        return messages
    return [*messages, {"role": "assistant", "content": partial},
            {"role": "user", "content": "继续上次尚未完成的HTML，从最后一个字符之后精确续写。不要重复已有内容，不要Markdown或解释，不要重新开始文档。完成全部功能和闭合标签。"}]


async def collect_segment(chunks, seconds: float = SEGMENT_SECONDS) -> dict:
    parts = []
    complete = False

    async def receive():
        async for text in chunks:
            if text:
                parts.append(text)

    try:
        # wait_for兼容Python 3.10；超时取消当前读取，不留下后台生成任务。
        await asyncio.wait_for(receive(), timeout=seconds)
        complete = True
    except asyncio.TimeoutError:
        if not parts:
            raise HTTPException(504, "模型在本段时间内未返回文本。请重试，或选择响应更快的模型。") from None
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("生成段读取失败 exception_type=%s", type(exc).__name__)
        raise HTTPException(502, "模型连接中断或上游响应异常。已接收代码保留，可重试生成。") from None
    finally:
        try:
            await asyncio.wait_for(chunks.aclose(), timeout=CLEANUP_SECONDS)
        except Exception as exc:
            logger.warning("生成段清理失败 exception_type=%s", type(exc).__name__)
    content = "".join(parts)
    if not content:
        raise HTTPException(502, "模型未返回代码，请重试或检查算力配置。")
    return {"content": content, "complete": complete}
