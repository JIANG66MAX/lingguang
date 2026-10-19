---
last_updated: 2026-10-18T10:05:36Z
---

# Architecture Design

## System Overview
灵光：中文 AI 网页应用生成工具。React/Vite前端，Auth0独立邮箱密码认证与Atoms Cloud用户隔离数据库；统一账号不再作为业务身份。内置生成通过独立会话校验后的后端接口执行。生成结果为自包含HTML，不承诺自动部署生成应用的服务端。

## Tech Stack

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| 双登录入口 | 独立邮箱密码表单与统一认证跳转并存；统一登录返回后验证原令牌并建立标记来源的业务Cookie | 统一账号用原user_id，独立账号用专属命名空间，不合并或迁移数据 |
| 灵光独立认证 | Auth0数据库连接管理邮箱密码；后端验证/token与/userinfo，应用签名HttpOnly Secure Cookie（1小时），CSRF令牌仅内存 | 不保存密码、不创建用户凭据表，业务拒绝原统一令牌 |
| 独立数据归属 | user_id=lingguang:auth0:SHA256(租户、连接、subject)；服务器强制归属与父项目校验；移除公开/all路由 | 相同邮箱不关联、不迁移，旧数据原样保留；新账号初始空空间 |
| 数据契约 | lingguang_projects(id整数,user_id字符串,title字符串)；lingguang_versions(id整数,user_id字符串,project_id整数,prompt字符串,html字符串)，均用户隔离 | 依据建表成功结果，SDK data封装读写 |
| AI接口 | 独立会话校验后调用AIHubService.gentxt，默认gpt-5.4，完整响应 | 不依赖旧统一令牌，保留前端校验、一次修复和保存路径 |
| 安全预览 | sandbox iframe仅allow-scripts，阻断网络连接 | 隔离生成代码与应用账号，生成应用只提供浏览器端功能 |
| 版本回滚 | 复制选中版本为新版本 | 保存完整版本历史，下一轮使用回滚后代码 |

## File Tree Plan

## Implementation Guide

