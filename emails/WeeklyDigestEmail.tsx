import React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";

export interface WeeklyDigestEmailProps {
  patientName?: string;
  startDate?: string;
  endDate?: string;
  avgSystolic?: number | null;
  avgDiastolic?: number | null;
  avgGlucose?: number | null;
  totalReadings?: number;
  criticalAlertCount?: number;
  dashboardUrl?: string;
}

export default function WeeklyDigestEmail({
  patientName = "Patient",
  startDate = "Past 7 Days",
  endDate = "Today",
  avgSystolic = null,
  avgDiastolic = null,
  avgGlucose = null,
  totalReadings = 0,
  criticalAlertCount = 0,
  dashboardUrl = "https://curasync.care/dashboard",
}: WeeklyDigestEmailProps) {
  const hasBp = avgSystolic !== null && avgDiastolic !== null;
  const hasGlucose = avgGlucose !== null;
  const hasCritical = criticalAlertCount > 0;

  return (
    <Html lang="en">
      <Head />
      <Preview>Your CuraSync Weekly Health Digest: {startDate} – {endDate}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Brand Header */}
          <Section style={headerSection}>
            <Row>
              <Column>
                <div style={logoBadge}>
                  <span style={logoText}>CuraSync</span>
                </div>
              </Column>
              <Column align="right">
                <Text style={dateBadge}>{startDate} – {endDate}</Text>
              </Column>
            </Row>
          </Section>

          <Heading style={headingStyle}>Weekly Health Digest</Heading>
          <Text style={paragraphStyle}>
            Hello <strong style={{ color: "#1F2937" }}>{patientName}</strong>,
          </Text>
          <Text style={subparagraphStyle}>
            Here is your personalized 7-day health summary consolidating your recorded vitals, weekly averages, and clinical safety alerts.
          </Text>

          <Hr style={dividerStyle} />

          {/* Vitals Summary Grid */}
          <Section style={{ marginBottom: "24px" }}>
            <Text style={sectionTitle}>7-Day Vitals Summary</Text>
            <Row>
              {/* Blood Pressure Card */}
              <Column style={cardColumn}>
                <div style={cardStyle}>
                  <Text style={cardLabel}>Blood Pressure</Text>
                  <Text style={cardValue}>
                    {hasBp ? `${avgSystolic}/${avgDiastolic}` : "--/--"}
                  </Text>
                  <Text style={cardUnit}>mmHg (Avg)</Text>
                  <div style={cardFooter}>
                    <Text style={cardFootnote}>
                      {hasBp
                        ? avgSystolic! < 130 && avgDiastolic! < 85
                          ? "✓ Optimal Range"
                          : "⚠ Elevated Range"
                        : "No logs this week"}
                    </Text>
                  </div>
                </div>
              </Column>

              {/* Blood Glucose Card */}
              <Column style={cardColumn}>
                <div style={cardStyle}>
                  <Text style={cardLabel}>Blood Glucose</Text>
                  <Text style={cardValue}>
                    {hasGlucose ? `${avgGlucose}` : "--"}
                  </Text>
                  <Text style={cardUnit}>mg/dL (Avg)</Text>
                  <div style={cardFooter}>
                    <Text style={cardFootnote}>
                      {hasGlucose
                        ? avgGlucose! >= 70 && avgGlucose! <= 140
                          ? "✓ In Target Range"
                          : "⚠ Review With Care Team"
                        : "No logs this week"}
                    </Text>
                  </div>
                </div>
              </Column>
            </Row>

            <Row style={{ marginTop: "12px" }}>
              {/* Readings Count Card */}
              <Column>
                <div style={bannerCardStyle}>
                  <Row>
                    <Column style={{ width: "70%" }}>
                      <Text style={{ ...cardLabel, margin: 0 }}>Total Logs Recorded</Text>
                      <Text style={{ fontSize: "12px", color: "#6B7280", margin: "4px 0 0" }}>
                        Consistency over the last 7 days
                      </Text>
                    </Column>
                    <Column align="right" style={{ width: "30%" }}>
                      <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#6C5CE7", margin: 0 }}>
                        {totalReadings}
                      </Text>
                      <Text style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>readings</Text>
                    </Column>
                  </Row>
                </div>
              </Column>
            </Row>
          </Section>

          {/* Clinical Alert Notice */}
          <Section style={{ marginBottom: "28px" }}>
            {hasCritical ? (
              <div style={criticalAlertBox}>
                <Text style={alertTitleRed}>⚠️ Clinical Alert Notice</Text>
                <Text style={alertBodyRed}>
                  <strong>{criticalAlertCount} critical reading(s)</strong> were identified in your logs during this 7-day period. Please review your medication adherence, re-test your vitals, and consult your physician or care team if symptoms persist.
                </Text>
              </div>
            ) : totalReadings === 0 ? (
              <div style={infoAlertBox}>
                <Text style={alertTitlePurple}>ℹ️ Health Tracking Tip</Text>
                <Text style={alertBodyPurple}>
                  No readings were recorded during the past 7 days. Logging your blood pressure and glucose once daily establishes a dependable baseline for early clinical risk detection.
                </Text>
              </div>
            ) : (
              <div style={healthyAlertBox}>
                <Text style={alertTitleGreen}>✓ Clinical Status: Normal</Text>
                <Text style={alertBodyGreen}>
                  All readings recorded over the past 7 days remained within expected clinical ranges with zero critical alert flags.
                </Text>
              </div>
            )}
          </Section>

          {/* Action CTA */}
          <Section style={{ textAlign: "center", marginBottom: "32px" }}>
            <Button style={primaryButtonStyle} href={dashboardUrl}>
              View Patient Dashboard →
            </Button>
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer & Privacy Disclaimers */}
          <Section style={{ textAlign: "center" }}>
            <Text style={footerText}>
              CuraSync Health Technologies • HIPAA Compliant Remote Patient Monitoring
            </Text>
            <Text style={footerSubtext}>
              This automated digest was generated based on your health log entries. This digest is for informational tracking and does not replace emergency medical care.
            </Text>
            <Text style={footerSubtext}>
              Preferences: You can adjust or disable your weekly email digest anytime in your{" "}
              <Link href={`${dashboardUrl.replace(/\/dashboard$/, "")}/settings`} style={footerLink}>
                Account Notification Settings
              </Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const mainStyle: React.CSSProperties = {
  backgroundColor: "#F3F4F6",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  padding: "32px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#FFFFFF",
  borderRadius: "16px",
  border: "1px solid #E5E7EB",
  padding: "36px 32px",
  maxWidth: "580px",
  margin: "0 auto",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
};

