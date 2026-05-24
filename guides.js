const config = window.DUKHUBUSTERS_CONFIG || {};
const guideBackend = {
  url: String(config.supabaseUrl || "").replace(/\/$/, ""),
  key: String(config.supabaseAnonKey || ""),
  table: String(config.guideTable || "guide_posts"),
  bucket: String(config.guideBucket || "guide-media"),
};
const guideStorageKey = "dukhubusters.guidePosts";
const fields = {
  form: document.querySelector("#guideForm"),
  editor: document.querySelector("#guideEditor"),
  openEditor: document.querySelector("#guideOpenEditor"),
  formTitle: document.querySelector("#guideFormTitle"),
  editId: document.querySelector("#guideEditId"),
  title: document.querySelector("#guideTitle"),
  author: document.querySelector("#guideAuthor"),
  category: document.querySelector("#guideCategory"),
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

function setStatus(message, mode = "") {
  fields.status.textContent = message;
  fields.status.className = `build-sync-status ${mode}`.trim();
}

function idValue() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePost(row) {
  return {
    id: row.id,
    title: row.title || "",
    author: row.author || "익명",
    category: row.category || "일반",
    content: row.content || "",
    media: Array.isArray(row.media) ? row.media : [],
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
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
    posts = sortPosts((await response.json()).map(normalizePost));
    renderPosts();
    setStatus("공개 공략 게시판에 연결되었습니다.", "is-online");
  } catch {
    setStatus("게시판 설정이 아직 적용되지 않아 이 기기의 임시 목록을 표시합니다.", "is-offline");
  }
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
    title: post.title,
    author: post.author,
    category: post.category,
    content: post.content,
    media: post.media,
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
  const basePost = {
    id,
    title: fields.title.value.trim(),
    author: fields.author.value.trim() || "익명",
    category: fields.category.value || "일반",
    content: fields.content.value.trim(),
    media: [...retainedMedia],
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
      return `<video controls preload="metadata" src="${url}" aria-label="${label}"></video>`;
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
      </button>
      <span class="guide-row-author">${escapeHtml(post.author)}</span>
      <span class="guide-row-date">${escapeHtml(dateLabel(post.updatedAt))}</span>
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
        <p>${escapeHtml(post.author)} · ${escapeHtml(new Date(post.updatedAt).toLocaleString("ko-KR"))}</p>
      </div>
      <div class="pending-actions">
        <button type="button" data-guide-action="edit">수정</button>
        <button type="button" data-guide-action="delete">삭제</button>
        <button type="button" data-guide-action="close">닫기</button>
      </div>
    </div>
    <div class="guide-viewer-content">${escapeHtml(post.content).replaceAll("\n", "<br>")}</div>
    ${post.media.length ? `<div class="guide-gallery">${mediaMarkup(post.media)}</div>` : ""}
  `;
}

function showRetainedMedia() {
  fields.existingMedia.hidden = !retainedMedia.length;
  fields.existingMedia.innerHTML = retainedMedia.length
    ? `<p>유지할 기존 첨부</p><div class="guide-existing-list">${retainedMedia.map((media, index) => `
      <span>${escapeHtml(media.name || "첨부 파일")} <button type="button" data-remove-media="${index}">제외</button></span>
    `).join("")}</div>`
    : "";
}

function startEdit(post) {
  fields.editor.hidden = false;
  fields.formTitle.textContent = "공략글 수정";
  fields.editId.value = post.id;
  fields.title.value = post.title;
  fields.author.value = post.author === "익명" ? "" : post.author;
  fields.category.value = post.category || "일반";
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
  fields.editor.hidden = true;
  showRetainedMedia();
}

async function deletePost(post) {
  if (!window.confirm(`"${post.title}" 글을 삭제할까요?`)) return;
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
    renderViewer();
  }
  if (button.dataset.guideAction === "edit") startEdit(post);
  if (button.dataset.guideAction === "delete") deletePost(post);
});
fields.viewer.addEventListener("click", (event) => {
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
revealCurrentNavItem();
loadPosts();
