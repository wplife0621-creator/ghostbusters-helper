const data = window.GHOST_DATA || {};

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
};

const essenceRows = data["정수"] || [];
const statNoneLabel = "스탯 선택 안 함";

function textOf(value) {
  return String(value ?? "").trim();
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
  select.innerHTML = [allLabel, ...values]
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
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
  optionList(els.floor, unique(essenceRows.map((row) => row["층"])), "전체 층");
  optionList(els.area, unique(essenceRows.map((row) => row["구역"])), "전체 구역");
  optionList(els.character, unique(essenceRows.map((row) => row["추천 캐릭터"])), "전체 캐릭터");
  optionList(els.statSort, statNames(), statNoneLabel);
  renderStatChips();

  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
}

function selectedStatName() {
  return els.statSort.value;
}

function hasStatSort() {
  return selectedStatName() !== statNoneLabel;
}

function renderStatChips() {
  const names = statNames();
  els.statChips.innerHTML = [
    `<button type="button" class="stat-chip is-active" data-stat="${escapeHtml(statNoneLabel)}">${escapeHtml(statNoneLabel)}</button>`,
    ...names.map((name) => `<button type="button" class="stat-chip" data-stat="${escapeHtml(name)}">${escapeHtml(name)} ↕</button>`),
  ].join("");

  els.statChips.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-stat]");
    if (!button) return;
    els.statSort.value = button.dataset.stat;
    render();
  });
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
