const fs = require("fs");
const path = require("path");

const projectId = "dukhubusters";
const apiKey = "AIzaSyB1Nvaz_Vmz201izN0vwx3mK9hDbLwDB4A";
const outputDir = path.join(process.cwd(), "data");
const configPath = path.join(process.cwd(), "config.js");
const collections = {
  reports: "dukhubusters_monster_reports",
  builds: "dukhubusters_builds",
  guides: "dukhubusters_guide_posts",
};
const arrayMarker = "__dukhubustersArray";
const sessionTimeMarker = "__session_time__";
const visitorMarkers = new Set(["__visitor_total__", "__visitor_daily__", "__location_settings__"]);

function fromFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, fromFirestoreValue(item)]));
  }
  return null;
}

function decodeFirestoreSafe(value) {
  if (Array.isArray(value)) return value.map(decodeFirestoreSafe);
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, arrayMarker)) {
      return Array.isArray(value[arrayMarker]) ? value[arrayMarker].map(decodeFirestoreSafe) : [];
    }
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeFirestoreSafe(item)]));
  }
  return value;
}

function replaceLegacySiteName(value) {
  if (typeof value === "string") return value.replaceAll("덕후버스터즈", "겜바바 버스터즈");
  if (Array.isArray(value)) return value.map(replaceLegacySiteName);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceLegacySiteName(item)]));
  }
  return value;
}

function fromDocument(doc) {
  const fields = doc.fields || {};
  const row = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFirestoreValue(value)]));
  return replaceLegacySiteName(decodeFirestoreSafe({
    id: row.id || String(doc.name || "").split("/").pop(),
    ...row,
  }));
}

async function listCollection(collection) {
  const rows = [];
  let pageToken = "";
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) throw new Error(`${collection} ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`);
    rows.push(...(payload.documents || []).map(fromDocument));
    pageToken = payload.nextPageToken || "";
  } while (pageToken);
  return rows;
}

function cleanBuildRows(rows) {
  return rows.filter((row) => {
    const title = String(row.title || "");
    return title !== sessionTimeMarker && !visitorMarkers.has(title);
  });
}

function sortByUpdated(rows) {
  return rows.sort((a, b) =>
    new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || 0)
      - new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || 0)
  );
}

function writeJson(name, rows) {
  const payload = {
    generatedAt: new Date().toISOString(),
    rows,
  };
  fs.writeFileSync(path.join(outputDir, `${name}.json`), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function refreshStaticDataVersion() {
  if (!fs.existsSync(configPath)) return;
  const version = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  const text = fs.readFileSync(configPath, "utf8");
  const next = text.replace(/staticDataVersion:\s*"[^"]*"/, `staticDataVersion: "${version}"`);
  if (next !== text) fs.writeFileSync(configPath, next, "utf8");
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  let reports;
  let builds;
  let guides;
  try {
    [reports, builds, guides] = await Promise.all([
      listCollection(collections.reports),
      listCollection(collections.builds),
      listCollection(collections.guides),
    ]);
  } catch (error) {
    console.warn(`Firestore에서 직접 읽지 못해 정적 데이터 갱신을 건너뜁니다: ${error.message}`);
    process.exit(0);
  }
  writeJson("reports-index", sortByUpdated(reports.filter((row) => row.status === "approved")).map(replaceLegacySiteName));
  writeJson("builds-index", sortByUpdated(cleanBuildRows(builds)).map(replaceLegacySiteName));
  writeJson("guides-index", sortByUpdated(guides).map(replaceLegacySiteName));
  refreshStaticDataVersion();
  console.log(JSON.stringify({
    source: "firestore",
    reports: reports.filter((row) => row.status === "approved").length,
    builds: cleanBuildRows(builds).length,
    guides: guides.length,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
