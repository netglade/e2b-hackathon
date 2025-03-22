'use server'

import mcps, { McpServer, McpServerState } from '../api/state/mcps'
import { Duration, ms } from '@/lib/duration'
import { kv } from '@vercel/kv'
import { customAlphabet } from 'nanoid'
import { v4 as uuidv4 } from 'uuid'
import { Sandbox } from "@e2b/code-interpreter";

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
    console.log("Starting server...");
    let url = await runMCPInSandbox(command, envs);
    console.log("URL:", url);
    const server = mcps.servers.find(server => server.id === id)

    if (server) {
      server.url = url;
      server.state = 'running' as McpServerState;
    }
    
}

async function runMCPInSandbox(mcpCommand: string, envs: Record<string, string>) {
  // Create a new sandbox with Node.js runtime
  console.log("Creating sandbox...");
  const sandbox = await Sandbox.create({
    template: "node",
    timeoutMs: 1000 * 60 * 10,
  });

  const host = sandbox.getHost(3000);
  const url = `https://${host}`;
  console.log("Server started at:", url);

  console.log("Starting server...");
  const process = await sandbox.commands.run(
    `npx -y supergateway --base-url ${url} --port 3000 --stdio "${mcpCommand}"`,
    {
      envs: envs,
      background: true,
      onStdout: (data) => {
        console.log(data);
      },
      onStderr: (data) => {
        console.log(data);
      }
    }
  );

  return url;
}
