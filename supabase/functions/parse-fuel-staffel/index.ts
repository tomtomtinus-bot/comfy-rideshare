import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { pdf_base64, mime_type } = await req.json();
    if (!pdf_base64 || typeof pdf_base64 !== "string") {
      return new Response(JSON.stringify({ error: "pdf_base64 ontbreekt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ontbreekt");

    const systemPrompt = `Je bent een specialist die brandstoftoeslag-staffels uit Nederlandse transportdocumenten haalt.
Een staffel beschrijft hoe een toeslag varieert met de dieselprijs (€/liter).
Geef ALLEEN de tiers terug. Bepaal of de toeslag een percentage van het uurtarief is, of een vast bedrag per uur.
Drempels zijn dieselprijzen in €/liter. De bovengrens van de laatste tier mag null zijn (= oneindig).
Als er geen geldige staffel staat, geef tiers: [] terug.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Lees deze brandstoftoeslag-staffel en geef de tiers." },
              {
                type: "image_url",
                image_url: { url: `data:${mime_type || "application/pdf"};base64,${pdf_base64}` },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_fuel_staffel",
              description: "Geef de gestructureerde brandstoftoeslag-staffel terug.",
              parameters: {
                type: "object",
                properties: {
                  kind: {
                    type: "string",
                    enum: ["percent", "per_uur"],
                    description: "percent = % van uurtarief, per_uur = vast bedrag in €/uur",
                  },
                  tiers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        from: { type: "number", description: "Dieselprijs ondergrens in €/l (inclusief)" },
                        to: {
                          type: ["number", "null"],
                          description: "Dieselprijs bovengrens in €/l (exclusief). null = oneindig.",
                        },
                        value: { type: "number", description: "Toeslagwaarde (% of €/uur)" },
                      },
                      required: ["from", "to", "value"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["kind", "tiers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_fuel_staffel" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate-limit, probeer over een minuut opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI-credits op. Voeg credits toe in Workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway fout");
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("Geen staffel gevonden in PDF");
    const args = JSON.parse(call.function.arguments);

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-fuel-staffel error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
