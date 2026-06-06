const fs = require("fs");
const path = require("path");

const projectId = "dukhubusters";
const apiKey = "AIzaSyB1Nvaz_Vmz201izN0vwx3mK9hDbLwDB4A";
const outputDir = path.join(process.cwd(), "data");
const collections = {
  reports: "dukhubusters_monster_reports",
  builds: "dukhubusters_builds",
  guides: "dukhubusters_guide_posts",
};
const backupDir = path.join(process.cwd(), "migration-backups");
const arrayMarker = "__dukhubustersArray";
const sessionTimeMarker = "__session_time__";
const visitorMarkers = new Set(["__visitor_total__", "__visitor_daily__"]);

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

function newestBackupFile(pattern) {
  if (!fs.existsSync(backupDir)) return "";
  return fs.readdirSync(backupDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(backupDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || "";
}

function loadBackupTables() {
  const mainFile = newestBackupFile(/^supabase-export-.*\.json$/);
  if (!mainFile) throw new Error("Firestore를 읽지 못했고 migration-backups 백업도 찾지 못했습니다.");
  const main = JSON.parse(fs.readFileSync(mainFile, "utf8"));
  return main.tables || {};
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

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  let reports;
  let builds;
  let guides;
  let source = "firestore";
  try {
    [reports, builds, guides] = await Promise.all([
      listCollection(collections.reports),
      listCollection(collections.builds),
      listCollection(collections.guides),
    ]);
  } catch (error) {
    source = "migration-backup";
    const tables = loadBackupTables();
    reports = Array.isArray(tables.monster_reports) ? tables.monster_reports : [];
    builds = Array.isArray(tables.builds) ? tables.builds : [];
    guides = Array.isArray(tables.guide_posts) ? tables.guide_posts : [];
    console.warn(`Firestore에서 직접 읽지 못해 백업으로 정적 데이터를 생성합니다: ${error.message}`);
  }
  writeJson("reports-index", sortByUpdated(reports.filter((row) => row.status === "approved")).map(replaceLegacySiteName));
  writeJson("builds-index", sortByUpdated(cleanBuildRows(builds)).map(replaceLegacySiteName));
  writeJson("guides-index", sortByUpdated(guides).map(replaceLegacySiteName));
  console.log(JSON.stringify({
    source,
    reports: reports.filter((row) => row.status === "approved").length,
    builds: cleanBuildRows(builds).length,
    guides: guides.length,
  }, null, 2));
})().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
