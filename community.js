redirectLegacyGithubPages();

const communityData = window.GHOST_DATA || {};
const config = window.DUKHUBUSTERS_CONFIG || {};
const storeKeys = {
  favorites: "dukhubusters.communityFavorites.v1",
  compare: "dukhubusters.communityCompare.v1",
  readAlerts: "dukhubusters.readAlerts.v1",
};

const staticUpdates = [
  {
    date: "2026-06-03",
    title: "커뮤니티 기능 확장",
    text: "통합 검색, 내 보관함, 비교함, 변경 이력, 초보자 허브, 알림 기반을 추가했습니다.",
    href: "./changelog.html",
    tag: "기능",
  },
  {
    date: "2026-06-02",
    title: "관리자 통계 개선",
    text: "방문, 체류시간, 인기 콘텐츠, 계정별 활동을 더 직관적으로 확인할 수 있게 정리했습니다.",
    href: "./admin.html",
    tag: "관리",
  },
  {
    date: "2026-06-02",
    title: "검색 포털 등록 준비",
    text: "사이트 설명, 검색 메타, 네이버/구글 검증 태그, 사이트맵 구성을 보강했습니다.",
    href: "./about.html",
    tag: "검색",
  },
];

document.addEventListener("DOMContentLoaded", initCommunityPage);

function redirectLegacyGithubPages() {
  if (window.location.hostname !== "wplife0621-creator.github.io") return;
  const legacyBasePath = "/ghostbusters-helper";
  const nextPath = window.location.pathname.startsWith(legacyBasePath)
    ? window.location.pathname.slice(legacyBasePath.length) || "/"
    : window.location.pathname || "/";
  window.location.replace(`https://busters.kr${nextPath}${window.location.search}${window.location.hash}`);
}

function initCommunityPage() {
  wireSaveButtons();
  initGlobalSearch();
  initLibrary();
  initChangelog();
  initBeginnerHub();
}

function initGlobalSearch() {
  const form = document.querySelector("[data-global-search-form]");
  const input = document.querySelector("[data-global-search-input]");
  const results = document.querySelector("[data-global-search-results]");
  const status = document.querySelector("[data-global-search-status]");
  const tagButtons = document.querySelectorAll("[data-search-tag]");
  if (!form || !input || !results) return;

  let cachedRemoteItems = [];
  let activeTag = "all";

  loadRemoteItems().then((items) => {
    cachedRemoteItems = items;
    renderSearch(input.value.trim(), activeTag, results, status, cachedRemoteItems);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderSearch(input.value.trim(), activeTag, results, status, cachedRemoteItems);
  });

  input.addEventListener("input", () => {
    renderSearch(input.value.trim(), activeTag, results, status, cachedRemoteItems);
  });

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeTag = button.dataset.searchTag || "all";
      tagButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderSearch(input.value.trim(), activeTag, results, status, cachedRemoteItems);
    });
  });
}

function initLibrary() {
  const favoritesBox = document.querySelector("[data-library-favorites]");
  const compareBox = document.querySelector("[data-library-compare]");
  const alertsBox = document.querySelector("[data-library-alerts]");
  if (!favoritesBox && !compareBox && !alertsBox) return;

  renderLibraryList(favoritesBox, getStore(storeKeys.favorites), "favorite");
  renderLibraryList(compareBox, getStore(storeKeys.compare), "compare");
  renderAlerts(alertsBox);
}

function initChangelog() {
  const list = document.querySelector("[data-changelog-list]");
  const status = document.querySelector("[data-changelog-status]");
  if (!list) return;

  list.innerHTML = staticUpdates.map(renderUpdateCard).join("");
  fetchReportUpdates()
    .then((updates) => {
      if (!updates.length) return;
      list.insertAdjacentHTML("beforeend", updates.map(renderUpdateCard).join(""));
      if (status) status.textContent = `운영 변경 ${staticUpdates.length}건과 최근 제보 반영 ${updates.length}건을 함께 표시합니다.`;
    })
    .catch(() => {
      if (status) status.textContent = "기본 변경 이력을 표시하고 있습니다.";
    });
}

