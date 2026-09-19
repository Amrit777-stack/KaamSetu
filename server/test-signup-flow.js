import "dotenv/config";
import assert from "node:assert/strict";
import { registerUser, authenticateUser } from "./src/services/authService.js";
import { createJob } from "./src/services/jobService.js";
import { applyForJob, hireApplicant } from "./src/services/applicationService.js";

async function runSignUpFlowTest() {
  console.log("--- Starting Real User Sign-Up & Dynamic Marketplace Tests ---");
  const suffix = Date.now();
  const workerEmail = `worker${suffix}@kaamsetu.demo`;
  const employerEmail = `employer${suffix}@kaamsetu.demo`;

  // 1. Sign up new Worker
  const worker = await registerUser({
    name: "Sunil Sharma",
    email: workerEmail,
    role: "worker",
    occupation: "Electrician",
    experienceYears: 4,
    location: "Pune",
  });
  assert.equal(worker.name, "Sunil Sharma");
  assert.equal(worker.role, "worker");
  assert.equal(worker.occupation, "Electrician");
  assert.equal(worker.profileId, null);
  console.log("[PASS] Worker 'Sunil Sharma' registered successfully.");

  // 2. Sign up new Employer
  const employer = await registerUser({
    name: "Pooja Patel",
    email: employerEmail,
    role: "employer",
    password: "SecurePass123!",
    companyName: "Sunrise Constructions",
    location: "Pune",
  });
  assert.equal(employer.name, "Pooja Patel");
  assert.equal(employer.companyName, "Sunrise Constructions");
  assert.equal(employer.role, "employer");
  console.log("[PASS] Employer 'Pooja Patel' (Sunrise Constructions) registered successfully.");

  // 2b. A newly registered employer can immediately sign in using email + password.
  const loggedInEmployer = await authenticateUser({
    email: employerEmail,
    password: "SecurePass123!",
    expectedRole: "employer",
  });
  assert.equal(loggedInEmployer.id, employer.id);
  assert.equal(loggedInEmployer.role, "employer");
  console.log("[PASS] Newly registered employer logged in successfully.");

  // 3. Duplicate email test
  try {
    await registerUser({
      name: "Duplicate User",
      email: workerEmail,
      role: "worker",
      occupation: "Welder",
    });
    assert.fail("Should have rejected duplicate email");
  } catch (err) {
    assert.equal(err.status, 400);
    assert.match(err.message, /already exists/i);
    console.log("[PASS] Duplicate email registration rejected properly.");
  }

  // 4. Authenticate newly created worker
  const loggedInWorker = await authenticateUser({
    email: workerEmail,
    userId: worker.id,
    expectedRole: "worker",
  });
  assert.equal(loggedInWorker.name, "Sunil Sharma");
  assert.equal(loggedInWorker.occupation, "Electrician");
  assert.equal(loggedInWorker.profileId, null);
  console.log("[PASS] Newly registered worker logged in successfully.");

  console.log("--- All Sign-Up & Dynamic User Tests Passed Successfully! ---");
}

runSignUpFlowTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
