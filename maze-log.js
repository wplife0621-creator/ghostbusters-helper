const MAZE_LOG_STORAGE_KEY = "dukhubusters.mazeLog.v1";
const MAZE_LOG_CUSTOM_FLOORS_KEY = "dukhubusters.mazeLog.customFloors.v1";
const MAZE_LOG_START_DAY_KEY = "dukhubusters.mazeLog.startDay.v1";
const MAZE_LOG_SHEETS_KEY = "dukhubusters.mazeLog.sheets.v2";
const MAZE_LOG_ACTIVE_SHEET_KEY = "dukhubusters.mazeLog.activeSheet.v2";

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
    rifts: ["결빙의 성소", "중력의 묘", "용광의 도가니"],
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

const CUSTOM_FLOOR_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const mazeLogEls = {
  sheets: document.querySelector("#mazeLogSheets"),
  sheetAdd: document.querySelector("#mazeLogSheetAdd"),
  sheetReset: document.querySelector("#mazeLogSheetReset"),
  editMode: document.querySelector("#mazeLogEditMode"),
  settingsOpen: document.querySelector("#mazeLogSettingsOpen"),
  head: document.querySelector("#mazeLogHead"),
  rows: document.querySelector("#mazeLogRows"),
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

let customFloorSettings = {};
let mazeLogStartDay = 10;
let mazeLogEntries = [];
let mazeLogEditMode = false;
let mazeLogSheets = loadMazeLogSheets();
let activeMazeSheetId = localStorage.getItem(MAZE_LOG_ACTIVE_SHEET_KEY) || mazeLogSheets[0]?.id;
applyActiveSheet(false);

function activeMazeFloors() {
  return CUSTOM_FLOOR_NUMBERS
    .map((floorNumber) => {
      const base = DEFAULT_MAZE_FLOORS.find((config) => config.floor === floorNumber);
      const setting = customFloorSettings[String(floorNumber)];
      if (!base && !setting) return null;
      const rifts = uniqueList([...(base?.rifts || []), ...(setting?.rifts || [])]);
      const specialSpawns = uniqueList([...(base?.specialSpawns || []), ...(setting?.specialSpawns || [])]);
      return {
        floor: floorNumber,
        label: setting?.label || base?.label || `${floorNumber}층`,
        rifts,
        hasOffering: Boolean(base?.hasOffering),
        specialSpawns,
        defaultOpen: Boolean(base?.defaultOpen),
        custom: Boolean(setting),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.floor - b.floor);
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

function uniqueList(items) {
  return [...new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

function floorNumberFromLabel(value) {
  const match = String(value || "").match(/(\d+)\s*층/);
  return match ? Number(match[1]) : 0;
}

function ensureDefaultFloor(floorNumber) {
  let config = DEFAULT_MAZE_FLOORS.find((item) => item.floor === floorNumber);
  if (config) return config;
  config = {
    floor: floorNumber,
    label: `${floorNumber}층`,
    rifts: [],
    hasOffering: false,
    specialSpawns: [],
    defaultOpen: floorNumber <= 6,
  };
  DEFAULT_MAZE_FLOORS.push(config);
  return config;
}

function uniqueLocationList(items) {
  const result = new Map();
  (items || []).forEach((item) => {
    const label = String(item || "").trim();
    const key = label.replace(/\s+/g, "").toLowerCase();
    if (!key) return;
    const current = result.get(key) || "";
    if (!current || (label.match(/\s/g) || []).length > (current.match(/\s/g) || []).length) result.set(key, label);
  });
  return [...result.values()];
}

function applySharedRiftLocations(items) {
  const grouped = new Map();
  (items || []).forEach((item) => {
    const floorName = String(item?.floor || item?.["층"] || "").trim();
    const areaName = String(item?.name || item?.["구역"] || "").trim();
    const floorNumber = floorNumberFromLabel(floorName);
    if (!floorName.includes("균열") || !floorNumber || !areaName || !CUSTOM_FLOOR_NUMBERS.includes(floorNumber)) return;
    if (!grouped.has(floorNumber)) grouped.set(floorNumber, []);
    grouped.get(floorNumber).push(areaName);
  });
  grouped.forEach((rifts, floorNumber) => {
    const config = ensureDefaultFloor(floorNumber);
    config.rifts = uniqueLocationList(rifts);
  });
}

async function loadSharedRiftLocations() {
  try {
    const version = window.DUKHUBUSTERS_CONFIG?.staticDataVersion || "maze-rifts";
    const response = await fetch(`./data/location-settings.json?v=${encodeURIComponent(version)}`, { cache: "force-cache" });
    if (!response.ok) return;
    const settings = (await response.json())?.settings;
    if (!Array.isArray(settings?.areas)) return;
    const enabledFloors = new Set((settings.floors || [])
      .filter((floor) => floor.enabled !== false)
      .map((floor) => floor.name));
    applySharedRiftLocations(settings.areas
      .filter((area) => area.enabled !== false && area.floor?.includes("균열") && (!enabledFloors.size || enabledFloors.has(area.floor)))
      .map((area) => ({ floor: area.floor, name: area.name })));
  } catch (error) {
    console.warn("Failed to load shared rift locations", error);
  }
}

function normalizeDay(value) {
  const day = Math.max(10, Math.floor(Number(value || 10) / 10) * 10);
  return Number.isFinite(day) ? day : 10;
}

function clampNumberInput(value, min, max) {
  if (value === "" || value == null) return "";
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return "";
  return String(Math.min(Math.max(number, min), max));
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
    appearedHour: "",
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
    appearedHour: saved?.appearedHour || "",
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

function createMazeSheet(index = 1) {
  return {
    id: `sheet-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `도전 ${index}`,
    startDay: 10,
    customFloors: {},
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeMazeSheet(sheet, index) {
  return {
    id: sheet?.id || `sheet-${Date.now()}-${index}`,
    name: textValue(sheet?.name) || `도전 ${index + 1}`,
    startDay: normalizeDay(sheet?.startDay || 10),
    customFloors: normalizeCustomFloorSettings(sheet?.customFloors || {}),
    entries: Array.isArray(sheet?.entries) ? sheet.entries : [],
    createdAt: sheet?.createdAt || new Date().toISOString(),
    updatedAt: sheet?.updatedAt || sheet?.createdAt || new Date().toISOString(),
  };
}

function normalizeCustomFloorSettings(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([floor]) => CUSTOM_FLOOR_NUMBERS.includes(Number(floor)))
    .map(([floor, item]) => [floor, {
      floor: Number(floor),
      label: textValue(item?.label) || `${floor}층`,
      rifts: Array.isArray(item?.rifts) ? uniqueList(item.rifts) : [],
      specialSpawns: Array.isArray(item?.specialSpawns) ? uniqueList(item.specialSpawns) : [],
    }]));
}

function textValue(value) {
  return String(value || "").trim();
}

function legacyMazeSheet() {
  return {
    ...createMazeSheet(1),
    name: "도전 1",
    startDay: loadStartDay(),
    customFloors: loadCustomFloorSettings(),
    entries: loadMazeLog(),
  };
}

function loadMazeLogSheets() {
  try {
    const raw = localStorage.getItem(MAZE_LOG_SHEETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const sheets = Array.isArray(parsed?.sheets) ? parsed.sheets : Array.isArray(parsed) ? parsed : [];
      const normalized = sheets.map(normalizeMazeSheet).filter(Boolean);
      if (normalized.length) return normalized;
    }
  } catch (error) {
    console.warn("Failed to load maze sheets", error);
  }
  return [legacyMazeSheet()];
}

function activeMazeSheet() {
  let sheet = mazeLogSheets.find((item) => item.id === activeMazeSheetId);
  if (!sheet) {
    sheet = mazeLogSheets[0] || createMazeSheet(1);
    if (!mazeLogSheets.length) mazeLogSheets = [sheet];
    activeMazeSheetId = sheet.id;
  }
  return sheet;
}

function syncActiveSheet() {
  const sheet = activeMazeSheet();
  sheet.startDay = mazeLogStartDay;
  sheet.customFloors = customFloorSettings;
  sheet.entries = mazeLogEntries;
  sheet.updatedAt = new Date().toISOString();
  saveMazeSheets();
}

function applyActiveSheet(shouldRender = true) {
  const sheet = activeMazeSheet();
  localStorage.setItem(MAZE_LOG_ACTIVE_SHEET_KEY, sheet.id);
  mazeLogStartDay = normalizeDay(sheet.startDay || 10);
  customFloorSettings = normalizeCustomFloorSettings(sheet.customFloors || {});
  mazeLogEntries = (Array.isArray(sheet.entries) ? sheet.entries : []).map(normalizeEntry).sort((a, b) => a.day - b.day);
  if (shouldRender) {
    if (mazeLogEls.startDay) mazeLogEls.startDay.value = String(mazeLogStartDay);
    renderSettingsFields();
    renderSheetTabs();
    renderMazeLog();
  }
}

function saveMazeSheets() {
  localStorage.setItem(MAZE_LOG_SHEETS_KEY, JSON.stringify({
    version: 2,
    activeSheetId: activeMazeSheetId,
    sheets: mazeLogSheets,
  }));
}

function renderSheetTabs() {
  if (!mazeLogEls.sheets) return;
  mazeLogEls.sheets.innerHTML = mazeLogSheets.map((sheet) => `
    <button type="button" class="maze-log-sheet-tab${sheet.id === activeMazeSheetId ? " is-active" : ""}" data-sheet-id="${escapeHtml(sheet.id)}">
      <span>${escapeHtml(sheet.name)}</span>
      <small>${Array.isArray(sheet.entries) ? sheet.entries.length : 0}회차</small>
    </button>
  `).join("");
}

function selectSheet(sheetId) {
  syncActiveSheet();
  activeMazeSheetId = sheetId;
  applyActiveSheet(true);
  setStatus(`${activeMazeSheet().name} 시트를 열었습니다.`, "ok");
}

function addSheet() {
  syncActiveSheet();
  const sheet = createMazeSheet(mazeLogSheets.length + 1);
  mazeLogSheets.push(sheet);
  activeMazeSheetId = sheet.id;
  applyActiveSheet(true);
  setStatus(`${sheet.name} 시트를 추가했습니다.`, "ok");
}

function resetCurrentSheet() {
  const sheet = activeMazeSheet();
  if (!confirm(`${sheet.name} 시트의 기록을 전부 초기화할까요? 다른 시트는 유지됩니다.`)) return;
  sheet.entries = [];
  sheet.startDay = 10;
  sheet.customFloors = {};
  activeMazeSheetId = sheet.id;
  saveMazeSheets();
  applyActiveSheet(true);
  setStatus(`${sheet.name} 시트를 초기화했습니다.`, "ok");
}

function loadCustomFloorSettings() {
  try {
    const raw = localStorage.getItem(MAZE_LOG_CUSTOM_FLOORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return normalizeCustomFloorSettings(parsed);
  } catch (error) {
    console.warn("Failed to load maze custom floors", error);
    return {};
  }
}

function saveCustomFloorSettings() {
  localStorage.setItem(MAZE_LOG_CUSTOM_FLOORS_KEY, JSON.stringify(customFloorSettings));
  syncActiveSheet();
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
  const removed = pruneEmptyEntriesBeforeStartDay();
  syncActiveSheet();
  renderSheetTabs();
  renderMazeLog();
  setStatus(
    removed
      ? `${mazeLogStartDay}일부터 시작하도록 저장하고, 비어 있던 이전 회차 ${removed}개를 정리했습니다.`
      : `${mazeLogStartDay}일부터 기록을 시작하도록 저장했습니다.`,
    "ok"
  );
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
  syncActiveSheet();
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
  if (floor.appearedDay) {
    parts.push(floor.appearedHour ? `${floor.appearedDay}일 ${floor.appearedHour}시` : `${floor.appearedDay}일`);
  }
  if (config.hasOffering && floor.offeringUsed) parts.push("봉헌");
  Object.entries(floor.specialSpawns || {}).forEach(([name, spawned]) => {
    if (spawned) parts.push(name);
  });
  if (floor.memo) parts.push(floor.memo);
  return parts.length ? parts.join(" · ") : "-";
}

function isEmptyFloorRecord(floor) {
  return !floor?.riftAppeared
    && !floor?.riftName
    && !floor?.appearedDay
    && !floor?.appearedHour
    && !floor?.offeringUsed
    && !floor?.memo
    && !Object.values(floor?.specialSpawns || {}).some(Boolean);
}

function isEmptyEntry(entry) {
  return (entry?.floors || []).every(isEmptyFloorRecord);
}

function pruneEmptyEntriesBeforeStartDay() {
  const before = mazeLogEntries.length;
  mazeLogEntries = mazeLogEntries.filter((entry) => Number(entry.day || 0) >= mazeLogStartDay || !isEmptyEntry(entry));
  return before - mazeLogEntries.length;
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
        <div>
          <span>관리</span>
          <button type="button" class="maze-log-column-add" aria-label="항목 추가">+</button>
        </div>
      </th>
    </tr>
  `;
}

function renderMazeLog() {
  if (!mazeLogEls.rows) return;
  const floors = activeMazeFloors();
  document.body.classList.toggle("maze-log-editing", mazeLogEditMode);
  if (mazeLogEls.editMode) {
    mazeLogEls.editMode.textContent = mazeLogEditMode ? "수정 완료" : "수정 모드";
    mazeLogEls.editMode.classList.toggle("primary-action", mazeLogEditMode);
  }
  renderTableHead();
  const addRow = `
    <tr class="maze-log-add-row">
      <td colspan="${floors.length + 2}">
        <button type="button" class="maze-log-add-round" data-add-round>
          <span>+</span>
          <strong>회차 추가</strong>
          <small>다음 기록은 ${nextRoundDay()}일로 생성됩니다.</small>
        </button>
      </td>
    </tr>
  `;
  if (!mazeLogEntries.length) {
    mazeLogEls.rows.innerHTML = `
      <tr><td colspan="${floors.length + 2}" class="maze-log-empty">아직 기록이 없습니다. 아래 + 회차 추가를 눌러 시작하세요.</td></tr>
      ${addRow}
    `;
    updateSummary();
    return;
  }
  mazeLogEls.rows.innerHTML = mazeLogEntries.map((entry) => {
    const cells = floors.map((config) => {
      const summary = floorSummary(entry, config);
      const emptyClass = summary === "-" ? " is-empty" : "";
      const value = summary === "-" ? "" : summary;
      const inputButton = summary === "-" && mazeLogEditMode
        ? `<button type="button" class="maze-log-cell-input">입력</button>`
        : "";
      return `
        <td class="maze-log-floor-cell${emptyClass}${mazeLogEditMode ? " is-editable" : ""}" data-label="${escapeHtml(config.label)}" data-entry-id="${entry.id}" data-floor="${config.floor}" ${mazeLogEditMode ? 'tabindex="0"' : ""} title="${escapeHtml(config.label)} 기록">
          <span class="maze-log-cell-label">${escapeHtml(config.label)}</span>
          <span class="maze-log-cell-value">${escapeHtml(value)}${inputButton}</span>
        </td>
      `;
    }).join("");
    return `
      <tr data-entry-row-id="${entry.id}">
        <th scope="row" data-label="회차">${entry.day}일</th>
        ${cells}
        <td data-label="관리">
          ${mazeLogEditMode ? `<button type="button" class="maze-log-edit" data-entry-id="${entry.id}">전체 수정</button>` : `<span class="maze-log-row-idle">-</span>`}
        </td>
      </tr>
    `;
  }).join("") + addRow;
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
  setStatus(`${entry.day}일 기록을 추가했습니다. 아래 수정 모드를 켠 뒤 필요한 칸만 입력하세요.`, "ok");
}

function openEditor(entryId, floorNumber = null) {
  const entry = mazeLogEntries.find((item) => item.id === entryId);
  if (!entry || !mazeLogEls.modal) return;
  const floorConfig = floorNumber ? floorConfigByNumber(floorNumber) : null;
  mazeLogEls.roundId.value = entry.id;
  mazeLogEls.dayLabel.value = `${entry.day}일`;
  const configs = floorConfig ? [floorConfig] : activeMazeFloors();
  const title = document.querySelector("#mazeLogModalTitle");
  if (title) title.textContent = floorConfig ? `${entry.day}일 · ${floorConfig.label}` : `${entry.day}일 전체 기록`;
  if (mazeLogEls.delete) mazeLogEls.delete.hidden = Boolean(floorConfig);
  mazeLogEls.floorFields.innerHTML = configs.map((config) => renderFloorEditor(entry, config)).join("");
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
          <span>균열 일</span>
          <input type="number" min="1" max="999" step="1" data-appeared-day value="${escapeHtml(floor.appearedDay || "")}" placeholder="1~999">
        </label>
        <label class="field">
          <span>균열 시</span>
          <input type="number" min="0" max="23" step="1" data-appeared-hour value="${escapeHtml(floor.appearedHour || "")}" placeholder="0~23">
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
      appearedDay: clampNumberInput(card.querySelector("[data-appeared-day]")?.value, 1, 999),
      appearedHour: clampNumberInput(card.querySelector("[data-appeared-hour]")?.value, 0, 23),
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
  syncActiveSheet();
  const payload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    activeSheetId: activeMazeSheetId,
    sheets: mazeLogSheets,
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
      if (Array.isArray(parsed?.sheets)) {
        mazeLogSheets = parsed.sheets.map(normalizeMazeSheet);
        activeMazeSheetId = parsed.activeSheetId && mazeLogSheets.some((sheet) => sheet.id === parsed.activeSheetId)
          ? parsed.activeSheetId
          : mazeLogSheets[0]?.id;
        saveMazeSheets();
        applyActiveSheet(false);
      } else {
        const entries = Array.isArray(parsed) ? parsed : parsed.entries;
        if (!Array.isArray(entries)) throw new Error("entries missing");
        const sheet = {
          ...createMazeSheet(1),
          name: "불러온 기록",
          customFloors: parsed?.customFloors && typeof parsed.customFloors === "object" ? parsed.customFloors : {},
          entries,
        };
        mazeLogSheets = [normalizeMazeSheet(sheet, 0)];
        activeMazeSheetId = mazeLogSheets[0].id;
        saveMazeSheets();
        applyActiveSheet(false);
      }
      renderSettingsFields();
      renderSheetTabs();
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
  const floor = mazeLogEls.customFloor?.value || "1";
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
  const floor = Number(mazeLogEls.customFloor?.value || 1);
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
  const floor = Number(mazeLogEls.customFloor?.value || 1);
  const setting = customFloorSettings[String(floor)];
  delete customFloorSettings[String(floor)];
  saveCustomFloorSettings();
  refreshEntriesForActiveFloors();
  renderSettingsFields();
  renderMazeLog();
  setStatus(`${setting?.label || `${floor}층`}을 표에서 숨겼습니다. 기존 기록은 백업 데이터 안에 보존됩니다.`, "ok");
}

async function initMazeLog() {
  await loadSharedRiftLocations();
  refreshEntriesForActiveFloors();
  if (mazeLogEls.startDay) mazeLogEls.startDay.value = String(mazeLogStartDay);
  renderSheetTabs();
  renderSettingsFields();
  renderMazeLog();
  mazeLogEls.sheets?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-sheet-id]");
    if (tab) selectSheet(tab.dataset.sheetId);
  });
  mazeLogEls.sheetAdd?.addEventListener("click", addSheet);
  mazeLogEls.sheetReset?.addEventListener("click", resetCurrentSheet);
  mazeLogEls.editMode?.addEventListener("click", () => {
    mazeLogEditMode = !mazeLogEditMode;
    renderMazeLog();
    setStatus(mazeLogEditMode ? "수정 모드입니다. 빈칸의 입력 버튼이나 기록 칸을 눌러 수정하세요." : "수정 완료 모드입니다. 빈칸은 비워두고 기록만 보여줍니다.", "ok");
  });
  mazeLogEls.export?.addEventListener("click", exportMazeLog);
  mazeLogEls.import?.addEventListener("click", () => mazeLogEls.importFile?.click());
  mazeLogEls.importFile?.addEventListener("change", (event) => importMazeLogFile(event.target.files?.[0]));
  mazeLogEls.startSave?.addEventListener("click", saveStartDay);
  mazeLogEls.settingsOpen?.addEventListener("click", openSettingsPanel);
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
    if (event.target.closest("[data-add-round]")) {
      addRound();
      return;
    }
    const editButton = event.target.closest(".maze-log-edit");
    if (editButton) {
      openEditor(editButton.dataset.entryId);
      return;
    }
    const cell = event.target.closest(".maze-log-floor-cell");
    if (cell && mazeLogEditMode) openEditor(cell.dataset.entryId, Number(cell.dataset.floor));
  });
  mazeLogEls.rows?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("[data-add-round]")) {
      event.preventDefault();
      addRound();
      return;
    }
    const cell = event.target.closest(".maze-log-floor-cell");
    if (!cell || !mazeLogEditMode) return;
    event.preventDefault();
    openEditor(cell.dataset.entryId, Number(cell.dataset.floor));
  });
}

initMazeLog().catch((error) => {
  console.warn("Failed to initialize maze log", error);
  renderMazeLog();
});
