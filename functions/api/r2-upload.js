const maxUploadBytes = 50 * 1024 * 1024;
const allowedOrigins = new Set([
  "https://busters.kr",
  "https://www.busters.kr",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function onRequestPost({ request, env }) {
  const headers = corsHeaders(request);
  const origin = request.headers.get("Origin") || "";
  if (origin && !allowedOrigins.has(origin)) {
    return json({ message: "허용되지 않은 업로드 출처입니다." }, 403, headers);
  }
  if (!env.GUIDE_MEDIA_BUCKET) {
    return json({ message: "R2 버킷 바인딩 GUIDE_MEDIA_BUCKET 설정이 필요합니다." }, 503, headers);
  }
  const url = new URL(request.url);
  const rawPath = url.searchParams.get("path") || "";
  const path = sanitizePath(rawPath);
  if (!path) return json({ message: "업로드 경로가 올바르지 않습니다." }, 400, headers);
  const size = Number(request.headers.get("Content-Length") || 0);
  if (size > maxUploadBytes) return json({ message: "50MB 이하 파일만 업로드할 수 있습니다." }, 413, headers);
  const contentType = request.headers.get("Content-Type") || "application/octet-stream";
  await env.GUIDE_MEDIA_BUCKET.put(path, request.body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: new Date().toISOString() },
  });
  const publicBase = String(env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return json({ path, url: publicBase ? `${publicBase}/${path}` : "" }, 200, headers);
}

function sanitizePath(value) {
  return String(value || "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120))
    .join("/")
    .slice(0, 500);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = allowedOrigins.has(origin) ? origin : "https://busters.kr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
