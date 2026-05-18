const data = window.GHOST_DATA || {};

const els = {
  summary: document.querySelector("#summary"),
  search: document.querySelector("#searchInput"),
  type: document.querySelector("#typeFilter"),
  floor: document.querySelector("#floorFilter"),
  character: document.querySelector("#characterFilter"),
  sort: document.querySelector("#sortFilter"),
  results: document.querySelector("#results"),
  resultCount: document.querySelector("#resultCount"),
  recommendations: document.querySelector("#recommendations"),
  gameHours: document.querySelector("#gameHours"),
  timeUnit: document.querySelector("#timeUnit"),
  timeResult: document.querySelector("#timeResult"),
};

const types = ["전체", "정수", "넘버스", "미샤", "균열", "스탯", "각인"];
const essenceRows = data["정수"] || [];

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

function init() {
  optionList(els.type, types.slice(1), "전체");
  optionList(els.floor, unique(Object.values(data).flat().map((row) => row["층"])), "전체 층");
  optionList(els.character, unique(essenceRows.map((row) => row["추천 캐릭터"])), "전체 캐릭터");

  els.summary.innerHTML = Object.entries(data)
    .map(([name, rows]) => `<span>${name} ${rows.length}</span>`)
    .join("");

  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  render();
}

function collectRows() {
  const selectedType = els.type.value;
  const groups = selectedType === "전체"
    ? Object.entries(data).filter(([name]) => types.includes(name))
    : [[selectedType, data[selectedType] || []]];

  const query = textOf(els.search.value).toLowerCase();
  const floor = els.floor.value;
  const character = els.character.value;

  let rows = groups.flatMap(([type, rows]) => rows.map((row) => ({ type, row })));

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

  return sortRows(rows);
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

function render() {
  const rows = collectRows();
  els.resultCount.textContent = `${rows.length}건`;
  els.results.innerHTML = rows.length
    ? rows.slice(0, 120).map(cardTemplate).join("")
    : `<div class="empty">검색 결과가 없습니다. 필터를 조금 넓혀보세요.</div>`;

  renderRecommendations();
  renderTime();
}

function cardTemplate({ type, row }) {
  const title = titleFor(type, row);
  const detail = detailFor(type, row);
  const meta = metaFor(type, row);

  return `
    <article class="card">
      <div class="card-head">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <span class="badge">${escapeHtml(type)}</span>
      </div>
      <div class="meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
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

function renderRecommendations() {
  const picks = essenceRows
    .filter((row) => textOf(row["추천 캐릭터"]))
    .slice(0, 8);

  els.recommendations.innerHTML = picks.map((row) => `
    <div class="mini-item">
      <strong>${escapeHtml(row["몬스터"])} <span class="tag">${escapeHtml(row["추천 캐릭터"])}</span></strong>
      <div class="detail">${escapeHtml(row["층"])} ${escapeHtml(row["구역"])} · ${escapeHtml(row["등급"])}</div>
    </div>
  `).join("");
}

function renderTime() {
  const amount = Number(els.gameHours.value || 0);
  const seconds = els.timeUnit.value === "condition" ? amount * 8 : amount * 4;
  const minutes = Math.floor(seconds / 60);
  const remain = Math.round(seconds % 60);
  els.timeResult.textContent = `${minutes}분 ${remain}초`;
}

init();
