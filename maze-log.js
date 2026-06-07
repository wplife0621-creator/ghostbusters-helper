const MAZE_LOG_STORAGE_KEY = "dukhubusters.mazeLog.v1";
const MAZE_LOG_CUSTOM_FLOORS_KEY = "dukhubusters.mazeLog.customFloors.v1";
const MAZE_LOG_START_DAY_KEY = "dukhubusters.mazeLog.startDay.v1";

const DEFAULT_MAZE_FLOORS = [
  {
    floor: 1,
    label: "1층",
    rifts: ["강철의 묘", "녹색 탄광", "빙하굴", "핏빛 성채"],
    hasOffering: true,
    specialSpawns: [],
    defaultOpen: true,
  },
  {
    floor: 2,
    label: "2층",
    rifts: ["검귀의 동굴", "망자의 제단", "안개의 거석 폐허", "총포사막", "홉고블린 요새"],
    hasOffering: false,
    specialSpawns: [],
    defaultOpen: true,
  },
  {
    floor: 3,
    label: "3층",
    rifts: ["백색신전"],
    hasOffering: false,
    specialSpawns: [],
    defaultOpen: true,
  },
  {
    floor: 4,
    label: "4층",
    rifts: ["천공신탁소"],
    hasOffering: false,
    specialSpawns: [],
    defaultOpen: true,
  },
  {
    floor: 5,
    label: "5층",
    rifts: ["결빙의 성소"],
    hasOffering: false,
    specialSpawns: ["밀라로돈", "베르타스"],
    defaultOpen: true,
  },
  {
    floor: 6,
    label: "6층",
    rifts: [],
    hasOffering: false,
    specialSpawns: [],
    defaultOpen: true,
  },
];

const CUSTOM_FLOOR_NUMBERS = [7, 8, 9, 10];

const mazeLogEls = {
  head: document.querySelector("#mazeLogHead"),
  rows: document.querySelector("#mazeLogRows"),
  add: document.querySelector("#mazeLogAdd"),
  export: document.querySelector("#mazeLogExport"),
  import: document.querySelector("#mazeLogImport"),
  importFile: document.querySelector("#mazeLogImportFile"),
  status: document.querySelector("#mazeLogStatus"),
  totalRounds: document.querySelector("#mazeLogTotalRounds"),
  latestDay: document.querySelector("#mazeLogLatestDay"),
  specialCount: document.querySelector("#mazeLogSpecialCount"),
  startDay: document.querySelector("#mazeLogStartDay"),
  startSave: document.querySelector("#mazeLogStartSave"),
  settings: document.querySelector("#mazeLogSettings"),
  settingsForm: document.querySelector("#mazeLogSettingsForm"),
  customFloor: document.querySelector("#mazeLogCustomFloor"),
  customLabel: document.querySelector("#mazeLogCustomLabel"),
  customRifts: document.querySelector("#mazeLogCustomRifts"),
  customSpecials: document.querySelector("#mazeLogCustomSpecials"),
  customRemove: document.querySelector("#mazeLogCustomRemove"),
  modal: document.querySelector("#mazeLogModal"),
  form: document.querySelector("#mazeLogForm"),
  close: document.querySelector("#mazeLogClose"),
  cancel: document.querySelector("#mazeLogCancel"),
  delete: document.querySelector("#mazeLogDelete"),
  roundId: document.querySelector("#mazeLogRoundId"),
  dayLabel: document.querySelector("#mazeLogDayLabel"),
  floorFields: document.querySelector("#mazeLogFloorFields"),
};

let customFloorSettings = loadCustomFloorSettings();
let mazeLogStartDay = loadStartDay();
let mazeLogEntries = loadMazeLog();

function activeMazeFloors() {
  const customFloors = CUSTOM_FLOOR_NUMBERS
    .map((floorNumber) => customFloorSettings[String(floorNumber)])
    .filter(Boolean)
    .map((setting) => ({
      floor: setting.floor,
      label: setting.label || `${setting.floor}층`,
      rifts: setting.rifts || [],
      hasOffering: false,
      specialSpawns: setting.specialSpawns || [],
      defaultOpen: false,
      custom: true,
    }));
  return [...DEFAULT_MAZE_FLOORS, ...customFloors].sort((a, b) => a.floor - b.floor);
}

