const config = window.DUKHUBUSTERS_CONFIG || {};
const guideBackend = {
  url: String(config.supabaseUrl || "").replace(/\/$/, ""),
  key: String(config.supabaseAnonKey || ""),
  table: String(config.guideTable || "guide_posts"),
  bucket: String(config.guideBucket || "guide-media"),
};
const guideStorageKey = "dukhubusters.guidePosts";
const guideCommentStorageKey = "dukhubusters.guideComments";
const commentTitlePrefix = "__guide_comment__:";
const viewCounterKind = "guide-view-counter";
const passwordKind = "guide-password";
const fields = {
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
  media: document.querySelector("#guideMedia"),
  existingMedia: document.querySelector("#guideExistingMedia"),
  submit: document.querySelector("#guideSubmit"),
  cancel: document.querySelector("#guideCancelEdit"),
  status: document.querySelector("#guideStatus"),
  count: document.querySelector("#guideCount"),
  posts: document.querySelector("#guidePosts"),
  viewer: document.querySelector("#guideViewer"),
  search: document.querySelector("#guideSearch"),
  categories: document.querySelector(".guide-categories"),
};
let posts = sortPosts(readLocalPosts().map(normalizePost));
let comments = readLocalComments();
let retainedMedia = [];
let activeCategory = "전체";
let selectedPostId = "";

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

function idValue() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function savedTitle(post) {
  return post.category !== "일반" ? `[${post.category}] ${post.title}` : post.title;
}

function isStoredComment(row) {
  return String(row.title || "").startsWith(commentTitlePrefix);
}

function viewCount(media) {
  const counter = (Array.isArray(media) ? media : []).find((item) => item?.kind === viewCounterKind);
  return Number(counter?.views || 0);
}

function passwordRecord(media) {
  return (Array.isArray(media) ? media : []).find((item) => item?.kind === passwordKind) || null;
}

function visibleMedia(media) {
  return (Array.isArray(media) ? media : [])
    .filter((item) => item?.kind !== viewCounterKind && item?.kind !== passwordKind);
}

function storedMedia(post) {
  const metadata = [];
  if (post.views) metadata.push({ kind: viewCounterKind, views: post.views });
  if (post.password) metadata.push(post.password);
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
  const match = title.match(/^\[(보스|파밍|빌드|정보)\]\s*/);
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
    media: visibleMedia(row.media),
    views: Number(row.views || viewCount(row.media)),
    password: passwordRecord(row.media),
    commentCount: Number(row.commentCount || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
  };
}

function normalizeComment(row) {
  return {
    id: row.id,
    postId: row.post_id || row.postId || String(row.title || "").slice(commentTitlePrefix.length),
    author: row.author || "익명",
    content: row.content || "",
    password: passwordRecord(row.media),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function sortPosts(rows) {
  return rows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function loadPosts() {
  renderPosts();
  if (!hasPublicStore()) {
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
    posts = sortPosts(rows.filter((row) => !isStoredComment(row)).map(normalizePost));
    loadCommentCounts();
    renderPosts();
    setStatus("공개 공략 게시판에 연결되었습니다.", "is-online");
  } catch {
    setStatus("게시판 설정이 아직 적용되지 않아 이 기기의 임시 목록을 표시합니다.", "is-offline");
  }
}

function loadCommentCounts() {
  posts.forEach((post) => {
    post.commentCount = comments.filter((comment) => comment.postId === post.id).length;
  });
}

async function filesToTemporaryMedia(files) {
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > 3 * 1024 * 1024) throw new Error("local-size");
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result, type: file.type, name: file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  })));
}

