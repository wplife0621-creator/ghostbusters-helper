redirectLegacyGithubPages();

const config = window.DUKHUBUSTERS_CONFIG || {};

function redirectLegacyGithubPages() {
  if (window.location.hostname !== "wplife0621-creator.github.io") return;

  const legacyBasePath = "/ghostbusters-helper";
  const nextPath = window.location.pathname.startsWith(legacyBasePath)
    ? window.location.pathname.slice(legacyBasePath.length) || "/"
    : window.location.pathname || "/";
  window.location.replace(`https://busters.kr${nextPath}${window.location.search}${window.location.hash}`);
}
const guideBackend = {
  url: String(config.supabaseUrl || "").replace(/\/$/, ""),
  key: String(config.supabaseAnonKey || ""),
  table: String(config.guideTable || "guide_posts"),
  bucket: String(config.guideBucket || "guide-media"),
  shareUrl: String(config.guideShareUrl || "").replace(/\/$/, ""),
};
const guideStorageKey = "dukhubusters.guidePosts";
const guideCommentStorageKey = "dukhubusters.guideComments";
const commentTitlePrefix = "__guide_comment__:";
const likeTitlePrefix = "__guide_like__:";
const reportTitlePrefix = "__guide_report__:";
const viewCounterKind = "guide-view-counter";
const passwordKind = "guide-password";
const commentParentKind = "guide-comment-parent";
const acceptedCommentKind = "guide-accepted-comment";
const mediaMarkerPattern = /\{\{media:([^}]+)\}\}/g;
const guideUploadLimitBytes = 50 * 1024 * 1024;
const guideUploadLimitLabel = "50MB";
const guideSiteTitle = "덕후버스터즈";
const guideDefaultTitle = `게시판 · ${guideSiteTitle}`;
const fields = {
  board: document.querySelector("#guideBoard"),
  form: document.querySelector("#guideForm"),
  editor: document.querySelector("#guideEditor"),
  openEditor: document.querySelector("#guideOpenEditor"),
  formTitle: document.querySelector("#guideFormTitle"),
  editId: document.querySelector("#guideEditId"),
  title: document.querySelector("#guideTitle"),
  author: document.querySelector("#guideAuthor"),
  category: document.querySelector("#guideCategory"),
  password: document.querySelector("#guidePassword"),
  content: document.querySelector("#guideContent"),
  composer: document.querySelector("#guideComposer"),
  media: document.querySelector("#guideMedia"),
  existingMedia: document.querySelector("#guideExistingMedia"),
  submit: document.querySelector("#guideSubmit"),
  cancel: document.querySelector("#guideCancelEdit"),
  status: document.querySelector("#guideStatus"),
  count: document.querySelector("#guideCount"),
  posts: document.querySelector("#guidePosts"),
  pagination: document.querySelector("#guidePagination"),
  viewer: document.querySelector("#guideViewer"),
  search: document.querySelector("#guideSearch"),
  categories: document.querySelector(".guide-categories"),
};
let posts = sortPosts(readLocalPosts().map(normalizePost));
let comments = readLocalComments();
let guideLikes = new Map();
let guideLikeRecordIds = new Set();
let likedPostIds = new Set();
let guideLikeIpPromise = null;
let activeReplyId = "";
let retainedMedia = [];
let activeCategory = "전체";
let guidePage = 1;
const guidePageSize = 10;
const linkedPostId = new URLSearchParams(window.location.search).get("post") || "";
let selectedPostId = linkedPostId;
let pendingLinkedView = linkedPostId;

function revealCurrentNavItem() {
  const current = document.querySelector(".site-nav [aria-current='page']");
  if (current && window.innerWidth <= 720) {
    current.scrollIntoView({ block: "nearest", inline: "center" });
  }
}

function hasPublicStore() {
  return Boolean(guideBackend.url && guideBackend.key);
}

