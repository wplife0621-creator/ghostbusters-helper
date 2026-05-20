const data = window.GHOST_DATA || {};

const els = {
  summary: document.querySelector("#summary"),
  search: document.querySelector("#searchInput"),
  type: document.querySelector("#typeFilter"),
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
  tabs: document.querySelectorAll(".tab"),
};

const types = ["전체", "정수", "넘버스", "미샤", "균열", "스탯", "각인"];
const essenceRows = data["정수"] || [];
const statNoneLabel = "스탯 선택 안 함";
let currentView = "all";
let statSortDirection = "desc";

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

function excludedStatName(name) {
  const normalized = cleanStatName(name).toLowerCase();
  return normalized === "경험치" || normalized === "hp";
}

function statValue(row, statName) {
  if (!statName || statName === "스탯 선택 안 함") return 0;
  const parts = textOf(row["주요 스탯"]).split(",");
  for (const part of parts) {
    const match = part.trim().match(/^(.+?)\s+(-?\d+)/);
    if (match && cleanStatName(match[1]) === statName) return Number(match[2]);
  }
  return 0;
}

function init() {
  optionList(els.type, types.slice(1), "전체");
  optionList(els.floor, unique(Object.values(data).flat().map((row) => row["층"])), "전체 층");
  optionList(els.area, unique(essenceRows.map((row) => row["구역"])), "전체 구역");
  optionList(els.character, unique(essenceRows.map((row) => row["추천 캐릭터"])), "전체 캐릭터");
  optionList(els.statSort, statNames(), statNoneLabel);
  renderStatChips();

  els.summary.innerHTML = Object.entries(data)
    .map(([name, rows]) => `<span>${name} ${rows.length}</span>`)
    .join("");

  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  els.statSort.addEventListener("change", () => {
    statSortDirection = "desc";
    render();
  });

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      currentView = tab.dataset.view;
      els.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      document.body.dataset.view = currentView;
      render();
    });
  });

  document.body.dataset.view = currentView;
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

    const nextStat = button.dataset.stat;
    if (selectedStatName() === nextStat && nextStat !== statNoneLabel) {
      statSortDirection = statSortDirection === "desc" ? "asc" : "desc";
    } else {
      statSortDirection = "desc";
    }

    els.statSort.value = nextStat;
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
      const marker = isActive ? (statSortDirection === "desc" ? " ↓" : " ↑") : " ↕";
      button.textContent = `${button.dataset.stat}${marker}`;
    }
  });

  els.statSortSummary.textContent = hasStatSort()
    ? `${activeStat} ${statSortDirection === "desc" ? "높은 순" : "낮은 순"}으로 정렬 중`
    : "스탯을 누르면 높은 순으로 정렬됩니다.";
}

function collectRows() {
  if (currentView === "essence") return collectEssenceRows();

  const selectedType = els.type.value;
  const groups = selectedType === "전체"
    ? Object.entries(data).filter(([name]) => types.includes(name))
    : [[selectedType, data[selectedType] || []]];

  let rows = groups.flatMap(([type, rows]) => rows.map((row) => ({ type, row })));
  rows = applyCommonFilters(rows);
  return sortRows(rows);
}

function collectEssenceRows() {
  let rows = essenceRows.map((row) => ({ type: "정수", row }));
  rows = applyCommonFilters(rows);

  if (els.area.value !== "전체 구역") {
    rows = rows.filter(({ row }) => textOf(row["구역"]) === els.area.value);
  }

  return sortEssenceRows(rows);
}

