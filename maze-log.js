const MAZE_LOG_STORAGE_KEY = "dukhubusters.mazeLog.v1";

const MAZE_FLOOR_CONFIG = [
  {
    floor: 1,
    rifts: ["강철의 묘", "녹색 탄광", "빙하굴", "핏빛 성채"],
    hasOffering: true,
    specialSpawns: [],
  },
  {
    floor: 2,
    rifts: ["검귀의 동굴", "망자의 제단", "안개의 거석 폐허", "총포사막", "홉고블린 요새"],
    hasOffering: false,
    specialSpawns: [],
  },
  {
    floor: 3,
    rifts: ["백색신전"],
    hasOffering: false,
    specialSpawns: [],
  },
  {
    floor: 4,
    rifts: ["천공신탁소"],
    hasOffering: false,
    specialSpawns: [],
  },
  {
    floor: 5,
    rifts: ["결빙의 성소"],
    hasOffering: false,
    specialSpawns: ["밀라로돈", "베르타스"],
  },
  { floor: 6, rifts: [], hasOffering: false, specialSpawns: [] },
  { floor: 7, rifts: [], hasOffering: false, specialSpawns: [] },
  { floor: 8, rifts: [], hasOffering: false, specialSpawns: [] },
  { floor: 9, rifts: [], hasOffering: false, specialSpawns: [] },
  { floor: 10, rifts: [], hasOffering: false, specialSpawns: [] },
];

const mazeLogEls = {
  rows: document.querySelector("#mazeLogRows"),
  add: document.querySelector("#mazeLogAdd"),
  export: document.querySelector("#mazeLogExport"),
  import: document.querySelector("#mazeLogImport"),
  importFile: document.querySelector("#mazeLogImportFile"),
  status: document.querySelector("#mazeLogStatus"),
  totalRounds: document.querySelector("#mazeLogTotalRounds"),
  latestDay: document.querySelector("#mazeLogLatestDay"),
  specialCount: document.querySelector("#mazeLogSpecialCount"),
  modal: document.querySelector("#mazeLogModal"),
  form: document.querySelector("#mazeLogForm"),
  close: document.querySelector("#mazeLogClose"),
  cancel: document.querySelector("#mazeLogCancel"),
  delete: document.querySelector("#mazeLogDelete"),
  roundId: document.querySelector("#mazeLogRoundId"),
  dayLabel: document.querySelector("#mazeLogDayLabel"),
  floorFields: document.querySelector("#mazeLogFloorFields"),
};

let mazeLogEntries = loadMazeLog();

function createEmptyFloor(config) {
  const specials = {};
  config.specialSpawns.forEach((name) => {
    specials[name] = false;
  });
  return {
    floor: config.floor,
    riftAppeared: false,
    riftName: "",
    appearedDay: "",
    offeringUsed: false,
    specialSpawns: specials,
    memo: "",
  };
}

