const SITE_TITLE = "덕후버스터즈";
const SITE_URL = "https://busters.kr";
const SUPABASE_URL = "https://bjlykfxfminmjfgilowj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JyUVYzb2vZoQiyLSasTNYg_P-LoaJrx";
const GUIDE_TABLE = "guide_posts";
const COMMENT_PREFIX = "__guide_comment__:";
const LIKE_PREFIX = "__guide_like__:";
const REPORT_PREFIX = "__guide_report__:";
const MEDIA_MARKER_PATTERN = /\{\{media:([^}]+)\}\}/g;

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const postId = requestUrl.searchParams.get("post") || "";
  const targetUrl = `${SITE_URL}/guides.html${postId ? `?post=${encodeURIComponent(postId)}` : ""}`;
  const preview = await loadPreview(postId);
  const title = preview.title ? `${preview.title} · ${SITE_TITLE}` : `게시판 · ${SITE_TITLE}`;
  const description = preview.description || "겜바바 팬게임 공략, 질문, 보스, 파밍, 빌드 정보를 공유하는 덕후버스터즈 게시판입니다.";

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="${escapeHtml(SITE_TITLE)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(targetUrl)}">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
</head>
<body>
  <p><a href="${escapeHtml(targetUrl)}">게시글로 이동</a></p>
  <script>location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

async function loadPreview(postId) {
  if (!postId) return {};
  try {
    const endpoint = `${SUPABASE_URL}/rest/v1/${GUIDE_TABLE}?id=eq.${encodeURIComponent(postId)}&select=title,content&limit=1`;
    const response = await fetch(endpoint, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) return {};
    const rows = await response.json();
    const post = Array.isArray(rows) ? rows[0] : null;
    const rawTitle = String(post?.title || "");
    if (!post || isMetaTitle(rawTitle)) return {};
    return {
      title: stripCategory(rawTitle),
      description: textDescription(String(post.content || "")),
    };
  } catch {
    return {};
  }
}

function isMetaTitle(title) {
  return title.startsWith(COMMENT_PREFIX) || title.startsWith(LIKE_PREFIX) || title.startsWith(REPORT_PREFIX);
}

function stripCategory(title) {
  return String(title || "").replace(/^\[[^\]]+\]\s*/, "").trim();
}

function textDescription(content) {
  const text = content
    .replace(MEDIA_MARKER_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 140) || "덕후버스터즈 게시글";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
