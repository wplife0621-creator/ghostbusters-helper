redirectLegacyGithubPages();

const config = window.DUKHUBUSTERS_CONFIG || {};
const data = window.GHOST_DATA || {};
const specBackend = {
  url: String(config.supabaseUrl || "").replace(/\/$/, ""),
  key: String(config.supabaseAnonKey || ""),
  table: String(config.specQuestionTable || "spec_questions"),
};
const staticDataVersion = String(config.staticDataVersion || "20260607-static-index");
const answerPrefix = "__spec_answer__:";
const answerLikePrefix = "__spec_answer_like__:";
const pageSize = 10;
let questions = [];
let answers = [];
let answerLikes = [];
let activePage = 1;
let activeQuestionId = "";

const fields = {
  form: document.querySelector("#specQuestionForm"),
  modal: document.querySelector("#specQuestionModal"),
  openQuestion: document.querySelector("#openSpecQuestion"),
  closeQuestion: document.querySelector("#closeSpecQuestion"),
  monster: document.querySelector("#specMonster"),
  monsterOptions: document.querySelector("#specMonsterOptions"),
  status: document.querySelector("#specStatus"),
  search: document.querySelector("#specSearch"),
  monsterFilter: document.querySelector("#specMonsterFilter"),
  count: document.querySelector("#specCount"),
  list: document.querySelector("#specQuestionList"),
  pagination: document.querySelector("#specPagination"),
};

function redirectLegacyGithubPages() {
  if (window.location.hostname !== "wplife0621-creator.github.io") return;
  const legacyBasePath = "/ghostbusters-helper";
  const nextPath = window.location.pathname.startsWith(legacyBasePath)
    ? window.location.pathname.slice(legacyBasePath.length) || "/"
    : window.location.pathname || "/";
  window.location.replace(`https://busters.kr${nextPath}${window.location.search}${window.location.hash}`);
}

function textOf(value) {
  return String(value ?? "").trim();
}

