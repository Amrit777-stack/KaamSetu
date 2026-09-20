import assert from "node:assert/strict";
import { resolveCity, getCityCoordinates } from "./src/services/cityCoordinates.js";
import { continueVoiceJobSearch } from "./src/services/voiceJobSearchService.js";
import { updateWorkerManualLocation, getWorkerProfile } from "./src/services/workerService.js";

async function runTests() {
  console.log("--- Starting Custom Location Search Tests ---");

  // Test 1: City resolution and multilingual aliases
  console.log("Test 1: Resolving English and Regional City Names");
  assert.equal(resolveCity("Mumbai"), "Mumbai");
  assert.equal(resolveCity("mumbai"), "Mumbai");
  assert.equal(resolveCity("in Mumbai"), "Mumbai");
  assert.equal(resolveCity("मुंबई"), "Mumbai");
  assert.equal(resolveCity("चेन्नई"), "Chennai");
  assert.equal(resolveCity("in Chennai"), "Chennai");
  assert.equal(resolveCity("दिल्ली"), "Delhi");
  assert.equal(resolveCity("new delhi"), "Delhi");
  assert.equal(resolveCity("bangalore"), "Bengaluru");
  assert.equal(resolveCity("बेंगलुरु"), "Bengaluru");
  console.log("  ✓ City resolution passed");

  // Test 2: City Coordinates lookup
  console.log("Test 2: City Coordinates Lookup");
  const mumbaiCoords = getCityCoordinates("Mumbai");
  assert.ok(mumbaiCoords);
  assert.equal(mumbaiCoords.latitude, 19.0760);
  assert.equal(mumbaiCoords.longitude, 72.8777);

  const chennaiCoords = getCityCoordinates("चेन्नई");
  assert.ok(chennaiCoords);
  assert.equal(chennaiCoords.latitude, 13.0827);
  assert.equal(chennaiCoords.longitude, 80.2707);
  console.log("  ✓ Coordinates lookup passed");

  // Test 3: Voice job search prioritizing custom location over browser GPS
  console.log("Test 3: Voice Job Search prioritizing custom location (Worker GPS: Pune -> Searched: Mumbai)");
  // Worker has Pune GPS coordinates (lat 18.5204, lon 73.8567)
  const puneGps = { latitude: 18.5204, longitude: 73.8567 };

  // Voice search where the user specifies "Mumbai"
  const searchState = {
    occupation: "Welder",
    skills: ["mig welding"],
    experience_years: 3,
    location: null,
    expected_salary_min: 15000,
    preferred_shift: "day",
    _asked: "location",
  };

  const result = await continueVoiceJobSearch({
    answer: "Mumbai",
    search: searchState,
    language: "en-IN",
    workerId: 1,
    latitude: puneGps.latitude,
    longitude: puneGps.longitude,
    location: "Pune",
  });

  assert.equal(result.isComplete, true, "Search should be complete");
  assert.equal(result.searchedLocation, "Mumbai", "Searched location should be Mumbai");
  assert.equal(result.isCustomLocation, true, "isCustomLocation should be true");
  assert.ok(result.matches.length > 0, "Should return matching jobs");

  // Check top match
  const topMatch = result.matches[0];
  console.log(`  Top match job title: "${topMatch.job.title}", location: "${topMatch.job.location}", distance: ${topMatch.job.distance_km} km`);
  assert.ok(
    String(topMatch.job.location || "").toLowerCase().includes("mumbai"),
    `Top job should be in Mumbai, but got ${topMatch.job.location}`
  );
  // Distance to Mumbai job from Mumbai reference should be close to 0 km, NOT ~120 km from Pune
  assert.ok(
    topMatch.job.distance_km < 30,
    `Top job distance should be calculated from Mumbai (< 30 km), but was ${topMatch.job.distance_km} km`
  );
  console.log("  ✓ Custom location voice search prioritized Mumbai jobs and calculated distance from Mumbai");

  // Test 4: Voice search with Hindi Devanagari city name
  console.log("Test 4: Voice search with Hindi Devanagari city name 'मुंबई'");
  const resultHindi = await continueVoiceJobSearch({
    answer: "मुंबई में",
    search: searchState,
    language: "hi-IN",
    workerId: 1,
    latitude: puneGps.latitude,
    longitude: puneGps.longitude,
    location: "Pune",
  });

  assert.equal(resultHindi.isComplete, true);
  assert.equal(resultHindi.searchedLocation, "Mumbai");
  assert.ok(
    String(resultHindi.matches[0].job.location || "").toLowerCase().includes("mumbai"),
    "Top job should be in Mumbai for Hindi city input"
  );
  console.log("  ✓ Hindi Devanagari city search passed");

  // Test 5: Manual location update syncing coordinates
  console.log("Test 5: updateWorkerManualLocation syncing coordinates");
  const manualResult = await updateWorkerManualLocation(1, "Mumbai");
  assert.equal(manualResult.location, "Mumbai");
  assert.equal(manualResult.latitude, 19.0760);
  assert.equal(manualResult.longitude, 72.8777);

  const updatedProfile = await getWorkerProfile(1);
  assert.equal(updatedProfile.location, "Mumbai");
  assert.equal(Number(updatedProfile.latitude), 19.0760);
  assert.equal(Number(updatedProfile.longitude), 72.8777);
  console.log("  ✓ Manual location update successfully updated both city and GPS coordinates");

  console.log("\nALL CUSTOM LOCATION SEARCH TESTS PASSED SUCCESSFULLY! ✅");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

