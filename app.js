const data = window.GHOST_DATA || {};

const storageKeys = {
  pending: "dukhubusters.pendingReports",
  approved: "dukhubusters.approvedReports",
  adminUnlocked: "dukhubusters.adminUnlocked",
  builds: "dukhubusters.sharedBuilds",
};

const adminCode = "0621";

const els = {
  search: document.querySelector("#searchInput"),
  floor: document.querySelector("#floorFilter"),
  area: document.querySelector("#areaFilter"),
  character: document.querySelector("#characterFilter"),
  sort: document.querySelector("#sortFilter"),
  statSort: document.querySelector("#statSortFilter"),
  statChips: document.querySelector("#statChips"),
  statSortSummary: document.querySelector("#statSortSummary"),
  results: document.querySelector("#results"),
  resultTitle: document.querySelector("#resultTitle"),
  resultCount: document.querySelector("#resultCount"),
  gameDays: document.querySelector("#gameDays"),
  gameHours: document.querySelector("#gameHours"),
  timeResult: document.querySelector("#timeResult"),
  reportForm: document.querySelector("#reportForm"),
  reportMode: document.querySelector("#reportMode"),
  reportMonster: document.querySelector("#reportMonster"),
  reportGrade: document.querySelector("#reportGrade"),
  reportFloor: document.querySelector("#reportFloor"),
  reportArea: document.querySelector("#reportArea"),
  reportStats: document.querySelector("#reportStats"),
  reportPassive: document.querySelector("#reportPassive"),
  reportActive: document.querySelector("#reportActive"),
  monsterOptions: document.querySelector("#monsterOptions"),
  editMonsterMatches: document.querySelector("#editMonsterMatches"),
  pendingCount: document.querySelector("#pendingCount"),
  pendingReports: document.querySelector("#pendingReports"),
  copyApproved: document.querySelector("#copyApproved"),
  adminCodeInput: document.querySelector("#adminCodeInput"),
  adminUnlock: document.querySelector("#adminUnlock"),
  adminLock: document.querySelector("#adminLock"),
  adminStatus: document.querySelector("#adminStatus"),
  buildForm: document.querySelector("#buildForm"),
  buildTitle: document.querySelector("#buildTitle"),
  buildAuthor: document.querySelector("#buildAuthor"),
  buildCharacter: document.querySelector("#buildCharacter"),
  buildLevel: document.querySelector("#buildLevel"),
  buildEssenceSlots: document.querySelector("#buildEssenceSlots"),
  buildNote: document.querySelector("#buildNote"),
  buildCount: document.querySelector("#buildCount"),
  copyCurrentBuild: document.querySelector("#copyCurrentBuild"),
  sharedBuildView: document.querySelector("#sharedBuildView"),
  buildList: document.querySelector("#buildList"),
};

let approvedReports = loadStoredRows(storageKeys.approved);
let pendingReports = loadStoredRows(storageKeys.pending);
let savedBuilds = loadStoredRows(storageKeys.builds);
let essenceRows = mergeApprovedRows(data["정수"] || [], approvedReports);
let adminUnlocked = localStorage.getItem(storageKeys.adminUnlocked) === "1";
const statNoneLabel = "스탯 선택 안 함";

function textOf(value) {
  return String(value ?? "").trim();
}

function loadStoredRows(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredRows(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function mergeApprovedRows(baseRows, approvedRows) {
  const merged = [...baseRows];
  approvedRows.forEach((row) => {
    const monster = textOf(row["몬스터"]);
    const index = merged.findIndex((item) => textOf(item["몬스터"]) === monster);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...row };
    } else {
      merged.unshift(row);
    }
  });
  return merged;
}

function numberFrom(value) {
  const match = textOf(value).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Infinity;
}

function cooldownOf(row) {
  const match = textOf(row["액티브"]).match(/(\d+)\s*s/i);
  return match ? Number(match[1]) : Infinity;
}

function floorRank(value) {
  const match = textOf(value).match(/\d+/);
  return match ? Number(match[0]) : 999;
}

