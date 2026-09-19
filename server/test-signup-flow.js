import assert from "node:assert/strict";
import { registerUser, authenticateUser } from "./src/services/authService.js";
import { createJob, getJobs } from "./src/services/jobService.js";
import { applyForJob, hireApplicant } from "./src/services/applicationService.js";

async function runSignUpFlowTest() {
  console.log("--- Starting Real User Sign-Up & Dynamic Marketplace Tests ---");

  // 1. Sign up new Worker
  const worker = await registerUser({
    name: "Sunil Sharma",
    email: "sunil@test.com",
    password: "mypassword123",
    role: "worker",
    occupation: "Electrician",
    experienceYears: 4,
    location: "Pune",
  });
  assert.equal(worker.name, "Sunil Sharma");
  assert.equal(worker.role, "worker");
  console.log("[PASS] Worker 'Sunil Sharma' registered successfully.");

  // 2. Sign up new Employer
  const employer = await registerUser({
    name: "Pooja Patel",
    email: "pooja@test.com",
    password: "mypassword123",
    role: "employer",
    companyName: "Sunrise Constructions",
    location: "Pune",
  });
  assert.equal(employer.name, "Pooja Patel");
  assert.equal(employer.companyName, "Sunrise Constructions");
  assert.equal(employer.role, "employer");
  console.log("[PASS] Employer 'Pooja Patel' (Sunrise Constructions) registered successfully.");

  // 3. Duplicate email test
  try {
    await registerUser({
      name: "Duplicate User",
      email: "sunil@test.com",
      password: "password123",
      role: "worker",
    });
    assert.fail("Should have rejected duplicate email");
  } catch (err) {
    assert.equal(err.status, 400);
    assert.match(err.message, /already exists/i);
    console.log("[PASS] Duplicate email registration rejected properly.");
  }

  // 4. Authenticate newly created worker
  const loggedInWorker = await authenticateUser({
    email: "sunil@test.com",
    password: "mypassword123",
    expectedRole: "worker",
  });
  assert.equal(loggedInWorker.name, "Sunil Sharma");
  console.log("[PASS] Newly registered worker logged in successfully.");

  // 5. Employer posts a new job
  const newJob = await createJob({
    employerId: employer.profileId,
    companyName: employer.companyName,
    title: "Electrical Maintenance Assistant",
    description: "Factory maintenance and wiring support.",
    location: "Pune",
    salaryMin: 21000,
    salaryMax: 27000,
    requiredExperience: 2,
    openings: 2,
  });
  assert.equal(newJob.title, "Electrical Maintenance Assistant");
  assert.equal(newJob.employer_id, employer.profileId);
  console.log("[PASS] New job posted by employer successfully.");

  // 6. Worker applies for the new job
  const application = await applyForJob({
    workerId: worker.profileId,
    jobId: newJob.id,
    workerName: worker.name,
  });
  assert.equal(application.worker_id, worker.profileId);
  assert.equal(application.job_id, newJob.id);
  assert.equal(application.status, "applied");
  console.log("[PASS] Worker applied for new job successfully.");

  // 7. Prevent duplicate application
  try {
    await applyForJob({
      workerId: worker.profileId,
      jobId: newJob.id,
      workerName: worker.name,
    });
    assert.fail("Should have rejected duplicate application");
  } catch (err) {
    assert.equal(err.status, 400);
    assert.match(err.message, /already applied/i);
    console.log("[PASS] Duplicate job application rejected properly.");
  }

  // 8. Employer hires the worker
  const hireRes = await hireApplicant(application.id);
  assert.equal(hireRes.success, true);
  assert.equal(hireRes.hiredApplication.status, "hired");
  console.log("[PASS] Employer hired new worker successfully.");

  console.log("--- All Sign-Up & Dynamic User Tests Passed Successfully! ---");
}

runSignUpFlowTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
