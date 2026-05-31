const siteTitle = "덕후버스터즈";
const defaultSiteUrl = "https://wplife0621-creator.github.io/ghostbusters-helper";
const commentTitlePrefix = "__guide_comment__:";
const likeTitlePrefix = "__guide_like__:";
const mediaMarkerPattern = /\{\{media:([^}]+)\}\}/g;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripCategory(title: string) {
  return title.replace(/^\[[^\]]+\]\s*/, "");
}

function textDescription(content: string) {
  const text = content
    .replace(mediaMarkerPattern, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 120) || "덕후버스터즈 공략 게시글";
}

Deno.serve(async (request) => {
  const requestUrl = new URL(request.url);
  const postId = requestUrl.searchParams.get("post") || "";
  const siteUrl = (Deno.env.get("SITE_URL") || defaultSiteUrl).replace(/\/$/, "");
  const targetUrl = `${siteUrl}/guides.html?post=${encodeURIComponent(postId)}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const guideTable = Deno.env.get("GUIDE_TABLE") || "guide_posts";

  let title = `공략글 보러가기 · ${siteTitle}`;
  let description = "덕후버스터즈 공략 게시판";

  if (postId && supabaseUrl && supabaseKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/${guideTable}?id=eq.${encodeURIComponent(postId)}&select=title,content`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        },
      );
      const rows = response.ok ? await response.json() : [];
      const post = Array.isArray(rows) ? rows[0] : null;
      const rawTitle = String(post?.title || "");
      if (post && !rawTitle.startsWith(commentTitlePrefix) && !rawTitle.startsWith(likeTitlePrefix)) {
        title = `${stripCategory(rawTitle)} · ${siteTitle}`;
        description = textDescription(String(post.content || ""));
      }
    } catch {
      // Keep the default preview if the post cannot be loaded.
    }
  }

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="${escapeHtml(siteTitle)}">
  <meta property="og:type" content="article">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(targetUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="description" content="${escapeHtml(description)}">
  <meta http-equiv="refresh" content="0; url=${escapeHtml(targetUrl)}">
</head>
<body>
  <p><a href="${escapeHtml(targetUrl)}">공략글로 이동</a></p>
  <script>location.replace(${JSON.stringify(targetUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
});
