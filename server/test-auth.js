import assert from "node:assert/strict";
import { authenticateUser } from "./src/services/authService.js";
import { getJobs } from "./src/services/jobService.js";

async function runAuthTests() {
  console.log("--- Starting Role-Segregated Authentication Tests ---");

  // 1. Valid Worker Login
  const workerLogin = await authenticateUser({
    email: "raju@example.test",
    password: "password123",
    expectedRole: "worker",
  });
  assert.equal(workerLogin.role, "worker");
  assert.equal(workerLogin.name, "Raju Kumar");
  console.log("[PASS] Worker logged in successfully via worker portal.");

  // 2. Worker attempts to login via Employer portal (Must throw "No account found")
  try {
    await authenticateUser({
      email: "raju@example.test",
      password: "password123",
      expectedRole: "employer",
    });
    assert.fail("Should have rejected worker on employer portal");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.equal(err.message, "No account found");
    console.log("[PASS] Worker blocked from Employer login with 'No account found'.");
  }

  // 3. Valid Employer Login
  const employerLogin = await authenticateUser({
    email: "amit@pragati.example.test",
    password: "password123",
    expectedRole: "employer",
  });
  assert.equal(employerLogin.role, "employer");
  assert.equal(employerLogin.name, "Amit Shah");
  assert.equal(employerLogin.companyName, "Pragati Fabrication Works");
  console.log("[PASS] Employer logged in successfully via employer portal.");

  // 4. Employer attempts to login via Worker portal (Must throw "No account found")
  try {
    await authenticateUser({
      email: "amit@pragati.example.test",
      password: "password123",
      expectedRole: "worker",
    });
    assert.fail("Should have rejected employer on worker portal");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.equal(err.message, "No account found");
    console.log("[PASS] Employer blocked from Worker login with 'No account found'.");
  }

  // 5. Non-existent User
  try {
    await authenticateUser({
      email: "unknown@example.test",
      password: "password123",
      expectedRole: "worker",
    });
    assert.fail("Should have rejected non-existent user");
  } catch (err) {
    assert.equal(err.status, 404);
    assert.equal(err.message, "No account found");
    console.log("[PASS] Unknown user rejected with 'No account found'.");
  }

  // 6. Invalid Password
  try {
    await authenticateUser({
      email: "raju@example.test",
      password: "wrongpassword",
      expectedRole: "worker",
    });
    assert.fail("Should have rejected invalid password");
  } catch (err) {
    assert.equal(err.status, 401);
    assert.equal(err.message, "Invalid password");
    console.log("[PASS] Invalid password rejected with 401.");
  }

  // 7. Employer Filtered Jobs Check
  const employerJobs = await getJobs({ employer_id: 1 });
  assert.ok(employerJobs.data.length > 0);
  for (const job of employerJobs.data) {
    assert.equal(job.employer_id, 1, "Job must belong to employer 1");
  }
  console.log(`[PASS] Employer 1 jobs filtered correctly (${employerJobs.data.length} jobs found).`);

  console.log("--- All Role-Segregated Auth Tests Passed! ---");
}

runAuthTests().catch((err) => {
  console.error("Auth test failed:", err);
  process.exit(1);
});
