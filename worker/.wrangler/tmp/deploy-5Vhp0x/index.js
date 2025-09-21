var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/itty-router/index.mjs
var e = /* @__PURE__ */ __name(({ base: e2 = "", routes: t = [], ...r2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((r3, o2, a, s) => (r4, ...c) => t.push([o2.toUpperCase(), RegExp(`^${(s = (e2 + r4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), c, s]) && a, "get") }), routes: t, ...r2, async fetch(e3, ...r3) {
  let o2, a, s = new URL(e3.url), c = e3.query = { __proto__: null };
  for (let [e4, t2] of s.searchParams) c[e4] = c[e4] ? [].concat(c[e4], t2) : t2;
  for (let [c2, n, l, i2] of t) if ((c2 == e3.method || "ALL" == c2) && (a = s.pathname.match(n))) {
    e3.params = a.groups || {}, e3.route = i2;
    for (let t2 of l) if (null != (o2 = await t2(e3.proxy ?? e3, ...r3))) return o2;
  }
} }), "e");
var r = /* @__PURE__ */ __name((e2 = "text/plain; charset=utf-8", t) => (r2, o2 = {}) => {
  if (void 0 === r2 || r2 instanceof Response) return r2;
  const a = new Response(t?.(r2) ?? r2, o2.url ? void 0 : o2);
  return a.headers.set("content-type", e2), a;
}, "r");
var o = r("application/json; charset=utf-8", JSON.stringify);
var i = /* @__PURE__ */ __name((e2, t) => new Response(null, { ...t, status: e2 }), "i");
var p = r("text/plain; charset=utf-8", String);
var f = r("text/html");
var u = r("image/jpeg");
var h = r("image/png");
var g = r("image/webp");

// src/index.ts
var router = e();
var handleCors = /* @__PURE__ */ __name((request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { headers });
  }
  return;
}, "handleCors");
var withCors = /* @__PURE__ */ __name((response) => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}, "withCors");
router.options("/authorize", handleCors);
router.options("/poll", handleCors);
router.post("/authorize", async (request, env) => {
  const readKey = crypto.randomUUID();
  const writeKey = crypto.randomUUID();
  await env.PINTEREST_OAUTH_KV.put(readKey, writeKey, { expirationTtl: 300 });
  const params = new URLSearchParams({
    client_id: env.PINTEREST_CLIENT_ID,
    redirect_uri: `${env.PLUGIN_URI}/callback`,
    response_type: "code",
    scope: "boards:read,pins:read",
    state: writeKey
    // Use the writeKey as the state to prevent CSRF
  });
  const authorizationUrl = `https://www.pinterest.com/oauth/?${params.toString()}`;
  const response = o({
    url: authorizationUrl,
    readKey
  });
  return withCors(response);
});
router.get("/callback", async (request, env) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return withCors(new Response("Missing authorization code or state.", { status: 400 }));
  }
  const tokenResponse = await fetch("https://api.pinterest.com/v5/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${env.PINTEREST_CLIENT_ID}:${env.PINTEREST_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.PLUGIN_URI}/callback`
    })
  });
  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Failed to get access token:", errorText);
    return withCors(new Response("Failed to get access token.", { status: 500 }));
  }
  const { access_token } = await tokenResponse.json();
  await env.PINTEREST_OAUTH_KV.put(state, JSON.stringify({ access_token }), { expirationTtl: 300 });
  const response = new Response("Authentication successful! You can now close this window.", {
    headers: { "Content-Type": "text/html" }
  });
  return withCors(response);
});
router.post("/poll", async (request, env) => {
  const { readKey } = await request.json();
  if (!readKey) {
    return withCors(new Response("Missing readKey", { status: 400 }));
  }
  const writeKey = await env.PINTEREST_OAUTH_KV.get(readKey);
  if (!writeKey) {
    return withCors(new Response("Invalid or expired readKey", { status: 404 }));
  }
  const tokenData = await env.PINTEREST_OAUTH_KV.get(writeKey);
  if (!tokenData) {
    return withCors(i(204));
  }
  await env.PINTEREST_OAUTH_KV.delete(readKey);
  await env.PINTEREST_OAUTH_KV.delete(writeKey);
  return withCors(o(JSON.parse(tokenData)));
});
var index_default = {
  fetch: /* @__PURE__ */ __name((request, env, ctx) => router.handle(request, env, ctx).catch((error) => {
    console.error(error);
    return withCors(new Response("Internal Server Error", { status: 500 }));
  }), "fetch")
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
