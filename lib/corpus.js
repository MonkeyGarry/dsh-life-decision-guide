// 《高性价比人生指南》语料加载与检索（纯 ESM，零依赖）。
// 数据源：vendor/HowToLiveBetter（用户一次 git clone 得到的内置快照）。
// 档位算法：从 index.html 现场抽取并核对（来源 blob b95508a104c0795f3cb56df9ef874969d61349be）。
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(PKG_DIR, 'vendor', 'HowToLiveBetter')

// 成本权重（index.html 里 COST_W，原样保留字符串键）。
export const COST_W = {
  money: { '0': 0, '少': 1, '多': 2 },
  time:  { '少': 0, '中': 1, '多': 2 },
  will:  { '否': 0, '些': 1, '是': 2 },
}

const LENS_LABEL = { '死亡率': '换寿命', '金钱': '换钱', '时间': '换时间精力', '自由': '换人身自由' }

// 与 index.html 里 e.ratio 完全一致：cs = 钱+时间+毅力，取值 0..6。
function ratioOf(e) {
  const cs = (COST_W.money[e.money] ?? 0) + (COST_W.time[e.time] ?? 0) + (COST_W.will[e.will] ?? 0)
  if (e.level === '大') return cs === 0 ? '极高' : cs <= 2 ? '高' : '一般'
  if (e.level === '中') return cs === 0 ? '高' : '一般'
  return '一般'
}

function readVendorVersion() {
  try {
    const v = readFileSync(join(VENDOR, 'VERSION'), 'utf8').split(/\r?\n/)[0].trim()
    if (v) return v
  } catch {}
  try {
    const head = readFileSync(join(VENDOR, '.git', 'HEAD'), 'utf8').trim()
    if (head.startsWith('ref:')) {
      const refPath = join(VENDOR, '.git', head.slice(5).trim())
      if (existsSync(refPath)) return readFileSync(refPath, 'utf8').trim()
    } else if (head.length > 0) {
      return head
    }
  } catch {}
  try {
    const shallow = join(VENDOR, '.git', 'shallow')
    if (existsSync(shallow)) return readFileSync(shallow, 'utf8').trim()
  } catch {}
  return 'unknown'
}

// 从 README.md 里抽 34 节：文件清单取全部 ](book/*.md) 链接（与在线页同一套逻辑），
// 节号/节名/问题取「这本书想回答的问题」表。
function parseSections(readme) {
  const files = [...new Set(Array.from(readme.matchAll(/\]\((book\/[^)]+\.md)\)/g), (m) => m[1]))].sort()
  const info = {}
  const rowRe = /^\|\s*([^|\n]+?)\s*\|\s*\[(\d+)\.\s*([^\]]+)\]\((book\/[^)]+\.md)\)\s*\|/gm
  for (const m of readme.matchAll(rowRe)) {
    info[m[4]] = { n: m[2], title: m[3].trim(), question: m[1].trim() }
  }
  return files.map((f) => ({
    file: f,
    n: info[f]?.n ?? '',
    title: info[f]?.title ?? '',
    question: info[f]?.question ?? '',
  }))
}

const FIELD_KEYS = { '成本': 'cost', '说人话': 'plain', '收益': 'benefit', '证据等级': 'evidence', '来源': 'source', '备注': 'note' }

// 解析一个节文件里的全部条目（### N. 标题 … 到下一个标题）。
function parseEntries(text, sec) {
  const lines = text.split(/\r?\n/)
  const entries = []
  let cur = null
  let lastField = null
  const flush = () => {
    if (!cur) return
    cur.raw = cur.rawLines.join('\n').replace(/\s+$/u, '')
    delete cur.rawLines
    entries.push(cur)
    cur = null
    lastField = null
  }
  for (const line of lines) {
    const l = line.replace(/\s+$/u, '')
    const h = /^### (\d+)\.\s+(.+)$/.exec(l)
    if (h) {
      flush()
      cur = {
        sec,
        n: h[1],
        title: h[2].trim(),
        money: '', time: '', will: '', level: '', lens: '', who: [],
        cost: '', plain: '', benefit: '', evidence: '', source: '', note: '',
        rawLines: [line],
      }
      continue
    }
    if (!cur) continue
    cur.rawLines.push(line)
    const tag = /^\x3c!--\s*成本标签:\s*(.*?)\s*-->/.exec(l)
    if (tag) {
      for (const kv of tag[1].split(/\s+/)) {
        const i = kv.indexOf('=')
        if (i < 0) continue
        const k = kv.slice(0, i)
        const v = kv.slice(i + 1)
        if (k === '钱') cur.money = v
        else if (k === '时间') cur.time = v
        else if (k === '毅力') cur.will = v
        else if (k === '收益') cur.level = v
        else if (k === '口径') cur.lens = v
        else if (k === '人群') cur.who = v.split(',').map((g) => g.split('+'))
      }
      continue
    }
    const f = /^-\s*(成本|说人话|收益|证据等级|来源|备注)\s*[:：]\s*(.*)$/.exec(l)
    if (f) {
      const key = FIELD_KEYS[f[1]]
      cur[key] = f[2].trim()
      lastField = key
      continue
    }
    if (lastField && l && !/^#/.test(l) && !/^-\s/.test(l)) {
      cur[lastField] = (cur[lastField] ? cur[lastField] + '\n' : '') + l.trim()
    }
  }
  flush()
  return entries
}

function finalize(e) {
  e.ratio = ratioOf(e)
  e.id = `${e.sec}-${e.n}`
  e.cite = `第 ${e.sec} 节第 ${e.n} 条（${e.title}）`
  e.searchText = [e.title, e.plain, e.benefit, e.note, e.cost].join(' ')
  return e
}

