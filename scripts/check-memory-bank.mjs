// Checks .memory-bank consistency (see .memory-bank/mbb/principles.md, indexing.md, frontmatter.md):
// - relative links to .md files point to existing files;
// - every document has an incoming link (no orphans);
// - every document has a status line right after the title.
import * as fs from 'fs'
import * as path from 'path'

const ROOT = process.cwd()
const MEMORY_BANK = path.join(ROOT, '.memory-bank')
const ENTRY_FILES = ['AGENTS.md', 'CLAUDE.md'].map((f) => path.join(ROOT, f))
const STATUS_EXEMPT = [path.join(MEMORY_BANK, 'index.md')]
const STATUS_LINE = /^Status: (Draft|Active|Template|Superseded)( \(\d{4}-\d{2}-\d{2}\))?$/

const docs = fs
  .readdirSync(MEMORY_BANK, { recursive: true })
  .filter((f) => f.endsWith('.md'))
  .map((f) => path.join(MEMORY_BANK, f))

const errors = []
const linked = new Set()

for (const file of [...ENTRY_FILES.filter((f) => fs.existsSync(f)), ...docs]) {
  const text = stripCode(fs.readFileSync(file, 'utf8'))
  for (const match of text.matchAll(/\]\(([^)\s]+?\.md)(#[^)]*)?\)/g)) {
    const target = match[1]
    if (/^[a-z]+:\/\//i.test(target)) continue
    const resolved = path.resolve(path.dirname(file), target)
    if (fs.existsSync(resolved)) {
      if (resolved !== file) linked.add(resolved)
    } else {
      errors.push(`${rel(file)}: broken link -> ${target}`)
    }
  }
}

for (const doc of docs) {
  if (!linked.has(doc)) {
    errors.push(`${rel(doc)}: orphan (no incoming links)`)
  }
  if (!STATUS_EXEMPT.includes(doc)) {
    const lines = fs.readFileSync(doc, 'utf8').split(/\r?\n/)
    if (!lines[0].startsWith('# ') || !STATUS_LINE.test(lines[1] ?? '')) {
      errors.push(`${rel(doc)}: expected "# Title" and "Status: <Draft|Active|Template|Superseded> (YYYY-MM-DD)" on lines 1-2`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  console.error(`\n❌ Memory bank check failed: ${errors.length} problem(s)`)
  process.exit(1)
}
console.log(`✅ Memory bank check passed: ${docs.length} documents`)

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '')
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}
