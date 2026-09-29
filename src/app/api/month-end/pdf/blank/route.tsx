import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { PRODUCT_TYPE_OPTIONS, middleUnitColumnLabel } from "@/lib/productType";
import { GenericMonthEndCountSheetDocument } from "@/lib/pdf/MonthEndCountSheetDocument";
import { exportFilename } from "@/lib/exportFilename";
import { easternDateString } from "@/lib/easternTime";
import { urlQrDataUri } from "@/lib/checkinQr";

const NO_VENDOR = "No Vendor";

// Not tied to any location -- every active product in the catalog,
// organized Product Type -> Vendor -> Product (alphabetical), with each
// Type starting on its own page. For printing a blank reference packet
// or handing a new location its first count sheet before it's set up.
export async function GET(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const [defaultYear, defaultMonth] = easternDateString().split("-").map(Number);
  const year = Number(searchParams.get("year") || defaultYear);
  const month = Number(searchParams.get("month") || defaultMonth);

  const supabase = createClient();

  const { data: products } = await supabase
    .from("products")
    .select("sku, description, product_type, middle_unit_label, each_countable, supplier:suppliers(name)")
    .eq("active", true);

  const vendorMapByType = new Map<string, Map<string, { name: string; products: any[] }>>();
  for (const p of (products as any[]) ?? []) {
    const vendorMap = vendorMapByType.get(p.product_type) ?? new Map<string, { name: string; products: any[] }>();
    const vendorName = p.supplier?.name || NO_VENDOR;
    const entry = vendorMap.get(vendorName) ?? { name: vendorName, products: [] as any[] };
    entry.products.push(p);
    vendorMap.set(vendorName, entry);
    vendorMapByType.set(p.product_type, vendorMap);
  }

  const typeSections = PRODUCT_TYPE_OPTIONS.map((t) => {
    const vendorMap = vendorMapByType.get(t.value);
    const vendors = vendorMap
      ? Array.from(vendorMap.values())
          .sort((a, b) => {
            if (a.name === NO_VENDOR) return 1;
            if (b.name === NO_VENDOR) return -1;
            return a.name.localeCompare(b.name);
          })
          .map((v) => ({ name: v.name, products: v.products.slice().sort((a, b) => a.description.localeCompare(b.description)) }))
      : [];
    return { typeLabel: t.shortLabel, middleUnitLabel: middleUnitColumnLabel(t.value), vendors };
  }).filter((s) => s.vendors.length > 0);

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const { origin } = new URL(request.url);
  const qrCodeDataUri = await urlQrDataUri(`${origin}/month-end`);

  const buffer = await renderToBuffer(
    (<GenericMonthEndCountSheetDocument monthLabel={monthLabel} typeSections={typeSections} qrCodeDataUri={qrCodeDataUri} />) as any
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${exportFilename("moEND-Count-Sheet-Blank", "pdf")}"`,
    },
  });
}
