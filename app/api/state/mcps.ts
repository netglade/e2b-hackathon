export type McpServerState = 'loading' | 'running' | 'error'

export interface McpServer {
  name: string
  command: string
  apiKey: string | undefined
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
  servers: [
    {
      command:
        'npx @modelcontextprotocol/server-postgres postgresql://postgres.awlyjmwlluxpdrnpqnpi:utensils.buddha.EXPELLED@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
      name: 'postgres',
    },
  ],
}

console.log(mcps)

if (process.env.NODE_ENV !== 'production') {
  global.mcpsInstance = mcps
}

export default mcps