function initBeginnerHub() {
  const toc = document.querySelector("[data-codex-toc]");
  if (!toc) return;

  const areas = [
    ["1층", ""],
    ["1층 균열", "강철의 묘"],
    ["1층 균열", "녹색 탄광"],
    ["1층 균열", "빙하굴"],
    ["1층 균열", "핏빛 성채"],
    ["2층 균열", "검귀의 동굴"],
    ["2층 균열", "망자의제단"],
    ["2층 균열", "안개의 거석 폐허"],
    ["2층 균열", "총포사막"],
    ["2층 균열", "홉고블린 요새"],
    ["3층 균열", "백색신전"],
    ["4층 균열", "천공신탁소"],
    ["5층", ""],
    ["6층", ""],
  ];

  toc.innerHTML = areas
    .map(([floor, area]) => {
      const query = new URLSearchParams({ floor, area }).toString();
      const title = area ? `${floor} · ${area}` : floor;
      return `
        <article class="community-mini-card">
          <strong>${escapeHtml(title)}</strong>
          <div>
            <a href="./essences.html?${query}">정수 보기</a>
            <a href="./numbers.html?${query}">넘버스 보기</a>
          </div>
        </article>
      `;
    })
    .join("");
}

async function renderSearch(query, activeTag, results, status, remoteItems) {
  const localItems = [...getEssenceItems(), ...getNumberItems()];
  const allItems = [...localItems, ...remoteItems];
  const normalizedQuery = normalizeText(query);
  const filtered = allItems
    .filter((item) => activeTag === "all" || item.kind === activeTag || item.tags.includes(activeTag))
    .filter((item) => !normalizedQuery || normalizeText([item.title, item.summary, item.detail, item.tags.join(" ")].join(" ")).includes(normalizedQuery))
    .slice(0, 80);

  results.innerHTML = filtered.length
    ? filtered.map(renderSearchCard).join("")
    : `<div class="community-empty">검색 결과가 없습니다. 몬스터명, 효과, 구역, 빌드 태그를 바꿔서 찾아보세요.</div>`;

  if (status) {
    const label = normalizedQuery ? `"${query}" 검색 결과` : "전체 추천 항목";
    status.textContent = `${label} ${filtered.length}개를 표시합니다.`;
  }
}

function getEssenceItems() {
  return (communityData["정수"] || []).map((row, index) => {
    const monster = textOf(row.monster || row.name || row["몬스터"] || row["이름"] || `정수 ${index + 1}`);
    const stats = joinValues(row.stats, row["스탯"]);
    const passive = joinValues(row.passive, row["패시브"]);
    const active = joinValues(row.active, row["액티브"]);
    const floor = textOf(row.floor || row["층"]);
    const area = textOf(row.area || row["구역"] || row.source || row["획득처"]);
    return {
      id: `essence-${monster}-${index}`,
      kind: "essence",
      typeLabel: "정수",
      title: monster,
      summary: [stats, passive, active].filter(Boolean).join(" · ") || "정수 상세 정보를 확인하세요.",
      detail: [floor, area].filter(Boolean).join(" · "),
      href: `./essences.html?search=${encodeURIComponent(monster)}`,
      tags: buildTags([stats, passive, active, floor, area, "정수"]),
    };
  });
}

function getNumberItems() {
  return (communityData["넘버스"] || []).map((row, index) => {
    const number = textOf(row.number || row.no || row["번호"] || row["NO"] || "미확인");
    const name = textOf(row.name || row["이름"] || `넘버스 ${number}`);
    const effect = joinValues(row.effect, row["효과"], row.description);
    const part = textOf(row.part || row["착용부위"]);
    const source = joinValues(row.source, row.sources, row["획득처"]);
    return {
      id: `number-${number}-${name}-${index}`,
      kind: "number",
      typeLabel: "넘버스",
      title: `NO.${number} ${name}`,
      summary: effect || "넘버스 상세 정보를 확인하세요.",
      detail: [part, source].filter(Boolean).join(" · "),
      href: `./numbers.html?search=${encodeURIComponent(number === "미확인" ? name : number)}`,
      tags: buildTags([effect, part, source, "넘버스"]),
    };
  });
}

