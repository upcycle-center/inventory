import QRCode from "qrcode";

// The one URL every stand's QR code (sticker and count sheet alike) always
// points to -- what it shows depends on the stand's current count status.
export function checkinUrl(origin: string, locationId: string): string {
  return `${origin}/checkin/${locationId}`;
}

export async function checkinQrBuffer(origin: string, locationId: string, width = 512): Promise<Buffer> {
  return QRCode.toBuffer(checkinUrl(origin, locationId), { type: "png", width, margin: 2 });
}

export async function checkinQrDataUri(origin: string, locationId: string, width = 240): Promise<string> {
  const buffer = await checkinQrBuffer(origin, locationId, width);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
