import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  assignment_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface Props {
  assignmentId: string;
  currentUserId: string;
  counterpartyLabel: string;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });

export function AssignmentChat({ assignmentId, currentUserId, counterpartyLabel }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("created_at", { ascending: true });
    if (!error) setMessages(data || []);
    setLoading(false);
  };

  const markRead = async () => {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("assignment_id", assignmentId)
      .neq("sender_id", currentUserId)
      .is("read_at", null);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`messages:${assignmentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `assignment_id=eq.${assignmentId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    markRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      assignment_id: assignmentId,
      sender_id: currentUserId,
      body: text,
    });
    setSending(false);
    if (error) {
      toast.error("Bericht verzenden mislukt");
      return;
    }
    setBody("");
  };

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-2 text-sm font-medium">
        Berichten met {counterpartyLabel}
      </div>
      <div ref={scrollRef} className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen berichten. Stuur het eerste bericht.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div className={`mt-1 text-[10px] ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    {fmtTime(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Typ een bericht…"
          maxLength={4000}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Verstuur
        </button>
      </form>
    </div>
  );
}
