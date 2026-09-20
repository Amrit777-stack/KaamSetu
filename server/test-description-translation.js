import assert from "node:assert/strict";
import { translateText } from "./src/services/translationService.js";
import { getJobs } from "./src/services/jobService.js";

console.log("--- Starting Job Description Translation & Employer Details Verification ---");

async function runTests() {
  // Test 1: Translation of seed job descriptions to all 5 Indian languages
  const testDesc = "Fabrication work for industrial equipment.";
  const languages = ["hi-IN", "ta-IN", "te-IN", "kn-IN", "mr-IN"];

  for (const lang of languages) {
    const res = await translateText({
      text: testDesc,
      sourceLanguageCode: "en-IN",
      targetLanguageCode: lang,
    });
    assert.ok(res.translatedText, `Expected translated text for ${lang}`);
    assert.notEqual(res.translatedText, testDesc, `Expected non-English translation for ${lang}`);
    console.log(`[PASS] Translated "${testDesc}" to [${lang}]: "${res.translatedText}" (cached=${res.cached})`);
  }

  // Test 2: en-IN immediately returns original English
  const enRes = await translateText({
    text: testDesc,
    sourceLanguageCode: "en-IN",
    targetLanguageCode: "en-IN",
  });
  assert.equal(enRes.translatedText, testDesc);
  console.log(`[PASS] en-IN returns original description: "${enRes.translatedText}"`);

  // Test 3: Multiple different job descriptions
  const descriptions = [
    "Precision welding for stainless steel assemblies.",
    "Install and maintain factory electrical systems.",
    "Operate CNC turning and milling machines.",
  ];

  for (const desc of descriptions) {
    const hiRes = await translateText({
      text: desc,
      sourceLanguageCode: "en-IN",
      targetLanguageCode: "hi-IN",
    });
    assert.ok(hiRes.translatedText);
    console.log(`[PASS] Hindi translation for "${desc.slice(0, 30)}...": "${hiRes.translatedText}"`);
  }

  // Test 4: getJobs returns employer data needed for Details tab
  const jobsResult = await getJobs({ open_only: true, unique: true });
  assert.ok(Array.isArray(jobsResult.data) && jobsResult.data.length > 0, "Jobs data should be an array");

  const sampleJob = jobsResult.data[0];
  assert.ok(sampleJob.title, "Job should have title");
  assert.ok(sampleJob.description, "Job should have description");
  assert.ok(sampleJob.company_name, "Job should have company_name");
  console.log(`[PASS] Job #${sampleJob.id} has company_name="${sampleJob.company_name}", title="${sampleJob.title}"`);

  console.log("--- All Description Translation & Employer Data Tests Passed Successfully! ---");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

