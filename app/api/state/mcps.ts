import { v4 as uuidv4 } from 'uuid';

interface McpServer {
    name: string,
    id: string 
}

interface Mcps {
  servers: McpServer[]
}


declare global {
  var mcpsInstance: Mcps | undefined
}

const mcps = global.mcpsInstance || { servers: [{ name: 'calculator', id: uuidv4()}] }

if (process.env.NODE_ENV !== 'production') {
  global.mcpsInstance = mcps
}

export default mcps
