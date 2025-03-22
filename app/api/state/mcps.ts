import { v4 as uuidv4 } from 'uuid'

export type McpServerState = 'loading' | 'running' | 'error'

export interface McpServer {
  name: string
  command: string
  envs: Record<string, string>
  id: string
  url: string | undefined
  state: McpServerState
}

export interface Mcps {
  servers: McpServer[]
}

declare global {
  var mcpsInstance: Mcps | undefined
}

const mcps = global.mcpsInstance || {
  servers: [],
}

console.log(mcps)

// if (process.env.NODE_ENV !== 'production') {
// }
global.mcpsInstance = mcps

export default mcps
