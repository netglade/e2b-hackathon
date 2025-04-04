import "dotenv/config";
import { Sandbox } from "@e2b/code-interpreter";

export async function runMCPInSandbox(mcpCommand, envs) {
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

async function main() {
  try {
    const mcpCommand = 'npx @modelcontextprotocol/server-postgres postgresql://postgres.awlyjmwlluxpdrnpqnpi:utensils.buddha.EXPELLED@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    const url = await runMCPInSandbox(mcpCommand);
    console.log("Server is running at:", url);
    await new Promise(() => {}); // Keep main process running
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
