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
  const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 500 }
    );
  }

  let sql: postgres.Sql | undefined;
  try {
    sql = postgres(dbUrl, { ssl: "require", connect_timeout: 10 });

    const demoUserId = "user_demo_patient_001";
    let patientProfiles = await sql`
      SELECT id FROM patient_profiles WHERE user_id = ${demoUserId} LIMIT 1
    `;

    let patientId: string;
    if (patientProfiles.length === 0) {
      const inserted = await sql`
        INSERT INTO patient_profiles (
          user_id, name, date_of_birth, conditions, emergency_contact
        ) VALUES (
          ${demoUserId},
          'Eleanor Vance',
          '1965-04-12',
          ARRAY['diabetes_t2', 'hypertension', 'ckd']::text[],
          ${JSON.stringify({ name: "Robert Vance", phone: "+15550192834", relationship: "Spouse" })}
        )
        RETURNING id;
      `;
      patientId = (inserted[0] as any)?.id;
    } else {
      patientId = (patientProfiles[0] as any)?.id;
    }

    // Seed Medications
    const medsToInsert = [
      { name: "Metformin", dosage: "500mg", frequency: "twice_daily", conditionId: "diabetes_t2", scheduledTimes: ["08:00", "20:00"] },
      { name: "Lisinopril", dosage: "10mg", frequency: "once_daily", conditionId: "hypertension", scheduledTimes: ["09:00"] },
      { name: "Empagliflozin (Jardiance)", dosage: "10mg", frequency: "once_daily", conditionId: "ckd", scheduledTimes: ["08:00"] },
      { name: "Atorvastatin", dosage: "20mg", frequency: "once_daily", conditionId: "hypertension", scheduledTimes: ["21:00"] },
    ];

    let medsSeeded = 0;
    for (const med of medsToInsert) {
      const existingMed = await sql`
        SELECT id FROM medications WHERE patient_id = ${patientId} AND name = ${med.name} LIMIT 1
      `;
      if (existingMed.length === 0) {
        await sql`
          INSERT INTO medications (
            patient_id, name, dosage, frequency, condition_id, scheduled_times, start_date, active
          ) VALUES (
            ${patientId}, ${med.name}, ${med.dosage}, ${med.frequency}, ${med.conditionId}, ${med.scheduledTimes}, CURRENT_DATE, true
          );
        `;
        medsSeeded++;
      }
    }

    // Seed Biometric Readings
    const sampleReadings = [
      { type: "blood_glucose", value: 142, unit: "mg/dL", source: "ble", minutesAgo: 10, notes: "Fasting blood sugar check" },
      { type: "blood_glucose", value: 168, unit: "mg/dL", source: "manual", minutesAgo: 180, notes: "Post-lunch reading" },
      { type: "blood_pressure_systolic", value: 138, unit: "mmHg", source: "ble", minutesAgo: 30, notes: "Morning resting BP" },
      { type: "blood_pressure_diastolic", value: 88, unit: "mmHg", source: "ble", minutesAgo: 30, notes: "Morning resting BP" },
      { type: "heart_rate", value: 74, unit: "bpm", source: "apple_health", minutesAgo: 15, notes: "Resting pulse" },
      { type: "spo2", value: 98, unit: "%", source: "fitbit", minutesAgo: 45, notes: "Pulse oximeter check" },
      { type: "weight", value: 72.5, unit: "kg", source: "manual", minutesAgo: 1440, notes: "Morning weigh-in" }
    ];

    let readingsSeeded = 0;
    for (const r of sampleReadings) {
      const recDate = new Date(Date.now() - r.minutesAgo * 60 * 1000);
      await sql`
        INSERT INTO readings (
          patient_id, type, value, unit, source, recorded_at, notes
        ) VALUES (
          ${patientId}, ${r.type}, ${r.value}, ${r.unit}, ${r.source}, ${recDate.toISOString()}, ${r.notes}
        );
      `;
      readingsSeeded++;
    }

    // Seed Journal Entries
    const journalData = [
      {
        text: "Slight dizziness after taking morning blood pressure medication.",
        severity: 2,
        conditionId: "hypertension",
        bodyLocation: "Head",
        contextTags: ["dizziness", "morning", "medication_side_effect"],
        editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        text: "Felt energetic after 30-min morning walk. Blood sugar level steady.",
        severity: 1,
        conditionId: "diabetes_t2",
        bodyLocation: "General",
        contextTags: ["exercise", "walking", "good_mood"],
        editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    ];

    let journalsSeeded = 0;
    for (const j of journalData) {
      await sql`
        INSERT INTO journal_entries (
          patient_id, text, severity, condition_id, body_location, context_tags, recorded_at, editable_until
        ) VALUES (
          ${patientId}, ${j.text}, ${j.severity}, ${j.conditionId}, ${j.bodyLocation}, ${j.contextTags}, NOW(), ${j.editableUntil.toISOString()}
        );
      `;
      journalsSeeded++;
    }

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      patientId,
      summary: {
        medicationsInserted: medsSeeded,
        readingsInserted: readingsSeeded,
        journalsInserted: journalsSeeded,
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
