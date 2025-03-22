import { v4 as uuidv4 } from 'uuid';

export interface McpServer {
    name: string,
    command: string,
    apiKey: string | undefined,
    id: string 
}

export interface Mcps {
  servers: McpServer[]
}


declare global {
  var mcpsInstance: Mcps | undefined
}

const mcps = global.mcpsInstance || { servers: [] }

console.log(mcps)

if (process.env.NODE_ENV !== 'production') {
  global.mcpsInstance = mcps
}

export default mcps
