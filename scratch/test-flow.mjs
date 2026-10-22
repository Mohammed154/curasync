import fetch from "node-fetch";

async function testAll() {
  console.log("=================================================");
  console.log("🔬 TESTING ONBOARDING FLOW & AUTHENTICATION GATES");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Guest visits /onboarding (No Active Session)
  console.log("--- 1. Guest visits /onboarding ---");
  const res1 = await fetch("http://localhost:3000/onboarding");
  assert(res1.status === 200, `Status is 200 (received ${res1.status})`);
  const html1 = await res1.text();
  assert(html1.includes("Tell us about your health profile"), "Renders Case A: OnboardingWizard Demographics form");
  assert(!html1.includes("Account Already Set Up"), "Does NOT render OnboardingGateNotice for guest");

  // 2. Completed Patient visits /onboarding (Active Session Found & onboarding_completed === true)
  // Patient: 0oxPGWt1xjNN1ZDmD87xBZ1dYoK2 (Mohammed Songadhwala)
  console.log("\n--- 2. Completed Patient visits /onboarding ---");
  const res2 = await fetch("http://localhost:3000/onboarding", {
    headers: {
      Cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient",
    },
    redirect: "manual",
  });
  assert(res2.status === 200, `Status is 200 (DO NOT ISSUE AUTOMATIC REDIRECT) - received ${res2.status}`);
  const html2 = await res2.text();
  assert(html2.includes("Account Already Set Up"), "Renders Case B: OnboardingGateNotice headline");
  assert(html2.includes("Go to Dashboard"), "Contains Primary Action: 'Go to Dashboard'");
  assert(html2.includes("Sign Out &amp; Switch Account") || html2.includes("Sign Out & Switch Account"), "Contains Secondary Action: 'Sign Out & Switch Account'");
  assert(!html2.includes("Tell us about your health profile"), "Questionnaire form is completely hidden from completed patient");

  // 3. Incomplete Patient visits /onboarding (onboarding_completed === false)
  // User: dev_patient_alex_rivera
  console.log("\n--- 3. Incomplete Patient visits /onboarding ---");
  const res3 = await fetch("http://localhost:3000/onboarding", {
    headers: {
      Cookie: "curasync_uid=dev_patient_alex_rivera; curasync_role=patient",
    },
    redirect: "manual",
  });
  assert(res3.status === 200, `Status is 200 - received ${res3.status}`);
  const html3 = await res3.text();
  assert(html3.includes("Tell us about your health profile"), "Renders Case A: OnboardingWizard so patient can resume onboarding");
  assert(!html3.includes("Account Already Set Up"), "Does NOT show gate notice for incomplete patient");

  // 4. Completed Patient visits /login
  console.log("\n--- 4. Completed Patient visits /login ---");
  const res4 = await fetch("http://localhost:3000/login", {
    headers: {
      Cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient",
    },
    redirect: "manual",
  });
  assert(res4.status === 307, `Status is 307 redirect - received ${res4.status}`);
  assert(res4.headers.get("location")?.includes("/dashboard"), `Redirects directly to /dashboard (received ${res4.headers.get("location")})`);

  // 5. Completed Patient visits /login?returnTo=/onboarding
  console.log("\n--- 5. Completed Patient visits /login?returnTo=/onboarding ---");
  const res5 = await fetch("http://localhost:3000/login?returnTo=/onboarding", {
    headers: {
      Cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient",
    },
    redirect: "manual",
  });
  assert(res5.status === 307, `Status is 307 redirect - received ${res5.status}`);
  const loc5 = res5.headers.get("location") || "";
  assert(loc5.includes("/dashboard") && !loc5.includes("/onboarding"), `Strips /onboarding and redirects to /dashboard (received ${loc5})`);

  // 6. Inspect /api/auth/session
  console.log("\n--- 6. Session route GET /api/auth/session ---");
  const res6 = await fetch("http://localhost:3000/api/auth/session", {
    headers: {
      Cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient",
    },
  });
  assert(res6.status === 200, `Session status is 200 - received ${res6.status}`);
  const data6 = await res6.json();
  assert(data6.authenticated === true, "Session authenticated is true");
  assert(data6.user?.onboarding_completed === true, "User profile onboarding_completed is true");
  assert(data6.user?.onboarding_complete === true, "User profile onboarding_complete is true");

  console.log(`\n=================================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`=================================================`);

  if (failed > 0) process.exit(1);
}

testAll().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
