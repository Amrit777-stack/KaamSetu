import "dotenv/config";
import assert from "node:assert/strict";
import { applyForJob, withdrawApplication, listApplications } from "./src/services/applicationService.js";
import { createJob } from "./src/services/jobService.js";
import { registerUser } from "./src/services/authService.js";

async function runWorkerWithdrawTests() {
  console.log("--- Starting Worker Application & Withdraw Verification ---");

  // Create temporary unique worker & employer
  const rand = Date.now();
  const worker = await registerUser({
    name: `Worker Test ${rand}`,
    email: `worker${rand}@kaamsetu.demo`,
    role: "worker",
    occupation: "Welder",
    experienceYears: 4,
    phone: "9876543210",
  });

  const employer = await registerUser({
    name: `Employer Test ${rand}`,
    email: `employer${rand}@kaamsetu.demo`,
    role: "employer",
    companyName: `Test Corp ${rand}`,
    phone: "9876543211",
  });

  const job = await createJob({
    employerId: employer.id,
    companyName: `Test Corp ${rand}`,
    title: "Structural Welder",
    description: "TIG welding for bridge components",
    salaryMin: 28000,
    salaryMax: 35000,
    requiredExperience: 3,
    openings: 2,
    location: "Pune",
  });

  console.log(`[PASS] Setup test worker #${worker.id}, employer #${employer.id}, job #${job.id}`);

  // 1. Worker applies for the job
  const app = await applyForJob({
    workerId: worker.id,
    jobId: job.id,
  });
  assert.ok(app.id, "Application should be created with an ID");
  assert.equal(app.status, "Applied", "Initial status should be Applied");
  console.log(`[PASS] Worker applied for job. Application ID: ${app.id}, Status: ${app.status}`);

  // 2. Check applications for worker
  const res = await listApplications({ workerId: worker.id });
  const foundApp = res.data.find((a) => Number(a.id) === Number(app.id));
  assert.ok(foundApp, "Worker application must be in worker's application list");
  assert.equal(foundApp.status, "Applied");

  // 3. Security check: wrong worker trying to withdraw
  try {
    await withdrawApplication(app.id, 999999);
    assert.fail("Wrong worker withdrawing should be rejected");
  } catch (err) {
    assert.match(err.message, /not authorized|mismatch/i);
    console.log("[PASS] Worker mismatch properly rejected with 403 authorization error.");
  }

  // 4. Authorized worker withdraws application
  const withdrawResult = await withdrawApplication(app.id, worker.id);
  assert.equal(withdrawResult.success, true, "Withdraw should report success: true");
  assert.equal(withdrawResult.application.status, "Withdrawn", "Status must be Withdrawn");
  console.log(`[PASS] Application #${app.id} successfully withdrawn.`);

  // 5. Verify database reflection in worker applications list
  const resAfter = await listApplications({ workerId: worker.id });
  const foundAfter = resAfter.data.find((a) => Number(a.id) === Number(app.id));
  assert.equal(foundAfter.status, "Withdrawn", "Database must reflect Withdrawn status");
  console.log("[PASS] Confirmed Withdrawn status persisted in database.");

  // 6. Double-withdraw prevention
  try {
    await withdrawApplication(app.id, worker.id);
    assert.fail("Double withdrawal should be rejected");
  } catch (err) {
    assert.match(err.message, /already withdrawn/i);
    console.log("[PASS] Double-withdrawal properly blocked.");
  }

  console.log("--- All Worker Withdraw Tests Passed Successfully! ---");
}

runWorkerWithdrawTests().catch((err) => {
  console.error("Worker withdraw test failed:", err);
  process.exit(1);
});
