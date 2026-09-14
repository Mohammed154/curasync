// seed-db.mjs — Comprehensive database seeder with exact Supabase enum support
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_DIRECT;

if (!dbUrl) {
  console.error("❌ DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

// prepare: false is required for Supabase PgBouncer / Supavisor connection pooling (port 6543)
const sql = postgres(dbUrl, { ssl: "require", connect_timeout: 15, prepare: false });

async function seed() {
  console.log("🌱 Starting fresh Supabase seed process...\n");

  try {
    const demoPatientId = "00000000-0000-0000-0000-000000000001";

    // 1. Upsert demo patient profile
    console.log("1. Ensuring demo patient profile (Arjun Mehta)...");
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
    console.log("2. Purging outdated hospital-only vitals (heart_rate, spo2, peak_flow)...");
    await sql`DELETE FROM alert_events WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');`;
    await sql`DELETE FROM readings WHERE type::text IN ('peak_flow', 'heart_rate', 'spo2');`;

    // 3. Seed Medications
    console.log("3. Seeding active chronic medications...");
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
    console.log("4. Seeding medication adherence logs for today...");
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
    console.log("5. Seeding biometric readings for home care monitoring...");
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
    console.log("6. Seeding realistic non-critical alert...");
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

    // 7. Seed Telehealth Video Consultation
    console.log("7. Seeding telehealth video consultation...");
    await sql`DELETE FROM consultations WHERE patient_id = ${demoPatientId}`;

    const consultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [consult] = await sql`
      INSERT INTO consultations (
        patient_id, provider_id, scheduled_at, duration_min, status, room_url, room_name, notes
      ) VALUES (
        ${demoPatientId},
        'provider_dr_sarah_jenkins',
        ${consultDate.toISOString()},
        25,
        'scheduled',
        'https://curasync.daily.co/telehealth-arjun-mehta',
        'telehealth-arjun-mehta',
        'Quarterly chronic condition review & medication titration follow-up.'
      ) RETURNING id;
    `;

    // 8. Seed Follow-up Reminders
    console.log("8. Seeding calendar follow-up reminders...");
    await sql`DELETE FROM follow_up_reminders WHERE patient_id = ${demoPatientId}`;

    const labDue = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const medDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sql`
      INSERT INTO follow_up_reminders (
        patient_id, created_by, title, description, due_date, reminder_type, related_consultation_id, status
      ) VALUES (
        ${demoPatientId}, 'provider_dr_sarah_jenkins', 'Comprehensive Metabolic & Lipid Panel', 'Fasting blood draw at Central Diagnostics Lab', ${labDue.toISOString()}, 'lab_test', ${consult.id}, 'pending'
      ), (
        ${demoPatientId}, 'provider_dr_sarah_jenkins', 'Blood Pressure Log & ACE Inhibitor Review', 'Review 7-day BP logs and check serum potassium/creatinine', ${medDue.toISOString()}, 'medication_review', ${consult.id}, 'pending'
      );
    `;

    // 9. Seed Journal Entries
    console.log("9. Seeding patient journal entries...");
    await sql`DELETE FROM journal_entries WHERE patient_id = ${demoPatientId}`;
    await sql`
      INSERT INTO journal_entries (
        patient_id, symptoms, notes, mood, logged_at
      ) VALUES (
        ${demoPatientId},
        ARRAY['mild_headache']::text[],
        'Morning walk went smoothly. Mild fatigue in afternoon, resolved after hydration.',
        'good',
        NOW() - INTERVAL '3 hours'
      );
    `;

    // 10. Seed Messages
    console.log("10. Seeding patient-doctor messages...");
    await sql`DELETE FROM messages WHERE recipient_id = 'dev_user_001' OR sender_id = 'dev_user_001'`;
    
    const threadId = "00000000-0000-0000-0000-000000000100";
    await sql`
      INSERT INTO messages (
        thread_id, sender_id, recipient_id, sender_role, content, sent_at
      ) VALUES (
        ${threadId}, 'provider_dr_sarah_jenkins', 'dev_user_001', 'provider', 'Hello Arjun, your recent blood glucose trends look stable. Please remember to log your BP before our video call tomorrow.', NOW() - INTERVAL '4 hours'
      ), (
        ${threadId}, 'dev_user_001', 'provider_dr_sarah_jenkins', 'patient', 'Thank you Dr. Jenkins! I logged this morning BP (126/82). Looking forward to the appointment.', NOW() - INTERVAL '2 hours'
      );
    `;

    console.log("\n✅ Demo seed completed successfully!");
    console.log(`Demo Patient ID: ${demoPatientId} (Arjun Mehta)`);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await sql.end();
  }
}

seed();
