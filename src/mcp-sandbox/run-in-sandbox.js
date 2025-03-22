import "dotenv/config";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs/promises";

async function main() {
  try {
    // Create a new sandbox with Node.js runtime
    console.log("Creating sandbox...");
    const sandbox = await Sandbox.create({
      template: "node",
    });

    console.log("Installing mcp-proxy...");
    await sandbox.commands.run("npm install mcp-proxy");

    // Upload and replace the SSE server file
    //console.log("Replacing SSE server file...");
    const serverContent = await fs.readFile("./startSSEServer.ts", "utf-8");
    await sandbox.files.remove("/home/user/node_modules/mcp-proxy/src/startSSEServer.ts");
    //await sandbox.files.write("/home/user/node_modules/mcp-proxy/src/startSSEServer.ts", serverContent);

    const files = await sandbox.files.list("/home/user/node_modules/.bin");
    console.log(files);
    
    console.log("Starting server...");
    const mcpCommand = 'npx @modelcontextprotocol/server-postgres "postgresql://postgres.awlyjmwlluxpdrnpqnpi:utensils.buddha.EXPELLED@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"';
    const process = await sandbox.commands.run(`npx mcp-proxy --port 3000 ${mcpCommand}`, { background: true });

    // Get the host for port 3000 (default port for the inspector)
    const host = sandbox.getHost(3000);
    const url = `https://${host}`;
    console.log("Server started at:", url);

    // Keep the script running until the server process exits
    console.log("Server is running... Press Ctrl+C to stop");
    await process.wait();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main().catch(console.error);
