import assert from "node:assert/strict";
import { hireApplicant, listApplications } from "./src/services/applicationService.js";

async function runTests() {
  console.log("--- Starting Worker Hiring & Auto-Withdrawal Verification ---");

  // 1. Initial State Check
  const initial = await listApplications();
  console.log(`[PASS] Fetched ${initial.data.length} initial applications.`);
  
  const initialApp1 = initial.data.find((a) => a.id === 1);
  const initialApp2 = initial.data.find((a) => a.id === 2);
  assert.equal(initialApp1.status, "shortlisted", "Application 1 should start as shortlisted");
  assert.equal(initialApp2.status, "applied", "Application 2 should start as applied");
  console.log("[PASS] Initial application statuses confirmed.");

  // 2. Execute Hire for Application #1
  const hireResult = await hireApplicant(1);
  console.log("[INFO] Hire result:", hireResult.message);

  assert.equal(hireResult.success, true, "Hire operation should succeed");
  assert.equal(hireResult.hiredApplication.status, "hired", "Target application must be marked as hired");
  assert.equal(hireResult.worker.is_available, false, "Worker profile is_available must be false");
  assert.equal(hireResult.withdrawnCount, 1, "Should have withdrawn 1 other open application");
  assert.equal(hireResult.withdrawnApplications[0].id, 2, "Application 2 must be the one withdrawn");
  console.log("[PASS] Application 1 marked as hired, Application 2 automatically withdrawn.");
  console.log("[PASS] Worker marked unavailable (is_available = false).");

  // 3. Confirm Unrelated Applications are Untouched
  const updatedList = await listApplications();
  const app3 = updatedList.data.find((a) => a.id === 3);
  assert.equal(app3.status, "shortlisted", "Application 3 (different worker) must remain shortlisted");
  console.log("[PASS] Other workers' applications remained untouched.");

  // 4. Duplicate Hire Protection
  try {
    await hireApplicant(1);
    assert.fail("Should have rejected hiring an already hired application");
  } catch (err) {
    assert.match(err.message, /already marked as hired/i);
    console.log("[PASS] Duplicate hire protection prevented re-hiring.");
  }

  // 5. Non-existent Application Protection
  try {
    await hireApplicant(9999);
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
