import "dotenv/config";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs/promises";

async function main() {
  try {
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
    const mcpCommand = 'npx @modelcontextprotocol/server-postgres postgresql://postgres.awlyjmwlluxpdrnpqnpi:utensils.buddha.EXPELLED@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
    const process = await sandbox.commands.run(`npx -y supergateway --base-url ${url} --port 3000 --stdio "${mcpCommand}"`, 
      { 
        background: true, 
        onStdout: (data) => {
          console.log(data);
        },
        onStderr: (data) => {
          console.log(data);
        }
      });

    // Keep the script running until the server process exits
    console.log("Server is running... Press Ctrl+C to stop");
    
    // Wait for the process to complete
    //await process.wait();
    
    // Keep the script running indefinitely
    await new Promise(() => {});
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
