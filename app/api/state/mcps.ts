import { McpSandbox } from '@netglade/mcp-sandbox'

// Backend interface with sandbox
export interface McpServer {
  name: string
  command: string
  envs: Record<string, string>
  id: string
  url: string | undefined
  state: McpServerState
  sandbox?: McpSandbox
}

// Frontend interface without sandbox
export interface McpServerPublic {
  name: string
  command: string
  envs: Record<string, string>
  id: string
  url: string | undefined
  state: McpServerState
}

export type McpServerState = 'loading' | 'running' | 'error'

export interface Mcps {
  servers: McpServer[]
}

// Helper function to convert to frontend-safe version
export function toPublicServer(server: McpServer): McpServerPublic {
  const { sandbox, ...publicServer } = server
  return publicServer
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