async function loadRemoteItems() {
  const [guides, builds] = await Promise.all([fetchGuides(), fetchBuilds()]);
  return [...guides, ...builds];
}

async function fetchGuides() {
  const rows = await restSelect(config.guideTable || "guide_posts", "id,title,author,created_at,content,media", "order=created_at.desc&limit=80");
  return rows
    .filter((row) => !isGuideMeta(row))
    .map((row) => {
      const parsed = parseGuideTitle(row.title);
      return {
        id: `guide-${row.id}`,
        kind: "guide",
        typeLabel: "게시판",
        title: parsed.title || "제목 없는 글",
        summary: stripHtml(textOf(row.content)).slice(0, 140) || "게시글 내용을 확인하세요.",
        detail: [parsed.category, row.author, formatDate(row.created_at)].filter(Boolean).join(" · "),
        href: `./guides.html?post=${encodeURIComponent(row.id)}`,
        tags: buildTags([parsed.category, row.title, row.content, "게시판", "공략"]),
        createdAt: row.created_at,
      };
    });
}

async function fetchBuilds() {
  const rows = await restSelect(config.buildTable || "builds", "id,title,author,created_at,members", "order=created_at.desc&limit=80");
  return rows
    .filter((row) => !isBuildMeta(row))
    .map((row) => {
      const members = Array.isArray(row.members) ? row.members : parseMaybeJson(row.members);
      const text = [row.title, row.author, JSON.stringify(members)].join(" ");
      const build = {
        id: row.id,
        title: textOf(row.title || "이름 없는 빌드"),
        author: textOf(row.author),
        members,
        createdAt: row.created_at,
      };
      return {
        id: `build-${row.id}`,
        kind: "build",
        typeLabel: "빌드",
        title: build.title,
        summary: summarizeBuildPayload(members),
        detail: [row.author, extractHashTags(text).join(" ")].filter(Boolean).join(" · "),
        href: `./builds.html?build=${encodeURIComponent(encodeBuildForUrl(build))}`,
        tags: buildTags([text, "빌드", ...extractHashTags(text)]),
        createdAt: row.created_at,
      };
    });
}

async function fetchReportUpdates() {
  const rows = await restSelect(config.reportTable || "monster_reports", "*", "order=updated_at.desc&limit=30");
  return rows
    .filter((row) => textOf(row.status) === "approved")
    .slice(0, 10)
    .map((row) => {
      const type = textOf(row.type).includes("number") ? "넘버스" : "정수";
      const title = textOf(row.monster || row.name || "정보");
      return {
        date: formatDate(row.updated_at || row.created_at),
        title: `${type} 정보 반영 · ${title}`,
        text: `${textOf(row.nickname || "사용자")}님의 제보가 승인되어 도감 정보에 반영되었습니다.`,
        href: type === "넘버스" ? `./numbers.html?search=${encodeURIComponent(title)}` : `./essences.html?search=${encodeURIComponent(title)}`,
        tag: "제보",
      };
    });
}

