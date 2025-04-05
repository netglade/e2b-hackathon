import { Duration } from '@/lib/duration'
import { openai } from '@ai-sdk/openai'
import { CoreMessage, experimental_createMCPClient, generateText } from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'
import mcps from '../state/mcps'
import { McpSandbox } from '@netglade/mcp-sandbox'
import { setSandboxTimeout } from '@/app/actions/sandbox'
import { McpServer, toPublicServer } from '@/app/api/state/mcps'
import { extendOrRestartServer } from '@/app/actions/publish'

export const maxDuration = 60

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export interface ToolCallArgument {
  name: string
  value: string
}

export interface ToolCall {
  name: string
  arguments: ToolCallArgument[]
  result: string,
  id: string,
}

async function waitForServerReady(url: string, maxAttempts = 5): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 200) {
        console.log(`Server ready at ${url} after ${i + 1} attempts`);
        return true;
      }
      console.log(`Server not ready yet (attempt ${i + 1}), status: ${response.status}`);
    } catch (error) {
      console.log(`Server connection failed (attempt ${i + 1})`);
    }
    // Wait 2 seconds between attempts
    await new Promise(resolve => setTimeout(resolve, 6000));
  }
  return false;
}

export async function POST(req: Request) {
  const {
    messages,
  }: {
    messages: CoreMessage[]
  } = await req.json()

  //  const limit = !config.apiKey
  //    ? await ratelimit(
  //        userID,
  //        rateLimitMaxRequests,
  //        ratelimitWindow,
  //      )
  //    : false
  //
  //  if (limit) {
  //    return new Response('You have reached your request limit for the day.', {
  //      status: 429,
  //      headers: {
  //        'X-RateLimit-Limit': limit.amount.toString(),
  //        'X-RateLimit-Remaining': limit.remaining.toString(),
  //        'X-RateLimit-Reset': limit.reset.toString(),
  //      },
  //    })
  //  }
  //
  //  console.log('userID', userID)
  //  // console.log('template', template)
  //  console.log('model', model)
  //  // console.log('config', config)
  //
  //  const { model: modelNameString, apiKey: modelApiKey, ...modelParams } = config
  //  const modelClient = getModelClient(model, config)
  //
  //  const stream = await streamObject({
  //    model: modelClient as LanguageModel,
  //    schema,
  //    system: toPrompt(template),
  //    messages,
  //    mode: getDefaultMode(model),
  //    ...modelParams,
  //  })
  //
  //  return stream.toTextStreamResponse()
  let clients: any[] = []
  try {
    const servers = mcps.servers.map(toPublicServer);
    const readyServers: typeof servers = [];
    const needsInitialization: typeof servers = [];

    // Phase 1: Check all servers, extend or restart as needed
    console.log("Phase 1: Checking servers...");
    for (const server of servers) {
        try {
            const wasRestarted = await extendOrRestartServer(server.id);
            if (wasRestarted) {
                needsInitialization.push(server);
            } else {
                readyServers.push(server);
            }
        } catch (error) {
            console.error(`Failed to handle server ${server.name}:`, error);
            continue;
        }
    }

    // Phase 2: Wait for restarted servers to be ready
    console.log("Phase 2: Waiting for restarted servers...");
    for (const server of needsInitialization) {
        if (server.url) {
            const isReady = await waitForServerReady(server.url);
            if (!isReady) {
                console.log(`Server ${server.name} failed to initialize properly`);
                continue;
            }
            readyServers.push(server);
        }
    }

    // Phase 3: Create clients for all ready servers
    console.log("Phase 3: Creating clients...");
    for (const server of readyServers) {
        const client = await experimental_createMCPClient({
            transport: {
                type: 'sse',
                url: server.url!,
            },
        });
        clients.push(client);
    }

    let tools = {}
    for (const client of clients) {
      const toolSet = await client.tools()
      console.log('Tools fetched:', toolSet)
      tools = {
        ...tools,
        ...toolSet,
      }
    }

    const response = await generateText({
      model: openai('gpt-4o'),
      tools,
      maxSteps: 20,
      messages,
    })

    console.log(JSON.stringify(response.response.messages))
    console.log(response.text)

    const toolCalls = extractToolCalls(response.response.messages)
    console.log(JSON.stringify(toolCalls))

    return new Response(
      JSON.stringify({
        text: response.text,
        toolCalls,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  } finally {
    for (const client of clients) {
      if (client) {
        await client.close()
      }
    }
  }
}

function extractToolCalls(conversation: any[]): ToolCall[] {
  const toolCalls: ToolCall[] = []

  // Iterate through the conversation
  for (let i = 0; i < conversation.length - 1; i++) {
    const currentMessage = conversation[i]

    // Check if this is an assistant message with tool calls
    if (currentMessage.role === 'assistant' && currentMessage.content) {
      // Find the tool-call item in the content array (there can only be one per message)
      const toolCallContent = currentMessage.content.find(
        (item: any) => item.type === 'tool-call',
      )

      // Process the tool call if found
      if (toolCallContent) {
        const toolCallId = toolCallContent.toolCallId
        const toolName = toolCallContent.toolName
        const args = toolCallContent.args

        // Look for the corresponding tool response
        const nextMessage = conversation[i + 1]
        if (nextMessage.role === 'tool' && nextMessage.content) {
          // Find the matching tool result
          const toolResult = nextMessage.content.find(
            (item: any) =>
              item.type === 'tool-result' && item.toolCallId === toolCallId,
          )

          if (toolResult) {
            // Extract the result text
            const resultText = toolResult.result.content?.[0]?.text || ''

            // Convert args object to ToolCallArgument array
            const argsArray: ToolCallArgument[] = Object.entries(args).map(
              ([name, value]) => ({
                name,
                value: String(value),
              }),
            )

            // Add the tool call to our collection
            toolCalls.push({
              name: toolName,
              arguments: argsArray,
              result: resultText,
              id: toolCallId,
            })
          }
        }
      }
    }
  }

  return toolCalls
}
