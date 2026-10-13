import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "ride-attachments";
export const MAX_DOC_BYTES = 20 * 1024 * 1024;

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_").slice(-120);

/** Upload files to {clientId}/{rideId}/ in the private ride-attachments bucket. */
export async function uploadRideDocs(clientId: string, rideId: string, files: File[]) {
  let failed = 0;
  for (const f of files) {
    if (f.size > MAX_DOC_BYTES) { toast.error(`${f.name} is groter dan 20 MB`); failed++; continue; }
    const path = `${clientId}/${rideId}/${Date.now()}_${safeName(f.name)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined });
    if (error) { toast.error(`${f.name}: ${error.message}`); failed++; }
  }
  return files.length - failed;
}

/** Remove every document of a ride (used once the escort completes the ritbon). */
export async function deleteRideDocs(clientId: string, rideId: string) {
  const folder = `${clientId}/${rideId}`;
  const { data } = await supabase.storage.from(BUCKET).list(folder);
  const paths = (data ?? []).filter((d) => d.name).map((d) => `${folder}/${d.name}`);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

interface Doc { name: string; size: number }

export const RideDocuments = ({ clientId, rideId, canDelete }: { clientId: string; rideId: string; canDelete: boolean }) => {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const folder = `${clientId}/${rideId}`;

  const load = useCallback(async () => {
    const { data } = await supabase.storage.from(BUCKET).list(folder, { sortBy: { column: "created_at", order: "asc" } });
    setDocs((data ?? []).filter((d) => d.name && !d.name.startsWith(".")).map((d) => ({ name: d.name, size: (d.metadata as any)?.size ?? 0 })));
  }, [folder]);
  useEffect(() => { load(); }, [load]);

  const open = async (d: Doc) => {
    const w = window.open("", "_blank");
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(`${folder}/${d.name}`, 300, { download: label(d.name) });
    if (error || !data) { w?.close(); return toast.error("Document kon niet worden geopend"); }
    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const remove = async (d: Doc) => {
    const { error } = await supabase.storage.from(BUCKET).remove([`${folder}/${d.name}`]);
    if (error) return toast.error(error.message);
    load();
  };

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const n = await uploadRideDocs(clientId, rideId, [...files]);
    setBusy(false);
    if (n) toast.success(`${n} document(en) toegevoegd`);
    load();
  };

  return (
    <div className="space-y-2">
      {docs.length === 0 && <p className="text-sm text-muted-foreground">Nog geen documenten.</p>}
      {docs.map((d) => (
        <div key={d.name} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate">{label(d.name)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{(d.size / 1024 / 1024).toFixed(1)} MB</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => open(d)} aria-label="Downloaden"><Download className="h-4 w-4" /></Button>
          {canDelete && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => remove(d)} aria-label="Verwijderen"><Trash2 className="h-4 w-4" /></Button>}
        </div>
      ))}
      <label className="inline-flex">
        <input type="file" multiple className="hidden" accept=".pdf,image/*,.dwg,.dxf,.doc,.docx,.xls,.xlsx" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
        <span className="inline-flex items-center gap-1 h-8 px-3 rounded-md border text-sm cursor-pointer hover:bg-muted">
          <Upload className="h-4 w-4" />{busy ? "Uploaden…" : "Document toevoegen"}
        </span>
      </label>
    </div>
  );
};

const label = (n: string) => n.replace(/^\d+_/, "");
