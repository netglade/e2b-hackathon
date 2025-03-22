import { Duration } from '@/lib/duration'
import { getModelClient, getDefaultMode } from '@/lib/models'
import { LLMModel, LLMModelConfig } from '@/lib/models'
import { toPrompt } from '@/lib/prompt'
import ratelimit from '@/lib/ratelimit'
import { fragmentSchema as schema } from '@/lib/schema'
import { Templates } from '@/lib/templates'
import { streamObject, LanguageModel, CoreMessage, experimental_createMCPClient, generateText } from 'ai'
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';
import { openai } from '@ai-sdk/openai';


export const maxDuration = 60

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 10
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : '1d'

export async function POST(req: Request) {
  const {
    messages,
    userID,
    template,
    model,
    config,
  }: {
    messages: CoreMessage[]
    userID: string
    template: Templates
    model: LLMModel
    config: LLMModelConfig
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
let clientOne : any;
try {
    // Initialize an MCP client to connect to a `stdio` MCP server:
    const transport = new Experimental_StdioMCPTransport({
      command: 'node',
      args: ['./app/api/servers/stdio/calculator.js'],
    });
    clientOne = await experimental_createMCPClient({
      transport,
    });

    // Alternatively, you can connect to a Server-Sent Events (SSE) MCP server:
    //clientTwo = await experimental_createMCPClient({
    //  transport: {
    //    type: 'sse',
    //    url: 'http://localhost:3000/sse',
    //  },
    //});

    // Similarly to the stdio example, you can pass in your own custom transport as long as it implements the `MCPTransport` interface:
    //const transport = new MyCustomTransport({
    //  // ...
    //});
    //clientThree = await experimental_createMCPClient({
    //  transport,
    //});

    const toolSetOne = await clientOne.tools();
    //const toolSetTwo = await clientTwo.tools();
    //const toolSetThree = await clientThree.tools();
    const tools = {
      ...toolSetOne,
      //...toolSetTwo,
      //...toolSetThree, // note: this approach causes subsequent tool sets to override tools with the same name
    };

    const response = await generateText({
      model: openai('gpt-4o'),
      tools,
      messages: messages
    });

    console.log(response);
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to process request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } finally {
    if (clientOne) {
      await clientOne.close();
    }
  }
}
