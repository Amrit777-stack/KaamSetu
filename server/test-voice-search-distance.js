import "dotenv/config";
import assert from "node:assert/strict";
import { continueVoiceJobSearch } from "./src/services/voiceJobSearchService.js";

async function runVoiceSearchDistanceTests() {
  console.log("--- Starting Voice Search Distance Calculation & Ordering Tests ---");

  // 1. Voice search with explicit worker coordinates (e.g., Pune coordinates)
  const puneLat = 18.5204;
  const puneLon = 73.8567;
  const search1 = {
    occupation: "Welder",
    skills: ["welding"],
    experience_years: 2,
    location: "Pune",
    expected_salary_min: 20000,
    preferred_shift: "day",
  };

  const res1 = await continueVoiceJobSearch({
    answer: "day",
    search: search1,
    language: "en-IN",
    latitude: puneLat,
    longitude: puneLon,
  });

  assert.equal(res1.isComplete, true, "Voice search should be complete");
  assert.ok(res1.matches.length > 0, "Should return matching jobs for Welder in Pune");

  // Verify all matches have distance_km populated as a valid number
  for (const match of res1.matches) {
    assert.ok(
      Number.isFinite(match.job.distance_km),
      `Job #${match.job.id} (${match.job.title}) must have a numeric distance_km, got: ${match.job.distance_km}`
    );
  }
  console.log(`[PASS] Verified distance_km is populated for all ${res1.matches.length} jobs with explicit coordinates.`);

  // Verify ascending distance ordering (least to max distance)
  for (let i = 1; i < res1.matches.length; i++) {
    const prevDist = res1.matches[i - 1].job.distance_km;
    const currDist = res1.matches[i].job.distance_km;
    assert.ok(
      currDist >= prevDist,
      `Jobs must be ordered by ascending distance: job #${i - 1} (${prevDist} km) should be <= job #${i} (${currDist} km)`
    );
  }
  console.log("[PASS] Verified jobs are ordered strictly in ascending distance order (least to max distance).");

  // 2. Voice search with workerId (Raju Kumar, Katpadi coords: 12.9707, 79.1637)
  const search2 = {
    occupation: "Welder",
    skills: ["welding"],
    experience_years: 3,
    location: "Katpadi",
    expected_salary_min: 20000,
    preferred_shift: "day",
  };

  const res2 = await continueVoiceJobSearch({
    answer: "day",
    search: search2,
    language: "en-IN",
    workerId: 1,
  });

  assert.equal(res2.isComplete, true);
  assert.ok(res2.matches.length > 0);
  assert.ok(
    Number.isFinite(res2.matches[0].job.distance_km),
    "Distance must be calculated when looking up profile coordinates by workerId"
  );
  console.log(`[PASS] Distance computed via workerId lookup: nearest job is ${res2.matches[0].job.distance_km} km away.`);

  // 3. Voice search with city location string fallback
  const search3 = {
    occupation: "Electrician",
    skills: ["wiring"],
    experience_years: 1,
    location: "Mumbai",
    expected_salary_min: 18000,
    preferred_shift: "day",
  };

  const res3 = await continueVoiceJobSearch({
    answer: "day",
    search: search3,
    language: "en-IN",
    location: "Mumbai",
  });

  assert.equal(res3.isComplete, true);
  assert.ok(res3.matches.length > 0);
  assert.ok(
    Number.isFinite(res3.matches[0].job.distance_km),
    "Distance must be calculated using city coordinates fallback"
  );
  console.log(`[PASS] Distance computed via city coordinates: nearest job is ${res3.matches[0].job.distance_km} km away.`);

  console.log("--- All Voice Search Distance Tests Passed Successfully! ---");
}

runVoiceSearchDistanceTests().catch((err) => {
  console.error("Voice search distance test failed:", err);
  process.exit(1);
});

