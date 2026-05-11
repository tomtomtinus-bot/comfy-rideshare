// Upload RDW ontheffing PDF en sla het handmatig ingevulde ontheffingnummer op.
// Hergebruikt vanuit RequestRide (inline upload) en Permits-pagina.

import { supabase } from "@/integrations/supabase/client";

export interface UploadedPermit {
  id: string;
  permit_number: string;
  carrier: string | null;
  pdf_path: string;
  routes_count: number;
}

export async function uploadPermitPdf(file: File, userId: string, permitNumber: string): Promise<UploadedPermit> {
  const cleanPermitNumber = permitNumber.trim();
  if (!cleanPermitNumber) {
    throw new Error("Vul eerst het ontheffingnummer in");
  }

  // Lees bestand één keer in als ArrayBuffer zodat oudere iOS Safari versies
  // geen File/ReadableStream pad hoeven te gebruiken bij de upload.
  const arrayBuffer = await file.arrayBuffer();
  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120);
  const path = `${userId}/${Date.now()}-${safeName || "ontheffing.pdf"}`;

  const pdfBlob = new Blob([arrayBuffer], { type: "application/pdf" });
  const { error: upErr } = await supabase.storage.from("permits").upload(path, pdfBlob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: ins, error: insErr } = await supabase
    .from("permits")
    .insert({
      client_id: userId,
      permit_number: cleanPermitNumber,
      pdf_path: path,
      raw_data: {
        upload_only: true,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "application/pdf",
      } as any,
    })
    .select()
    .single();
  if (insErr) {
    // probeer storage op te ruimen — best effort
    await supabase.storage.from("permits").remove([path]).catch(() => {});
    throw insErr;
  }

  return {
    id: ins.id,
    permit_number: cleanPermitNumber,
    carrier: null,
    pdf_path: path,
    routes_count: 0,
  };
}
