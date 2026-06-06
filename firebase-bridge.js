(function () {
  const config = window.DUKHUBUSTERS_CONFIG || {};
  const firebaseConfig = config.firebaseConfig || {};
  const enabled = String(config.backendMode || "").toLowerCase() === "firebase";
  const supabaseBase = String(config.supabaseUrl || "").replace(/\/$/, "");
  const tableMap = new Set([
    config.buildTable || "builds",
    config.reportTable || "monster_reports",
    config.guideTable || "guide_posts",
    config.visitorTable || "site_visitors",
    config.dailyVisitorTable || "daily_visitors",
    config.profileTable || "user_profiles",
  ]);

  const state = {
    app: null,
    auth: null,
    db: null,
    ready: null,
  };

  window.DUKHUBUSTERS_FIREBASE = {
    isConfigured,
    ready,
    auth: () => state.auth,
    db: () => state.db,
    table: collectionRef,
  };

  if (enabled) {
    installFetchBridge();
  }

  function isConfigured() {
    return Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
  }

  async function ready() {
    if (state.ready) return state.ready;
    state.ready = Promise.resolve().then(() => {
      if (!enabled || !isConfigured() || !window.firebase?.initializeApp) return false;
      state.app = window.firebase.apps?.length ? window.firebase.app() : window.firebase.initializeApp(firebaseConfig);
      state.auth = window.firebase.auth();
      state.db = window.firebase.firestore();
      state.db.enablePersistence?.({ synchronizeTabs: true }).catch(() => {});
      return true;
    });
    return state.ready;
  }

  function collectionRef(table) {
    return state.db.collection(`dukhubusters_${table}`);
  }

  function installFetchBridge() {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function bridgedFetch(input, init = {}) {
      const url = typeof input === "string" ? input : input?.url;
      const parsed = parseSupabaseRestUrl(url);
      if (!parsed) return nativeFetch(input, init);
      try {
        const ok = await ready();
        if (!ok) return new Response(JSON.stringify({ message: "Firebase 설정이 비어 있습니다." }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
        return await handleRest(parsed, init, nativeFetch, input);
      } catch (error) {
        return new Response(JSON.stringify({ message: error?.message || "Firebase bridge error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    };
  }

  function parseSupabaseRestUrl(rawUrl) {
    if (!enabled || !supabaseBase || !rawUrl || !String(rawUrl).startsWith(`${supabaseBase}/rest/v1/`)) return null;
    const url = new URL(rawUrl);
    const table = decodeURIComponent(url.pathname.split("/").pop() || "");
    if (!tableMap.has(table)) return null;
    return { table, params: url.searchParams };
  }

  async function handleRest(parsed, init, nativeFetch, originalInput) {
    const method = String(init?.method || "GET").toUpperCase();
    if (method === "GET") {
      const rows = await readRows(parsed.table, parsed.params);
      if (!rows.length && shouldFallbackToLegacy(parsed.table, parsed.params)) {
        return nativeFetch(originalInput, init);
      }
      return jsonResponse(rows, 200, { "Content-Range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` });
    }
    if (method === "POST") return jsonResponse(await writeRows(parsed.table, init, false), 201);
    if (method === "PATCH") return jsonResponse(await patchRows(parsed.table, parsed.params, init));
    if (method === "DELETE") {
      await deleteRows(parsed.table, parsed.params);
      return jsonResponse([], 204);
    }
    return jsonResponse({ message: "Unsupported method" }, 405);
  }

  function shouldFallbackToLegacy(table, params) {
    if (params.get("no_legacy_fallback") === "1") return false;
    return tableMap.has(table);
  }

  async function readRows(table, params) {
    let rows = (await collectionRef(table).get()).docs.map((doc) => fromDoc(doc));
    rows = applyFilters(rows, params);
    const order = params.get("order");
    if (order) {
      const [field, direction = "asc"] = order.split(".");
      rows.sort((a, b) => compareValue(a[field], b[field]) * (direction === "desc" ? -1 : 1));
    }
    const limit = Number(params.get("limit") || 0);
    return limit > 0 ? rows.slice(0, limit) : rows;
  }

  async function writeRows(table, init, merge) {
    const payload = parseBody(init);
    const items = Array.isArray(payload) ? payload : [payload];
    const saved = [];
    for (const item of items) {
      const id = String(item.id || crypto.randomUUID?.() || Date.now());
      const row = { ...item, id };
      await collectionRef(table).doc(id).set(row, { merge });
      saved.push(row);
    }
    return saved;
  }

  async function patchRows(table, params, init) {
    const payload = parseBody(init);
    const rows = await readRows(table, params);
    const saved = [];
    for (const row of rows) {
      const next = { ...row, ...payload, id: row.id };
      await collectionRef(table).doc(row.id).set(next, { merge: true });
      saved.push(next);
    }
    return saved;
  }

  async function deleteRows(table, params) {
    const rows = await readRows(table, params);
    await Promise.all(rows.map((row) => collectionRef(table).doc(row.id).delete()));
  }

  function parseBody(init) {
    if (!init?.body) return {};
    if (typeof init.body === "string") return JSON.parse(init.body || "{}");
    return init.body;
  }

  function applyFilters(rows, params) {
    let result = rows;
    for (const [key, rawValue] of params.entries()) {
      if (["select", "order", "limit", "on_conflict"].includes(key)) continue;
      const value = String(rawValue);
      if (value.startsWith("eq.")) {
        const expected = decodeURIComponent(value.slice(3));
        result = result.filter((row) => String(row[key] ?? "") === expected);
      } else if (value.startsWith("neq.")) {
        const expected = decodeURIComponent(value.slice(4));
        result = result.filter((row) => String(row[key] ?? "") !== expected);
      } else if (value.startsWith("in.(") && value.endsWith(")")) {
        const values = value.slice(4, -1).split(",").map((item) => decodeURIComponent(item.trim()));
        result = result.filter((row) => values.includes(String(row[key] ?? "")));
      }
    }
    return result;
  }

  function fromDoc(doc) {
    return { id: doc.id, ...doc.data() };
  }

  function compareValue(a, b) {
    const left = Date.parse(a) ? Date.parse(a) : String(a ?? "");
    const right = Date.parse(b) ? Date.parse(b) : String(b ?? "");
    return left > right ? 1 : left < right ? -1 : 0;
  }

  function jsonResponse(data, status = 200, extraHeaders = {}) {
    const body = status === 204 ? null : JSON.stringify(data);
    return new Response(body, {
      status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    });
  }
})();
