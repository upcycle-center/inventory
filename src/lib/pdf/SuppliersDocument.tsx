import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Supplier } from "@/lib/supabase/types";

const DAY_LABELS: Record<string, string> = { Sun: "Su", Mon: "M", Tue: "Tu", Wed: "W", Thu: "Th", Fri: "F", Sat: "Sa" };
const DAY_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDays(days: string[]): string {
  if (!days.length) return "—";
  return DAY_ORDER.filter((d) => days.includes(d))
    .map((d) => DAY_LABELS[d])
    .join(" ");
}

function fullName(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "—";
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, marginBottom: 10, color: "#555555" },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 3 },
  cell: { paddingRight: 4 },
});

const COLUMNS: { label: string; flex: number; render: (s: Supplier) => string }[] = [
  { label: "Company", flex: 2, render: (s) => s.name },
  { label: "Acct #", flex: 0.8, render: (s) => s.account_number || "—" },
  { label: "Website", flex: 1.3, render: (s) => s.website || "—" },
  { label: "Office #", flex: 1, render: (s) => s.office_phone || "—" },
  { label: "Acct Rep", flex: 1.3, render: (s) => fullName(s.representative_first_name, s.representative_last_name) },
  { label: "Rep Email", flex: 1.6, render: (s) => s.representative_email || "—" },
  { label: "Rep Mobile", flex: 1, render: (s) => s.representative_phone || "—" },
  { label: "Billing Contact", flex: 1.3, render: (s) => fullName(s.billing_first_name, s.billing_last_name) },
  { label: "Billing Email", flex: 1.6, render: (s) => s.billing_email || "—" },
  { label: "Billing Mobile", flex: 1, render: (s) => s.billing_phone || "—" },
  { label: "Order By", flex: 0.9, render: (s) => formatDays(s.order_by_days) },
  { label: "Deliver On", flex: 0.9, render: (s) => formatDays(s.delivery_days) },
  { label: "Logistics Notes", flex: 2, render: (s) => s.logistics_notes || "—" },
];

export function SuppliersDocument({ suppliers, generatedAt }: { suppliers: Supplier[]; generatedAt: string }) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Suppliers</Text>
        <Text style={styles.subtitle}>
          Printed {generatedAt} · {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}
        </Text>

        <View style={styles.thRow}>
          {COLUMNS.map((col) => (
            <Text key={col.label} style={[styles.cell, { flex: col.flex }]}>
              {col.label}
            </Text>
          ))}
        </View>
        {suppliers.map((s) => (
          <View key={s.id} style={styles.tr} wrap={false}>
            {COLUMNS.map((col) => (
              <Text key={col.label} style={[styles.cell, { flex: col.flex }]}>
                {col.render(s)}
              </Text>
            ))}
          </View>
        ))}
        {!suppliers.length && <Text>No suppliers yet.</Text>}
      </Page>
    </Document>
  );
}