function createEmptyEntry(roundNumber) {
  return {
    id: `maze-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    round: roundNumber,
    day: roundNumber * 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    floors: MAZE_FLOOR_CONFIG.map(createEmptyFloor),
  };
}

function normalizeEntry(entry, index) {
  const round = Number(entry?.round || index + 1);
  const floors = MAZE_FLOOR_CONFIG.map((config) => {
    const saved = Array.isArray(entry?.floors)
      ? entry.floors.find((floor) => Number(floor.floor) === config.floor)
      : null;
    const base = createEmptyFloor(config);
    const specialSpawns = { ...base.specialSpawns, ...(saved?.specialSpawns || {}) };
    return {
      ...base,
      ...saved,
      floor: config.floor,
      riftAppeared: Boolean(saved?.riftAppeared),
      offeringUsed: Boolean(saved?.offeringUsed),
      specialSpawns,
    };
  });
  return {
    id: entry?.id || `maze-${Date.now()}-${index}`,
    round,
    day: Number(entry?.day || round * 10),
    createdAt: entry?.createdAt || new Date().toISOString(),
    updatedAt: entry?.updatedAt || entry?.createdAt || new Date().toISOString(),
    floors,
  };
}

function loadMazeLog() {
  try {
    const raw = localStorage.getItem(MAZE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).sort((a, b) => a.day - b.day);
  } catch (error) {
    console.warn("Failed to load maze log", error);
    return [];
  }
}

function saveMazeLog() {
  localStorage.setItem(MAZE_LOG_STORAGE_KEY, JSON.stringify(mazeLogEntries));
}

function setStatus(message, type = "") {
  if (!mazeLogEls.status) return;
  mazeLogEls.status.textContent = message;
  mazeLogEls.status.dataset.type = type;
}

function floorByNumber(entry, floorNumber) {
  return entry.floors.find((floor) => Number(floor.floor) === floorNumber) || createEmptyFloor(MAZE_FLOOR_CONFIG[floorNumber - 1]);
}

function floorSummary(entry, floorNumber) {
  const floor = floorByNumber(entry, floorNumber);
  const config = MAZE_FLOOR_CONFIG[floorNumber - 1];
  const parts = [];
  if (floor.riftAppeared && floor.riftName) {
    parts.push(floor.riftName);
  } else if (floor.riftAppeared) {
    parts.push("균열");
  }
  if (floor.appearedDay) parts.push(`${floor.appearedDay}일`);
  if (config.hasOffering && floor.offeringUsed) parts.push("봉헌");
  Object.entries(floor.specialSpawns || {}).forEach(([name, spawned]) => {
    if (spawned) parts.push(name);
  });
  return parts.length ? parts.join(" · ") : "-";
}

function countSpecialSpawns() {
  return mazeLogEntries.reduce((total, entry) => {
    const floor5 = floorByNumber(entry, 5);
    return total + Object.values(floor5.specialSpawns || {}).filter(Boolean).length;
  }, 0);
}

function updateSummary() {
  if (mazeLogEls.totalRounds) mazeLogEls.totalRounds.textContent = String(mazeLogEntries.length);
  if (mazeLogEls.latestDay) {
    const latest = mazeLogEntries.at(-1);
    mazeLogEls.latestDay.textContent = latest ? `${latest.day}일` : "-";
  }
  if (mazeLogEls.specialCount) mazeLogEls.specialCount.textContent = String(countSpecialSpawns());
}

function renderMazeLog() {
  if (!mazeLogEls.rows) return;
  if (!mazeLogEntries.length) {
    mazeLogEls.rows.innerHTML = `<tr><td colspan="12" class="maze-log-empty">아직 기록이 없습니다. + 10일 추가를 눌러 시작하세요.</td></tr>`;
    updateSummary();
    return;
  }
  mazeLogEls.rows.innerHTML = mazeLogEntries.map((entry) => {
    const cells = MAZE_FLOOR_CONFIG.map((config) => `<td data-label="${config.floor}층">${escapeHtml(floorSummary(entry, config.floor))}</td>`).join("");
    return `
      <tr data-entry-id="${entry.id}" tabindex="0">
        <th scope="row" data-label="회차">${entry.day}일</th>
        ${cells}
        <td data-label="관리">
          <button type="button" class="maze-log-edit" data-entry-id="${entry.id}">수정</button>
        </td>
      </tr>
    `;
  }).join("");
  updateSummary();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nextRoundNumber() {
  const maxRound = mazeLogEntries.reduce((max, entry) => Math.max(max, Number(entry.round || 0)), 0);
  return maxRound + 1;
}

function addRound() {
  const entry = createEmptyEntry(nextRoundNumber());
  mazeLogEntries.push(entry);
  mazeLogEntries.sort((a, b) => a.day - b.day);
  saveMazeLog();
  renderMazeLog();
  openEditor(entry.id);
  setStatus(`${entry.day}일 기록을 추가했습니다.`, "ok");
}

function openEditor(entryId) {
  const entry = mazeLogEntries.find((item) => item.id === entryId);
  if (!entry || !mazeLogEls.modal) return;
  mazeLogEls.roundId.value = entry.id;
  mazeLogEls.dayLabel.value = `${entry.day}일`;
  mazeLogEls.floorFields.innerHTML = MAZE_FLOOR_CONFIG.map((config) => renderFloorEditor(entry, config)).join("");
  mazeLogEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function renderFloorEditor(entry, config) {
  const floor = floorByNumber(entry, config.floor);
  const riftOptions = [`<option value="">균열 선택</option>`]
    .concat(config.rifts.map((rift) => `<option value="${escapeHtml(rift)}"${floor.riftName === rift ? " selected" : ""}>${escapeHtml(rift)}</option>`))
    .join("");
  const specialControls = config.specialSpawns.map((name) => `
    <label class="maze-log-check">
      <input type="checkbox" data-special="${escapeHtml(name)}" ${floor.specialSpawns?.[name] ? "checked" : ""}>
      <span>${escapeHtml(name)} 젠</span>
    </label>
  `).join("");
  const offeringControl = config.hasOffering
    ? `
      <label class="maze-log-check">
        <input type="checkbox" data-offering ${floor.offeringUsed ? "checked" : ""}>
        <span>봉헌 사용</span>
      </label>
    `
    : "";
  return `
    <details class="maze-log-floor-card" data-floor="${config.floor}" ${config.floor <= 5 ? "open" : ""}>
      <summary>${config.floor}층 <span>${escapeHtml(floorSummary(entry, config.floor))}</span></summary>
      <div class="maze-log-floor-grid">
        <label class="maze-log-check">
          <input type="checkbox" data-rift-appeared ${floor.riftAppeared ? "checked" : ""}>
          <span>균열 나옴</span>
        </label>
        <label class="field">
          <span>균열 종류</span>
          <select data-rift-name>
            ${riftOptions}
          </select>
        </label>
        <label class="field">
          <span>며칠에 나옴</span>
          <input type="number" min="1" max="10" step="1" data-appeared-day value="${escapeHtml(floor.appearedDay || "")}" placeholder="1~10">
        </label>
        ${offeringControl}
        ${specialControls}
        <label class="field maze-log-memo">
          <span>메모</span>
          <input type="text" data-memo value="${escapeHtml(floor.memo || "")}" placeholder="추가 기록">
        </label>
      </div>
    </details>
  `;
}

function closeEditor() {
  if (!mazeLogEls.modal) return;
  mazeLogEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function readEditorEntry() {
  const entry = mazeLogEntries.find((item) => item.id === mazeLogEls.roundId.value);
  if (!entry) return null;
  const floors = [...mazeLogEls.floorFields.querySelectorAll(".maze-log-floor-card")].map((card) => {
    const config = MAZE_FLOOR_CONFIG.find((item) => item.floor === Number(card.dataset.floor));
    const specialSpawns = {};
    card.querySelectorAll("[data-special]").forEach((input) => {
      specialSpawns[input.dataset.special] = input.checked;
    });
    return {
      floor: config.floor,
      riftAppeared: Boolean(card.querySelector("[data-rift-appeared]")?.checked),
      riftName: card.querySelector("[data-rift-name]")?.value || "",
      appearedDay: card.querySelector("[data-appeared-day]")?.value || "",
      offeringUsed: Boolean(card.querySelector("[data-offering]")?.checked),
      specialSpawns,
      memo: card.querySelector("[data-memo]")?.value.trim() || "",
    };
  });
  return {
    ...entry,
    updatedAt: new Date().toISOString(),
    floors,
  };
}

function saveEditor(event) {
  event.preventDefault();
  const updated = readEditorEntry();
  if (!updated) return;
  mazeLogEntries = mazeLogEntries.map((entry) => entry.id === updated.id ? updated : entry);
  saveMazeLog();
  renderMazeLog();
  closeEditor();
  setStatus(`${updated.day}일 기록을 저장했습니다.`, "ok");
}

function deleteCurrentEntry() {
  const entry = mazeLogEntries.find((item) => item.id === mazeLogEls.roundId.value);
  if (!entry) return;
  if (!confirm(`${entry.day}일 기록을 삭제할까요?`)) return;
  mazeLogEntries = mazeLogEntries.filter((item) => item.id !== entry.id);
  saveMazeLog();
  renderMazeLog();
  closeEditor();
  setStatus(`${entry.day}일 기록을 삭제했습니다.`, "ok");
}

function exportMazeLog() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: mazeLogEntries,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `maze-log-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("미궁 일지 백업 파일을 만들었습니다.", "ok");
}

function importMazeLogFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const entries = Array.isArray(parsed) ? parsed : parsed.entries;
      if (!Array.isArray(entries)) throw new Error("entries missing");
      mazeLogEntries = entries.map(normalizeEntry).sort((a, b) => a.day - b.day);
      saveMazeLog();
      renderMazeLog();
      setStatus("백업 파일을 불러왔습니다.", "ok");
    } catch (error) {
      console.warn("Failed to import maze log", error);
      setStatus("불러오기에 실패했습니다. JSON 백업 파일인지 확인해주세요.", "error");
    } finally {
      mazeLogEls.importFile.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function initMazeLog() {
  renderMazeLog();
  mazeLogEls.add?.addEventListener("click", addRound);
  mazeLogEls.export?.addEventListener("click", exportMazeLog);
  mazeLogEls.import?.addEventListener("click", () => mazeLogEls.importFile?.click());
  mazeLogEls.importFile?.addEventListener("change", (event) => importMazeLogFile(event.target.files?.[0]));
  mazeLogEls.form?.addEventListener("submit", saveEditor);
  mazeLogEls.close?.addEventListener("click", closeEditor);
  mazeLogEls.cancel?.addEventListener("click", closeEditor);
  mazeLogEls.delete?.addEventListener("click", deleteCurrentEntry);
  mazeLogEls.modal?.addEventListener("click", (event) => {
    if (event.target === mazeLogEls.modal) closeEditor();
  });
  mazeLogEls.rows?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-entry-id]");
    if (button) openEditor(button.dataset.entryId);
  });
  mazeLogEls.rows?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const row = event.target.closest("[data-entry-id]");
    if (!row) return;
    event.preventDefault();
    openEditor(row.dataset.entryId);
  });
}

initMazeLog();