function floorConfigByNumber(floorNumber) {
  return activeMazeFloors().find((config) => config.floor === Number(floorNumber))
    || DEFAULT_MAZE_FLOORS.find((config) => config.floor === Number(floorNumber))
    || {
      floor: Number(floorNumber),
      label: `${floorNumber}층`,
      rifts: [],
      hasOffering: false,
      specialSpawns: [],
      defaultOpen: false,
    };
}

function splitList(value) {
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDay(value) {
  const day = Math.max(10, Math.floor(Number(value || 10) / 10) * 10);
  return Number.isFinite(day) ? day : 10;
}

function createEmptyFloor(config) {
  const specials = {};
  (config.specialSpawns || []).forEach((name) => {
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

function createEmptyEntry(day) {
  const normalizedDay = normalizeDay(day);
  return {
    id: `maze-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    round: normalizedDay / 10,
    day: normalizedDay,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    floors: activeMazeFloors().map(createEmptyFloor),
  };
}

function normalizeFloor(saved, config) {
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
}

function normalizeEntry(entry, index) {
  const round = Number(entry?.round || index + 1);
  const savedFloors = Array.isArray(entry?.floors) ? entry.floors : [];
  const normalizedFloors = activeMazeFloors().map((config) => {
    const saved = savedFloors.find((floor) => Number(floor.floor) === config.floor);
    return normalizeFloor(saved, config);
  });
  const inactiveFloors = savedFloors
    .filter((floor) => !normalizedFloors.some((active) => Number(active.floor) === Number(floor.floor)))
    .map((floor) => normalizeFloor(floor, floorConfigByNumber(floor.floor)));
  return {
    id: entry?.id || `maze-${Date.now()}-${index}`,
    round,
    day: Number(entry?.day || round * 10),
    createdAt: entry?.createdAt || new Date().toISOString(),
    updatedAt: entry?.updatedAt || entry?.createdAt || new Date().toISOString(),
    floors: [...normalizedFloors, ...inactiveFloors].sort((a, b) => a.floor - b.floor),
  };
}

function loadCustomFloorSettings() {
  try {
    const raw = localStorage.getItem(MAZE_LOG_CUSTOM_FLOORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([floor]) => CUSTOM_FLOOR_NUMBERS.includes(Number(floor)))
      .map(([floor, value]) => [floor, {
        floor: Number(floor),
        label: value?.label || `${floor}층`,
        rifts: Array.isArray(value?.rifts) ? value.rifts.filter(Boolean) : [],
        specialSpawns: Array.isArray(value?.specialSpawns) ? value.specialSpawns.filter(Boolean) : [],
      }]));
  } catch (error) {
    console.warn("Failed to load maze custom floors", error);
    return {};
  }
}

function saveCustomFloorSettings() {
  localStorage.setItem(MAZE_LOG_CUSTOM_FLOORS_KEY, JSON.stringify(customFloorSettings));
}

function loadStartDay() {
  try {
    return normalizeDay(localStorage.getItem(MAZE_LOG_START_DAY_KEY) || 10);
  } catch (error) {
    console.warn("Failed to load maze start day", error);
    return 10;
  }
}

function saveStartDay() {
  mazeLogStartDay = normalizeDay(mazeLogEls.startDay?.value || 10);
  localStorage.setItem(MAZE_LOG_START_DAY_KEY, String(mazeLogStartDay));
  if (mazeLogEls.startDay) mazeLogEls.startDay.value = String(mazeLogStartDay);
  setStatus(`${mazeLogStartDay}일부터 기록을 시작하도록 저장했습니다.`, "ok");
}

function loadMazeLog() {
  try {
    const raw = localStorage.getItem(MAZE_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeEntry).sort((a, b) => a.day - b.day);
  } catch (error) {
    console.warn("Failed to load maze log", error);
    return [];
  }
}

function saveMazeLog() {
  localStorage.setItem(MAZE_LOG_STORAGE_KEY, JSON.stringify(mazeLogEntries));
}

function refreshEntriesForActiveFloors() {
  mazeLogEntries = mazeLogEntries.map((entry, index) => normalizeEntry(entry, index));
  saveMazeLog();
}

function setStatus(message, type = "") {
  if (!mazeLogEls.status) return;
  mazeLogEls.status.textContent = message;
  mazeLogEls.status.dataset.type = type;
}

function floorByNumber(entry, floorNumber) {
  const config = floorConfigByNumber(floorNumber);
  return entry.floors.find((floor) => Number(floor.floor) === Number(floorNumber)) || createEmptyFloor(config);
}

function floorSummary(entry, config) {
  const floor = floorByNumber(entry, config.floor);
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
  if (floor.memo) parts.push(floor.memo);
  return parts.length ? parts.join(" · ") : "-";
}

function countSpecialSpawns() {
  return mazeLogEntries.reduce((total, entry) => {
    return total + activeMazeFloors().reduce((floorTotal, config) => {
      const floor = floorByNumber(entry, config.floor);
      return floorTotal + Object.values(floor.specialSpawns || {}).filter(Boolean).length;
    }, 0);
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

function openSettingsPanel() {
  if (!mazeLogEls.settings) return;
  mazeLogEls.settings.hidden = false;
  mazeLogEls.settings.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
}

function renderTableHead() {
  if (!mazeLogEls.head) return;
  const floorHeaders = activeMazeFloors().map((config) => `<th>${escapeHtml(config.label)}</th>`).join("");
  mazeLogEls.head.innerHTML = `
    <tr>
      <th>회차</th>
      ${floorHeaders}
      <th class="maze-log-manage-head">
        <span>관리</span>
        <button type="button" class="maze-log-column-add" aria-label="항목 추가">+</button>
      </th>
    </tr>
  `;
}

function renderMazeLog() {
  if (!mazeLogEls.rows) return;
  const floors = activeMazeFloors();
  renderTableHead();
  if (!mazeLogEntries.length) {
    mazeLogEls.rows.innerHTML = `<tr><td colspan="${floors.length + 2}" class="maze-log-empty">아직 기록이 없습니다. + 10일 추가를 눌러 시작하세요.</td></tr>`;
    updateSummary();
    return;
  }
  mazeLogEls.rows.innerHTML = mazeLogEntries.map((entry) => {
    const cells = floors.map((config) => {
      const summary = floorSummary(entry, config);
      const emptyClass = summary === "-" ? " is-empty" : "";
      return `<td class="maze-log-floor-cell${emptyClass}" data-label="${escapeHtml(config.label)}">${escapeHtml(summary)}</td>`;
    }).join("");
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

function nextRoundDay() {
  const maxDay = mazeLogEntries.reduce((max, entry) => Math.max(max, Number(entry.day || 0)), 0);
  return Math.max(maxDay + 10, mazeLogStartDay);
}

function addRound() {
  const entry = createEmptyEntry(nextRoundDay());
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
  mazeLogEls.floorFields.innerHTML = activeMazeFloors().map((config) => renderFloorEditor(entry, config)).join("");
  mazeLogEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function renderFloorEditor(entry, config) {
  const floor = floorByNumber(entry, config.floor);
  const riftOptions = [`<option value="">균열 선택</option>`]
    .concat((config.rifts || []).map((rift) => `<option value="${escapeHtml(rift)}"${floor.riftName === rift ? " selected" : ""}>${escapeHtml(rift)}</option>`))
    .join("");
  const specialControls = (config.specialSpawns || []).map((name) => `
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
  const customHint = config.custom ? `<p class="maze-log-floor-hint">개인 설정으로 추가한 층입니다.</p>` : "";
  return `
    <details class="maze-log-floor-card${config.custom ? " is-custom" : ""}" data-floor="${config.floor}" ${config.defaultOpen ? "open" : ""}>
      <summary>${escapeHtml(config.label)} <span>${escapeHtml(floorSummary(entry, config))}</span></summary>
      <div class="maze-log-floor-grid">
        ${customHint}
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
  const editedFloors = [...mazeLogEls.floorFields.querySelectorAll(".maze-log-floor-card")].map((card) => {
    const config = floorConfigByNumber(Number(card.dataset.floor));
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
  const inactiveFloors = entry.floors.filter((floor) => !editedFloors.some((edited) => Number(edited.floor) === Number(floor.floor)));
  return {
    ...entry,
    updatedAt: new Date().toISOString(),
    floors: [...editedFloors, ...inactiveFloors].sort((a, b) => a.floor - b.floor),
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
    version: 2,
    exportedAt: new Date().toISOString(),
    customFloors: customFloorSettings,
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
      if (parsed?.customFloors && typeof parsed.customFloors === "object") {
        customFloorSettings = parsed.customFloors;
        saveCustomFloorSettings();
      }
      mazeLogEntries = entries.map(normalizeEntry).sort((a, b) => a.day - b.day);
      saveMazeLog();
      renderSettingsFields();
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

function renderSettingsFields() {
  const floor = mazeLogEls.customFloor?.value || "7";
  const setting = customFloorSettings[floor] || {
    floor: Number(floor),
    label: `${floor}층`,
    rifts: [],
    specialSpawns: [],
  };
  if (mazeLogEls.customLabel) mazeLogEls.customLabel.value = setting.label || `${floor}층`;
  if (mazeLogEls.customRifts) mazeLogEls.customRifts.value = (setting.rifts || []).join(", ");
  if (mazeLogEls.customSpecials) mazeLogEls.customSpecials.value = (setting.specialSpawns || []).join(", ");
}

function saveCustomFloor(event) {
  event.preventDefault();
  const floor = Number(mazeLogEls.customFloor?.value || 7);
  const label = mazeLogEls.customLabel?.value.trim() || `${floor}층`;
  const rifts = splitList(mazeLogEls.customRifts?.value);
  const specialSpawns = splitList(mazeLogEls.customSpecials?.value);
  customFloorSettings[String(floor)] = { floor, label, rifts, specialSpawns };
  saveCustomFloorSettings();
  refreshEntriesForActiveFloors();
  renderMazeLog();
  setStatus(`${label} 개인 설정을 저장했습니다.`, "ok");
}

function removeCustomFloor() {
  const floor = Number(mazeLogEls.customFloor?.value || 7);
  const setting = customFloorSettings[String(floor)];
  delete customFloorSettings[String(floor)];
  saveCustomFloorSettings();
  refreshEntriesForActiveFloors();
  renderSettingsFields();
  renderMazeLog();
  setStatus(`${setting?.label || `${floor}층`}을 표에서 숨겼습니다. 기존 기록은 백업 데이터 안에 보존됩니다.`, "ok");
}

function initMazeLog() {
  if (mazeLogEls.startDay) mazeLogEls.startDay.value = String(mazeLogStartDay);
  renderSettingsFields();
  renderMazeLog();
  mazeLogEls.add?.addEventListener("click", addRound);
  mazeLogEls.export?.addEventListener("click", exportMazeLog);
  mazeLogEls.import?.addEventListener("click", () => mazeLogEls.importFile?.click());
  mazeLogEls.importFile?.addEventListener("change", (event) => importMazeLogFile(event.target.files?.[0]));
  mazeLogEls.startSave?.addEventListener("click", saveStartDay);
  mazeLogEls.head?.addEventListener("click", (event) => {
    if (event.target.closest(".maze-log-column-add")) openSettingsPanel();
  });
  mazeLogEls.customFloor?.addEventListener("change", renderSettingsFields);
  mazeLogEls.settingsForm?.addEventListener("submit", saveCustomFloor);
  mazeLogEls.customRemove?.addEventListener("click", removeCustomFloor);
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
