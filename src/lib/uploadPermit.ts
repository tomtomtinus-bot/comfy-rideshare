// Upload + parse RDW ontheffing PDF en sla op in storage + permits + permit_routes.
// Hergebruikt vanuit RequestRide (inline upload) en Permits-pagina.

import { supabase } from "@/integrations/supabase/client";
import { parsePermitPdf, type ParsedPermit } from "@/lib/permitParser";

export interface UploadedPermit {
  id: string;
  permit_number: string;
  carrier: string | null;
  pdf_path: string;
  routes_count: number;
}

export async function uploadPermitPdf(file: File, userId: string): Promise<UploadedPermit> {
  const parsed: ParsedPermit = await parsePermitPdf(file);
  if (!parsed.permitNumber) {
    throw new Error("Geen ontheffingnummer gevonden in PDF");
  }

  const safeName = file.name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(-120);
  const path = `${userId}/${Date.now()}-${safeName || "ontheffing.pdf"}`;

  const { error: upErr } = await supabase.storage.from("permits").upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: ins, error: insErr } = await supabase
    .from("permits")
    .insert({
      client_id: userId,
      permit_number: parsed.permitNumber,
      reference: parsed.reference,
      carrier: parsed.carrier,
      cargo: parsed.cargo,
      valid_from: parsed.validFrom,
      valid_to: parsed.validTo,
      max_length_m: parsed.maxLengthM,
      max_width_m: parsed.maxWidthM,
      max_height_m: parsed.maxHeightM,
      max_weight_kg: parsed.maxWeightKg,
      pdf_path: path,
      raw_data: parsed as any,
    })
    .select()
    .single();
  if (insErr) {
    // probeer storage op te ruimen — best effort
    await supabase.storage.from("permits").remove([path]).catch(() => {});
    throw insErr;
  }

  if (parsed.routes.length > 0) {
    const rowsToInsert = parsed.routes.map((r) => ({
      permit_id: ins.id,
      route_index: r.routeIndex,
      loaded: r.loaded,
      origin: r.origin,
      destination: r.destination,
      waypoints: r.waypoints as any,
    }));
    await supabase.from("permit_routes").insert(rowsToInsert);
  }

  return {
    id: ins.id,
    permit_number: parsed.permitNumber,
    carrier: parsed.carrier ?? null,
    pdf_path: path,
    routes_count: parsed.routes.length,
  };
}
