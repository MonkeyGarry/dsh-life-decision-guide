# life-decision-guide（DSH 插件）

把 [eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter) 的 `skills/life-decision-guide` 移植成 DeepSeek Harness 插件：注册一个同名 Skill + 三个查询工具，让模型**先查书再回答**，每条注明第几节第几条，查不到就说书里没写。

## 组成

- `skill/SKILL.md`：指令层（安全分流 + 检索步骤 + 写作纪律 + 边界）。
- `lib/corpus.js`：语料加载、解析、检索、档位计算（纯 ESM，零依赖）。
- `index.js`：插件入口，注册 skill 与三个工具。
- `vendor/HowToLiveBetter/`：语料快照（需你 clone 一次，见下）。
- `tools/check.mjs`：校验快照完整性（765 条 + 证据/性价比分布）。

工具：

| 工具 | 作用 |
|---|---|
| `life_guide_toc` | 34 节目录（节号 / 节名 / 问题 / 条数） |
| `life_guide_find` | 关键词 + 可选节号检索，返回紧凑命中（含性价比档） |
| `life_guide_read` | 按 id 取整条原文（含备注、来源），数字照抄用 |

## 语料

**发布版已内置**：`vendor/HowToLiveBetter` 随 npm 包一起发布，装好即可用，**不需要 clone**。

只有本地开发或更新快照时才需要手动准备：

```bash
git clone --depth 1 https://github.com/eternity4719/HowToLiveBetter.git vendor/HowToLiveBetter
```

- 更新：`git -C vendor/HowToLiveBetter pull`，然后重启 DSH。
- 没装 git 也可以下 ZIP：解压成 `vendor/HowToLiveBetter`，再新建 `VERSION` 写 `短sha · 日期`（如 `5f210ca9 · 2026-10-20`）。

## 安装

**从市场 / npm 装（发布后）**

```bash
dsh plugin --profile web add dsh-life-decision-guide
```

或在 DSH 的 **Settings → Plugin Market** 里搜 `dsh-life-decision-guide`。

**本地开发装**：让 Agent 用 `plugin_manager` 的 `install_bundle`，`target` 传本目录绝对路径。

装好后新会话的 skill 编目会出现 `life-decision-guide`，也可用 `/life-decision-guide` 显式触发。

## 校验快照（维护者，可选）

```bash
node tools/check.mjs
```

期望输出 `校验通过：34 节 / 765 条，证据与性价比分布吻合。`

> 未声明 `engines.dsh`：DSH 目前的版本号带预发布标签（如 `0.2.1-rc.2`），semver 范围容易误判，而 `engines.dsh` 不满足会直接阻断安装，所以首版先不写。插件在 `0.2.1-rc.2` 上验证通过。

## 上游、许可与非官方声明

**非官方实现。** 本插件由第三方基于《高性价比人生指南》制作，与原作者无关，未获其背书，也不代表原作者的观点。

- 上游：https://github.com/eternity4719/HowToLiveBetter
- 快照：commit `5f210ca9`，2026-10-20（记录在 `vendor/HowToLiveBetter/VERSION`）
- 正文（`book/`、`README.md`）：CC BY 4.0，逐字未改，署名《高性价比人生指南》并附许可证链接。
- 指令层（`skill/SKILL.md`）与档位算法（`lib/corpus.js` 的 `COST_W`/`e.ratio`）：改编/取自原仓库 `skills/` 与 `index.html`，依 MIT 保留 `Copyright (c) 2026 eternity4719` 及许可全文。
- 完整声明见 `NOTICE`。

本插件不替代医生、律师、会计。
