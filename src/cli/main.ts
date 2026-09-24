import { NodeCredentials } from '../apis/NodeCredentials.js'
import { runProgramAsync } from './program.js'

// stdout принадлежит результату команды (при --json — только JSON), поэтому диагностика
// API-клиентов и исполнителей через console.log уходит в stderr.
console.log = console.error
console.info = console.error
console.debug = console.error

runProgramAsync(
  {
    credentials: NodeCredentials.fromProcess(),
    streams: {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    },
    setExitCode: (code) => (process.exitCode = code),
  },
  process.argv.slice(2),
).catch((error) => {
  console.error(error)
  process.exitCode = 1
})
