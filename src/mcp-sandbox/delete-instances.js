// Run using: `node delete-instances.js`

import "dotenv/config";
import { Sandbox } from "@e2b/code-interpreter";

async function listAndDeleteSandboxes() {
  try {
    // First, list all running sandboxes
    const runningSandboxes = await Sandbox.list();
    console.log('Running sandboxes:', runningSandboxes.map(s => s.sandboxId));

    // Then delete each sandbox
    for (const sandboxInfo of runningSandboxes) {
      try {
        const sandbox = await Sandbox.create({ id: sandboxInfo.sandboxId });
        await sandbox.kill();
        console.log(`Successfully deleted sandbox: ${sandboxInfo.sandboxId}`);
      } catch (error) {
        console.error(`Failed to delete sandbox ${sandboxInfo.sandboxId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error listing sandboxes:', error.message);
  }
}

listAndDeleteSandboxes()
  .then(() => console.log('Finished listing and deleting sandboxes'))
  .catch(error => console.error('Error in process:', error));