const headerSection: React.CSSProperties = {
  marginBottom: "24px",
};

const logoBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 14px",
  borderRadius: "10px",
  background: "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)",
  backgroundColor: "#6C5CE7",
};

const logoText: React.CSSProperties = {
  color: "#FFFFFF",
  fontWeight: "bold",
  fontSize: "16px",
  letterSpacing: "-0.3px",
};

const dateBadge: React.CSSProperties = {
  fontSize: "12px",
  color: "#6B7280",
  fontWeight: 500,
  margin: 0,
};

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: "bold",
  color: "#111827",
  margin: "0 0 12px 0",
  letterSpacing: "-0.5px",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#374151",
  margin: "0 0 8px 0",
};

const subparagraphStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6B7280",
  margin: "0 0 20px 0",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#F3F4F6",
  borderStyle: "solid",
  borderWidth: "1px",
  margin: "24px 0",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: "#4B5563",
  margin: "0 0 12px 0",
};

const cardColumn: React.CSSProperties = {
  width: "50%",
  paddingRight: "6px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: "12px",
  padding: "16px",
  textAlign: "center",
};

const bannerCardStyle: React.CSSProperties = {
  backgroundColor: "#F9FAFB",
  border: "1px solid #E5E7EB",
  borderRadius: "12px",
  padding: "14px 18px",
};

const cardLabel: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#6B7280",
  margin: "0 0 4px 0",
  textTransform: "uppercase",
};

const cardValue: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#111827",
  margin: "4px 0 0 0",
  letterSpacing: "-0.5px",
};

const cardUnit: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  margin: "2px 0 10px 0",
};

const cardFooter: React.CSSProperties = {
  borderTop: "1px solid #E5E7EB",
  paddingTop: "8px",
  marginTop: "4px",
};

const cardFootnote: React.CSSProperties = {
  fontSize: "11px",
  color: "#4B5563",
  fontWeight: 500,
  margin: 0,
};

const criticalAlertBox: React.CSSProperties = {
  backgroundColor: "#FEF2F2",
  border: "1px solid #F87171",
  borderRadius: "12px",
  padding: "16px 18px",
};

const alertTitleRed: React.CSSProperties = {
  color: "#DC2626",
  fontWeight: 700,
  fontSize: "14px",
  margin: "0 0 6px 0",
};

const alertBodyRed: React.CSSProperties = {
  color: "#991B1B",
  fontSize: "13px",
  lineHeight: "19px",
  margin: 0,
};

const healthyAlertBox: React.CSSProperties = {
  backgroundColor: "#F0FDF4",
  border: "1px solid #86EFAC",
  borderRadius: "12px",
  padding: "16px 18px",
};

const alertTitleGreen: React.CSSProperties = {
  color: "#16A34A",
  fontWeight: 700,
  fontSize: "14px",
  margin: "0 0 6px 0",
};

const alertBodyGreen: React.CSSProperties = {
  color: "#166534",
  fontSize: "13px",
  lineHeight: "19px",
  margin: 0,
};

const infoAlertBox: React.CSSProperties = {
  backgroundColor: "#F5F3FF",
  border: "1px solid #DDD6FE",
  borderRadius: "12px",
  padding: "16px 18px",
};

const alertTitlePurple: React.CSSProperties = {
  color: "#6C5CE7",
  fontWeight: 700,
  fontSize: "14px",
  margin: "0 0 6px 0",
};

const alertBodyPurple: React.CSSProperties = {
  color: "#4C1D95",
  fontSize: "13px",
  lineHeight: "19px",
  margin: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#6C5CE7",
  color: "#FFFFFF",
  fontWeight: 600,
  fontSize: "14px",
  borderRadius: "10px",
  padding: "14px 28px",
  textDecoration: "none",
  display: "inline-block",
  boxShadow: "0 2px 6px rgba(108, 92, 231, 0.35)",
};

const footerText: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#6B7280",
  margin: "0 0 6px 0",
};

const footerSubtext: React.CSSProperties = {
  fontSize: "11px",
  color: "#9CA3AF",
  lineHeight: "16px",
  margin: "0 0 6px 0",
};

const footerLink: React.CSSProperties = {
  color: "#6C5CE7",
  textDecoration: "underline",
};
