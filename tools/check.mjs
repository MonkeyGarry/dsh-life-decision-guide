import { loadCorpus, stats } from '../lib/corpus.js'

const EXPECT = {
  sections: 34,
  entries: 765,
  A: 495,
  B: 218,
  C: 52,
  disputed: 88,
  todo: 3,
  hi: 122,
  med: 344,
  low: 299,
}

const s = stats()
console.log(`书版本 ${s.version}\n`)
let ok = true
for (const [key, expected] of Object.entries(EXPECT)) {
  const got = s[key]
  const pass = got === expected
  if (!pass) ok = false
  console.log(`${pass ? '✓' : '✗'} ${key}: ${got}（期望 ${expected}）`)
}
if (!ok) {
  console.error('\n统计与全书分布不一致：请检查 vendor/HowToLiveBetter 快照是否完整、是否为最新版本。')
  process.exit(1)
}
console.log('\n校验通过：34 节 / 765 条，证据与性价比分布吻合。')
