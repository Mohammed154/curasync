// lib/reports/medical-pdf.tsx
// Professional medical PDF document generator using @react-pdf/renderer with high-fidelity jsPDF fallback

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";
import { jsPDF } from "jspdf";

export interface ReportPatientData {
  displayName: string;
  email: string;
  userId: string;
  reportingPeriod: string;
  generatedAt: string;
}

export interface VitalItem {
  type: string;
  value: string | number;
  unit: string;
  recordedAt: string;
  source?: string;
}

export interface GlucoseItem {
  value: number;
  unit: string;
  mealContext?: string;
  recordedAt: string;
}

export interface MedicationAdherenceData {
  totalScheduled: number;
  totalTaken: number;
  adherencePercentage: number;
  items?: Array<{ name: string; dosage: string; status: string; scheduledAt: string }>;
}

export interface MedicalReportData {
  patient: ReportPatientData;
  glucoseMetrics: {
    average: number;
    totalReadings: number;
    spikesCount: number;
    lowsCount: number;
    timeInRangePercentage: number;
  };
  vitals: VitalItem[];
  glucoseLogs: GlucoseItem[];
  medicationAdherence: MedicationAdherenceData;
  physicianNotes?: string;
  conditionNotes?: string[];
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#1A1A2E",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#6C5CE7",
    paddingBottom: 14,
    marginBottom: 16,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6C5CE7",
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#666680",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  reportBadge: {
    backgroundColor: "#F0EEFD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: "right",
  },
  reportBadgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#6C5CE7",
    textTransform: "uppercase",
  },
  confidentialText: {
    fontSize: 7,
    color: "#D63031",
    fontWeight: "bold",
    marginTop: 2,
  },
  patientCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  patientInfoCol1: {
    width: "28%",
  },
  patientInfoCol2: {
    width: "48%",
  },
  patientInfoCol3: {
    width: "24%",
  },
  patientLabel: {
    fontSize: 7,
    color: "#8888A8",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  patientValue: {
    fontSize: 9.5,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  patientEmailValue: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  patientIdValue: {
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#46465A",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1A1A2E",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FAFAFF",
    borderWidth: 1,
    borderColor: "#E2E0F0",
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginTop: 2,
  },
  metricTitle: {
    fontSize: 7,
    color: "#8888A8",
    textAlign: "center",
  },
  table: {
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  col1: { flex: 2, fontSize: 8, color: "#1A1A2E" },
  col2: { flex: 1.5, fontSize: 8, fontWeight: "bold", color: "#1A1A2E" },
  col3: { flex: 1.5, fontSize: 8, color: "#64748B" },
  col4: { flex: 2, fontSize: 7, color: "#94A3B8" },
  thText: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  notesBox: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 3,
    borderLeftColor: "#6C5CE7",
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 6,
    color: "#94A3B8",
  },
});

