import "dotenv/config";
import assert from "node:assert/strict";
import { authenticateUser } from "./src/services/authService.js";
import { getJobs } from "./src/services/jobService.js";

async function runAuthTests() {
  console.log("--- Starting Role-Segregated Authentication Tests ---");

  // 1. Valid Worker Login (uses Email + User ID)
  const workerLogin = await authenticateUser({
    email: "worker1@kaamsetu.demo",
    userId: 1,
    expectedRole: "worker",
  });
  assert.equal(workerLogin.role, "worker");
  assert.equal(workerLogin.name, "Raju Kumar");
  console.log("[PASS] Worker logged in successfully via worker portal.");

  // 2. Worker attempts to login via Employer portal (Must throw "No employer account found")
  try {
    await authenticateUser({
      email: "worker1@kaamsetu.demo",
      userId: 1,
      expectedRole: "employer",
    });
    assert.fail("Should have rejected worker on employer portal");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.match(err.message, /No employer account found/);
    console.log("[PASS] Worker blocked from Employer login with 'No employer account found'.");
  }

  // 3. Valid Employer Login (uses Email + Password)
  const employerLogin = await authenticateUser({
    email: "employer5@kaamsetu.demo",
    password: "password123",
    expectedRole: "employer",
  });
  assert.equal(employerLogin.role, "employer");
  assert.equal(employerLogin.name, "Amit Shah");
  console.log("[PASS] Employer logged in successfully via employer portal.");

  // 4. Employer attempts to login via Worker portal (Must throw "No worker account found")
  try {
    await authenticateUser({
    email: "employer5@kaamsetu.demo",
    userId: 5,
      expectedRole: "worker",
    });
    assert.fail("Should have rejected employer on worker portal");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.match(err.message, /No worker account found/);
    console.log("[PASS] Employer blocked from Worker login with 'No worker account found'.");
  }

  // 5. Non-existent User
  try {
    await authenticateUser({
      email: "unknown@example.test",
      userId: 999999,
      expectedRole: "worker",
    });
    assert.fail("Should have rejected non-existent user");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.match(err.message, /No worker account found/);
    console.log("[PASS] Unknown user rejected with 'No worker account found'.");
  }

  // 6. Invalid Employer Password
  try {
    await authenticateUser({
      email: "employer5@kaamsetu.demo",
      password: "wrongpassword",
      expectedRole: "employer",
    });
    assert.fail("Should have rejected invalid password");
  } catch (err) {
    assert.equal(err.status, 401);
    assert.match(err.message, /No employer account found/);
    console.log("[PASS] Invalid password rejected.");
  }

  // 7. Employer Filtered Jobs Check
  const employerJobs = await getJobs({ employer_id: 501 });
  assert.ok(Array.isArray(employerJobs.data));
  for (const job of employerJobs.data) {
    assert.equal(job.employer_id, 501, "Job must belong to employer 501");
  }
  console.log(`[PASS] Employer 501 jobs filtered correctly (${employerJobs.data.length} jobs found).`);

  console.log("--- All Role-Segregated Auth Tests Passed! ---");
}

runAuthTests().catch((err) => {
  console.error("Auth test failed:", err);
  process.exit(1);
});