async function uploadMedia(files, postId) {
  const uploaded = [];
  for (const file of files) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "media";
    const path = `${postId}/${idValue()}-${cleanName}`;
    const response = await fetch(`${guideBackend.url}/storage/v1/object/${guideBackend.bucket}/${encodeURIComponent(path).replaceAll("%2F", "/")}`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }),
      body: file,
    });
    if (!response.ok) throw new Error("upload");
    uploaded.push({
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

async function submitPost(event) {
  event.preventDefault();
  const editId = fields.editId.value;
  const previous = posts.find((post) => post.id === editId);
  const editing = Boolean(previous);
  const id = editing ? previous.id : idValue();
  const selectedFiles = [...fields.media.files];
  const category = fields.category.value || "일반";
  const title = fields.title.value.trim();
  if (savedTitle({ title, category }).length > 100) {
    setStatus("말머리를 포함한 제목은 100자 이내로 입력해주세요.", "is-offline");
    return;
  }
  const basePost = {
    id,
    title,
    author: fields.author.value.trim() || "익명",
    category,
    content: fields.content.value.trim(),
    media: [...retainedMedia],
    views: previous?.views || 0,
    commentCount: previous?.commentCount || 0,
    password: previous?.password || await makePasswordRecord(fields.password.value),
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fields.submit.disabled = true;
  try {
    if (hasPublicStore()) {
      basePost.media.push(...await uploadMedia(selectedFiles, id));
      const saved = await saveRemotePost(basePost, editing);
      posts = sortPosts([saved, ...posts.filter((post) => post.id !== id)]);
      setStatus(editing ? "공략글이 수정되었습니다." : "공략글이 등록되었습니다.", "is-online");
    } else {
      basePost.media.push(...await filesToTemporaryMedia(selectedFiles));
      posts = sortPosts([basePost, ...posts.filter((post) => post.id !== id)]);
      saveLocalPosts();
      setStatus(editing ? "공략글을 이 기기에서 수정했습니다." : "공략글을 이 기기에 임시 저장했습니다.", "is-offline");
    }
    resetForm();
    renderPosts();
  } catch (error) {
    try {
      basePost.media = [...retainedMedia, ...await filesToTemporaryMedia(selectedFiles)];
      posts = sortPosts([basePost, ...posts.filter((post) => post.id !== id)]);
      saveLocalPosts();
      resetForm();
      renderPosts();
      setStatus("공개 게시판에 저장하지 못해 이 기기에 임시 저장했습니다. 저장소 설정을 적용하면 모두에게 공유됩니다.", "is-offline");
    } catch (localError) {
      const message = localError.message === "local-size"
        ? "공개 저장소 연결 전에는 첨부 파일 합계 3MB까지 임시 저장할 수 있습니다."
        : "공략글 저장에 실패했습니다. 게시판 저장소 설정을 확인해주세요.";
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

function dateLabel(value) {
  return new Date(value).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
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
      <span class="guide-row-category">${escapeHtml(post.category)}</span>
      <button type="button" class="guide-row-title" data-guide-action="view">
        ${escapeHtml(post.title)}
        ${post.media.length ? `<small>첨부 ${post.media.length}</small>` : ""}
        ${post.commentCount ? `<small>댓글 ${post.commentCount}</small>` : ""}
      </button>
      <span class="guide-row-author">${escapeHtml(post.author)}</span>
      <span class="guide-row-date">${escapeHtml(dateLabel(post.updatedAt))}</span>
      <span class="guide-row-views">${post.views}</span>
    </article>
  `).join("") : `<div class="empty compact-empty">조건에 맞는 공략글이 없습니다.</div>`;
  renderViewer();
}

function renderViewer() {
  const post = posts.find((item) => item.id === selectedPostId);
  fields.viewer.hidden = !post;
  if (!post) {
    fields.viewer.innerHTML = "";
    return;
  }
  fields.viewer.innerHTML = `
    <div class="guide-viewer-head" data-guide-id="${escapeHtml(post.id)}">
      <div>
        <span class="guide-row-category">${escapeHtml(post.category)}</span>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.author)} · ${escapeHtml(new Date(post.updatedAt).toLocaleString("ko-KR"))} · 조회 ${post.views} · 댓글 ${post.commentCount}</p>
      </div>
      <div class="pending-actions">
        <button type="button" data-guide-action="edit">수정</button>
        <button type="button" data-guide-action="delete">삭제</button>
        <button type="button" data-guide-action="close">닫기</button>
      </div>
    </div>
    <div class="guide-viewer-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
    ${post.media.length ? `<div class="guide-gallery">${mediaMarkup(post.media)}</div>` : ""}
    <section class="guide-comments">
      <h4>댓글 <span id="guideCommentCount">${post.commentCount}</span></h4>
      <form class="guide-comment-form" id="guideCommentForm">
        <label class="field">
          <span>작성자</span>
          <input id="guideCommentAuthor" maxlength="40" placeholder="닉네임">
        </label>
        <label class="field guide-comment-content">
          <span>댓글 내용</span>
          <textarea id="guideCommentContent" required maxlength="500" rows="2" placeholder="댓글을 입력하세요."></textarea>
        </label>
        <label class="field">
          <span>삭제용 비밀번호</span>
          <input id="guideCommentPassword" type="password" required minlength="4" maxlength="40" autocomplete="new-password" placeholder="4자 이상 입력">
        </label>
        <button class="submit-report" type="submit">댓글 등록</button>
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

function renderComments(postId) {
  const list = document.querySelector("#guideCommentList");
  const count = document.querySelector("#guideCommentCount");
  if (!list || !count || selectedPostId !== postId) return;
  const rows = commentsForPost(postId);
  count.textContent = String(rows.length);
  const post = posts.find((item) => item.id === postId);
  if (post) post.commentCount = rows.length;
  list.innerHTML = rows.length ? rows.map((comment) => `
    <article class="guide-comment" data-comment-id="${escapeHtml(comment.id)}">
      <div>
        <strong>${escapeHtml(comment.author)}</strong>
        <span>${escapeHtml(new Date(comment.createdAt).toLocaleString("ko-KR"))}</span>
        <button type="button" data-comment-action="delete">삭제</button>
      </div>
      <p>${escapeHtml(comment.content).replaceAll("\n", "<br>")}</p>
    </article>
  `).join("") : `<div class="empty compact-empty">첫 댓글을 남겨보세요.</div>`;
}

async function loadComments(postId) {
  renderComments(postId);
}

async function submitComment(event) {
  event.preventDefault();
  const postId = selectedPostId;
  if (!postId) return;
  const comment = {
    id: idValue(),
    postId,
    author: document.querySelector("#guideCommentAuthor").value.trim() || "익명",
    content: document.querySelector("#guideCommentContent").value.trim(),
    password: await makePasswordRecord(document.querySelector("#guideCommentPassword").value),
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
          media: [comment.password],
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
    saveLocalComments();
    renderComments(comment.postId);
    renderPosts();
  } catch {
    setStatus("댓글 삭제에 실패했습니다.", "is-offline");
  }
}

function showRetainedMedia() {
  fields.existingMedia.hidden = !retainedMedia.length;
  fields.existingMedia.innerHTML = retainedMedia.length
    ? `<p>유지할 기존 첨부</p><div class="guide-existing-list">${retainedMedia.map((media, index) => `
      <span>${escapeHtml(media.name || "첨부 파일")} <button type="button" data-remove-media="${index}">제외</button></span>
    `).join("")}</div>`
    : "";
}

async function startEdit(post) {
  if (!(await verifyPassword(post, "글 수정"))) return;
  fields.editor.hidden = false;
  fields.formTitle.textContent = "공략글 수정";
  fields.editId.value = post.id;
  fields.title.value = post.title;
  fields.author.value = post.author === "익명" ? "" : post.author;
  fields.category.value = post.category || "일반";
  fields.password.value = "";
  fields.password.required = !post.password;
  fields.password.disabled = Boolean(post.password);
  fields.password.placeholder = post.password ? "기존 비밀번호 유지" : "4자 이상 입력";
  fields.content.value = post.content;
  retainedMedia = [...post.media];
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
  fields.formTitle.textContent = "공략글 작성";
  fields.submit.textContent = "공략글 등록";
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
    if (selectedPostId === post.id) selectedPostId = "";
    saveLocalPosts();
    if (fields.editId.value === post.id) resetForm();
    renderPosts();
    setStatus("공략글이 삭제되었습니다.", hasPublicStore() ? "is-online" : "is-offline");
  } catch {
    setStatus("공략글 삭제에 실패했습니다.", "is-offline");
  }
}

fields.form.addEventListener("submit", submitPost);
fields.cancel.addEventListener("click", resetForm);
fields.openEditor.addEventListener("click", () => {
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
  retainedMedia.splice(Number(button.dataset.removeMedia), 1);
  showRetainedMedia();
});
fields.posts.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-guide-action]");
  if (!button) return;
  const post = posts.find((item) => item.id === button.closest("[data-guide-id]").dataset.guideId);
  if (!post) return;
  if (button.dataset.guideAction === "view") {
    selectedPostId = post.id;
    incrementViews(post);
    renderViewer();
  }
  if (button.dataset.guideAction === "edit") startEdit(post);
  if (button.dataset.guideAction === "delete") deletePost(post);
});
fields.viewer.addEventListener("click", (event) => {
  const commentButton = event.target.closest("button[data-comment-action]");
  if (commentButton) {
    deleteComment(commentButton.closest("[data-comment-id]").dataset.commentId);
    return;
  }
  const button = event.target.closest("button[data-guide-action]");
  if (!button) return;
  const post = posts.find((item) => item.id === button.closest("[data-guide-id]").dataset.guideId);
  if (button.dataset.guideAction === "close") {
    selectedPostId = "";
    renderViewer();
    return;
  }
  if (!post) return;
  if (button.dataset.guideAction === "edit") startEdit(post);
  if (button.dataset.guideAction === "delete") deletePost(post);
});
fields.viewer.addEventListener("submit", (event) => {
  if (event.target.matches("#guideCommentForm")) submitComment(event);
});
revealCurrentNavItem();
loadPosts();
