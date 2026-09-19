import http from "node:http";
import app from "./src/app.js"; // wait, app.js starts listening directly on import if not guarded or we can fetch from port 4000

// Let's test the express app directly using node's http server
const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl}`);

  try {
    // 1. Test GET /api/applications
    const listRes = await fetch(`${baseUrl}/api/applications`);
    const listData = await listRes.json();
    console.log(`[PASS] GET /api/applications returned ${listData.data.length} items`);

    // 2. Test POST /api/applications/3/hire (Meena Devi)
    const hireRes = await fetch(`${baseUrl}/api/applications/3/hire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const hireData = await hireRes.json();
    console.log(`[PASS] POST /api/applications/3/hire status ${hireRes.status}:`, hireData.message);

    // 3. Test Invalid ID
    const errorRes = await fetch(`${baseUrl}/api/applications/999/hire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const errorData = await errorRes.json();
    console.log(`[PASS] POST /api/applications/999/hire error status ${errorRes.status}:`, errorData.error);

    console.log("--- Express API Integration Verification Passed! ---");
  } catch (err) {
    console.error("API test error:", err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
});
