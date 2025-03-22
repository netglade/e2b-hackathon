'use server'

import mcps, { McpServer } from '../api/state/mcps'
import { Duration, ms } from '@/lib/duration'
import { Sandbox } from '@e2b/code-interpreter'
import { kv } from '@vercel/kv'
import { customAlphabet } from 'nanoid'
import { v4 as uuidv4 } from 'uuid';


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

export async function addMcp(server: McpServer) {
  server.id = uuidv4()
  mcps.servers.push(server)
}
