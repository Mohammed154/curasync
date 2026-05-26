// PDF Preview — server component rendered headlessly by Lambda Puppeteer
// URL: /pdf-preview?patientId=&rangeStart=&rangeEnd=&token=
// Puppeteer captures this at 794×1123px (A4) and converts to PDF.
// The token is a short-lived JWT signed by the export API route.
// No auth session needed — token IS the auth.

import React from "react";
import { getMockDashboardData } from "@/lib/mock-data";
import { conditionColors } from "@/lib/design-tokens";
import { format, subDays } from "date-fns";

interface Props {
  searchParams: Promise<{ patientId?: string; rangeStart?: string; rangeEnd?: string }>;
}

export default async function PdfPreviewPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = getMockDashboardData();
  const { patient, latestReadings, conditionSummaries, weeklyAdherence, todayMedications, activeAlerts } = data;

  const rangeStart = params.rangeStart ?? format(subDays(new Date(), 30), "yyyy-MM-dd");
  const rangeEnd   = params.rangeEnd   ?? format(new Date(), "yyyy-MM-dd");
  const generatedAt = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

  const age = new Date().getFullYear() - parseInt(patient.dateOfBirth.slice(0, 4));

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1A1A2E; background: #fff; width: 794px; }
          .page { padding: 40px 48px; }
          .page-break { page-break-before: always; padding: 40px 48px; }
          h1 { font-size: 22px; font-weight: 700; color: #1A1A2E; }
          h2 { font-size: 14px; font-weight: 700; color: #1A1A2E; margin-bottom: 8px; }
          h3 { font-size: 12px; font-weight: 600; color: #4A4A68; margin-bottom: 6px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #6C5CE7; }
          .logo { display: flex; align-items: center; gap: 8px; }
          .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #6C5CE7, #A29BFE); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 16px; }
          .logo-text { font-size: 18px; font-weight: 700; color: #1A1A2E; }
          .report-meta { text-align: right; color: #8888A8; font-size: 10px; line-height: 1.6; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: 700; color: #6C5CE7; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #E2E0F0; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .card { border: 1px solid #E2E0F0; border-radius: 8px; padding: 12px; }
          .card-label { font-size: 9px; font-weight: 600; color: #8888A8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
          .card-value { font-size: 20px; font-weight: 700; color: #1A1A2E; line-height: 1; }
          .card-unit  { font-size: 10px; color: #8888A8; margin-left: 2px; }
          .card-status { font-size: 9px; font-weight: 600; margin-top: 4px; }
          .status-green { color: #00B894; }
          .status-amber { color: #F39C12; }
          .status-red   { color: #D63031; }
          table { width: 100%; border-collapse: collapse; }
          thead tr { background: #F4F4F6; }
          th { padding: 6px 8px; text-align: left; font-size: 9px; font-weight: 700; color: #8888A8; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 7px 8px; font-size: 10px; border-bottom: 1px solid #E2E0F0; color: #1A1A2E; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 9px; font-weight: 600; }
          .badge-amber { background: #FEF9E7; color: #F39C12; }
          .badge-green { background: #E8F8F5; color: #00B894; }
          .badge-red   { background: #FDECEA; color: #D63031; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E0F0; display: flex; justify-content: space-between; font-size: 9px; color: #8888A8; }
          .disclaimer { background: #FEF9E7; border: 1px solid #FDCB6E33; border-radius: 6px; padding: 8px 12px; font-size: 9px; color: #8888A8; margin-top: 16px; line-height: 1.5; }
          .adherence-bar { height: 8px; background: #E2E0F0; border-radius: 4px; overflow: hidden; margin-top: 4px; }
          .adherence-fill { height: 100%; border-radius: 4px; }
        `}</style>
      </head>
      <body>

        {/* ── PAGE 1 ── */}
        <div className="page">
          {/* Header */}
          <div className="header">
            <div className="logo">
              <div className="logo-icon">♥</div>
              <span className="logo-text">CuraSync</span>
            </div>
            <div className="report-meta">
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>
                Clinical Health Report
              </div>
              <div>Period: {format(new Date(rangeStart), "MMM d")} – {format(new Date(rangeEnd), "MMM d, yyyy")}</div>
              <div>Generated: {generatedAt}</div>
              <div>Confidential — HIPAA Protected</div>
            </div>
          </div>

          {/* Patient info */}
          <div className="section">
            <div className="section-title">Patient Information</div>
            <div className="grid-2">
              <div className="card">
                <div className="card-label">Patient Name</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{patient.name}</div>
                <div style={{ fontSize: 10, color: "#8888A8", marginTop: 2 }}>
                  Age {age} · DOB {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                </div>
              </div>
              <div className="card">
                <div className="card-label">Active Conditions</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {patient.conditions.map((cId) => {
                    const c = conditionColors[cId];
                    return (
                      <span key={cId} style={{
                        background: c?.bg, color: c?.accent,
                        padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 600,
                      }}>
                        {c?.emoji} {c?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Latest vitals */}
          <div className="section">
            <div className="section-title">Latest Biometric Readings</div>
            <div className="grid-3">
              {[
                { label: "Blood Glucose", value: latestReadings.bloodGlucose, unit: "mg/dL", status: latestReadings.bloodGlucose > 180 ? "amber" : "green" },
                { label: "Blood Pressure", value: `${latestReadings.systolic}/${latestReadings.diastolic}`, unit: "mmHg", status: latestReadings.systolic > 140 ? "amber" : "green" },
                { label: "Heart Rate", value: latestReadings.heartRate, unit: "bpm", status: "green" },
                { label: "SpO₂", value: latestReadings.spo2, unit: "%", status: latestReadings.spo2 < 94 ? "amber" : "green" },
                { label: "Weight", value: latestReadings.weight, unit: "kg", status: "green" },
                { label: "Medication Adherence", value: `${weeklyAdherence}%`, unit: "this week", status: weeklyAdherence >= 80 ? "green" : "amber" },
              ].map((v) => (
                <div key={v.label} className="card">
                  <div className="card-label">{v.label}</div>
                  <div>
                    <span className="card-value">{v.value}</span>
                    <span className="card-unit">{v.unit}</span>
                  </div>
                  <div className={`card-status status-${v.status}`}>
                    {v.status === "green" ? "✓ Normal" : "⚠ Monitor"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Condition summaries */}
          <div className="section">
            <div className="section-title">Condition Status Overview</div>
            <table>
              <thead>
                <tr>
                  <th>Condition</th>
                  <th>Primary Metric</th>
                  <th>Value</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {conditionSummaries.map((s) => (
                  <tr key={s.conditionId}>
                    <td>{conditionColors[s.conditionId]?.emoji} {s.label}</td>
                    <td>{s.metricLabel}</td>
                    <td style={{ fontWeight: 700 }}>{s.metricValue}</td>
                    <td style={{ color: "#8888A8" }}>{s.unit}</td>
                    <td>
                      <span className={`badge badge-${s.status}`}>
                        {s.status === "green" ? "Normal" : s.status === "amber" ? "Monitor" : "Alert"}
                      </span>
                    </td>
                    <td style={{ color: s.trend === "down" ? "#00B894" : s.trend === "up" ? "#D63031" : "#8888A8" }}>
                      {s.trend === "down" ? "↓ Improving" : s.trend === "up" ? "↑ Worsening" : "→ Stable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Adherence */}
          <div className="section">
            <div className="section-title">Medication Adherence</div>
            <div className="grid-2">
              <div className="card">
                <div className="card-label">Weekly Adherence Score</div>
                <div className="card-value">{weeklyAdherence}<span className="card-unit">%</span></div>
                <div className="adherence-bar" style={{ marginTop: 8 }}>
                  <div className="adherence-fill" style={{
                    width: `${weeklyAdherence}%`,
                    background: weeklyAdherence >= 80 ? "#00B894" : weeklyAdherence >= 60 ? "#FDCB6E" : "#D63031",
                  }} />
                </div>
              </div>
              <div className="card">
                <div className="card-label">Today&apos;s Medications</div>
                <table>
                  <tbody>
                    {todayMedications.slice(0, 4).map((m) => (
                      <tr key={m.id}>
                        <td style={{ paddingLeft: 0, border: "none", paddingTop: 3, paddingBottom: 3 }}>{m.name} {m.dosage}</td>
                        <td style={{ border: "none", paddingTop: 3, paddingBottom: 3, textAlign: "right" }}>
                          <span className={`badge badge-${m.status === "taken" ? "green" : m.status === "missed" ? "red" : "amber"}`}>
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="disclaimer">
            ⚕️ <strong>Clinical Disclaimer:</strong> This report is generated from patient self-reported data and connected wearable devices.
            Values should be interpreted in clinical context. This report does not constitute a medical diagnosis.
            For emergencies, call 112. CuraSync is not a substitute for professional medical advice.
          </div>

          <div className="footer">
            <span>CuraSync · HIPAA Compliant · DPDP Act 2023 · Data stored in ap-south-1</span>
            <span>Page 1 of 2 · Report ID: {Math.random().toString(36).slice(2, 10).toUpperCase()}</span>
          </div>
        </div>

        {/* ── PAGE 2 — Active Alerts + Emergency Contact ── */}
        <div className="page-break">
          <div className="header">
            <div className="logo">
              <div className="logo-icon">♥</div>
              <span className="logo-text">CuraSync</span>
            </div>
            <div className="report-meta">
              <div>{patient.name} · Continued</div>
              <div>Period: {format(new Date(rangeStart), "MMM d")} – {format(new Date(rangeEnd), "MMM d, yyyy")}</div>
            </div>
          </div>

          {/* Active alerts */}
          <div className="section">
            <div className="section-title">Active Alerts ({activeAlerts.length})</div>
            {activeAlerts.length === 0 ? (
              <p style={{ color: "#00B894", fontWeight: 600 }}>✓ No active alerts at time of report generation.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Message</th>
                    <th>Value</th>
                    <th>Triggered</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAlerts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className={`badge badge-${a.severity === "critical" ? "red" : a.severity === "high" ? "red" : "amber"}`}>
                          {a.severity.toUpperCase()}
                        </span>
                      </td>
                      <td>{a.message}</td>
                      <td style={{ fontWeight: 700 }}>{a.value ?? "—"}</td>
                      <td style={{ color: "#8888A8" }}>{format(new Date(a.triggeredAt), "MMM d, h:mm a")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Emergency contact */}
          <div className="section">
            <div className="section-title">Emergency Contact</div>
            <div className="card" style={{ maxWidth: 320 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{patient.emergencyContact.name}</div>
              <div style={{ color: "#8888A8", fontSize: 10 }}>{patient.emergencyContact.relationship}</div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>{patient.emergencyContact.phone}</div>
            </div>
          </div>

          {/* Reference ranges */}
          <div className="section">
            <div className="section-title">Clinical Reference Ranges</div>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Normal Range</th>
                  <th>High Alert</th>
                  <th>Critical</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: "Blood Glucose (Fasting)", normal: "70–99 mg/dL", high: ">250 mg/dL", critical: ">400 or <54 mg/dL" },
                  { metric: "Blood Pressure (Systolic)", normal: "<120 mmHg", high: ">150 mmHg", critical: ">180 mmHg" },
                  { metric: "Heart Rate", normal: "60–100 bpm", high: ">120 bpm", critical: ">150 or <40 bpm" },
                  { metric: "SpO₂", normal: "≥95%", high: "<94%", critical: "<90%" },
                ].map((r) => (
                  <tr key={r.metric}>
                    <td style={{ fontWeight: 600 }}>{r.metric}</td>
                    <td className="status-green">{r.normal}</td>
                    <td className="status-amber">{r.high}</td>
                    <td className="status-red">{r.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="disclaimer">
            This document was generated automatically by CuraSync and contains patient health data protected under HIPAA and the
            Indian Digital Personal Data Protection Act 2023. Unauthorised disclosure is prohibited. Retain for a minimum of 7 years
            per medical record regulations.
          </div>

          <div className="footer">
            <span>CuraSync · Encrypted at rest · AES-256 · © 2026</span>
            <span>Page 2 of 2</span>
          </div>
        </div>

      </body>
    </html>
  );
}
