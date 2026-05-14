import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// VIES SOAP endpoint
const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/services/checkVatService";

const buildSoap = (country: string, number: string) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${country}</urn:countryCode>
      <urn:vatNumber>${number}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

const pick = (xml: string, tag: string) => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${tag}>([\\s\\S]*?)</(?:\\w+:)?${tag}>`));
  return m ? m[1].trim() : "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { vat } = await req.json();
    if (typeof vat !== "string" || vat.trim().length < 4) {
      return new Response(JSON.stringify({ valid: false, error: "invalid_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = vat.replace(/[\s.\-]/g, "").toUpperCase();
    const country = cleaned.slice(0, 2);
    const number = cleaned.slice(2);

    if (!/^[A-Z]{2}$/.test(country) || number.length < 2) {
      return new Response(JSON.stringify({ valid: false, error: "format" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
      body: buildSoap(country, number),
    });
    const xml = await res.text();

    if (xml.includes("<faultstring") || xml.includes(":Fault>")) {
      const fault = pick(xml, "faultstring");
      return new Response(
        JSON.stringify({ valid: false, error: "vies_error", detail: fault || "VIES error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validRaw = pick(xml, "valid").toLowerCase();
    const valid = validRaw === "true";
    const name = pick(xml, "name");
    const address = pick(xml, "address");
    const requestDate = pick(xml, "requestDate");

    return new Response(
      JSON.stringify({ valid, country, number, name, address, requestDate }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return new Response(JSON.stringify({ valid: false, error: "exception", detail: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
