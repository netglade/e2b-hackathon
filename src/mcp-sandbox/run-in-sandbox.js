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

    // Read the demo server code
    console.log("Reading demo server code...");
    const demoServerCode = await fs.readFile("./demo-server.js", "utf-8");

    // Install required dependencies in the sandbox
    console.log("Installing dependencies...");

    // Write the demo server code to a file in the sandbox
    console.log("Writing server code to sandbox...");
    await sandbox.files.write("/app/demo-server.js", demoServerCode);

    // Check Node.js version
    console.log("Checking Node.js version...");
    const versionProcess = await sandbox.commands.run("node --version");
    console.log("Node.js version:", versionProcess.stdout);

    // Create package.json to ensure ES modules are enabled
    await sandbox.files.write("/app/package.json", JSON.stringify({
      "type": "module",
      "dependencies": {
        "@e2b/code-interpreter": "^1.0.4",
        "@modelcontextprotocol/sdk": "^1.7.0",
        "dotenv": "^16.4.7",
        "express": "^5.0.1",
        "zod": "^3.22.4"
      },
    }));

    const installProcess = await sandbox.commands.run("cd /app && npm i", {
      timeoutMs: 120000,
    });
    console.log("Install process output:", installProcess.stdout);

    // Run the demo server in background
    console.log("Starting server...");
    
    const process = await sandbox.commands.run("node /app/demo-server.js", { background: true });

    // Get the host for port 3000 (default port for the inspector)
    const host = sandbox.getHost(3001);
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
