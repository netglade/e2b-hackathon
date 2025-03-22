import 'dotenv/config'
import { Sandbox } from '@e2b/code-interpreter'

const sbx = await Sandbox.create() // By default the sandbox is alive for 5 minutes
const execution = await sbx.runCode('console.log("hello world")', { language: 'deno' }) // Execute Python inside the sandbox
console.log(execution.logs)

// const files = await sbx.files.list('/')
// console.log(files)