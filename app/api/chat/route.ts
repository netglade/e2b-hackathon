import { Duration } from '@/lib/duration'
import { openai } from '@ai-sdk/openai'
import { CoreMessage, experimental_createMCPClient, generateText } from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio'
import mcps from '../state/mcps'

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

// Add interface for server type
interface McpServer {
  url: string;
  command?: string;
  name?: string;
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
    const servers = mcps.servers as McpServer[] // Type assertion here

    for (const server of servers) {
      const client = await experimental_createMCPClient({
        transport: {
          type: 'sse',
          url: server.url,
        },
      });

      clients.push(client)
    }
    
    // const clientOne = await experimental_createMCPClient({
    //   transport: {
    //     type: 'sse',
    //     url: 'https://3000-iccj2mdne89kx7p0drf2c-ae3f52e0.e2b.dev/sse',
    //   },
    // });

    // Similarly to the stdio example, you can pass in your own custom transport as long as it implements the `MCPTransport` interface:
    //const transport = new MyCustomTransport({
    //  // ...
    //});
    //clientThree = await experimental_createMCPClient({
    //  transport,
    //});

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
