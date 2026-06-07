// lib/sms.ts — Lightweight Twilio SMS client using native fetch

export async function sendCriticalAlertSms(
  patientName: string,
  contactName: string,
  contactPhone: string,
  alertMessage: string
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  const isConfigured =
    accountSid &&
    authToken &&
    fromPhone &&
    !accountSid.startsWith("AC...") &&
    accountSid.length > 5;

  const messageBody = `CuraSync Alert: Critical alert triggered for ${patientName}. ${alertMessage}. Please check on them.`;

  if (!isConfigured) {
    // Graceful fallback for local development without real keys
    console.warn(
      `\n[sms] 📱 Twilio keys not fully configured. SIMULATED SMS DISPATCH:\n` +
      `  To:   ${contactName} (${contactPhone})\n` +
      `  From: ${fromPhone ?? "MOCK_TWILIO"}\n` +
      `  Body: "${messageBody}"\n`
    );
    return true;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: fromPhone,
        To: contactPhone,
        Body: messageBody,
      }).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sms] Twilio API error (status ${response.status}):`, errorText);
      return false;
    }

    console.log(`[sms] SMS successfully dispatched via Twilio to emergency contact: ${contactPhone}`);
    return true;
  } catch (err) {
    console.error("[sms] Failed to dispatch SMS via Twilio:", err);
    return false;
  }
}
