# dsh-life-decision-guide

把 [eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter) 的 `skills/life-decision-guide` 移植成 DeepSeek Harness 插件：注册一个同名 Skill + 三个查询工具，让模型**先查书再回答**，每条注明第几节第几条，查不到就说书里没写。

全书 765 条正文随包内置，装好即用，不需要联网、不需要 clone。

## 组成

| 文件 | 作用 |
|---|---|
| `skill/SKILL.md` | 指令层：安全分流 + 检索步骤 + 写作纪律 + 边界 |
| `lib/corpus.js` | 语料加载、解析、检索、性价比档计算（纯 ESM，零依赖） |
| `index.js` | 插件入口，注册 skill 与三个工具 |
| `vendor/HowToLiveBetter/` | 语料快照（book 34 节 + README + 版本记录 + 许可） |
| `tools/check.mjs` | 快照完整性校验（765 条 + 证据/性价比分布） |

工具：

| 工具 | 作用 |
|---|---|
| `life_guide_toc` | 34 节目录（节号 / 节名 / 问题 / 条数） |
| `life_guide_find` | 关键词 + 可选节号检索，返回紧凑命中（含性价比档） |
| `life_guide_read` | 按 id 取整条原文（含备注、来源），数字照抄用 |

## 安装

**npm（推荐）**

```bash
dsh plugin --profile web add dsh-life-decision-guide
```

**GitHub 直装**（npm 不可用时的备选）

```bash
dsh plugin --profile web add github:MonkeyGarry/dsh-life-decision-guide
```

或在 DSH 的 **Settings → Plugin Market** 里搜 `dsh-life-decision-guide`。

**本地开发**

让 Agent 用 `plugin_manager` 的 `install_bundle`，`target` 传本目录绝对路径（本地目录会以链接方式安装，改代码立即生效）。

装好后新会话的 skill 编目会出现 `life-decision-guide`，也可用 `/life-decision-guide` 显式触发。

## 语料

发布包已内置 `vendor/HowToLiveBetter`，普通用户不需要做任何事。

维护者更新快照（注意：快照目录已**不含 `.git`**，不能 `git pull`）：

```bash
# 1) 克隆到临时目录
tmp=$(mktemp -d)
git clone --depth 1 https://github.com/eternity4719/HowToLiveBetter.git "$tmp/hltb"

# 2) 只覆盖运行时需要的文件
cp "$tmp"/hltb/book/*.md vendor/HowToLiveBetter/book/
cp "$tmp"/hltb/README.md vendor/HowToLiveBetter/

# 3) 更新版本记录（短 sha · 日期）
git -C "$tmp/hltb" rev-parse --short HEAD
printf '%s · %s\n' "<短sha>" "$(date +%F)" > vendor/HowToLiveBetter/VERSION

# 4) 校验
node tools/check.mjs
```

期望输出 `校验通过：34 节 / 765 条，证据与性价比分布吻合。` 分布不符说明正文变了，先核对再发版。

PowerShell 版对应命令：

```powershell
$tmp = Join-Path $env:TEMP "hltb"
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
git clone --depth 1 https://github.com/eternity4719/HowToLiveBetter.git $tmp
Copy-Item "$tmp\book\*" vendor\HowToLiveBetter\book\ -Force
Copy-Item "$tmp\README.md" vendor\HowToLiveBetter\ -Force
git -C $tmp rev-parse --short HEAD
```


## 上游、许可与非官方声明

**非官方实现。** 本插件由第三方基于《高性价比人生指南》制作，与原作者无关，未获其背书，也不代表原作者的观点。

- 上游：https://github.com/eternity4719/HowToLiveBetter
- 快照：commit `5f210ca9`，2026-10-20（记录在 `vendor/HowToLiveBetter/VERSION`）
- 正文（`book/`、`README.md`）：CC BY 4.0，逐字未改，署名《高性价比人生指南》并附许可证链接。
- 指令层（`skill/SKILL.md`）与档位算法（`lib/corpus.js` 的 `COST_W`/`e.ratio`）：改编/取自原仓库 `skills/` 与 `index.html`，依 MIT 保留 `Copyright (c) 2026 eternity4719` 及许可全文。
- 完整声明见 `NOTICE`。

本插件不替代医生、律师、会计。