function unique(values) {
  return [...new Set(values.map(textOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function optionList(select, values, allLabel) {
  const current = select.value;
  select.innerHTML = [allLabel, ...values]
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function escapeHtml(value) {
  return textOf(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanStatName(value) {
  return textOf(value).replace(/^[[(]+|[\])]+$/g, "").trim();
}

function excludedStatName(name) {
  const normalized = cleanStatName(name).toLowerCase();
  return normalized === "경험치" || normalized === "hp";
}

function statNames() {
  const fromStatSheet = (data["스탯"] || []).map((row) => cleanStatName(row["이름"]));
  const fromEssence = essenceRows.flatMap((row) =>
    textOf(row["주요 스탯"])
      .split(",")
      .map((part) => cleanStatName(part.trim().match(/^(.+?)\s+\d+/)?.[1]))
      .filter(Boolean)
  );
  return unique([...fromStatSheet, ...fromEssence]).filter((name) => !excludedStatName(name));
}

function statValue(row, statName) {
  if (!statName || statName === statNoneLabel) return 0;
  const parts = textOf(row["주요 스탯"]).split(",");
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)\s+(-?\d+)/);
    if (match && cleanStatName(match[1]) === statName) return Number(match[2]);
  }
  return 0;
}

function init() {
  if (els.search) initHome();
  if (els.reportForm) initReport();
  if (els.buildForm) initBuilds();
}

function initHome() {
  refreshControls();
  renderStatChips();

  document.querySelectorAll(".compact-layout input, .compact-layout select").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
}

function initReport() {
  fillMonsterOptions();
  updateReportMode();
  els.reportMode.addEventListener("change", updateReportMode);
  els.reportMonster.addEventListener("input", handleReportMonsterInput);
  els.editMonsterMatches.addEventListener("click", handleEditMonsterClick);
  els.reportForm.addEventListener("submit", submitReport);
  els.pendingReports.addEventListener("click", handlePendingAction);
  els.copyApproved.addEventListener("click", copyApprovedRows);
  els.adminUnlock.addEventListener("click", unlockAdmin);
  els.adminLock.addEventListener("click", lockAdmin);
  els.adminCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockAdmin();
  });
  updateAdminUi();
  renderPendingReports();
}

function initBuilds() {
  renderBuildSlots();
  loadBuildFromUrl();
  els.buildLevel.addEventListener("change", renderBuildSlots);
  els.buildForm.addEventListener("submit", submitBuild);
  els.copyCurrentBuild.addEventListener("click", copyCurrentBuildLink);
  els.buildList.addEventListener("click", handleBuildListClick);
  renderBuilds();
}

function essenceOptionList() {
  return unique(essenceRows.map((row) => row["몬스터"]));
}

function renderBuildSlots() {
  const oldValues = [...els.buildEssenceSlots.querySelectorAll("select")].map((select) => select.value);
  const level = Number(els.buildLevel.value || 1);
  const options = essenceOptionList()
    .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join("");
  els.buildEssenceSlots.innerHTML = Array.from({ length: level }, (_, index) => `
    <label class="field">
      <span>정수 ${index + 1}</span>
      <select class="build-essence-select" required>
        <option value="">정수 선택</option>
        ${options}
      </select>
    </label>
  `).join("");
  els.buildEssenceSlots.querySelectorAll("select").forEach((select, index) => {
    if (oldValues[index]) select.value = oldValues[index];
  });
}

function readBuildForm() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: textOf(els.buildTitle.value),
    author: textOf(els.buildAuthor.value) || "익명",
    character: els.buildCharacter.value,
    level: Number(els.buildLevel.value || 1),
    essences: [...els.buildEssenceSlots.querySelectorAll("select")].map((select) => select.value).filter(Boolean),
    note: textOf(els.buildNote.value),
    createdAt: new Date().toISOString(),
  };
}

function submitBuild(event) {
  event.preventDefault();
  const build = readBuildForm();
  if (build.essences.length !== build.level) return;
  savedBuilds.unshift(build);
  saveStoredRows(storageKeys.builds, savedBuilds);
  els.buildForm.reset();
  renderBuildSlots();
  renderBuilds();
}

function applyBuildToForm(build) {
  if (!build) return;
  els.buildTitle.value = build.title || "";
  els.buildAuthor.value = build.author || "";
  els.buildCharacter.value = build.character || "비요른";
  els.buildLevel.value = String(build.level || 1);
  renderBuildSlots();
  els.buildEssenceSlots.querySelectorAll("select").forEach((select, index) => {
    select.value = build.essences?.[index] || "";
  });
  els.buildNote.value = build.note || "";
}

function loadBuildFromUrl() {
  const params = new URLSearchParams(location.search);
  const encoded = params.get("build");
  if (!encoded) return;
  const build = decodeBuild(encoded);
  if (!build) return;
  applyBuildToForm(build);
  els.sharedBuildView.innerHTML = buildCard(build, true);
}

