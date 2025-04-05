'use server'

import mcps, { McpServer, McpServerState, toPublicServer } from '../api/state/mcps'
import { Duration, ms } from '@/lib/duration'
import { kv } from '@vercel/kv'
import { customAlphabet } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { Sandbox } from "@e2b/code-interpreter";
import { startMcpSandbox } from "@netglade/mcp-sandbox";

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
  return {
    servers: mcps.servers.map(toPublicServer)
  }
}

export async function removeMcp(id: string) {
  mcps.servers = mcps.servers.filter((server) => server.id !== id)
}

export async function addMcp(server: {
  name: string
  command: string
  envs: Record<string, string>
}) {
  console.log('Adding new server:', {
    name: server.name,
    command: server.command,
    envs: server.envs
  });

  let serverToAdd: McpServer = {
    name: server.name,
    command: server.command,
    envs: server.envs,
    id: uuidv4(),
    state: 'loading',
    url: undefined,
    sandbox: undefined,
  }

  mcps.servers.push(serverToAdd)

  startServer(serverToAdd.command, serverToAdd.envs, serverToAdd.id)
}

async function startServer(command: string, envs: Record<string, string>, id: string)
{
    console.log("Starting server...");

    const sandbox = await startMcpSandbox({
      command: command,
      apiKey: process.env.E2B_API_KEY!,
      envs: envs,
      timeoutMs: 1000 * 60 * 10,
    })
    
    const url = sandbox.getUrl();

    const server = mcps.servers.find(server => server.id === id)

    if (server) {
      server.url = url;
      server.state = 'running' as McpServerState;
      server.sandbox = sandbox;
    }
    
}

export async function extendOrRestartServer(serverId: string): Promise<boolean> {
  const server = mcps.servers.find(server => server.id === serverId);
  if (!server) {
    throw new Error(`Server not found: ${serverId}`);
  }

  // Check if server is running
  if (server.sandbox) {
    const isRunning = await server.sandbox.sandbox.isRunning();
    if (isRunning) {
      // Extend timeout if server is running
      await server.sandbox.sandbox.setTimeout(300_000);
      console.log("Server is running, timeout extended:", server.url);
      return false; // Not restarted
    }
    console.log("Server stopped, restarting...");
  }

  // Server not running, restart it
  try {
    const sandbox = await startMcpSandbox({
      command: server.command,
      apiKey: process.env.E2B_API_KEY!,
      envs: server.envs,
      timeoutMs: 1000 * 60 * 10,
    });
    
    const newUrl = sandbox.getUrl();
    
    // Update server with new sandbox and URL
    server.url = newUrl;
    server.sandbox = sandbox;
    server.state = 'running' as McpServerState;
    
    console.log("Server restarted successfully:", newUrl);
    return true; // Was restarted
  } catch (error) {
    console.error("Failed to restart server:", error);
    server.state = 'error' as McpServerState;
    throw error; // Propagate the error
  }
}