async function renderAlerts(alertsBox) {
  if (!alertsBox) return;
  const nickname = await getCurrentNickname();
  if (!nickname) {
    alertsBox.innerHTML = `<div class="community-empty">로그인 후 닉네임을 설정하면 내 글에 달린 댓글 알림을 확인할 수 있습니다.</div>`;
    return;
  }

  const rows = await restSelect(config.guideTable || "guide_posts", "id,title,author,content,created_at", "order=created_at.desc&limit=120").catch(() => []);
  const posts = rows.filter((row) => !isGuideMeta(row) && textOf(row.author) === nickname);
  const postIds = new Set(posts.map((row) => textOf(row.id)));
  const comments = rows
    .filter((row) => textOf(row.title).startsWith("__guide_comment__:"))
    .filter((row) => postIds.has(textOf(row.title).replace("__guide_comment__:", "")))
    .slice(0, 12);

  alertsBox.innerHTML = comments.length
    ? comments.map((row) => {
        const targetId = textOf(row.title).replace("__guide_comment__:", "");
        const post = posts.find((item) => textOf(item.id) === targetId);
        const item = {
          id: `alert-${row.id}`,
          title: `${post?.title || "내 게시글"}에 댓글`,
          summary: stripHtml(row.content).slice(0, 120),
          detail: [row.author, formatDate(row.created_at)].filter(Boolean).join(" · "),
          href: `./guides.html?post=${encodeURIComponent(targetId)}`,
          typeLabel: "알림",
          tags: [],
        };
        return renderSearchCard(item, false);
      }).join("")
    : `<div class="community-empty">아직 새 알림이 없습니다. 내 글에 댓글이 달리면 이곳에 모입니다.</div>`;
}

function renderSearchCard(item, withActions = true) {
  const encoded = encodeURIComponent(JSON.stringify(item));
  return `
    <article class="community-result-card">
      <div class="community-result-main">
        <span class="community-type">${escapeHtml(item.typeLabel || item.kind || "정보")}</span>
        <h3><a href="${escapeAttr(item.href || "#")}">${escapeHtml(item.title)}</a></h3>
        <p>${escapeHtml(item.summary || "")}</p>
        ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
      </div>
      ${
        withActions
          ? `<div class="community-result-actions">
              <button type="button" data-save-favorite="${encoded}">즐겨찾기</button>
              <button type="button" data-save-compare="${encoded}">비교함</button>
            </div>`
          : ""
      }
    </article>
  `;
}

function renderLibraryList(box, rows, mode) {
  if (!box) return;
  box.innerHTML = rows.length
    ? rows.map((item) => `
      <article class="community-result-card">
        <div class="community-result-main">
          <span class="community-type">${escapeHtml(item.typeLabel || item.kind || "정보")}</span>
          <h3><a href="${escapeAttr(item.href || "#")}">${escapeHtml(item.title)}</a></h3>
          <p>${escapeHtml(item.summary || "")}</p>
          ${item.detail ? `<small>${escapeHtml(item.detail)}</small>` : ""}
        </div>
        <div class="community-result-actions">
          <button type="button" data-remove-store="${mode}" data-remove-id="${escapeAttr(item.id)}">삭제</button>
        </div>
      </article>
    `).join("")
    : `<div class="community-empty">${mode === "favorite" ? "즐겨찾기한 정보" : "비교함에 담은 정보"}가 없습니다. 통합 검색에서 필요한 항목을 담아보세요.</div>`;
}

function renderUpdateCard(update) {
  return `
    <article class="community-timeline-card">
      <span>${escapeHtml(update.date || "")}</span>
      <strong>${escapeHtml(update.title || "")}</strong>
      <p>${escapeHtml(update.text || "")}</p>
      <a href="${escapeAttr(update.href || "#")}">${escapeHtml(update.tag || "확인")} 보기</a>
    </article>
  `;
}

function wireSaveButtons() {
  document.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-save-favorite]");
    const compareButton = event.target.closest("[data-save-compare]");
    const removeButton = event.target.closest("[data-remove-store]");
    if (favoriteButton) {
      saveItem(storeKeys.favorites, favoriteButton.dataset.saveFavorite);
      flashButton(favoriteButton, "저장됨");
    }
    if (compareButton) {
      saveItem(storeKeys.compare, compareButton.dataset.saveCompare);
      flashButton(compareButton, "담김");
    }
    if (removeButton) {
      removeItem(removeButton.dataset.removeStore === "favorite" ? storeKeys.favorites : storeKeys.compare, removeButton.dataset.removeId);
      initLibrary();
    }
  });
}