let corpus = null

export function loadCorpus() {
  if (corpus) return corpus
  const readmePath = join(VENDOR, 'README.md')
  if (!existsSync(readmePath)) {
    throw new Error(
      'life-decision-guide：语料快照缺失。请先在插件目录执行一次：\n' +
      'git clone --depth 1 https://github.com/eternity4719/HowToLiveBetter.git "vendor/HowToLiveBetter"\n' +
      '（详见插件 README.md 的「获取语料」一节。）'
    )
  }
  const readme = readFileSync(readmePath, 'utf8')
  const sections = parseSections(readme)
  const entries = []
  for (const sec of sections) {
    const p = join(VENDOR, sec.file)
    if (!existsSync(p)) continue
    for (const e of parseEntries(readFileSync(p, 'utf8'), sec.n)) entries.push(finalize(e))
  }
  if (entries.length < 500) {
    throw new Error(
      `life-decision-guide：只解析到 ${entries.length} 条（期望约 765 条），语料快照可能不完整或解析失败。` +
      ' 请重新 clone 或运行 node tools/check.mjs 检查。'
    )
  }
  corpus = {
    version: readVendorVersion(),
    sections,
    entries,
    byId: new Map(entries.map((e) => [e.id, e])),
  }
  return corpus
}

function sectionCount(c, n) {
  let count = 0
  for (const e of c.entries) if (e.sec === n) count++
  return count
}

export function stats() {
  const c = loadCorpus()
  const evidence = (g) => c.entries.filter((e) => e.evidence === g).length
  return {
    version: c.version,
    sections: c.sections.length,
    entries: c.entries.length,
    A: evidence('A'),
    B: evidence('B'),
    C: evidence('C'),
    disputed: c.entries.filter((e) => /争议/.test(e.note || '')).length,
    todo: c.entries.filter((e) => /TODO/i.test(e.note || '')).length,
    hi: c.entries.filter((e) => e.ratio === '极高').length,
    med: c.entries.filter((e) => e.ratio === '高').length,
    low: c.entries.filter((e) => e.ratio === '一般').length,
  }
}

export function describeToc() {
  const c = loadCorpus()
  const lines = c.sections.map((s) => `${s.n} · ${s.title} · ${s.question} · ${sectionCount(c, s.n)} 条`)
  return `《高性价比人生指南》目录（书版本 ${c.version}，共 ${c.entries.length} 条）\n\n${lines.join('\n')}`
}

function compact(e) {
  const who = e.who.length ? ` 人群=${e.who.map((g) => g.join('+')).join(',')}` : ''
  const cost = `钱=${e.money || '?'} 时间=${e.time || '?'} 毅力=${e.will || '?'} 收益=${e.level || '?'}`
  const lens = LENS_LABEL[e.lens] || e.lens || '口径未标'
  const plain = (e.plain || '').replace(/\s+/g, ' ').slice(0, 80)
  return `${e.id} [${e.evidence || '?'}级 · 性价比${e.ratio} · ${lens}] ${e.title}\n    ${cost}${who}\n    ${plain}`
}

export function findEntries(args) {
  const c = loadCorpus()
  const query = String(args && args.query != null ? args.query : '').trim()
  if (!query) throw new Error('query 不能为空：给出中文关键词，例如「担保 借条」。')
  const section = args && args.section != null ? Number(args.section) : undefined
  const rawLimit = args && args.limit != null ? Number(args.limit) : 5
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 8) : 5
  const tokens = query.split(/\s+/).filter(Boolean)
  const scored = []
  for (const e of c.entries) {
    if (section !== undefined && Number.isInteger(section) && Number(e.sec) !== section) continue
    let score = 0
    for (const t of tokens) {
      if (e.title.includes(t)) score += 4
      if (e.plain.includes(t)) score += 2
      if (e.benefit.includes(t)) score += 2
      if (e.note.includes(t)) score += 1
      if (e.cost.includes(t)) score += 1
    }
    if (score > 0) scored.push({ e, score })
  }
  scored.sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id))
  const hits = scored.slice(0, limit)
  if (hits.length === 0) {
    return `书版本 ${c.version} · 命中 0 条（共 ${c.entries.length} 条）。\n\n书里没有直接命中「${query}」的条目。不要凭记忆编造书里的数字；可以给常识判断，但要标明那是常识、不是书里的内容。`
  }
  const lines = hits.map((h) => compact(h.e))
  return `书版本 ${c.version} · 命中 ${hits.length} 条（共 ${c.entries.length} 条）\n\n${lines.join('\n\n')}\n\n要整条原文，调 life_guide_read，例如 ids: ["${hits[0].e.id}"]。`
}

export function readEntries(ids) {
  const c = loadCorpus()
  const list = Array.isArray(ids) ? ids : [ids]
  if (list.length === 0 || list.length > 5) throw new Error('ids 必须是 1–5 个条目 id。')
  const parts = []
  for (const raw of list) {
    const id = String(raw).trim()
    const e = c.byId.get(id)
    if (!e) {
      parts.push(`— ${id}：没有这个条目 id。先用 life_guide_find 或 life_guide_toc 查正确的 id。`)
      continue
    }
    parts.push(`【${e.cite}】\n${e.raw}`)
  }
  return `《高性价比人生指南》原文（书版本 ${c.version}）。数字照抄，不要改写或四舍五入。\n\n${parts.join('\n\n---\n\n')}`
}
