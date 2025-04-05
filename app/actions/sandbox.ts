'use server'

import mcps from '../api/state/mcps'

export async function setSandboxTimeout(serverId: string, timeout: number) {
  const server = mcps.servers.find(s => s.id === serverId)
  if (server?.sandbox) {
    await server.sandbox.sandbox.setTimeout(timeout)
    return true
  }
  return false
}