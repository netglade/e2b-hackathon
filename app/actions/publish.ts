'use server'

import mcps, { McpServer, McpServerState } from '../api/state/mcps'
import { Duration, ms } from '@/lib/duration'
import { Sandbox } from '@e2b/code-interpreter'
import { kv } from '@vercel/kv'
import { customAlphabet } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { runMCPInSandbox } from '@/src/mcp-sandbox/run-in-sandbox'

const nanoid = customAlphabet('1234567890abcdef', 7)

export async function publish(
  url: string,
  sbxId: string,
  duration: Duration,
  apiKey: string | undefined,
) {
  const expiration = ms(duration)
  await Sandbox.setTimeout(sbxId, expiration, { apiKey })

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const id = nanoid()
    await kv.set(`fragment:${id}`, url, { px: expiration })

    return {
      url: process.env.NEXT_PUBLIC_SITE_URL
        ? `https://${process.env.NEXT_PUBLIC_SITE_URL}/s/${id}`
        : `/s/${id}`,
    }
  }

  return {
    url,
  }
}

export async function getMcps() {
  return mcps
}

export async function removeMcp(id: string) {
  mcps.servers = mcps.servers.filter((server) => server.id !== id)
}

export async function addMcp(server: {
  name: string
  command: string
  envs: Record<string, string>
}) {
  let serverToAdd: McpServer = {
    name: server.name,
    command: server.command,
    envs: server.envs,
    id: uuidv4(),
    state: 'loading',
    url: undefined,
  }
  mcps.servers.push(serverToAdd)

  startServer(serverToAdd.command, serverToAdd.envs, serverToAdd.id)
}

async function startServer(command: string, envs: Record<string, string>, id: string)
{
    let url = await runMCPInSandbox(command, envs);
    const server = mcps.servers.find(server => server.id === id)

    if (server) {
      server.url = url;
      server.state = 'running' as McpServerState;
    }
    
}
