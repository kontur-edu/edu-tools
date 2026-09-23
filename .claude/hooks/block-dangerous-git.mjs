// PreToolUse hook (Bash | PowerShell): blocks dangerous git commands.
// Node port of .claude/skills/git-guardrails-claude-code/scripts/block-dangerous-git.sh,
// so it works on Windows and in Codespaces without bash/jq.
// Exit 2 = block the tool call and show stderr to Claude.
import { readFileSync } from 'fs'

const DANGEROUS_PATTERNS = [
  /git push/,
  /git reset --hard/,
  /git clean -fd/,
  /git clean -f/,
  /git branch -D/,
  /git checkout \./,
  /git restore \./,
  /push --force/,
  /reset --hard/,
]

let command = ''
try {
  command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? ''
} catch {
  process.exit(0)
}

const match = DANGEROUS_PATTERNS.find((pattern) => pattern.test(command))
if (match) {
  console.error(
    `BLOCKED: '${command}' matches dangerous pattern '${match.source}'. The user has prevented you from doing this.`,
  )
  process.exit(2)
}
process.exit(0)
