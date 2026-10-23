const BASE_URL = "http://localhost:3000";
const TEST_UID = "hdlC2qlEwFMTVWP7Fi10kimqgP22";

async function runTests() {
  console.log("=== STEP 1: Dev Login Simulation ===");
  const loginRes = await fetch(`${BASE_URL}/api/auth/dev-login?uid=${TEST_UID}&role=patient&redirect=/conditions`, {
    redirect: "manual",
  });
  console.log("Login status:", loginRes.status);
  const setCookie = loginRes.headers.get("set-cookie");
  console.log("Set-Cookie header:", setCookie);

  const cookieHeader = `curasync_uid=${TEST_UID}; curasync_role=patient`;

  console.log("\n=== STEP 2: Session Check ===");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { cookie: cookieHeader },
  });
  console.log("Session status:", sessionRes.status);
  const sessionData = await sessionRes.json();
  console.log("Session profile:", JSON.stringify(sessionData, null, 2));

  console.log("\n=== STEP 3: Condition Page Fetch ===");
  const condPageRes = await fetch(`${BASE_URL}/conditions`, {
    headers: { cookie: cookieHeader },
  });
  console.log("Conditions page status:", condPageRes.status);

  console.log("\n=== STEP 4: Condition Detail Page (CKD) Fetch ===");
  const ckdPageRes = await fetch(`${BASE_URL}/conditions/ckd`, {
    headers: { cookie: cookieHeader },
  });
  console.log("Conditions/ckd page status:", ckdPageRes.status);

  console.log("\n=== STEP 5: Logging Condition-Specific Vitals via API ===");
  const metricsToLog = [
    { type: "egfr", value: 54, unit: "mL/min/1.73m²", notes: "Lab panel test" },
    { type: "creatinine", value: 1.6, unit: "mg/dL", notes: "Serum creatinine" },
    { type: "bun", value: 24, unit: "mg/dL", notes: "Blood urea nitrogen" },
    { type: "tsh", value: 5.2, unit: "mIU/L", notes: "Thyroid routine" },
    { type: "free_t4", value: 1.1, unit: "ng/dL", notes: "Free thyroxine" },
    { type: "pain_scale", value: 4, unit: "/10", notes: "Morning flare rating" },
    { type: "morning_stiffness", value: 45, unit: "min", notes: "Post waking" },
    { type: "asthma_control", value: 21, unit: "/25", notes: "ACT monthly test" },
    { type: "rescue_inhaler_use", value: 1, unit: "puffs/wk", notes: "Albuterol" },
  ];

  for (const m of metricsToLog) {
    const res = await fetch(`${BASE_URL}/api/v1/readings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({
        type: m.type,
        value: m.value,
        unit: m.unit,
        source: "manual",
        recordedAt: new Date().toISOString(),
        notes: m.notes,
      }),
    });
    const json = await res.json();
    console.log(`Log ${m.type} -> status: ${res.status}, success: ${json.success}`);
    if (!json.success) console.error("Error details:", json);
  }

  console.log("\n=== STEP 6: Verify Readings API for Patient ===");
  const getReadingsRes = await fetch(`${BASE_URL}/api/v1/readings?limit=20`, {
    headers: { cookie: cookieHeader },
  });
  console.log("Get readings status:", getReadingsRes.status);
  const readingsJson = await getReadingsRes.json();
  console.log(`Total readings returned: ${readingsJson.data?.length || 0}`);
  if (readingsJson.data?.length > 0) {
    console.log("Latest 3 readings:", readingsJson.data.slice(0, 3));
  }

  console.log("\n=== STEP 7: Verify Onboarding / Condition Update API ===");
  const updateCondRes = await fetch(`${BASE_URL}/api/v1/onboarding`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      conditions: ["ckd", "hypothyroidism", "ra", "asthma"],
    }),
  });
  console.log("Update conditions status:", updateCondRes.status);
  const updateJson = await updateCondRes.json();
  console.log("Update conditions result:", updateJson);

  console.log("\n=== ALL FLOW VERIFICATIONS COMPLETE ===");
}

runTests().catch(console.error);
