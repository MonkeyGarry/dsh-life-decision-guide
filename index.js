import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PKG_DIR, describeToc, findEntries, readEntries } from './lib/corpus.js'

export const inject = ['skills', 'tools']

// 从 skill/SKILL.md 读 frontmatter（name/description/whenToUse）与正文，保持单一数据源。
function readSkill() {
  const raw = readFileSync(join(PKG_DIR, 'skill', 'SKILL.md'), 'utf8')
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw)
  if (!m) throw new Error('life-decision-guide: skill/SKILL.md 缺少 frontmatter')
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let val = line.slice(i + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    fm[key] = val
  }
  if (!fm.name || !fm.description) throw new Error('life-decision-guide: SKILL.md 需要 name 与 description')
  return { name: fm.name, description: fm.description, whenToUse: fm.whenToUse, content: m[2].trim() + '\n' }
}

function textBlock(text) {
  return [{ type: 'text', text }]
}

export function apply(ctx) {
  const skill = readSkill()

  ctx.effect(() => ctx.skills.register({
    name: skill.name,
    description: skill.description,
    whenToUse: skill.whenToUse,
    source: 'custom',
    resourceBase: { kind: 'directory', path: PKG_DIR },
    content: skill.content,
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'life_guide_toc',
    description: '返回《高性价比人生指南》的 34 节目录（节号、节名、这一节回答什么问题、共几条）。先看目录，再决定查哪 1–3 节。',
    parameters: { type: 'object', properties: {} },
    output: { schema: { type: 'string' }, render: (_args, value) => textBlock(value) },
    isConcurrencySafe: () => true,
    async execute() { return describeToc() },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'life_guide_find',
    description: '在《高性价比人生指南》765 条里按中文关键词检索，返回紧凑命中（成本三元组、收益量级、证据等级、性价比档、说人话前 80 字）。要整条原文再调 life_guide_read。查不到时 matches 为空，说明书里没写这件事。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '中文关键词，空格分隔多词，例如「担保 借条」。' },
        section: { type: 'integer', description: '限定只查这一节（1–34）；省略表示全书。' },
        limit: { type: 'integer', description: '返回条数上限，1–8，默认 5。' },
      },
      required: ['query'],
    },
    output: { schema: { type: 'string' }, render: (_args, value) => textBlock(value) },
    isConcurrencySafe: () => true,
    async execute(args) { return findEntries(args) },
  }))

  ctx.effect(() => ctx.tools.register({
    name: 'life_guide_read',
    description: '按条目 id 取整条原文（成本、说人话、收益、证据等级、来源、备注），并给出来源串「第 8 节第 17 条（标题）」。回答里的数字只能从这里照抄。',
    parameters: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, description: '1–5 个条目 id，例如 ["8-17"]。' },
      },
      required: ['ids'],
    },
    output: { schema: { type: 'string' }, render: (_args, value) => textBlock(value) },
    isConcurrencySafe: () => true,
    async execute(args) { return readEntries(args.ids) },
  }))
}