function escapeHtml(value) {
  return textOf(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function idValue() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function hasPublicStore() {
  return Boolean(specBackend.url && specBackend.key);
}

function authHeaders(extra = {}) {
  return {
    apikey: specBackend.key,
    Authorization: `Bearer ${specBackend.key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function specStoreUrl(query = "") {
  return `${specBackend.url}/rest/v1/${specBackend.table}${query}`;
}

function staticDataUrl(name) {
  return `./data/${name}.json?v=${encodeURIComponent(staticDataVersion)}`;
}

async function fetchStaticRows(name) {
  const response = await fetch(staticDataUrl(name), { cache: "force-cache" });
  if (!response.ok) throw new Error(`static data unavailable: ${name}`);
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload.rows) ? payload.rows : [];
}

function currentUser() {
  return window.DUKHUBUSTERS_AUTH?.getUser?.() || null;
}

function currentNickname() {
  return textOf(window.DUKHUBUSTERS_AUTH?.getDisplayName?.()) || "익명";
}

function currentUserKey() {
  const user = currentUser();
  return textOf(user?.uid || user?.email || "");
}

function requireLoggedIn(actionLabel = "이용") {
  const user = currentUser();
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

function setStatus(message, mode = "") {
  if (!fields.status) return;
  fields.status.textContent = message;
  fields.status.className = `build-sync-status ${mode}`.trim();
}

function normalizeQuestion(row) {
  const payload = typeof row.spec === "object" && row.spec ? row.spec : row;
  const monster = textOf(payload.monster || row.monster || row.title);
  return {
    id: textOf(row.id) || idValue(),
    monster,
    author: textOf(row.author) || "익명",
    createdAt: textOf(row.created_at || row.createdAt) || new Date().toISOString(),
    updatedAt: textOf(row.updated_at || row.updatedAt || row.created_at || row.createdAt) || new Date().toISOString(),
    answerCount: 0,
  };
}

function normalizeAnswer(row) {
  const questionId = textOf(row.question_id) || textOf(row.questionId) || textOf(row.title).slice(answerPrefix.length);
  return {
    id: textOf(row.id) || idValue(),
    questionId,
    result: textOf(row.result || row.category || "조건부 가능"),
    content: textOf(row.content || row.memo),
    author: textOf(row.author) || "익명",
    createdAt: textOf(row.created_at || row.createdAt) || new Date().toISOString(),
    likeCount: 0,
    liked: false,
  };
}

function normalizeAnswerLike(row) {
  const answerId = textOf(row.answer_id) || textOf(row.answerId) || textOf(row.title).slice(answerLikePrefix.length);
  return {
    id: textOf(row.id) || idValue(),
    answerId,
    questionId: textOf(row.question_id || row.questionId),
    userKey: textOf(row.user_key || row.userKey || row.author),
  };
}

function splitRows(rows) {
  answerLikes = rows.filter((row) => textOf(row.title).startsWith(answerLikePrefix)).map(normalizeAnswerLike);
  answers = rows.filter((row) => textOf(row.title).startsWith(answerPrefix)).map(normalizeAnswer);
  questions = rows
    .filter((row) => !textOf(row.title).startsWith(answerPrefix) && !textOf(row.title).startsWith(answerLikePrefix))
    .map(normalizeQuestion)
    .filter((question) => question.monster)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  const answerCounts = new Map();
  answers.forEach((answer) => answerCounts.set(answer.questionId, (answerCounts.get(answer.questionId) || 0) + 1));
  questions.forEach((question) => {
    question.answerCount = answerCounts.get(question.id) || 0;
  });
  hydrateAnswerLikes();
}

function hydrateAnswerLikes() {
  const currentKey = currentUserKey();
  const likesByAnswer = new Map();
  answerLikes.forEach((like) => {
    if (!like.answerId) return;
    const bucket = likesByAnswer.get(like.answerId) || { count: 0, liked: false };
    bucket.count += 1;
    if (currentKey && like.userKey === currentKey) bucket.liked = true;
    likesByAnswer.set(like.answerId, bucket);
  });
  answers = answers.map((answer) => {
    const likes = likesByAnswer.get(answer.id) || { count: 0, liked: false };
    return { ...answer, likeCount: likes.count, liked: likes.liked };
  });
}

function seedMonsterOptions() {
  const monsters = [...new Set((data["정수"] || []).map((row) => textOf(row["몬스터"])).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  fields.monsterOptions.innerHTML = monsters.map((monster) => `<option value="${escapeHtml(monster)}"></option>`).join("");
  fields.monsterFilter.innerHTML = `<option value="">전체 몬스터</option>${monsters.map((monster) => `<option value="${escapeHtml(monster)}">${escapeHtml(monster)}</option>`).join("")}`;
}

async function loadQuestions() {
  try {
    splitRows(await fetchStaticRows("spec-questions-index"));
    setStatus("가벼운 공개 질문 목록을 먼저 보여주고, 최신 질문을 확인하는 중입니다.", "is-online");
    renderQuestions();
  } catch {
    // Static index is generated by GitHub Actions. Fall back to live data before the first run.
  }
  if (!hasPublicStore()) {
    setStatus("스펙 질문 저장소 연결 전입니다.", "is-offline");
    renderQuestions();
    return;
  }
  try {
    const response = await fetch(specStoreUrl("?select=*&order=updated_at.desc&limit=500"), {
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("load");
    splitRows(await response.json());
    setStatus("공개 스펙 질문 저장소에 연결되었습니다.", "is-online");
  } catch {
    setStatus("스펙 질문 목록을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.", "is-offline");
  }
  renderQuestions();
}

function filteredQuestions() {
  const query = textOf(fields.search.value).toLowerCase().replace(/\s+/g, "");
  const monster = textOf(fields.monsterFilter.value);
  return questions.filter((question) => {
    if (monster && question.monster !== monster) return false;
    if (!query) return true;
    return [question.monster, question.author].join(" ").toLowerCase().replace(/\s+/g, "").includes(query);
  });
}

function answerRows(questionId) {
  return answers
    .filter((answer) => answer.questionId === questionId)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function resultClass(result) {
  if (result.includes("불가능")) return "danger";
  if (result.includes("가능") && !result.includes("조건")) return "ok";
  if (result.includes("어려")) return "warn";
  return "conditional";
}

function questionMarkup(question) {
  const rows = answerRows(question.id);
  const open = activeQuestionId === question.id;
  return `
    <article class="spec-card ${open ? "is-open" : ""}" data-spec-id="${escapeHtml(question.id)}">
      <button class="spec-question-row" type="button" data-spec-action="toggle">
        <span>${escapeHtml(question.monster)} 잡을 수 있나요?</span>
        <small>${escapeHtml(question.author)} · 답변 ${rows.length}</small>
        <i aria-hidden="true">⌕</i>
      </button>
      ${open ? `
        <div class="spec-question-body">
          <div class="spec-answers">
            ${rows.length ? rows.map((answer) => `
              <div class="spec-answer is-${escapeHtml(resultClass(answer.result))}" data-answer-id="${escapeHtml(answer.id)}">
                <div>
                  <b>${escapeHtml(answer.result)}</b>
                  <p>${escapeHtml(answer.content)}</p>
                  <small>${escapeHtml(answer.author)} · ${escapeHtml(new Date(answer.createdAt).toLocaleDateString("ko-KR"))}</small>
                </div>
                <button class="spec-answer-like ${answer.liked ? "is-liked" : ""}" type="button" data-spec-action="like-answer" ${answer.liked ? "disabled" : ""}>
                  좋아요 ${answer.likeCount}
                </button>
              </div>
            `).join("") : `<div class="spec-answer-empty">아직 답변이 없습니다. 첫 답변을 남겨주세요.</div>`}
          </div>
          <form class="spec-answer-form">
            <select data-spec-answer-result aria-label="답변 결과">
              <option>가능</option>
              <option selected>조건부 가능</option>
              <option>어려움</option>
              <option>불가능</option>
            </select>
            <input data-spec-answer-content maxlength="500" placeholder="예: 항마 정수 있으면 가능, 없으면 어려움">
            <button type="submit">답변</button>
          </form>
        </div>
      ` : ""}
    </article>
  `;
}

function renderQuestions() {
  hydrateAnswerLikes();
  const visible = filteredQuestions();
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  activePage = Math.min(Math.max(1, activePage), totalPages);
  const pageRows = visible.slice((activePage - 1) * pageSize, activePage * pageSize);
  fields.count.textContent = `질문 ${visible.length}개 · ${activePage}/${totalPages}쪽`;
  fields.list.innerHTML = pageRows.length
    ? pageRows.map(questionMarkup).join("")
    : `<div class="empty compact-empty">조건에 맞는 스펙 질문이 없습니다.</div>`;
  fields.pagination.innerHTML = totalPages > 1 ? `
    <button type="button" data-page="${activePage - 1}" ${activePage <= 1 ? "disabled" : ""}>이전</button>
    ${Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => `
      <button type="button" data-page="${page}" class="${page === activePage ? "is-active" : ""}">${page}</button>
    `).join("")}
    <button type="button" data-page="${activePage + 1}" ${activePage >= totalPages ? "disabled" : ""}>다음</button>
  ` : "";
}

function openQuestionModal() {
  if (!requireLoggedIn("스펙 질문")) return;
  fields.modal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => fields.monster.focus(), 20);
}

function closeQuestionModal() {
  fields.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function saveQuestion(event) {
  event.preventDefault();
  if (!requireLoggedIn("질문 등록")) return;
  const monster = textOf(fields.monster.value);
  if (!monster) {
    setStatus("몬스터 이름을 입력해주세요.", "is-offline");
    return;
  }
  const question = {
    id: `spec-${idValue()}`,
    title: monster,
    author: currentNickname(),
    spec: { monster },
    content: `${monster} 잡을 수 있나요?`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const response = await fetch(specStoreUrl(), {
      method: "POST",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(question),
    });
    if (!response.ok) throw new Error("save");
    const rows = await response.json();
    questions = [normalizeQuestion(rows[0] || question), ...questions];
    fields.form.reset();
    closeQuestionModal();
    setStatus("질문이 등록되었습니다.", "is-online");
    activePage = 1;
    renderQuestions();
  } catch {
    setStatus("질문 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "is-offline");
  }
}

async function saveAnswer(event) {
  event.preventDefault();
  const card = event.target.closest("[data-spec-id]");
  const questionId = card?.dataset.specId || "";
  if (!questionId || !requireLoggedIn("답변 등록")) return;
  const contentInput = event.target.querySelector("[data-spec-answer-content]");
  const result = textOf(event.target.querySelector("[data-spec-answer-result]")?.value);
  const content = textOf(contentInput?.value);
  if (!content) {
    setStatus("답변 내용을 입력해주세요.", "is-offline");
    return;
  }
  const answer = {
    id: `spec-answer-${idValue()}`,
    title: `${answerPrefix}${questionId}`,
    question_id: questionId,
    result,
    author: currentNickname(),
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const response = await fetch(specStoreUrl(), {
      method: "POST",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(answer),
    });
    if (!response.ok) throw new Error("answer");
    const rows = await response.json();
    answers = [...answers, normalizeAnswer(rows[0] || answer)];
    const question = questions.find((item) => item.id === questionId);
    if (question) question.updatedAt = new Date().toISOString();
    contentInput.value = "";
    setStatus("답변이 등록되었습니다.", "is-online");
    renderQuestions();
  } catch {
    setStatus("답변 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "is-offline");
  }
}

async function saveAnswerLike(answerId) {
  if (!answerId || !requireLoggedIn("답변 좋아요")) return;
  const userKey = currentUserKey();
  if (!userKey) return;
  const likeId = `spec-like-${answerId}-${userKey}`.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 180);
  if (answerLikes.some((like) => like.id === likeId || (like.answerId === answerId && like.userKey === userKey))) {
    setStatus("이미 좋아요를 누른 답변입니다.", "is-online");
    return;
  }
  const answer = answers.find((item) => item.id === answerId);
  const like = {
    id: likeId,
    title: `${answerLikePrefix}${answerId}`,
    answer_id: answerId,
    question_id: answer?.questionId || activeQuestionId,
    author: currentNickname(),
    user_key: userKey,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  try {
    const response = await fetch(specStoreUrl(), {
      method: "POST",
      headers: authHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify(like),
    });
    if (!response.ok && response.status !== 409) throw new Error("like");
    answerLikes = [...answerLikes, normalizeAnswerLike(like)];
    setStatus("답변에 좋아요를 눌렀습니다.", "is-online");
    renderQuestions();
  } catch {
    setStatus("좋아요 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", "is-offline");
  }
}

fields.openQuestion.addEventListener("click", openQuestionModal);
fields.closeQuestion.addEventListener("click", closeQuestionModal);
fields.modal.addEventListener("click", (event) => {
  if (event.target === fields.modal) closeQuestionModal();
});
fields.form.addEventListener("submit", saveQuestion);
fields.list.addEventListener("click", (event) => {
  const likeButton = event.target.closest("button[data-spec-action='like-answer']");
  if (likeButton) {
    saveAnswerLike(likeButton.closest("[data-answer-id]")?.dataset.answerId || "");
    return;
  }
  const toggleButton = event.target.closest("button[data-spec-action='toggle']");
  if (!toggleButton) return;
  const id = toggleButton.closest("[data-spec-id]")?.dataset.specId || "";
  activeQuestionId = activeQuestionId === id ? "" : id;
  renderQuestions();
});
fields.list.addEventListener("submit", saveAnswer);
fields.search.addEventListener("input", () => {
  activePage = 1;
  renderQuestions();
});
fields.monsterFilter.addEventListener("change", () => {
  activePage = 1;
  renderQuestions();
});
fields.pagination.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button) return;
  activePage = Number(button.dataset.page) || 1;
  renderQuestions();
});
window.addEventListener("dukhubusters:auth", renderQuestions);

seedMonsterOptions();
fields.search.value = new URLSearchParams(location.search).get("search") || "";
loadQuestions();
