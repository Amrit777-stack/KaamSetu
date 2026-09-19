import assert from "node:assert/strict";
import { createJob, getJobs, updateJobOpenings, deleteJob } from "./src/services/jobService.js";

async function runJobManagementTests() {
  console.log("--- Starting Job Vacancy Edit & Removal Verification ---");

  // 1. Create a test job
  const created = await createJob({
    employerId: 501,
    companyName: "Test Automation Co",
    title: "CNC Machine Operator",
    description: "Operate 3-axis CNC machines in Pune facility",
    salaryMin: 25000,
    salaryMax: 32000,
    requiredExperience: 2,
    openings: 3,
    location: "Pune, Maharashtra",
  });

  console.log(`[PASS] Created job #${created.id} with title "${created.title}" and ${created.openings} openings.`);
  assert.equal(created.openings, 3, "Initial openings should be 3");

  // 2. Verify job is listed
  const listAfterCreate = await getJobs({ employer_id: 501 });
  const foundInList = listAfterCreate.data.find((j) => Number(j.id) === Number(created.id));
  assert.ok(foundInList, "Job must appear in employer's job list");
  assert.equal(foundInList.openings, 3, "Listed job must have 3 openings");
  console.log(`[PASS] Job #${created.id} verified in employer's job list.`);

  // 3. Update vacancies / openings to 7
  const updatedTo7 = await updateJobOpenings(created.id, 7);
  assert.equal(updatedTo7.openings, 7, "Openings must be updated to 7 in database");
  console.log(`[PASS] Updated vacancies to 7 in database: openings = ${updatedTo7.openings}`);

  // 4. Update vacancies to 0 (filled)
  const updatedTo0 = await updateJobOpenings(created.id, 0);
  assert.equal(updatedTo0.openings, 0, "Openings must be updated to 0");
  console.log(`[PASS] Updated vacancies to 0 (filled): openings = ${updatedTo0.openings}`);

  // 5. Verify database reflection through getJobs
  const listAfterUpdate = await getJobs({ employer_id: 501 });
  const jobAfterUpdate = listAfterUpdate.data.find((j) => Number(j.id) === Number(created.id));
  assert.equal(jobAfterUpdate.openings, 0, "Job in database must reflect updated openings (0)");
  console.log(`[PASS] Verified database persistence for updated vacancies.`);

  // 6. Delete job
  const deleteResult = await deleteJob(created.id);
  assert.equal(deleteResult.success, true, "Delete should report success: true");
  console.log(`[PASS] Successfully deleted job #${created.id}: ${deleteResult.message}`);

  // 7. Verify job no longer exists in database
  const listAfterDelete = await getJobs({ employer_id: 501 });
  const jobAfterDelete = listAfterDelete.data.find((j) => Number(j.id) === Number(created.id));
  assert.equal(jobAfterDelete, undefined, "Deleted job must no longer appear in database");
  console.log(`[PASS] Confirmed job #${created.id} is removed from database.`);

  // 8. Error handling: updating or deleting non-existent job
  try {
    await updateJobOpenings(created.id, 5);
    assert.fail("Updating non-existent job should throw 404");
  } catch (err) {
    assert.match(err.message, /not found/i);
    console.log("[PASS] 404 properly returned when editing non-existent job.");
  }

  try {
    await deleteJob(created.id);
    assert.fail("Deleting non-existent job should throw 404");
  } catch (err) {
    assert.match(err.message, /not found/i);
    console.log("[PASS] 404 properly returned when deleting non-existent job.");
  }

  console.log("--- All Job Vacancy Edit & Delete Tests Passed Successfully! ---");
}

runJobManagementTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