function authHeaders(extra = {}) {
  return {
    apikey: guideBackend.key,
    Authorization: `Bearer ${guideBackend.key}`,
    ...extra,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function readLocalPosts() {
  try {
    const rows = JSON.parse(localStorage.getItem(guideStorageKey) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function saveLocalPosts() {
  localStorage.setItem(guideStorageKey, JSON.stringify(posts));
}

function readLocalComments() {
  try {
    const rows = JSON.parse(localStorage.getItem(guideCommentStorageKey) || "[]");
    return Array.isArray(rows) ? rows.map(normalizeComment) : [];
  } catch {
    return [];
  }
}

function saveLocalComments() {
  localStorage.setItem(guideCommentStorageKey, JSON.stringify(comments));
}

function setStatus(message, mode = "") {
  fields.status.textContent = message;
  fields.status.className = `build-sync-status ${mode}`.trim();
}

function currentAuthNickname() {
  return String(window.DUKHUBUSTERS_AUTH?.getDisplayName?.() || "").trim();
}

function requireLoggedInNickname(actionLabel = "작성") {
  const user = window.DUKHUBUSTERS_AUTH?.getUser?.();
  if (!user) {
    setStatus(`${actionLabel}하려면 Google 로그인이 필요합니다.`, "is-offline");
    window.DUKHUBUSTERS_AUTH?.signIn?.();
    return false;
  }
  if (!window.DUKHUBUSTERS_AUTH?.hasNickname?.()) {
    setStatus(`${actionLabel}하려면 닉네임을 먼저 설정해주세요.`, "is-offline");
    window.DUKHUBUSTERS_AUTH?.openNickname?.();
    return false;
  }
  return true;
}

function setMetaContent(selector, content) {
  let meta = document.head.querySelector(selector);
  if (!meta) {
    meta = document.createElement("meta");
    const propertyMatch = selector.match(/meta\[property=['"]([^'"]+)['"]\]/);
    const nameMatch = selector.match(/meta\[name=['"]([^'"]+)['"]\]/);
    if (propertyMatch) meta.setAttribute("property", propertyMatch[1]);
    if (nameMatch) meta.setAttribute("name", nameMatch[1]);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function shareTitleForPost(post) {
  return post ? `${post.title} · ${guideSiteTitle}` : guideDefaultTitle;
}

function updateGuideShareMeta(post = null) {
  const title = shareTitleForPost(post);
  const description = post
    ? String(post.content || "").replace(mediaMarkerPattern, "").replace(/\s+/g, " ").trim().slice(0, 120) || "덕후버스터즈 게시글"
    : "덕후버스터즈 게시판";
  const url = post ? postShareUrl(post.id).toString() : postUrl("").toString();
  document.title = title;
  setMetaContent("meta[property='og:title']", title);
  setMetaContent("meta[property='og:site_name']", guideSiteTitle);
  setMetaContent("meta[property='og:description']", description);
  setMetaContent("meta[property='og:url']", url);
  setMetaContent("meta[name='twitter:title']", title);
  setMetaContent("meta[name='twitter:description']", description);
  setMetaContent("meta[name='description']", description);
}

function idValue() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mediaRef(media, index = 0) {
  return String(media.ref || media.path || `legacy-media-${index}`);
}

function preparedMedia(media) {
  return media.map((item, index) => ({ ...item, ref: mediaRef(item, index) }));
}

function markerFor(ref) {
  return `{${"{"}media:${ref}}}`;
}

function postUrl(postId) {
  const url = new URL("./guides.html", window.location.href);
  if (postId) url.searchParams.set("post", postId);
  else url.searchParams.delete("post");
  return url;
}

function postShareUrl(postId) {
  if (guideBackend.shareUrl && postId) {
    const url = new URL(guideBackend.shareUrl);
    url.searchParams.set("post", postId);
    return url;
  }
  return postUrl(postId);
}

function updatePostUrl(postId, replace = false) {
  const url = postUrl(postId);
  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function guidePostHref(postId) {
  return postUrl(postId).toString();
}

function openLinkedPostIfAvailable() {
  if (!pendingLinkedView) return;
  const post = posts.find((item) => item.id === pendingLinkedView);
  if (!post) return;
  pendingLinkedView = "";
  incrementViews(post);
  renderViewer();
  fields.viewer.scrollIntoView({ block: "start" });
}

async function sharePostLink(post, button) {
  const url = postShareUrl(post.id).toString();
  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitleForPost(post), text: "게시글 보기", url });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = "링크 복사됨";
    setTimeout(() => {
      if (selectedPostId === post.id) renderViewer();
    }, 1300);
  } catch {
    window.prompt("게시글 링크를 복사하세요.", url);
  }
}

function savedTitle(post) {
  return post.category !== "일반" ? `[${post.category}] ${post.title}` : post.title;
}

function isStoredComment(row) {
  return String(row.title || "").startsWith(commentTitlePrefix);
}

function isStoredLike(row) {
  return String(row.title || "").startsWith(likeTitlePrefix);
}

function isStoredReport(row) {
  return String(row.title || "").startsWith(reportTitlePrefix);
}

function viewCount(media) {
  const counter = (Array.isArray(media) ? media : []).find((item) => item?.kind === viewCounterKind);
  return Number(counter?.views || 0);
}

function passwordRecord(media) {
  return (Array.isArray(media) ? media : []).find((item) => item?.kind === passwordKind) || null;
}

function parentCommentRecord(media) {
  return (Array.isArray(media) ? media : []).find((item) => item?.kind === commentParentKind) || null;
}

function acceptedCommentRecord(media) {
  return (Array.isArray(media) ? media : []).find((item) => item?.kind === acceptedCommentKind) || null;
}

function visibleMedia(media) {
  return (Array.isArray(media) ? media : [])
    .filter((item) => item?.kind !== viewCounterKind && item?.kind !== passwordKind && item?.kind !== acceptedCommentKind);
}

function storedMedia(post) {
  const metadata = [];
  if (post.views) metadata.push({ kind: viewCounterKind, views: post.views });
  if (post.password) metadata.push(post.password);
  if (post.acceptedCommentId) metadata.push({ kind: acceptedCommentKind, commentId: post.acceptedCommentId });
  return [...post.media, ...metadata];
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function makePasswordRecord(password) {
  const salt = idValue();
  return {
    kind: passwordKind,
    salt,
    digest: await hashPassword(password, salt),
  };
}

async function verifyPassword(item, action) {
  if (!item.password) return true;
  const password = window.prompt(`${action} 비밀번호를 입력하세요.`);
  if (!password) return false;
  const valid = await hashPassword(password, item.password.salt) === item.password.digest;
  if (!valid) setStatus("비밀번호가 일치하지 않습니다.", "is-offline");
  return valid;
}

function parsedTitle(row) {
  const title = row.title || "";
  const match = title.match(/^\[(질문|보스|파밍|빌드|정보)\]\s*/);
  return {
    title: match ? title.slice(match[0].length) : title,
    category: row.category || match?.[1] || "일반",
  };
}

function normalizePost(row) {
  const parsed = parsedTitle(row);
  return {
    id: row.id,
    title: parsed.title,
    author: row.author || "익명",
    category: parsed.category,
    content: row.content || "",
    media: preparedMedia(visibleMedia(row.media)),
    views: Number(row.views || viewCount(row.media)),
    likes: Number(row.likes || 0),
    password: passwordRecord(row.media),
    acceptedCommentId: row.acceptedCommentId || acceptedCommentRecord(row.media)?.commentId || "",
    commentCount: Number(row.commentCount || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
  };
}

function normalizeComment(row) {
  const parent = parentCommentRecord(row.media);
  return {
    id: row.id,
    postId: row.post_id || row.postId || String(row.title || "").slice(commentTitlePrefix.length),
    author: row.author || "익명",
    content: row.content || "",
    password: passwordRecord(row.media),
    parentId: row.parentId || parent?.parentId || "",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function sortPosts(rows) {
  return rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function loadLikeCounts(rows) {
  guideLikes = new Map();
  guideLikeRecordIds = new Set();
  rows.filter(isStoredLike).forEach((row) => {
    const postId = String(row.title || "").slice(likeTitlePrefix.length);
    if (!postId) return;
    guideLikes.set(postId, (guideLikes.get(postId) || 0) + 1);
    guideLikeRecordIds.add(row.id);
  });
  posts.forEach((post) => {
    post.likes = guideLikes.get(post.id) || 0;
  });
}

async function loadPosts() {
  renderPosts();
  if (!hasPublicStore()) {
    openLinkedPostIfAvailable();
    setStatus("공개 게시판 연결 전입니다. 이 기기에 임시 저장됩니다.", "is-offline");
    return;
  }
  try {
    const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?select=*&order=updated_at.desc`, {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("load");
    const rows = await response.json();
    comments = rows.filter(isStoredComment).map(normalizeComment);
    posts = sortPosts(rows.filter((row) => !isStoredComment(row) && !isStoredLike(row) && !isStoredReport(row)).map(normalizePost));
    loadLikeCounts(rows);
    loadCommentCounts();
    renderPosts();
    markLikedPostsForVisitor();
    openLinkedPostIfAvailable();
    setStatus("공개 게시판에 연결되었습니다.", "is-online");
  } catch {
    openLinkedPostIfAvailable();
    setStatus("게시판 설정이 아직 적용되지 않아 이 기기의 임시 목록을 표시합니다.", "is-offline");
  }
}

async function guideLikeIp() {
  if (!guideLikeIpPromise) {
    guideLikeIpPromise = fetch("https://api64.ipify.org?format=json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("ip unavailable");
        return response.json();
      })
      .then((row) => String(row.ip || "").trim());
  }
  return guideLikeIpPromise;
}

async function guideLikeId(postId) {
  const ip = await guideLikeIp();
  if (!ip) throw new Error("ip unavailable");
  const source = new TextEncoder().encode(`dukhubusters:guide-like:${postId}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `guide-like-${hash}`;
}

async function markLikedPostsForVisitor() {
  try {
    const entries = await Promise.all(posts.map(async (post) => [post.id, await guideLikeId(post.id)]));
    likedPostIds = new Set(entries.filter((entry) => guideLikeRecordIds.has(entry[1])).map((entry) => entry[0]));
    renderPosts();
  } catch {
    likedPostIds = new Set();
  }
}

async function savePostLike(post) {
  if (!hasPublicStore()) {
    if (likedPostIds.has(post.id)) return;
    likedPostIds.add(post.id);
    post.likes += 1;
    saveLocalPosts();
    renderPosts();
    return;
  }
  const likeId = await guideLikeId(post.id);
  if (guideLikeRecordIds.has(likeId)) {
    likedPostIds.add(post.id);
    renderPosts();
    return;
  }
  const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: likeId,
      title: `${likeTitlePrefix}${post.id}`,
      author: "like",
      content: "like",
      media: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok && response.status !== 409) throw new Error("like-save");
  guideLikeRecordIds.add(likeId);
  likedPostIds.add(post.id);
  post.likes += 1;
  guideLikes.set(post.id, post.likes);
  renderPosts();
}

function loadCommentCounts() {
  posts.forEach((post) => {
    post.commentCount = comments.filter((comment) => comment.postId === post.id).length;
  });
}

async function filesToTemporaryMedia(items) {
  const total = items.reduce((sum, item) => sum + item.file.size, 0);
  if (total > guideUploadLimitBytes) throw new Error("local-size");
  return Promise.all(items.map((item) => new Promise((resolve, reject) => {
    const file = item.file;
    const reader = new FileReader();
    reader.onload = () => resolve({ ref: item.ref, url: reader.result, type: file.type, name: file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

async function uploadMedia(items, postId) {
  const uploaded = [];
  for (const item of items) {
    const file = item.file;
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "media";
    const path = `${postId}/${idValue()}-${cleanName}`;
    const response = await fetch(`${guideBackend.url}/storage/v1/object/${guideBackend.bucket}/${encodeURIComponent(path).replaceAll("%2F", "/")}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }),
      body: file,
    });
    if (!response.ok) throw new Error("upload");
    uploaded.push({
      ref: item.ref,
      path,
      name: file.name,
      type: file.type,
      url: `${guideBackend.url}/storage/v1/object/public/${guideBackend.bucket}/${path}`,
    });
  }
  return uploaded;
}

async function saveRemotePost(post, editing) {
  const body = {
    id: post.id,
    title: savedTitle(post),
    author: post.author,
    content: post.content,
    media: storedMedia(post),
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  };
  const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}${editing ? `?id=eq.${encodeURIComponent(post.id)}` : ""}`, {
    method: editing ? "PATCH" : "POST",
    headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("save");
  const rows = await response.json();
  return normalizePost(rows[0] || post);
}

let composerRange = null;

function composerMediaMarkup(item) {
  const url = escapeHtml(item.previewUrl || item.url);
  const label = escapeHtml(item.name || "첨부 파일");
  const preview = String(item.type).startsWith("video/")
    ? `<video controls preload="metadata" src="${url}" aria-label="${label}"></video>`
    : `<img src="${url}" alt="${label}">`;
  return `<figure class="guide-composer-media" data-media-ref="${escapeHtml(item.ref)}" contenteditable="false">${preview}<figcaption>${label}</figcaption></figure>`;
}

function rememberComposerRange() {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !fields.composer.contains(selection.anchorNode)) return;
  composerRange = selection.getRangeAt(0).cloneRange();
}

function insertComposerMedia(item) {
  fields.composer.focus();
  const selection = window.getSelection();
  if (composerRange && fields.composer.contains(composerRange.commonAncestorContainer)) {
    selection.removeAllRanges();
    selection.addRange(composerRange);
  }
  const range = selection.rangeCount ? selection.getRangeAt(0) : document.createRange();
  if (!selection.rangeCount) {
    range.selectNodeContents(fields.composer);
    range.collapse(false);
  }
  const template = document.createElement("template");
  template.innerHTML = composerMediaMarkup(item);
  const node = template.content.firstElementChild;
  range.deleteContents();
  range.insertNode(node);
  const spacer = document.createElement("div");
  spacer.innerHTML = "<br>";
  node.after(spacer);
  range.setStart(spacer, 0);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  composerRange = range.cloneRange();
}

function queueMediaFiles(files) {
  [...files]
    .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
    .forEach((file) => {
      const item = {
        ref: `media-${idValue()}`,
        file,
        name: file.name || "붙여넣은 미디어",
        type: file.type,
        previewUrl: URL.createObjectURL(file),
      };
      retainedMedia.push(item);
      insertComposerMedia(item);
    });
  fields.media.value = "";
  showRetainedMedia();
}

function composerContent() {
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.matches(".guide-composer-media")) return `\n${markerFor(node.dataset.mediaRef)}\n`;
    if (node.tagName === "BR") return "\n";
    const text = [...node.childNodes].map(walk).join("");
    return /^(DIV|P|LI)$/.test(node.tagName) ? `${text}\n` : text;
  };
  return [...fields.composer.childNodes]
    .map(walk)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textToComposerMarkup(text) {
  return escapeHtml(text).replaceAll("\n", "<br>");
}

function fillComposer(content, media) {
  const referenced = new Set();
  let cursor = 0;
  let markup = "";
  for (const match of content.matchAll(mediaMarkerPattern)) {
    markup += textToComposerMarkup(content.slice(cursor, match.index));
    const item = media.find((entry) => entry.ref === match[1]);
    if (item) {
      markup += composerMediaMarkup(item);
      referenced.add(item.ref);
    }
    cursor = match.index + match[0].length;
  }
  markup += textToComposerMarkup(content.slice(cursor));
  media.filter((item) => !referenced.has(item.ref)).forEach((item) => {
    markup += composerMediaMarkup(item);
  });
  fields.composer.innerHTML = markup;
  fields.content.value = composerContent();
}

async function submitPost(event) {
  event.preventDefault();
  if (!requireLoggedInNickname("게시글 작성")) return;
  const editId = fields.editId.value;
  const previous = posts.find((post) => post.id === editId);
  const editing = Boolean(previous);
  const id = editing ? previous.id : idValue();
  const pendingMedia = retainedMedia.filter((item) => item.file);
  const keptMedia = retainedMedia.filter((item) => !item.file);
  const category = fields.category.value || "일반";
  const title = fields.title.value.trim();
  const content = composerContent();
  fields.content.value = content;
  if (!content) {
    setStatus("게시글 내용을 입력하거나 이미지·동영상을 넣어주세요.", "is-offline");
    fields.composer.focus();
    return;
  }
  if (content.length > 5000) {
    setStatus("게시글 내용은 5000자 이내로 입력해주세요.", "is-offline");
    return;
  }
  if (savedTitle({ title, category }).length > 100) {
    setStatus("말머리를 포함한 제목은 100자 이내로 입력해주세요.", "is-offline");
    return;
  }
  const basePost = {
    id,
    title,
    author: currentAuthNickname(),
    category,
    content,
    media: [...keptMedia],
    views: previous?.views || 0,
    commentCount: previous?.commentCount || 0,
    password: previous?.password || await makePasswordRecord(fields.password.value),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fields.submit.disabled = true;
  try {
    if (hasPublicStore()) {
      basePost.media.push(...await uploadMedia(pendingMedia, id));
      const saved = await saveRemotePost(basePost, editing);
      posts = sortPosts([saved, ...posts.filter((post) => post.id !== id)]);
      setStatus(editing ? "게시글이 수정되었습니다." : "게시글이 등록되었습니다.", "is-online");
    } else {
      basePost.media.push(...await filesToTemporaryMedia(pendingMedia));
      posts = sortPosts([basePost, ...posts.filter((post) => post.id !== id)]);
      saveLocalPosts();
      setStatus(editing ? "게시글을 이 기기에서 수정했습니다." : "게시글을 이 기기에 임시 저장했습니다.", "is-offline");
    }
    resetForm();
    renderPosts();
  } catch (error) {
    try {
      basePost.media = [...keptMedia, ...await filesToTemporaryMedia(pendingMedia)];
      posts = sortPosts([basePost, ...posts.filter((post) => post.id !== id)]);
      saveLocalPosts();
      resetForm();
      renderPosts();
      setStatus("공개 게시판에 저장하지 못해 이 기기에 임시 저장했습니다. 저장소 설정을 적용하면 모두에게 공유됩니다.", "is-offline");
    } catch (localError) {
      const message = localError.message === "local-size"
        ? `첨부 파일 합계 ${guideUploadLimitLabel}까지 업로드할 수 있습니다.`
        : "게시글 저장에 실패했습니다. 게시판 저장소 설정을 확인해주세요.";
      setStatus(message, "is-offline");
    }
  } finally {
    fields.submit.disabled = false;
  }
}

function mediaMarkup(media) {
  return media.map((item) => {
    const url = escapeHtml(item.url);
    const label = escapeHtml(item.name || "첨부 파일");
    if (String(item.type).startsWith("video/")) {
      return `<video class="guide-video" controls preload="metadata" src="${url}" aria-label="${label}"></video>`;
    }
    return `<img loading="lazy" src="${url}" alt="${label}">`;
  }).join("");
}

function proseMarkup(text) {
  return text ? `<div class="guide-prose">${escapeHtml(text).replaceAll("\n", "<br>")}</div>` : "";
}

function postBodyMarkup(post) {
  const referenced = new Set();
  let cursor = 0;
  let body = "";
  for (const match of post.content.matchAll(mediaMarkerPattern)) {
    body += proseMarkup(post.content.slice(cursor, match.index));
    const media = post.media.find((item) => item.ref === match[1]);
    if (media) {
      referenced.add(media.ref);
      body += `<div class="guide-inline-media">${mediaMarkup([media])}</div>`;
    }
    cursor = match.index + match[0].length;
  }
  body += proseMarkup(post.content.slice(cursor));
  return {
    body,
    remaining: post.media.filter((item) => !referenced.has(item.ref)),
  };
}

function dateLabel(value) {
  return new Date(value).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

function categoryClass(category) {
  const key = String(category || "일반").trim();
  const map = {
    "일반": "general",
    "질문": "question",
    "보스": "boss",
    "파밍": "farm",
    "빌드": "build",
    "정보": "info",
  };
  return `guide-category-${map[key] || "general"}`;
}

function filteredPosts() {
  const query = fields.search.value.trim().toLowerCase();
  return posts.filter((post) => {
    if (activeCategory !== "전체" && post.category !== activeCategory) return false;
    if (!query) return true;
    return [post.title, post.author, post.content]
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function renderPosts() {
  const visiblePosts = filteredPosts();
  fields.count.textContent = `${activeCategory === "전체" ? "전체글" : activeCategory} ${visiblePosts.length}개`;
  fields.posts.innerHTML = visiblePosts.length ? visiblePosts.map((post) => `
    <article class="guide-row" data-guide-id="${escapeHtml(post.id)}">
      <span class="guide-row-number">${posts.length - posts.indexOf(post)}</span>
      <span class="guide-row-category ${categoryClass(post.category)}">${escapeHtml(post.category)}</span>
      <a class="guide-row-title" data-guide-action="view" href="${escapeHtml(guidePostHref(post.id))}">
        ${escapeHtml(post.title)}
        ${post.acceptedCommentId ? `<small class="guide-accepted-mini">답변 채택</small>` : ""}
        ${post.media.length ? `<small>첨부 ${post.media.length}</small>` : ""}
        ${post.commentCount ? `<small>댓글 ${post.commentCount}</small>` : ""}
      </a>
      <span class="guide-row-author">${escapeHtml(post.author)}</span>
      <span class="guide-row-date">${escapeHtml(dateLabel(post.updatedAt))}</span>
      <span class="guide-row-metrics">
        <span class="guide-row-views">조회 ${post.views}</span>
        <span class="guide-row-likes">좋아요 ${post.likes}</span>
      </span>
    </article>
  `).join("") : `<div class="empty compact-empty">조건에 맞는 게시글이 없습니다.</div>`;
  renderViewer();
}

function renderViewer() {
  const post = posts.find((item) => item.id === selectedPostId);
  fields.viewer.hidden = !post;
  fields.board.classList.toggle("is-viewing", Boolean(post));
  if (!post) {
    fields.viewer.innerHTML = "";
    updateGuideShareMeta();
    return;
  }
  updateGuideShareMeta(post);
  const postBody = postBodyMarkup(post);
  fields.viewer.innerHTML = `
    <div class="guide-viewer-head" data-guide-id="${escapeHtml(post.id)}">
      <div>
        <span class="guide-row-category ${categoryClass(post.category)}">${escapeHtml(post.category)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.author)} · ${escapeHtml(new Date(post.updatedAt).toLocaleString("ko-KR"))} · 조회 ${post.views} · 댓글 ${post.commentCount} · 좋아요 ${post.likes}</p>
      </div>
      <div class="pending-actions guide-viewer-actions">
        <button class="guide-like-button${likedPostIds.has(post.id) ? " is-liked" : ""}" type="button" data-guide-action="like"${likedPostIds.has(post.id) ? " disabled" : ""}>${likedPostIds.has(post.id) ? "좋아요 완료" : "좋아요"} ${post.likes}</button>
        <button type="button" data-guide-action="share">공유</button>
        <button type="button" data-guide-action="report">신고</button>
        <button type="button" data-guide-action="edit">수정</button>
        <button type="button" data-guide-action="delete">삭제</button>
        <button type="button" data-guide-action="close">목록으로</button>
      </div>
    </div>
    <div class="guide-viewer-content">${postBody.body}</div>
    ${postBody.remaining.length ? `<div class="guide-gallery">${mediaMarkup(postBody.remaining)}</div>` : ""}
    <section class="guide-comments">
      <h4>댓글 <span id="guideCommentCount">${post.commentCount}</span></h4>
      <p id="guideReplyTarget" class="guide-reply-target" hidden></p>
      <form class="guide-comment-form" id="guideCommentForm">
        <label class="field">
          <span>작성자</span>
          <input id="guideCommentAuthor" maxlength="40" readonly value="${escapeHtml(currentAuthNickname())}" placeholder="로그인 닉네임으로 자동 입력">
        </label>
        <label class="field guide-comment-content">
          <span>댓글 내용</span>
          <textarea id="guideCommentContent" required maxlength="500" rows="2" placeholder="댓글을 입력하세요."></textarea>
        </label>
        <label class="field">
          <span>삭제용 비밀번호</span>
          <input id="guideCommentPassword" type="password" required minlength="4" maxlength="40" autocomplete="new-password" placeholder="4자 이상 입력">
        </label>
        <div class="guide-comment-submit">
          <button class="submit-report" type="submit" id="guideCommentSubmit">댓글 등록</button>
          <button type="button" id="guideReplyCancel" data-comment-action="reply-cancel" hidden>답글 취소</button>
        </div>
      </form>
      <div id="guideCommentList" class="guide-comment-list"></div>
    </section>
  `;
  loadComments(post.id);
}

async function incrementViews(post) {
  post.views += 1;
  renderPosts();
  if (!hasPublicStore()) {
    saveLocalPosts();
    return;
  }
  try {
    const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?id=eq.${encodeURIComponent(post.id)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ media: storedMedia(post) }),
    });
    if (!response.ok) throw new Error("view");
  } catch {
    post.views -= 1;
    renderPosts();
  }
}

function commentsForPost(postId) {
  return comments
    .filter((comment) => comment.postId === postId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function updateReplyUi(postId) {
  const replyTarget = document.querySelector("#guideReplyTarget");
  const submit = document.querySelector("#guideCommentSubmit");
  const cancel = document.querySelector("#guideReplyCancel");
  if (!replyTarget || !submit || !cancel || selectedPostId !== postId) return;
  const comment = comments.find((item) => item.id === activeReplyId && item.postId === postId);
  if (!comment) {
    activeReplyId = "";
    replyTarget.hidden = true;
    replyTarget.textContent = "";
    submit.textContent = "댓글 등록";
    cancel.hidden = true;
    return;
  }
  replyTarget.hidden = false;
  replyTarget.textContent = `${comment.author}님에게 답글 작성 중`;
  submit.textContent = "답글 등록";
  cancel.hidden = false;
}

function commentMarkup(comment, isReply = false, post = null) {
  const isAccepted = Boolean(post?.acceptedCommentId && post.acceptedCommentId === comment.id);
  const canAccept = post?.category === "질문" && !isAccepted;
  return `
    <article class="guide-comment${isReply ? " is-reply" : ""}${isAccepted ? " is-accepted" : ""}" data-comment-id="${escapeHtml(comment.id)}">
      <div>
        ${isReply ? `<span class="guide-reply-mark">답글</span>` : ""}
        ${isAccepted ? `<span class="guide-accepted-badge">채택 답변</span>` : ""}
        <strong>${escapeHtml(comment.author)}</strong>
        <span>${escapeHtml(new Date(comment.createdAt).toLocaleString("ko-KR"))}</span>
        ${canAccept ? `<button type="button" data-comment-action="accept">답변 채택</button>` : ""}
        <button type="button" data-comment-action="reply">답글</button>
        <button type="button" data-comment-action="report">신고</button>
        <button type="button" data-comment-action="delete">삭제</button>
      </div>
      <p>${escapeHtml(comment.content).replaceAll("\n", "<br>")}</p>
    </article>
  `;
}

function renderComments(postId) {
  const list = document.querySelector("#guideCommentList");
  const count = document.querySelector("#guideCommentCount");
  if (!list || !count || selectedPostId !== postId) return;
  const rows = commentsForPost(postId);
  count.textContent = String(rows.length);
  const post = posts.find((item) => item.id === postId);
  if (post) post.commentCount = rows.length;
  const roots = rows
    .filter((comment) => !comment.parentId || !rows.some((row) => row.id === comment.parentId))
    .sort((a, b) => (b.id === post?.acceptedCommentId) - (a.id === post?.acceptedCommentId)
      || new Date(a.createdAt) - new Date(b.createdAt));
  list.innerHTML = rows.length ? roots.map((comment) => {
    const replies = rows
      .filter((reply) => reply.parentId === comment.id)
      .sort((a, b) => (b.id === post?.acceptedCommentId) - (a.id === post?.acceptedCommentId)
        || new Date(a.createdAt) - new Date(b.createdAt));
    return `${commentMarkup(comment, false, post)}${replies.map((reply) => commentMarkup(reply, true, post)).join("")}`;
  }).join("") : `<div class="empty compact-empty">첫 댓글을 남겨보세요.</div>`;
  updateReplyUi(postId);
}

async function loadComments(postId) {
  renderComments(postId);
}

async function submitComment(event) {
  event.preventDefault();
  if (!requireLoggedInNickname(activeReplyId ? "답글 작성" : "댓글 작성")) return;
  const postId = selectedPostId;
  if (!postId) return;
  const comment = {
    id: idValue(),
    postId,
    author: currentAuthNickname(),
    content: document.querySelector("#guideCommentContent").value.trim(),
    password: await makePasswordRecord(document.querySelector("#guideCommentPassword").value),
    parentId: activeReplyId,
    createdAt: new Date().toISOString(),
  };
  try {
    if (hasPublicStore()) {
      const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
        body: JSON.stringify({
          id: comment.id,
          title: `${commentTitlePrefix}${comment.postId}`,
          author: comment.author,
          content: comment.content,
          media: [comment.password, ...(comment.parentId ? [{ kind: commentParentKind, parentId: comment.parentId }] : [])],
          created_at: comment.createdAt,
          updated_at: comment.createdAt,
        }),
      });
      if (!response.ok) throw new Error("comment-save");
      const rows = await response.json();
      comments.push(normalizeComment(rows[0] || comment));
    } else {
      comments.push(comment);
      saveLocalComments();
    }
    event.target.reset();
    activeReplyId = "";
    renderComments(postId);
    renderPosts();
  } catch {
    setStatus("댓글 저장에 실패했습니다. 게시판 저장소 설정을 확인해주세요.", "is-offline");
  }
}

async function deleteComment(commentId) {
  const comment = comments.find((item) => item.id === commentId);
  if (!comment || !(await verifyPassword(comment, "댓글 삭제")) || !window.confirm("댓글을 삭제할까요?")) return;
  try {
    if (hasPublicStore()) {
      const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?id=eq.${encodeURIComponent(commentId)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("comment-delete");
    }
    comments = comments.filter((item) => item.id !== commentId);
    if (activeReplyId === commentId) activeReplyId = "";
    saveLocalComments();
    renderComments(comment.postId);
    renderPosts();
  } catch {
    setStatus("댓글 삭제에 실패했습니다.", "is-offline");
  }
}

async function acceptComment(commentId) {
  const post = posts.find((item) => item.id === selectedPostId);
  const comment = comments.find((item) => item.id === commentId && item.postId === selectedPostId);
  if (!post || !comment || post.category !== "질문") return;
  if (!(await verifyPassword(post, "답변 채택"))) return;
  try {
    post.acceptedCommentId = comment.id;
    post.updatedAt = new Date().toISOString();
    if (hasPublicStore()) {
      const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?id=eq.${encodeURIComponent(post.id)}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ media: storedMedia(post), updated_at: post.updatedAt }),
      });
      if (!response.ok) throw new Error("accept");
    }
    saveLocalPosts();
    renderPosts();
    setStatus("답변을 채택했습니다.", hasPublicStore() ? "is-online" : "is-offline");
  } catch {
    setStatus("답변 채택 저장에 실패했습니다.", "is-offline");
  }
}

async function reportGuideTarget(targetType, targetId, label) {
  if (!requireLoggedInNickname("신고")) return;
  const reason = window.prompt(`${label} 신고 사유를 간단히 입력해주세요.`);
  if (!reason?.trim()) return;
  try {
    if (hasPublicStore()) {
      const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify({
          id: `guide-report-${idValue()}`,
          title: `${reportTitlePrefix}${targetType}:${targetId}`,
          author: currentAuthNickname(),
          content: reason.trim().slice(0, 500),
          media: [{ kind: "guide-report", targetType, targetId }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("report");
    }
    setStatus("신고가 접수되었습니다. 운영자가 확인할게요.", hasPublicStore() ? "is-online" : "is-offline");
  } catch {
    setStatus("신고 접수에 실패했습니다.", "is-offline");
  }
}

function showRetainedMedia() {
  fields.existingMedia.hidden = !retainedMedia.length;
  fields.existingMedia.innerHTML = retainedMedia.length
    ? `<p>본문에 들어간 미디어</p><div class="guide-existing-list">${retainedMedia.map((media, index) => `
      <span>${escapeHtml(media.name || "첨부 파일")} <button type="button" data-remove-media="${index}">삭제</button></span>
    `).join("")}</div>`
    : "";
}

async function startEdit(post) {
  if (!(await verifyPassword(post, "글 수정"))) return;
  fields.editor.hidden = false;
  fields.formTitle.textContent = "게시글 수정";
  fields.editId.value = post.id;
  fields.title.value = post.title;
  fields.author.value = post.author === "익명" ? "" : post.author;
  fields.category.value = post.category || "일반";
  fields.password.value = "";
  fields.password.required = !post.password;
  fields.password.disabled = Boolean(post.password);
  fields.password.placeholder = post.password ? "기존 비밀번호 유지" : "4자 이상 입력";
  retainedMedia = preparedMedia(post.media);
  fillComposer(post.content, retainedMedia);
  fields.submit.textContent = "수정 완료";
  fields.cancel.hidden = false;
  showRetainedMedia();
  fields.title.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  fields.form.reset();
  fields.editId.value = "";
  retainedMedia = [];
  fields.composer.innerHTML = "";
  fields.content.value = "";
  composerRange = null;
  fields.formTitle.textContent = "게시글 작성";
  fields.submit.textContent = "게시글 등록";
  fields.cancel.hidden = true;
  fields.password.disabled = false;
  fields.password.required = true;
  fields.password.placeholder = "4자 이상 입력";
  fields.editor.hidden = true;
  showRetainedMedia();
}

async function deletePost(post) {
  if (!(await verifyPassword(post, "글 삭제")) || !window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
  try {
    if (hasPublicStore()) {
      const response = await fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?id=eq.${encodeURIComponent(post.id)}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("delete");
    }
    posts = posts.filter((item) => item.id !== post.id);
    if (selectedPostId === post.id) {
      selectedPostId = "";
      updatePostUrl("", true);
    }
    saveLocalPosts();
    if (fields.editId.value === post.id) resetForm();
    renderPosts();
    setStatus("게시글이 삭제되었습니다.", hasPublicStore() ? "is-online" : "is-offline");
  } catch {
    setStatus("게시글 삭제에 실패했습니다.", "is-offline");
  }
}

fields.form.addEventListener("submit", submitPost);
fields.cancel.addEventListener("click", resetForm);
fields.openEditor.addEventListener("click", () => {
  if (!requireLoggedInNickname("게시글 작성")) return;
  resetForm();
  fields.editor.hidden = false;
  fields.title.focus();
  fields.editor.scrollIntoView({ block: "start", behavior: "smooth" });
});
fields.search.addEventListener("input", renderPosts);
fields.categories.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-guide-category]");
  if (!button) return;
  activeCategory = button.dataset.guideCategory;
  fields.categories.querySelectorAll("button").forEach((item) => {
    item.classList.toggle("is-active", item === button);
  });
  renderPosts();
});
fields.existingMedia.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-remove-media]");
  if (!button) return;
  const removed = retainedMedia.splice(Number(button.dataset.removeMedia), 1)[0];
  fields.composer.querySelector(`[data-media-ref="${CSS.escape(removed.ref)}"]`)?.remove();
  fields.content.value = composerContent();
  showRetainedMedia();
});
fields.posts.addEventListener("click", (event) => {
  const button = event.target.closest("[data-guide-action]");
  if (!button) return;
  const post = posts.find((item) => item.id === button.closest("[data-guide-id]").dataset.guideId);
  if (!post) return;
  if (button.dataset.guideAction === "view") {
    event.preventDefault();
    selectedPostId = post.id;
    updatePostUrl(post.id);
    incrementViews(post);
    renderViewer();
    fields.viewer.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  if (button.dataset.guideAction === "edit") startEdit(post);
  if (button.dataset.guideAction === "delete") deletePost(post);
});
fields.viewer.addEventListener("click", (event) => {
  const commentButton = event.target.closest("button[data-comment-action]");
  if (commentButton) {
    if (commentButton.dataset.commentAction === "reply-cancel") {
      activeReplyId = "";
      updateReplyUi(selectedPostId);
      return;
    }
    const commentId = commentButton.closest("[data-comment-id]")?.dataset.commentId;
    if (commentButton.dataset.commentAction === "reply") {
      const comment = comments.find((item) => item.id === commentId);
      activeReplyId = comment?.parentId || commentId || "";
      updateReplyUi(selectedPostId);
      document.querySelector("#guideCommentContent")?.focus();
      return;
    }
    if (commentButton.dataset.commentAction === "accept") {
      acceptComment(commentId);
      return;
    }
    if (commentButton.dataset.commentAction === "report") {
      reportGuideTarget("comment", commentId, "댓글");
      return;
    }
    if (commentButton.dataset.commentAction === "delete") deleteComment(commentId);
    return;
  }
  const button = event.target.closest("button[data-guide-action]");
  if (!button) return;
  const post = posts.find((item) => item.id === button.closest("[data-guide-id]").dataset.guideId);
  if (button.dataset.guideAction === "close") {
    selectedPostId = "";
    updatePostUrl("");
    renderViewer();
    fields.board.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  if (!post) return;
  if (button.dataset.guideAction === "like") {
    button.disabled = true;
    savePostLike(post).catch(() => {
      setStatus("좋아요 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "is-offline");
      renderViewer();
    });
  }
  if (button.dataset.guideAction === "share") sharePostLink(post, button);
  if (button.dataset.guideAction === "report") reportGuideTarget("post", post.id, "게시글");
  if (button.dataset.guideAction === "edit") startEdit(post);
  if (button.dataset.guideAction === "delete") deletePost(post);
});
fields.viewer.addEventListener("submit", (event) => {
  if (event.target.matches("#guideCommentForm")) submitComment(event);
});
window.addEventListener("popstate", () => {
  selectedPostId = new URLSearchParams(window.location.search).get("post") || "";
  renderViewer();
  if (selectedPostId) fields.viewer.scrollIntoView({ block: "start" });
});
fields.composer.addEventListener("input", () => {
  fields.content.value = composerContent();
  rememberComposerRange();
});
fields.composer.addEventListener("keyup", rememberComposerRange);
fields.composer.addEventListener("mouseup", rememberComposerRange);
fields.composer.addEventListener("paste", (event) => {
  const files = [...event.clipboardData.files]
    .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"));
  if (!files.length) return;
  event.preventDefault();
  queueMediaFiles(files);
});
fields.media.addEventListener("change", () => queueMediaFiles(fields.media.files));
fields.search.addEventListener("input", () => {
  guidePage = 1;
  renderPosts();
});
fields.categories.addEventListener("click", (event) => {
  if (event.target.closest("button[data-guide-category]")) {
    guidePage = 1;
    renderPosts();
  }
});
fields.pagination?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const visiblePosts = filteredPosts();
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / guidePageSize));
  if (button.dataset.guidePagePrev !== undefined) guidePage -= 1;
  else if (button.dataset.guidePageNext !== undefined) guidePage += 1;
  else if (button.dataset.guidePage) guidePage = Number(button.dataset.guidePage);
  guidePage = Math.min(Math.max(1, guidePage), totalPages);
  renderPosts();
});

function renderPosts() {
  const visiblePosts = filteredPosts();
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / guidePageSize));
  guidePage = Math.min(Math.max(1, guidePage), totalPages);
  const startIndex = (guidePage - 1) * guidePageSize;
  const pagePosts = visiblePosts.slice(startIndex, startIndex + guidePageSize);
  fields.count.textContent = `${activeCategory === "전체" ? "전체글" : activeCategory} ${visiblePosts.length}개 · ${guidePage}/${totalPages}쪽`;
  fields.posts.innerHTML = pagePosts.length ? pagePosts.map((post) => `
    <article class="guide-row" data-guide-id="${escapeHtml(post.id)}">
      <span class="guide-row-number">${posts.length - posts.indexOf(post)}</span>
      <span class="guide-row-category ${categoryClass(post.category)}">${escapeHtml(post.category)}</span>
      <button type="button" class="guide-row-title" data-guide-action="view">
        ${escapeHtml(post.title)}
        ${post.acceptedCommentId ? `<small class="guide-accepted-mini">답변 채택</small>` : ""}
        ${post.media.length ? `<small>첨부 ${post.media.length}</small>` : ""}
        ${post.commentCount ? `<small>댓글 ${post.commentCount}</small>` : ""}
      </button>
      <span class="guide-row-author">${escapeHtml(post.author)}</span>
      <span class="guide-row-date">${escapeHtml(dateLabel(post.updatedAt))}</span>
      <span class="guide-row-metrics">
        <span class="guide-row-views">조회 ${post.views}</span>
        <span class="guide-row-likes">좋아요 ${post.likes}</span>
      </span>
    </article>
  `).join("") : `<div class="empty compact-empty">조건에 맞는 게시글이 없습니다.</div>`;
  renderGuidePagination(totalPages);
  renderViewer();
}

function renderGuidePagination(totalPages) {
  if (!fields.pagination) return;
  if (totalPages <= 1) {
    fields.pagination.innerHTML = "";
    return;
  }
  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`
      <button type="button" class="${page === guidePage ? "is-active" : ""}" data-guide-page="${page}" aria-current="${page === guidePage ? "page" : "false"}">
        ${page}
      </button>
    `);
  }
  fields.pagination.innerHTML = `
    <button type="button" data-guide-page-prev ${guidePage <= 1 ? "disabled" : ""}>이전</button>
    ${pages.join("")}
    <button type="button" data-guide-page-next ${guidePage >= totalPages ? "disabled" : ""}>다음</button>
  `;
}
revealCurrentNavItem();
loadPosts();