function applyCommonFilters(rows) {
  const query = textOf(els.search.value).toLowerCase();
  const floor = els.floor.value;
  const character = els.character.value;

  if (floor !== "전체 층") {
    rows = rows.filter(({ row }) => textOf(row["층"]) === floor);
  }

  if (character !== "전체 캐릭터") {
    rows = rows.filter(({ row }) => textOf(row["추천 캐릭터"]) === character);
  }

  if (query) {
    rows = rows.filter(({ type, row }) => {
      const haystack = [type, ...Object.values(row)].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  return rows;
}

function sortRows(rows) {
  const mode = els.sort.value;
  const copy = [...rows];

  if (mode === "grade") {
    return copy.sort((a, b) => numberFrom(a.row["등급"]) - numberFrom(b.row["등급"]));
  }

  if (mode === "cooldown") {
    return copy.sort((a, b) => cooldownOf(a.row) - cooldownOf(b.row));
  }

  if (mode === "cost") {
    return copy.sort((a, b) => numberFrom(a.row["비용"]) - numberFrom(b.row["비용"]));
  }

  return copy;
}

function sortEssenceRows(rows) {
  const statName = selectedStatName();
  const mode = els.sort.value;
  const filteredRows = hasStatSort()
    ? rows.filter(({ row }) => statValue(row, statName) !== 0)
    : rows;
  const copy = sortRows(filteredRows);

  if (hasStatSort()) {
    return copy.sort((a, b) => {
      const statDiff = statSortDirection === "desc"
        ? statValue(b.row, statName) - statValue(a.row, statName)
        : statValue(a.row, statName) - statValue(b.row, statName);
      if (statDiff) return statDiff;
      return floorAreaMonsterSort(a, b);
    });
  }

  if (mode === "default") {
    return copy.sort(floorAreaMonsterSort);
  }

  return copy;
}

function floorAreaMonsterSort(a, b) {
  return floorRank(a.row["층"]) - floorRank(b.row["층"])
    || textOf(a.row["층"]).localeCompare(textOf(b.row["층"]), "ko")
    || textOf(a.row["구역"]).localeCompare(textOf(b.row["구역"]), "ko")
    || textOf(a.row["몬스터"]).localeCompare(textOf(b.row["몬스터"]), "ko");
}

function render() {
  const rows = collectRows();
  updateStatSortUi();
  els.resultTitle.textContent = currentView === "essence" ? "정수 목록" : "검색 결과";
  els.resultCount.textContent = `${rows.length}건`;
  els.results.className = currentView === "essence" ? "essence-results" : "results";
  els.results.innerHTML = rows.length
    ? currentView === "essence"
      ? essenceTemplate(rows)
      : rows.slice(0, 120).map(cardTemplate).join("")
    : `<div class="empty">검색 결과가 없습니다. 필터를 조금 넓혀보세요.</div>`;

  renderTime();
}

function essenceTemplate(rows) {
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
        <div class="essence-table-wrap">
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
        </div>
      </section>
    `;
  }).join("");
}

function essenceRowTemplate(row) {
  const activeStat = hasStatSort() ? selectedStatName() : "";
  const highlightValue = activeStat ? statValue(row, activeStat) : 0;
  return `
    <tr>
      <td>
        <strong class="monster-name">${escapeHtml(row["몬스터"])}</strong>
        <span class="mobile-meta">${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])}</span>
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

function cardTemplate({ type, row }) {
  const title = titleFor(type, row);
  const detail = detailFor(type, row);
  const meta = metaFor(type, row);
  const statMeta = currentView === "essence" && type === "정수" && hasStatSort()
    ? [`${selectedStatName()} ${statValue(row, selectedStatName())}`]
    : [];

  return `
    <article class="card">
      <div class="card-head">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <span class="badge">${escapeHtml(type)}</span>
      </div>
      <div class="meta">${[...meta, ...statMeta].map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      <p class="detail">${detail}</p>
    </article>
  `;
}

function titleFor(type, row) {
  if (type === "정수") return row["몬스터"];
  if (type === "넘버스") return `${row["번호"]} ${row["이름"]}`;
  if (type === "미샤") return row["이름"];
  if (type === "균열") return row["균열"] || "균열 없음";
  if (type === "스탯") return row["이름"];
  if (type === "각인") return row["각인"];
  return Object.values(row).find(Boolean) || type;
}

function metaFor(type, row) {
  if (type === "정수") return [row["층"], row["구역"], row["등급"], row["추천 캐릭터"]].filter(Boolean);
  if (type === "넘버스") return [`Lv ${row["아이템 레벨(Lv)"]}`];
  if (type === "균열") return [row["층"], row["구역"]].filter(Boolean);
  if (type === "스탯") return [row["육체"]].filter(Boolean);
  if (type === "각인") return [`비용 ${Number(row["비용"] || 0).toLocaleString("ko-KR")}`];
  return [];
}

function detailFor(type, row) {
  if (type === "정수") {
    return [
      line("주요 스탯", row["주요 스탯"]),
      line("패시브", row["패시브"]),
      line("액티브", row["액티브"]),
    ].join("\n");
  }

  if (type === "넘버스") return line("효과", row["효과"]);
  if (type === "미샤") return [line("설명", row["설명"]), line("능력치", row["능력치"]), line("스킬", row["스킬"])].join("\n");
  if (type === "균열") return `${row["층"]} ${row["구역"]}에서 연결`;
  if (type === "스탯") return line("설명", row["설명"]);
  if (type === "각인") return line("능력치", row["능력치"] || "미기록");
  return Object.values(row).map(escapeHtml).join("\n");
}

function line(label, value) {
  return `<span class="label">${escapeHtml(label)}</span> ${escapeHtml(value || "-")}`;
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