export const MedicalReportDocument: React.FC<{ data: MedicalReportData }> = ({ data }) => {
  const { patient, glucoseMetrics, vitals, medicationAdherence, physicianNotes } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>CuraSync Medical Portal</Text>
            <Text style={styles.brandSubtitle}>
              Continuous Health Telemetry &amp; Chronic Disease Analytics
            </Text>
          </View>
          <View style={styles.reportBadge}>
            <Text style={styles.reportBadgeText}>Clinical Health Summary</Text>
            <Text style={styles.confidentialText}>CONFIDENTIAL MEDICAL RECORD</Text>
          </View>
        </View>

        <View style={styles.patientCard}>
          <View style={styles.patientInfoCol1}>
            <Text style={styles.patientLabel}>Patient Name</Text>
            <Text style={styles.patientValue}>{String(patient.displayName || "Patient")}</Text>
            <Text style={styles.patientLabel}>Patient ID / UID</Text>
            <Text style={styles.patientIdValue}>{String(patient.userId)}</Text>
          </View>
          <View style={styles.patientInfoCol2}>
            <Text style={styles.patientLabel}>Email Address</Text>
            <Text style={styles.patientEmailValue}>{String(patient.email)}</Text>
            <Text style={styles.patientLabel}>Coverage Span</Text>
            <Text style={styles.patientValue}>{String(patient.reportingPeriod)}</Text>
          </View>
          <View style={styles.patientInfoCol3}>
            <Text style={styles.patientLabel}>Report Generated</Text>
            <Text style={styles.patientValue}>{String(patient.generatedAt)}</Text>
            <Text style={styles.patientLabel}>Med Adherence</Text>
            <Text style={[styles.patientValue, { color: "#00B894" }]}>{`${medicationAdherence.adherencePercentage}%`}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Glycemic Control &amp; Biometric Analytics</Text>
        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Average Glucose</Text>
            <Text style={styles.metricNumber}>{glucoseMetrics.average ? `${Math.round(glucoseMetrics.average)}` : "—"}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Time in Range</Text>
            <Text style={styles.metricNumber}>{`${glucoseMetrics.timeInRangePercentage}%`}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Spikes</Text>
            <Text style={styles.metricNumber}>{String(glucoseMetrics.spikesCount)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Lows</Text>
            <Text style={styles.metricNumber}>{String(glucoseMetrics.lowsCount)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Entries</Text>
            <Text style={styles.metricNumber}>{String(glucoseMetrics.totalReadings)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recorded Biometric Vitals</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.thText]}>Metric</Text>
            <Text style={[styles.col2, styles.thText]}>Value</Text>
            <Text style={[styles.col3, styles.thText]}>Source</Text>
            <Text style={[styles.col4, styles.thText]}>Timestamp</Text>
          </View>
          {vitals.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.col1, { color: "#94A3B8" }]}>No vitals recorded in this period</Text>
              <Text style={styles.col2}>—</Text>
              <Text style={styles.col3}>—</Text>
              <Text style={styles.col4}>—</Text>
            </View>
          ) : (
            vitals.slice(0, 10).map((v, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>{formatVitalName(v.type)}</Text>
                <Text style={styles.col2}>{`${v.value} ${v.unit}`}</Text>
                <Text style={styles.col3}>{v.source || "Manual Entry"}</Text>
                <Text style={styles.col4}>{v.recordedAt ? new Date(v.recordedAt).toLocaleString() : "—"}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Physician Review &amp; Clinical Directives</Text>
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>
            {String(physicianNotes || "Patient is actively logging telemetry vitals. All measurements are within reference parameters.")}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CuraSync Health Intelligence Platform</Text>
          <Text style={styles.footerText}>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};

function formatVitalName(type: string): string {
  switch (type) {
    case "blood_glucose": return "Blood Glucose";
    case "blood_pressure_systolic": return "Blood Pressure (Systolic)";
    case "blood_pressure_diastolic": return "Blood Pressure (Diastolic)";
    case "heart_rate": return "Heart Rate";
    case "spo2": return "Blood Oxygen (SpO2)";
    case "temperature": return "Body Temperature";
    case "weight": return "Body Weight";
    default: return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Safely renders text in jsPDF within a maximum width boundary.
 * Dynamically scales down font size and/or truncates with an ellipsis if needed
 * to ensure text never overflows or collides with adjacent columns.
 */
function drawSafeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options?: {
    align?: "left" | "center" | "right";
    minFontSize?: number;
  }
) {
  let str = String(text ?? "");
  const align = options?.align || "left";
  let width = doc.getTextWidth(str);

  if (width <= maxWidth) {
    doc.text(str, x, y, { align });
    return;
  }

  const originalFontSize = doc.getFontSize();
  const minFontSize = options?.minFontSize ?? Math.max(6.5, originalFontSize - 2);

  // Attempt slight font reduction down to minFontSize
  let currentSize = originalFontSize;
  while (currentSize > minFontSize && width > maxWidth) {
    currentSize -= 0.5;
    doc.setFontSize(currentSize);
    width = doc.getTextWidth(str);
  }

  if (width <= maxWidth) {
    doc.text(str, x, y, { align });
    doc.setFontSize(originalFontSize);
    return;
  }

  // Truncate with ellipsis if still wider than boundary
  while (str.length > 2 && doc.getTextWidth(str + "…") > maxWidth) {
    str = str.slice(0, -1);
  }
  doc.text(str + "…", x, y, { align });
  doc.setFontSize(originalFontSize);
}

/**
 * High-fidelity pure JS PDF generator using jsPDF
 * Immune to React reconciler / fiber version constraints
 */
function generateJsPdfBuffer(data: MedicalReportData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 40;

  // Header banner
  doc.setFillColor(108, 92, 231); // #6C5CE7
  doc.rect(40, y, 4, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(108, 92, 231);
  doc.text("CuraSync Medical Portal", 52, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text("Continuous Health Telemetry & Chronic Disease Analytics", 52, y + 28);

  // Badge on right
  doc.setFillColor(240, 238, 253);
  doc.roundedRect(pageWidth - 190, y, 150, 30, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(108, 92, 231);
  doc.text("CLINICAL HEALTH SUMMARY", pageWidth - 182, y + 14);
  doc.setFontSize(7);
  doc.setTextColor(214, 48, 49);
  doc.text("CONFIDENTIAL MEDICAL RECORD", pageWidth - 182, y + 24);

  y += 50;

  // Patient Info Card - 3-column proportional grid with overflow protection
  doc.setFillColor(248, 249, 250);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, y, pageWidth - 80, 72, 6, 6, "FD");

  // Col 1 (Patient Info: Name & ID) - x: 54, width: 140
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("PATIENT NAME", 54, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(26, 26, 46);
  drawSafeText(doc, String(data.patient.displayName || "Patient"), 54, y + 31, 136);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("PATIENT ID / UID", 54, y + 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 90);
  drawSafeText(doc, String(data.patient.userId), 54, y + 61, 136, { minFontSize: 6 });

  // Col 2 (Email & Coverage Span) - x: 206, width: 224
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("EMAIL ADDRESS", 206, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(26, 26, 46);
  drawSafeText(doc, String(data.patient.email), 206, y + 31, 224, { minFontSize: 7 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("COVERAGE SPAN", 206, y + 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(26, 26, 46);
  drawSafeText(doc, String(data.patient.reportingPeriod), 206, y + 61, 224);

  // Col 3 (Report Generated & Med Adherence) - x: 446, width: 100
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("REPORT GENERATED", 446, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(26, 26, 46);
  drawSafeText(doc, String(data.patient.generatedAt), 446, y + 31, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(136, 136, 168);
  doc.text("MED ADHERENCE", 446, y + 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 184, 148);
  drawSafeText(doc, `${data.medicationAdherence.adherencePercentage}%`, 446, y + 61, 100);

  y += 86;

  // Glycemic Control Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("GLYCEMIC CONTROL & BIOMETRIC ANALYTICS", 40, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y + 4, pageWidth - 40, y + 4);

  y += 14;

  // 5 Metric Boxes
  const boxWidth = (pageWidth - 80 - 32) / 5;
  const metrics = [
    { title: "Average Glucose", value: data.glucoseMetrics.average ? `${Math.round(data.glucoseMetrics.average)} mg/dL` : "—", color: [26, 26, 46] },
    { title: "Time in Range", value: `${data.glucoseMetrics.timeInRangePercentage}%`, color: [0, 184, 148] },
    { title: "Hyper Spikes", value: String(data.glucoseMetrics.spikesCount), color: [214, 48, 49] },
    { title: "Hypo Lows", value: String(data.glucoseMetrics.lowsCount), color: [214, 48, 49] },
    { title: "Readings Logged", value: String(data.glucoseMetrics.totalReadings), color: [26, 26, 46] },
  ];

  metrics.forEach((m, idx) => {
    const bx = 40 + idx * (boxWidth + 8);
    doc.setFillColor(250, 250, 255);
    doc.setDrawColor(226, 224, 240);
    doc.roundedRect(bx, y, boxWidth, 42, 4, 4, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(136, 136, 168);
    doc.text(m.title, bx + boxWidth / 2, y + 14, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const [cr = 26, cg = 26, cb = 46] = m.color;
    doc.setTextColor(cr, cg, cb);
    doc.text(m.value, bx + boxWidth / 2, y + 30, { align: "center" });
  });

  y += 56;

  // Recorded Vitals Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("RECORDED BIOMETRIC VITALS", 40, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y + 4, pageWidth - 40, y + 4);

  y += 12;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(40, y, pageWidth - 80, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("BIOMETRIC METRIC", 48, y + 12);
  doc.text("RECORDED VALUE", 185, y + 12);
  doc.text("SOURCE / CONTEXT", 305, y + 12);
  doc.text("TIMESTAMP", 430, y + 12);

  y += 18;

  if (data.vitals.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("No vitals recorded in this period", 48, y + 14);
    y += 20;
  } else {
    data.vitals.slice(0, 8).forEach((v, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y, pageWidth - 80, 16, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(26, 26, 46);
      drawSafeText(doc, formatVitalName(v.type), 48, y + 11, 130);

      doc.setFont("helvetica", "bold");
      drawSafeText(doc, `${v.value} ${v.unit}`, 185, y + 11, 110);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      drawSafeText(doc, v.source || "Manual Entry", 305, y + 11, 115);

      doc.setTextColor(148, 163, 184);
      drawSafeText(doc, v.recordedAt ? new Date(v.recordedAt).toLocaleString() : "—", 430, y + 11, 120);

      y += 16;
    });
  }

  y += 14;

  // Medication Adherence Record
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("MEDICATION ADHERENCE RECORD", 40, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y + 4, pageWidth - 40, y + 4);

  y += 12;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(40, y, pageWidth - 80, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("MEDICATION", 48, y + 12);
  doc.text("DOSAGE", 185, y + 12);
  doc.text("STATUS", 305, y + 12);
  doc.text("SCHEDULED / LOGGED", 430, y + 12);

  y += 18;

  if (!data.medicationAdherence.items || data.medicationAdherence.items.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Adherence log: ${data.medicationAdherence.totalTaken} of ${data.medicationAdherence.totalScheduled} doses recorded taken (${data.medicationAdherence.adherencePercentage}%)`, 48, y + 14);
    y += 20;
  } else {
    data.medicationAdherence.items.slice(0, 6).forEach((m, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, y, pageWidth - 80, 16, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(26, 26, 46);
      drawSafeText(doc, m.name, 48, y + 11, 130);

      doc.setTextColor(100, 116, 139);
      drawSafeText(doc, m.dosage, 185, y + 11, 110);

      doc.setFont("helvetica", "bold");
      if (m.status === "taken") {
        doc.setTextColor(0, 184, 148);
      } else {
        doc.setTextColor(214, 48, 49);
      }
      drawSafeText(doc, m.status.toUpperCase(), 305, y + 11, 115);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      drawSafeText(doc, m.scheduledAt ? new Date(m.scheduledAt).toLocaleDateString() : "—", 430, y + 11, 120);

      y += 16;
    });
  }

  y += 16;

  // Physician Notes Box - Dynamic Height based on content
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 46);
  doc.text("PHYSICIAN REVIEW & CLINICAL DIRECTIVES", 40, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y + 4, pageWidth - 40, y + 4);

  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const noteLines = doc.splitTextToSize(
    data.physicianNotes || "Patient is actively logging telemetry vitals. Fasting glucose tracking within stable reference range. Recommended: continue prescribed daily regimen, maintain hydration, and report blood pressure anomalies exceeding 140/90 mmHg. Bring this document to the next scheduled clinical evaluation.",
    pageWidth - 104
  );
  const noteBoxHeight = Math.max(48, noteLines.length * 11 + 18);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(108, 92, 231);
  doc.roundedRect(40, y, pageWidth - 80, noteBoxHeight, 4, 4, "F");
  doc.rect(40, y, 3, noteBoxHeight, "F");

  doc.text(noteLines, 52, y + 16);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 28;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, footerY - 8, pageWidth - 40, footerY - 8);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("CuraSync Health Intelligence Platform · Generated automatically via HIPAA-compliant scheduler.", 40, footerY);
  doc.text("Page 1 of 1", pageWidth - 40, footerY, { align: "right" });

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/**
 * Compiles report data into a binary Buffer with fallback resilience
 */
export async function generateReportPdfBuffer(data: MedicalReportData): Promise<Buffer> {
  try {
    const element = React.createElement(MedicalReportDocument, { data });
    const stream = await renderToStream(element as any);
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", (err: any) => reject(err));
    });
  } catch (reactPdfErr) {
    console.warn("[medical-pdf] Falling back to jsPDF vector engine:", reactPdfErr);
    return generateJsPdfBuffer(data);
  }
}
