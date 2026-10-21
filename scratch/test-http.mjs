async function test() {
  console.log("--- 1. Testing /provider/dashboard (unauthenticated) ---");
  const res1 = await fetch("http://localhost:3000/provider/dashboard", {
    redirect: "manual",
  });
  console.log("Status:", res1.status);
  console.log("Location:", res1.headers.get("location"));

  console.log("\n--- 2. Testing /provider/dashboard (authenticated as patient) ---");
  const res2 = await fetch("http://localhost:3000/provider/dashboard", {
    redirect: "manual",
    headers: {
      cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient; curasync_session=dummy-token",
    },
  });
  console.log("Status:", res2.status);
  console.log("Location:", res2.headers.get("location"));

  console.log("\n--- 3. Testing /onboarding (authenticated as onboarded patient) ---");
  const res3 = await fetch("http://localhost:3000/onboarding", {
    redirect: "manual",
    headers: {
      cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient; curasync_session=dummy-token",
    },
  });
  console.log("Status:", res3.status);
  const text3 = await res3.text();
  console.log("Contains 'Account Already Set Up':", text3.includes("Account Already Set Up"));
  console.log("Contains 'Go to Dashboard':", text3.includes("Go to Dashboard"));
  console.log("Contains 'Sign Out / Switch Account':", text3.includes("Sign Out / Switch Account"));

  console.log("\n--- 4. Testing /login with returnTo=/onboarding (authenticated patient) ---");
  const res4 = await fetch("http://localhost:3000/login?returnTo=/onboarding", {
    redirect: "manual",
    headers: {
      cookie: "curasync_uid=0oxPGWt1xjNN1ZDmD87xBZ1dYoK2; curasync_role=patient; curasync_session=dummy-token",
    },
  });
  console.log("Status:", res4.status);
  console.log("Location:", res4.headers.get("location"));
}

test().catch(console.error);