function encodeBuild(build) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(build))));
  } catch {
    return "";
  }
}

function decodeBuild(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

function shareUrlForBuild(build) {
  const url = new URL(location.href);
  url.pathname = url.pathname.replace(/[^/]*$/, "builds.html");
  url.search = `?build=${encodeBuild(build)}`;
  return url.toString();
}

async function copyText(text, button, defaultText) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사 완료";
  } catch {
    button.textContent = "복사 실패";
  }
  setTimeout(() => {
    button.textContent = defaultText;
  }, 1500);
}

function copyCurrentBuildLink() {
  const build = readBuildForm();
  copyText(shareUrlForBuild(build), els.copyCurrentBuild, "현재 빌드 공유 링크 복사");
}

function handleBuildListClick(event) {
  const button = event.target.closest("button[data-build-action]");
  if (!button) return;
  const build = savedBuilds.find((item) => item.id === button.closest("[data-build-id]")?.dataset.buildId);
  if (!build) return;
  if (button.dataset.buildAction === "share") {
    copyText(shareUrlForBuild(build), button, "공유 링크 복사");
  }
  if (button.dataset.buildAction === "load") {
    applyBuildToForm(build);
  }
}

function renderBuilds() {
  els.buildCount.textContent = `등록된 빌드 ${savedBuilds.length}개`;
  els.buildList.innerHTML = savedBuilds.length
    ? savedBuilds.map((build) => buildCard(build, false)).join("")
    : `<div class="empty compact-empty">등록된 빌드가 없습니다.</div>`;
}

function buildCard(build, shared) {
  return `
    <article class="build-card" data-build-id="${escapeHtml(build.id || "")}">
      <div class="build-card-head">
        <div>
          <strong>${escapeHtml(build.title || "이름 없는 빌드")}</strong>
          <span>${escapeHtml(build.character)} · ${escapeHtml(build.level)}레벨 · ${escapeHtml(build.author || "익명")}</span>
        </div>
        ${shared ? `<span class="grade-pill">공유 빌드</span>` : ""}
      </div>
      <div class="build-essence-list">
        ${(build.essences || []).map((name, index) => `<span>${index + 1}. ${escapeHtml(name)}</span>`).join("")}
      </div>
      ${build.note ? `<p>${escapeHtml(build.note)}</p>` : ""}
      ${shared ? "" : `
        <div class="pending-actions">
          <button type="button" data-build-action="share">공유 링크 복사</button>
          <button type="button" data-build-action="load">불러오기</button>
        </div>
      `}
    </article>
  `;
}

function unlockAdmin() {
  if (textOf(els.adminCodeInput.value) !== adminCode) {
    els.adminStatus.textContent = "관리자 코드가 맞지 않습니다.";
    return;
  }
  adminUnlocked = true;
  localStorage.setItem(storageKeys.adminUnlocked, "1");
  els.adminCodeInput.value = "";
  updateAdminUi();
  renderPendingReports();
}

function lockAdmin() {
  adminUnlocked = false;
  localStorage.removeItem(storageKeys.adminUnlocked);
  updateAdminUi();
  renderPendingReports();
}

function updateAdminUi() {
  els.adminStatus.textContent = adminUnlocked
    ? "관리자 모드가 열려 있습니다. 검수 승인과 반려가 가능합니다."
    : "관리자 모드가 잠겨 있습니다.";
  els.adminUnlock.hidden = adminUnlocked;
  els.adminLock.hidden = !adminUnlocked;
  els.adminCodeInput.disabled = adminUnlocked;
  els.copyApproved.hidden = !adminUnlocked;
}

