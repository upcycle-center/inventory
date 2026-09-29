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
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, marginBottom: 10, color: "#555555" },
  thRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingVertical: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 4 },
  cell: { paddingRight: 6 },
});

type Column = { label: string; flex: number; render: (s: Supplier) => string };

const ACCOUNT_COLUMNS: Column[] = [
  { label: "Company", flex: 2, render: (s) => s.name },
  { label: "Acct #", flex: 1, render: (s) => s.account_number || "—" },
  { label: "Acct Rep", flex: 1.8, render: (s) => fullName(s.representative_first_name, s.representative_last_name) },
  { label: "Rep Email", flex: 2.2, render: (s) => s.representative_email || "—" },
  { label: "Rep Mobile", flex: 1.4, render: (s) => s.representative_phone || "—" },
  { label: "Order By", flex: 1.2, render: (s) => formatDays(s.order_by_days) },
  { label: "Deliver On", flex: 1.2, render: (s) => formatDays(s.delivery_days) },
];

const BILLING_COLUMNS: Column[] = [
  { label: "Company", flex: 2, render: (s) => s.name },
  { label: "Acct #", flex: 1, render: (s) => s.account_number || "—" },
  { label: "Website", flex: 1.6, render: (s) => s.website || "—" },
  { label: "Office #", flex: 1.2, render: (s) => s.office_phone || "—" },
  { label: "Billing Contact", flex: 1.8, render: (s) => fullName(s.billing_first_name, s.billing_last_name) },
  { label: "Billing Email", flex: 2, render: (s) => s.billing_email || "—" },
  { label: "Billing Mobile", flex: 1.4, render: (s) => s.billing_phone || "—" },
];

function SupplierTablePage({
  heading,
  columns,
  suppliers,
  generatedAt,
}: {
  heading: string;
  columns: Column[];
  suppliers: Supplier[];
  generatedAt: string;
}) {
  return (
    <Page size="LETTER" orientation="landscape" style={styles.page}>
      <Text style={styles.title}>{heading}</Text>
      <Text style={styles.subtitle}>
        Printed {generatedAt} · {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"}
      </Text>

      <View style={styles.thRow}>
        {columns.map((col) => (
          <Text key={col.label} style={[styles.cell, { flex: col.flex }]}>
            {col.label}
          </Text>
        ))}
      </View>
      {suppliers.map((s) => (
        <View key={s.id} style={styles.tr} wrap={false}>
          {columns.map((col) => (
            <Text key={col.label} style={[styles.cell, { flex: col.flex }]}>
              {col.render(s)}
            </Text>
          ))}
        </View>
      ))}
      {!suppliers.length && <Text>No suppliers yet.</Text>}
    </Page>
  );
}

export function SuppliersDocument({ suppliers, generatedAt }: { suppliers: Supplier[]; generatedAt: string }) {
  return (
    <Document>
      <SupplierTablePage heading="Suppliers | Account Information" columns={ACCOUNT_COLUMNS} suppliers={suppliers} generatedAt={generatedAt} />
      <SupplierTablePage heading="Suppliers | Billing Information" columns={BILLING_COLUMNS} suppliers={suppliers} generatedAt={generatedAt} />
    </Document>
  );
}