function saveItem(key, encoded) {
  const item = parseMaybeJson(decodeURIComponent(encoded || ""));
  if (!item.id) return;
  const rows = getStore(key).filter((row) => row.id !== item.id);
  rows.unshift({ ...item, savedAt: new Date().toISOString() });
  setStore(key, rows.slice(0, 80));
}

function removeItem(key, id) {
  setStore(key, getStore(key).filter((row) => row.id !== id));
}

async function restSelect(table, select, query = "") {
  const url = textOf(config.supabaseUrl).replace(/\/$/, "");
  const key = textOf(config.supabaseAnonKey);
  if (!url || !key || !table) return [];
  const endpoint = `${url}/rest/v1/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}${query ? `&${query}` : ""}`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) return [];
  return response.json();
}

async function getCurrentNickname() {
  if (window.DUKHUBUSTERS_AUTH?.getDisplayName) {
    const nickname = textOf(window.DUKHUBUSTERS_AUTH.getDisplayName());
    if (nickname) return nickname;
  }
  return localStorage.getItem("dukhubusters.authNickname") || "";
}

function getStore(key) {
  return parseMaybeJson(localStorage.getItem(key) || "[]");
}

function setStore(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function parseMaybeJson(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function isGuideMeta(row) {
  const title = textOf(row.title);
  return title.startsWith("__guide_comment__:") || title.startsWith("__guide_like__:") || title.startsWith("__guide_report__:");
}

function isBuildMeta(row) {
  const title = textOf(row.title);
  return title.startsWith("__visitor_") || title.startsWith("__session_time__") || title.startsWith("__build_like__") || title.startsWith("__build_deleted__") || title.startsWith("__build_review__") || title.startsWith("__build_report__");
}

function summarizeBuildPayload(payload) {
  const text = JSON.stringify(payload);
  const characters = Array.isArray(payload) ? payload.length : text.match(/"character"/g)?.length || 0;
  const tags = extractHashTags(text).slice(0, 4).join(" ");
  return [characters ? `캐릭터 ${characters}명 구성` : "공개 빌드", tags].filter(Boolean).join(" · ");
}

function parseGuideTitle(value) {
  const title = textOf(value);
  const match = title.match(/^\[(일반|질문|보스|파밍|빌드|정보)\]\s*/);
  return {
    category: match ? match[1] : "일반",
    title: match ? title.slice(match[0].length) : title,
  };
}

function encodeBuildForUrl(build) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(build))));
  } catch {
    return "";
  }
}

function extractHashTags(text) {
  return Array.from(new Set(textOf(text).match(/#[가-힣A-Za-z0-9_-]+/g) || []));
}

function buildTags(values) {
  const text = normalizeText(Array.isArray(values) ? values.join(" ") : values);
  const tags = [];
  [
    "물리 피해",
    "경직",
    "방어력 관통",
    "빙결",
    "화염",
    "암흑",
    "번개",
    "감전",
    "시야",
    "스태미나",
    "받는 피해",
    "항해",
    "보스",
    "파밍",
    "초보",
  ].forEach((tag) => {
    if (text.includes(normalizeText(tag))) tags.push(tag);
  });
  return tags;
}

function joinValues(...values) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map(textOf)
    .filter(Boolean)
    .join(" · ");
}

function textOf(value) {
  return value == null ? "" : String(value).trim();
}

function normalizeText(value) {
  return textOf(value).toLowerCase().replace(/\s+/g, " ");
}

function stripHtml(value) {
  const div = document.createElement("div");
  div.innerHTML = value || "";
  return div.textContent || div.innerText || "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return textOf(value).slice(0, 10);
  return date.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function flashButton(button, label) {
  const original = button.textContent;
  button.textContent = label;
  button.disabled = true;
  setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 900);
}

function escapeHtml(value) {
  return textOf(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