function fillMonsterOptions() {
  els.monsterOptions.innerHTML = unique(essenceRows.map((row) => row["몬스터"]))
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function updateReportMode() {
  const editMode = els.reportMode.value === "edit";
  els.reportMonster.placeholder = editMode ? "수정할 몬스터명을 검색하세요" : "예: 얼음 와이번";
  els.editMonsterMatches.hidden = !editMode;
  if (editMode) {
    renderEditMonsterMatches();
    fillReportFromExactMonster();
  } else {
    els.editMonsterMatches.innerHTML = "";
    els.editMonsterMatches.hidden = true;
  }
}

function handleReportMonsterInput() {
  if (els.reportMode.value !== "edit") return;
  renderEditMonsterMatches();
  fillReportFromExactMonster();
}

function handleEditMonsterClick(event) {
  const button = event.target.closest("button[data-monster]");
  if (!button) return;
  fillReportFromRow(findMonsterRow(button.dataset.monster));
}

function findMonsterRow(monsterName) {
  const target = textOf(monsterName).toLowerCase();
  return essenceRows.find((row) => textOf(row["몬스터"]).toLowerCase() === target);
}

function fillReportFromExactMonster() {
  const row = findMonsterRow(els.reportMonster.value);
  if (row) fillReportFromRow(row);
}

function fillReportFromRow(row) {
  if (!row) return;
  els.reportMonster.value = textOf(row["몬스터"]);
  els.reportGrade.value = textOf(row["등급"]);
  els.reportFloor.value = textOf(row["층"]);
  els.reportArea.value = textOf(row["구역"]);
  els.reportStats.value = textOf(row["주요 스탯"]);
  els.reportPassive.value = textOf(row["패시브"]);
  els.reportActive.value = textOf(row["액티브"]);
  renderEditMonsterMatches();
}

function renderEditMonsterMatches() {
  const query = textOf(els.reportMonster.value).toLowerCase();
  const rows = essenceRows
    .filter((row) => {
      if (!query) return true;
      return textOf(row["몬스터"]).toLowerCase().includes(query)
        || textOf(row["층"]).toLowerCase().includes(query)
        || textOf(row["구역"]).toLowerCase().includes(query);
    })
    .slice(0, 8);

  els.editMonsterMatches.hidden = els.reportMode.value !== "edit";
  els.editMonsterMatches.innerHTML = rows.length
    ? rows.map((row) => `
      <button type="button" data-monster="${escapeHtml(row["몬스터"])}">
        <strong>${escapeHtml(row["몬스터"])}</strong>
        <span>${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])} · ${escapeHtml(row["등급"] || "-")}</span>
      </button>
    `).join("")
    : `<div class="edit-match-empty">일치하는 몬스터가 없습니다.</div>`;
}

function refreshControls() {
  optionList(els.floor, unique(essenceRows.map((row) => row["층"])), "전체 층");
  optionList(els.area, unique(essenceRows.map((row) => row["구역"])), "전체 구역");
  optionList(els.character, unique(essenceRows.map((row) => row["추천 캐릭터"])), "전체 캐릭터");
  optionList(els.statSort, statNames(), statNoneLabel);
}

function selectedStatName() {
  return els.statSort.value;
}

function hasStatSort() {
  return selectedStatName() !== statNoneLabel;
}

function renderStatChips() {
  const active = selectedStatName() || statNoneLabel;
  els.statChips.innerHTML = [
    `<button type="button" class="stat-chip" data-stat="${escapeHtml(statNoneLabel)}">${escapeHtml(statNoneLabel)}</button>`,
    ...statNames().map((name) => `<button type="button" class="stat-chip" data-stat="${escapeHtml(name)}">${escapeHtml(name)} ↕</button>`),
  ].join("");
  els.statSort.value = active;

  els.statChips.onclick = (event) => {
    const button = event.target.closest("button[data-stat]");
    if (!button) return;
    els.statSort.value = button.dataset.stat;
    render();
  };
}

function updateStatSortUi() {
  const activeStat = selectedStatName();
  els.statChips.querySelectorAll("button[data-stat]").forEach((button) => {
    const isActive = button.dataset.stat === activeStat;
    button.classList.toggle("is-active", isActive);
    if (button.dataset.stat === statNoneLabel) {
      button.textContent = statNoneLabel;
    } else {
      button.textContent = `${button.dataset.stat}${isActive ? " ↓" : " ↕"}`;
    }
  });

  els.statSortSummary.textContent = hasStatSort()
    ? `${activeStat} 높은 순으로 정렬 중`
    : "스탯을 누르면 높은 순으로 정렬됩니다.";
}

function collectEssenceRows() {
  let rows = essenceRows.map((row) => ({ type: "정수", row }));
  rows = applyFilters(rows);
  return sortEssenceRows(rows);
}

function applyFilters(rows) {
  const query = textOf(els.search.value).toLowerCase();

  if (els.floor.value !== "전체 층") {
    rows = rows.filter(({ row }) => textOf(row["층"]) === els.floor.value);
  }

  if (els.area.value !== "전체 구역") {
    rows = rows.filter(({ row }) => textOf(row["구역"]) === els.area.value);
  }

  if (els.character.value !== "전체 캐릭터") {
    rows = rows.filter(({ row }) => textOf(row["추천 캐릭터"]) === els.character.value);
  }

  if (query) {
    rows = rows.filter(({ row }) => Object.values(row).join(" ").toLowerCase().includes(query));
  }

  return rows;
}

function sortEssenceRows(rows) {
  const statName = selectedStatName();
  const mode = els.sort.value;
  const filteredRows = hasStatSort()
    ? rows.filter(({ row }) => statValue(row, statName) !== 0)
    : rows;
  const copy = [...filteredRows];

  if (hasStatSort()) {
    return copy.sort((a, b) => {
      const statDiff = statValue(b.row, statName) - statValue(a.row, statName);
      if (statDiff) return statDiff;
      return floorAreaMonsterSort(a, b);
    });
  }

  if (mode === "grade") {
    return copy.sort((a, b) => numberFrom(a.row["등급"]) - numberFrom(b.row["등급"]) || floorAreaMonsterSort(a, b));
  }

  if (mode === "cooldown") {
    return copy.sort((a, b) => cooldownOf(a.row) - cooldownOf(b.row) || floorAreaMonsterSort(a, b));
  }

  return copy.sort(floorAreaMonsterSort);
}

function floorAreaMonsterSort(a, b) {
  return floorRank(a.row["층"]) - floorRank(b.row["층"])
    || textOf(a.row["층"]).localeCompare(textOf(b.row["층"]), "ko")
    || textOf(a.row["구역"]).localeCompare(textOf(b.row["구역"]), "ko")
    || textOf(a.row["몬스터"]).localeCompare(textOf(b.row["몬스터"]), "ko");
}

function render() {
  const rows = collectEssenceRows();
  updateStatSortUi();
  els.resultTitle.textContent = hasStatSort() ? `${selectedStatName()} 정렬` : "정수 목록";
  els.resultCount.textContent = `${rows.length}건`;
  els.results.innerHTML = rows.length
    ? essenceTemplate(rows)
    : `<div class="empty">조건에 맞는 정수가 없습니다. 필터를 조금 넓혀보세요.</div>`;

  renderTime();
}

function essenceTemplate(rows) {
  if (hasStatSort()) {
    return `<div class="essence-table-wrap">${essenceTable(rows)}</div>`;
  }

  const groups = new Map();
  rows.forEach((item) => {
    const key = `${item.row["층"] || "미기록"}|${item.row["구역"] || "미기록"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return [...groups.entries()].map(([key, items]) => {
    const [floor, area] = key.split("|");
    return `
      <section class="essence-group">
        <div class="group-title">
          <h3>${escapeHtml(floor)} · ${escapeHtml(area)}</h3>
          <span>${items.length}마리</span>
        </div>
        <div class="essence-table-wrap">${essenceTable(items)}</div>
      </section>
    `;
  }).join("");
}

function essenceTable(items) {
  return `
    <table class="essence-table">
      <thead>
        <tr>
          <th>몬스터</th>
          <th>등급</th>
          <th>추천</th>
          <th>주요 스탯</th>
          <th>패시브</th>
          <th>액티브</th>
        </tr>
      </thead>
      <tbody>${items.map(({ row }) => essenceRowTemplate(row)).join("")}</tbody>
    </table>
  `;
}

function essenceRowTemplate(row) {
  const activeStat = hasStatSort() ? selectedStatName() : "";
  const highlightValue = activeStat ? statValue(row, activeStat) : 0;
  return `
    <tr>
      <td>
        <div class="monster-title-line">
          <strong class="monster-name">${escapeHtml(row["몬스터"])}</strong>
          <span class="location-pill">${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])}</span>
        </div>
      </td>
      <td><span class="grade-pill">${escapeHtml(row["등급"] || "-")}</span></td>
      <td>${row["추천 캐릭터"] ? `<span class="character-pill">${escapeHtml(row["추천 캐릭터"])}</span>` : `<span class="muted">-</span>`}</td>
      <td>
        ${activeStat ? `<div class="sorted-stat">${escapeHtml(activeStat)} ${highlightValue}</div>` : ""}
        <div class="stat-list">${statBadges(row["주요 스탯"])}</div>
      </td>
      <td class="skill-cell">${skillText(row["패시브"])}</td>
      <td class="skill-cell">${skillText(row["액티브"])}</td>
    </tr>
  `;
}

function statBadges(value) {
  return textOf(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.+?)\s+(-?\d+)/);
      if (!match) return `<span>${escapeHtml(part)}</span>`;
      return `<span><b>${escapeHtml(cleanStatName(match[1]))}</b> ${escapeHtml(match[2])}</span>`;
    })
    .join("");
}

function skillText(value) {
  const text = textOf(value) || "-";
  const [name, ...rest] = text.split(":");
  if (!rest.length) return escapeHtml(text);
  return `<b>${escapeHtml(name.trim())}</b>: ${escapeHtml(rest.join(":").trim())}`;
}

function reportToRow(report) {
  return {
    "층": report.floor,
    "구역": report.area,
    "몬스터": report.monster,
    "등급": report.grade,
    "주요 스탯": report.stats,
    "패시브": report.passive,
    "액티브": report.active,
    "추천 캐릭터": "",
    "출처": report.mode === "edit" ? "수정 승인" : "제보 승인",
    "승인일": new Date().toISOString(),
  };
}

function submitReport(event) {
  event.preventDefault();
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: els.reportMode.value,
    monster: textOf(els.reportMonster.value),
    grade: textOf(els.reportGrade.value),
    floor: textOf(els.reportFloor.value),
    area: textOf(els.reportArea.value),
    stats: textOf(els.reportStats.value),
    passive: textOf(els.reportPassive.value),
    active: textOf(els.reportActive.value),
    createdAt: new Date().toISOString(),
  };
  pendingReports.unshift(report);
  saveStoredRows(storageKeys.pending, pendingReports);
  els.reportForm.reset();
  if (els.reportMode) updateReportMode();
  if (els.search) render();
  else renderPendingReports();
}

function handlePendingAction(event) {
  if (!adminUnlocked) return;
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest("[data-report-id]")?.dataset.reportId;
  const report = pendingReports.find((item) => item.id === id);
  if (!report) return;

  pendingReports = pendingReports.filter((item) => item.id !== id);
  saveStoredRows(storageKeys.pending, pendingReports);

  if (button.dataset.action === "approve") {
    const row = reportToRow(report);
    approvedReports.unshift(row);
    saveStoredRows(storageKeys.approved, approvedReports);
    essenceRows = mergeApprovedRows(data["정수"] || [], approvedReports);
    if (els.search) {
      refreshControls();
      renderStatChips();
    }
  }

  if (els.search) render();
  else renderPendingReports();
}

function renderPendingReports() {
  els.pendingCount.textContent = `검수 대기 ${pendingReports.length}건`;
  if (!adminUnlocked) {
    els.pendingReports.innerHTML = `<div class="empty compact-empty">관리자 모드를 열면 검수 대기 목록이 표시됩니다.</div>`;
    return;
  }
  els.pendingReports.innerHTML = pendingReports.length
    ? pendingReports.map((report) => `
      <article class="pending-card" data-report-id="${escapeHtml(report.id)}">
        <div>
          <strong>${escapeHtml(report.monster)}</strong>
          <span>${report.mode === "edit" ? "수정" : "신규"} · ${escapeHtml(report.floor)} · ${escapeHtml(report.area)} · ${escapeHtml(report.grade)}</span>
        </div>
        <p><b>스탯</b> ${escapeHtml(report.stats)}</p>
        <p><b>패시브</b> ${escapeHtml(report.passive)}</p>
        <p><b>액티브</b> ${escapeHtml(report.active)}</p>
        <div class="pending-actions">
          <button type="button" data-action="approve">승인해서 추가</button>
          <button type="button" data-action="reject">반려</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty compact-empty">검수 대기 제보가 없습니다.</div>`;
}

async function copyApprovedRows() {
  if (!adminUnlocked) {
    els.copyApproved.textContent = "관리자 전용";
    setTimeout(() => {
      els.copyApproved.textContent = "승인 데이터 복사";
    }, 1500);
    return;
  }
  const text = JSON.stringify(approvedReports, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    els.copyApproved.textContent = "복사 완료";
  } catch {
    els.copyApproved.textContent = "복사 실패";
  }
  setTimeout(() => {
    els.copyApproved.textContent = "승인 데이터 복사";
  }, 1500);
}

function renderTime() {
  const days = Math.max(0, Number(els.gameDays.value || 0));
  const hours = Math.max(0, Number(els.gameHours.value || 0));
  const totalGameHours = (days * 24) + hours;
  const seconds = Math.round(totalGameHours * 4);
  els.timeResult.textContent = `현실 시간 ${formatSeconds(seconds)}`;
}

function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}시간`);
  if (minutes) parts.push(`${minutes}분`);
  parts.push(`${seconds}초`);
  return parts.join(" ");
}

init();
