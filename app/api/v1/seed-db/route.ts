// app/api/v1/seed-db/route.ts — Database seed API endpoint
import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleSeed();
}

export async function POST() {
  return handleSeed();
}

async function handleSeed() {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT;
  if (!dbUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  let sql: postgres.Sql | undefined;
  try {
    sql = postgres(dbUrl, { ssl: "require", connect_timeout: 15, prepare: false });

    const demoPatientId = "00000000-0000-0000-0000-000000000001";

    // 1. Patient profile
    await sql`
      INSERT INTO patient_profiles (
        id, user_id, name, date_of_birth, conditions, emergency_contact, language, onboarding_complete
      ) VALUES (
        ${demoPatientId},
        'dev_user_001',
        'Arjun Mehta',
        '1965-04-12',
        ARRAY['diabetes_t2', 'hypertension', 'ckd']::condition_id[],
        ${JSON.stringify({ name: "Ananya Mehta", phone: "+1 555-0192", relationship: "Spouse" })},
        'en',
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        name = 'Arjun Mehta',
        user_id = 'dev_user_001',
        date_of_birth = '1965-04-12',
        conditions = ARRAY['diabetes_t2', 'hypertension', 'ckd']::condition_id[],
        emergency_contact = ${JSON.stringify({ name: "Ananya Mehta", phone: "+1 555-0192", relationship: "Spouse" })},
        onboarding_complete = true,
        updated_at = NOW();
    `;

    // 2. Clean out old/unsupported vitals (peak_flow, heart_rate, spo2)
    await sql`DELETE FROM alert_events WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');`;
    await sql`DELETE FROM readings WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');`;

    // 3. Seed Medications
    await sql`DELETE FROM medication_logs WHERE patient_id = ${demoPatientId}`;
    await sql`DELETE FROM medications WHERE patient_id = ${demoPatientId}`;

    const medsToInsert = [
      { name: "Metformin", dosage: "500mg", frequency: "twice_daily", conditionId: "diabetes_t2", schedule: ["08:00", "20:00"] },
      { name: "Lisinopril", dosage: "10mg", frequency: "once_daily", conditionId: "hypertension", schedule: ["09:00"] },
      { name: "Empagliflozin (Jardiance)", dosage: "10mg", frequency: "once_daily", conditionId: "ckd", schedule: ["08:00"] },
      { name: "Atorvastatin", dosage: "20mg", frequency: "once_daily", conditionId: "hypertension", schedule: ["21:00"] }
    ];

    const insertedMeds = [];
    for (const m of medsToInsert) {
      const [row] = await sql`
        INSERT INTO medications (
          patient_id, name, dosage, frequency, condition_id, custom_schedule, start_date, active
        ) VALUES (
          ${demoPatientId},
          ${m.name},
          ${m.dosage},
          ${m.frequency}::dose_frequency,
          ${m.conditionId}::condition_id,
          ${m.schedule}::text[],
          CURRENT_DATE - 45,
          true
        ) RETURNING id, name;
      `;
      insertedMeds.push(row);
    }

    // 4. Seed Medication Logs
    const todayMorning = new Date();
    todayMorning.setHours(8, 10, 0, 0);

    for (const med of insertedMeds) {
      await sql`
        INSERT INTO medication_logs (
          medication_id, patient_id, status, scheduled_at, logged_at
        ) VALUES (
          ${med.id}, ${demoPatientId}, 'taken'::medication_status, ${todayMorning.toISOString()}, ${todayMorning.toISOString()}
        );
      `;
    }

    // 5. Seed Biometric Readings for Home Care
    await sql`DELETE FROM readings WHERE patient_id = ${demoPatientId}`;

    const now = Date.now();
    const sampleReadings = [
      { type: "blood_glucose", value: 138, unit: "mg/dL", source: "ble", msAgo: 25 * 60 * 1000, notes: "Fasting morning reading" },
      { type: "blood_glucose", value: 154, unit: "mg/dL", source: "manual", msAgo: 160 * 60 * 1000, notes: "Post-lunch 2h check" },
      { type: "blood_glucose", value: 122, unit: "mg/dL", source: "ble", msAgo: 1400 * 60 * 1000, notes: "Yesterday fasting" },
      { type: "blood_glucose", value: 145, unit: "mg/dL", source: "ble", msAgo: 2800 * 60 * 1000, notes: "2 days ago fasting" },
      { type: "blood_pressure_systolic", value: 126, unit: "mmHg", source: "ble", msAgo: 40 * 60 * 1000, notes: "Morning resting BP" },
      { type: "blood_pressure_diastolic", value: 82, unit: "mmHg", source: "ble", msAgo: 40 * 60 * 1000, notes: "Morning resting BP" },
      { type: "weight", value: 74.2, unit: "kg", source: "manual", msAgo: 120 * 60 * 1000, notes: "Morning weight" },
      { type: "steps", value: 6840, unit: "steps", source: "manual", msAgo: 45 * 60 * 1000, notes: "Evening walk" },
      { type: "body_temp", value: 36.8, unit: "°C", source: "manual", msAgo: 180 * 60 * 1000, notes: "Normal" },
    ];

    for (const r of sampleReadings) {
      const recDate = new Date(now - r.msAgo);
      await sql`
        INSERT INTO readings (
          patient_id, type, value, unit, source, recorded_at, notes
        ) VALUES (
          ${demoPatientId},
          ${r.type}::reading_type,
          ${r.value},
          ${r.unit},
          ${r.source}::reading_source,
          ${recDate.toISOString()},
          ${r.notes}
        );
      `;
    }

    // 6. Seed Sample Alert Event
    await sql`DELETE FROM alert_events WHERE patient_id = ${demoPatientId}`;
    await sql`
      INSERT INTO alert_events (
        patient_id, severity, status, type, message, value, threshold, triggered_at
      ) VALUES (
        ${demoPatientId},
        'medium'::alert_severity,
        'active'::alert_status,
        'blood_glucose'::reading_type,
        'Post-prandial blood glucose slightly above target: 154 mg/dL',
        154,
        140,
        NOW() - INTERVAL '2 hours'
      );
    `;

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with clean demo dataset",
      patientId: demoPatientId,
      summary: {
        medicationsInserted: insertedMeds.length,
        readingsInserted: sampleReadings.length,
        alertsActive: 1,
      }
    });
  } catch (error: any) {
    console.error("❌ Seed route error:", error);
    return NextResponse.json(
      { error: "Seeding failed", message: error.message },
      { status: 500 }
    );
  } finally {
    if (sql) await sql.end();
  }
}
