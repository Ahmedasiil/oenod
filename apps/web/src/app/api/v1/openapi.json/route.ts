import { RESOURCES, type Field } from "@/lib/fields";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";
import { APP_URL } from "@/lib/env";

function prop(f: Field): Record<string, unknown> {
  const t: Record<string, unknown> = { description: f.label + (f.help ? ` — ${f.help}` : "") };
  switch (f.type) {
    case "number": case "money": case "percent": return { ...t, type: "number" };
    case "boolean": return { ...t, type: "boolean" };
    case "date": return { ...t, type: "string", format: "date" };
    case "datetime": return { ...t, type: "string", format: "date-time" };
    case "tags": return { ...t, type: "array", items: { type: "string" } };
    case "items": return { ...t, type: "array", items: { type: "object", properties: { name: { type: "string" }, qty: { type: "number" }, price: { type: "number" }, productId: { type: "string" } }, required: ["name", "qty", "price"] } };
    case "select": return { ...t, type: "string", enum: f.options };
    case "email": return { ...t, type: "string", format: "email" };
    default: return { ...t, type: "string" };
  }
}

export function GET() {
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};
  for (const r of RESOURCES) {
    const name = r.singular.replace(/[^A-Za-z]/g, "");
    schemas[name] = { type: "object", properties: { id: { type: "string", readOnly: true }, ...Object.fromEntries(r.fields.map((f) => [f.name, { ...prop(f), ...(f.readOnly ? { readOnly: true } : {}) }])), createdAt: { type: "string", format: "date-time", readOnly: true } }, required: r.fields.filter((f) => f.required).map((f) => f.name) };
    const ref = { $ref: `#/components/schemas/${name}` };
    paths[`/api/v1/${r.key}`] = {
      get: { tags: [r.label], summary: `List ${r.label.toLowerCase()}`, parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer", maximum: 200 } }], responses: { 200: { description: "OK", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: ref }, total: { type: "integer" }, page: { type: "integer" } } } } } } } },
      ...(r.readOnly ? {} : { post: { tags: [r.label], summary: `Create ${r.singular.toLowerCase()}`, requestBody: { content: { "application/json": { schema: ref } } }, responses: { 201: { description: "Created" } } } }),
    };
    paths[`/api/v1/${r.key}/{id}`] = {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: [r.label], summary: `Get ${r.singular.toLowerCase()}`, responses: { 200: { description: "OK" } } },
      patch: { tags: [r.label], summary: `Update ${r.singular.toLowerCase()}`, requestBody: { content: { "application/json": { schema: ref } } }, responses: { 200: { description: "OK" } } },
      delete: { tags: [r.label], summary: `Delete ${r.singular.toLowerCase()}`, responses: { 200: { description: "Deleted" } } },
    };
  }
  paths["/api/fleet/ingest"] = { post: { tags: ["Fleet GPS"], summary: "Send a GPS position (OsmAnd/Traccar compatible: id, lat, lon, speed, bearing, timestamp)", security: [], responses: { 200: { description: "OK" } } } };
  paths["/api/ai/chat"] = { post: { tags: ["AI Business Manager"], summary: "Ask the AI Business Manager", requestBody: { content: { "application/json": { schema: { type: "object", properties: { message: { type: "string" }, conversationId: { type: "string" } }, required: ["message"] } } } }, responses: { 200: { description: "Reply and any actions taken" } } } };
  return Response.json({
    openapi: "3.1.0",
    info: { title: "OENOD API", version: "1.0.0", description: `Connect any system to OENOD. Authenticate with an API key from Developers & API: \`Authorization: Bearer oen_live_...\`. Webhook events: ${WEBHOOK_EVENTS.join(", ")}. Webhooks are signed: X-Oenod-Signature = sha256 HMAC of "{timestamp}.{body}" with your webhook secret.` },
    servers: [{ url: APP_URL }],
    security: [{ bearer: [] }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } }, schemas },
    paths,
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
