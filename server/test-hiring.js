import "dotenv/config";
import assert from "node:assert/strict";
import { hireApplicant, listApplications, applyForJob } from "./src/services/applicationService.js";
import { createJob } from "./src/services/jobService.js";
import { registerUser } from "./src/services/authService.js";

async function runTests() {
  console.log("--- Starting Worker Hiring & Auto-Withdrawal Verification ---");

  // Setup test workers, employer, and jobs
  const rand = Date.now();
  const worker1 = await registerUser({
    name: `Worker H1 ${rand}`,
    email: `workerh1_${rand}@kaamsetu.demo`,
    role: "worker",
    occupation: "Welder",
  });
  const worker2 = await registerUser({
    name: `Worker H2 ${rand}`,
    email: `workerh2_${rand}@kaamsetu.demo`,
    role: "worker",
    occupation: "Electrician",
  });
  const employer = await registerUser({
    name: `Employer H ${rand}`,
    email: `employerh_${rand}@kaamsetu.demo`,
    password: "password123",
    role: "employer",
    companyName: `Test Hire Corp ${rand}`,
  });
  const job1 = await createJob({
    employerId: employer.id,
    companyName: `Test Hire Corp ${rand}`,
    title: "Welder Opening",
    openings: 2,
    location: "Pune",
  });
  const job2 = await createJob({
    employerId: employer.id,
    companyName: `Test Hire Corp ${rand}`,
    title: "Second Opening",
    openings: 1,
    location: "Pune",
  });

  const app1 = await applyForJob({ workerId: worker1.id, jobId: job1.id });
  const app2 = await applyForJob({ workerId: worker1.id, jobId: job2.id });
  const app3 = await applyForJob({ workerId: worker2.id, jobId: job1.id });

  console.log(`[PASS] Created test applications: App 1 (#${app1.id}), App 2 (#${app2.id}), App 3 (#${app3.id})`);

  // 2. Execute Hire for Application #1
  const hireResult = await hireApplicant(app1.id);
  console.log("[INFO] Hire result:", hireResult.message);

  assert.equal(hireResult.success, true, "Hire operation should succeed");
  assert.ok(["hired", "selected"].includes(hireResult.hiredApplication.status.toLowerCase()), "Target application must be marked as hired/selected");
  assert.equal(hireResult.worker.is_available, false, "Worker profile is_available must be false");
  assert.equal(hireResult.withdrawnCount, 1, "Should have withdrawn 1 other open application");
  assert.equal(Number(hireResult.withdrawnApplications[0].id), Number(app2.id), "Application 2 must be the one withdrawn");
  console.log("[PASS] Application 1 marked as hired, Application 2 automatically withdrawn.");
  console.log("[PASS] Worker marked unavailable (is_available = false).");

  // 3. Confirm Unrelated Applications are Untouched
  const appsForWorker2 = await listApplications({ workerId: worker2.id });
  const app3Check = appsForWorker2.data.find((a) => Number(a.id) === Number(app3.id));
  assert.notEqual(app3Check.status.toLowerCase(), "withdrawn", "Application 3 (different worker) must remain active");
  console.log("[PASS] Other workers' applications remained untouched.");

  // 4. Duplicate Hire Protection
  try {
    await hireApplicant(app1.id);
    assert.fail("Should have rejected hiring an already hired application");
  } catch (err) {
    assert.match(err.message, /already marked as hired/i);
    console.log("[PASS] Duplicate hire protection prevented re-hiring.");
  }

  // 5. Non-existent Application Protection
  try {
    await hireApplicant(999999);
    assert.fail("Should have rejected non-existent application");
  } catch (err) {
    assert.match(err.message, /not found/i);
    console.log("[PASS] Non-existent application check handled properly.");
  }

  console.log("--- All Hiring Workflow Tests Passed Successfully! ---");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
