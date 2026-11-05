import { test } from "node:test";
import assert from "node:assert/strict";
const origin = process.env.TEST_BASE_URL;
test("private routes redirect before rendering when Supabase is unconfigured", { skip: !origin }, async () => {
  for (const path of ["/admin", "/admin/leads", "/admin/leads/11111111-1111-4111-8111-111111111111", "/admin/clientes", "/admin/configuracion", "/admin/agenda", "/admin/instalaciones", "/admin/cotizaciones", "/admin/resenas", "/admin/privacidad", "/admin/pagos", "/admin/contenido", "/admin/tarifario", "/admin/notificaciones", "/admin/auditoria"]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status,307,path);
    assert.equal(new URL(response.headers.get("location")!,origin).pathname,"/admin/login");
    assert.match(response.headers.get("cache-control") ?? "",/no-store/);
  }
  const login = await fetch(`${origin}/admin/login`);
  assert.equal(login.status,200);
  const html = await login.text();
  assert.match(html,/Acceso pendiente de configuración/);
  assert.match(html,/noindex/);
});
test("public home, sitemap and robots remain available", { skip: !origin }, async () => {
  const home = await fetch(`${origin}/`);
  assert.equal(home.status,200);
  const html = await home.text();
  for (const id of ["inicio", "servicios", "nosotros", "portafolio", "agenda", "faq", "cotizacion", "resenas-google"]) {
    assert.ok(html.includes(`id="${id}"`),id);
  }
  assert.match(html,/Aún no mostramos reseñas de Google aquí/);
  assert.doesNotMatch(html,/"aggregateRating"/);
  for (const path of ["/sitemap.xml", "/robots.txt"]) assert.equal((await fetch(`${origin}${path}`)).status,200);
});
