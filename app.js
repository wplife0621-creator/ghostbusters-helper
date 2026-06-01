redirectLegacyGithubPages();

const data = window.GHOST_DATA || {};

function redirectLegacyGithubPages() {
  if (window.location.hostname !== "wplife0621-creator.github.io") return;

  const legacyBasePath = "/ghostbusters-helper";
  const nextPath = window.location.pathname.startsWith(legacyBasePath)
    ? window.location.pathname.slice(legacyBasePath.length) || "/"
    : window.location.pathname || "/";
  window.location.replace(`https://busters.kr${nextPath}${window.location.search}${window.location.hash}`);
}

const storageKeys = {
  pending: "dukhubusters.pendingReports",
  approved: "dukhubusters.approvedReports",
  approvedReportItems: "dukhubusters.approvedReportItems",
  pinnedEssences: "dukhubusters.pinnedEssences",
  adminUnlocked: "dukhubusters.adminUnlocked",
  builds: "dukhubusters.sharedBuilds",
  visitorId: "dukhubusters.visitorId",
  lastVisitDate: "dukhubusters.lastVisitDate",
};

const adminCode = "0621";
const siteConfig = window.DUKHUBUSTERS_CONFIG || {};
const buildBackend = {
  url: textOf(siteConfig.supabaseUrl).replace(/\/$/, ""),
  anonKey: textOf(siteConfig.supabaseAnonKey),
  table: textOf(siteConfig.buildTable) || "builds",
};
const reportBackend = {
  url: textOf(siteConfig.supabaseUrl).replace(/\/$/, ""),
  anonKey: textOf(siteConfig.supabaseAnonKey),
  table: textOf(siteConfig.reportTable) || "monster_reports",
};
const guideBackend = {
  url: textOf(siteConfig.supabaseUrl).replace(/\/$/, ""),
  anonKey: textOf(siteConfig.supabaseAnonKey),
  table: textOf(siteConfig.guideTable) || "guide_posts",
};
const visitorBackend = {
  url: textOf(siteConfig.supabaseUrl).replace(/\/$/, ""),
  anonKey: textOf(siteConfig.supabaseAnonKey),
  visitorTable: textOf(siteConfig.visitorTable) || "site_visitors",
  dailyTable: textOf(siteConfig.dailyVisitorTable) || "daily_visitors",
};
const adminEmails = Array.isArray(siteConfig.adminEmails)
  ? siteConfig.adminEmails.map((email) => textOf(email).toLowerCase()).filter(Boolean)
  : [];
const visitorBuildMarkers = {
  total: "__visitor_total__",
  daily: "__visitor_daily__",
};
const buildLikeMarker = "__build_like__";
const buildDeleteMarker = "__build_deleted__";
const numbersReportPrefix = "__numbers__:";
const numbersDeleteMarker = "__numbers_deleted__";
const sailingMarker = "__sailing__";
const recommendationMarkerPrefix = "__recommended_character__:";
const authorNicknameMarkerPrefix = "__author_nickname__:";
const effectSortDefinitions = {
  "physical-damage": {
    label: "물리 피해",
    pattern: /물리\s*피해/i,
    scorePatterns: [/물리\s*피해\s*([+-]?\d+(?:\.\d+)?)\s*%/i],
  },
  "incoming-damage": {
    label: "받는 피해",
    pattern: /받는\s*피해(?:량)?/i,
    scorePatterns: [
      /받는\s*피해(?:량)?\s*-\s*(\d+(?:\.\d+)?)\s*%/i,
      /받는\s*피해(?:량)?\s*(\d+(?:\.\d+)?)\s*%\s*흡수/i,
    ],
    penaltyPattern: /받는\s*피해(?:량)?(?:\s*\+\s*\d+(?:\.\d+)?\s*%|\s*\d+(?:\.\d+)?\s*%\s*트레이드\s*오프|\s*증가)/i,
  },
  stagger: {
    label: "경직",
    pattern: /경직/i,
    scorePatterns: [
      /([+-]?\d+(?:\.\d+)?)\s*%\s*확률[^/\n]*경직/i,
      /([+-]?\d+(?:\.\d+)?)\s*초\s*경직/i,
      /경직\s*([+-]?\d+(?:\.\d+)?)\s*초/i,
    ],
  },
  "armor-pierce": { label: "방어력 관통", pattern: /방어력\s*관통/i },
  "freeze-stack": {
    label: "빙결 스택",
    pattern: /빙결\s*스택/i,
    scorePatterns: [/빙결\s*스택\s*\+?\s*([+-]?\d+(?:\.\d+)?)/i],
  },
  "fire-stack": {
    label: "화염 스택",
    pattern: /화염\s*스택/i,
    scorePatterns: [/화염\s*스택\s*\+?\s*([+-]?\d+(?:\.\d+)?)/i],
  },
  "dark-stack": {
    label: "암흑 스택",
    pattern: /암흑\s*스택/i,
    scorePatterns: [/암흑\s*스택\s*\+?\s*([+-]?\d+(?:\.\d+)?)/i],
  },
  "lightning-stack": {
    label: "번개 스택",
    pattern: /번개\s*스택/i,
    scorePatterns: [/번개\s*스택\s*\+?\s*([+-]?\d+(?:\.\d+)?)/i],
  },
  shock: {
    label: "감전",
    pattern: /감전/i,
    scorePatterns: [
      /([+-]?\d+(?:\.\d+)?)\s*%\s*확률[^/\n]*감전/i,
      /감전\s*([+-]?\d+(?:\.\d+)?)\s*초/i,
      /([+-]?\d+(?:\.\d+)?)\s*초[^/\n]*감전/i,
    ],
  },
  vision: {
    label: "시야",
    pattern: /시야/i,
    scorePatterns: [/시야(?:\s*범위)?\s*\+?\s*([+-]?\d+(?:\.\d+)?)\s*타일/i],
  },
  stamina: {
    label: "스태미나",
    pattern: /스태미나/i,
    scorePatterns: [/스태미나(?:\s*소모)?\s*([+-]?\d+(?:\.\d+)?)\s*%/i],
  },
};

const floorOptions = ["1층", "1층 균열", "2층", "2층 균열", "3층", "3층 균열", "4층", "4층 균열", "5층", "6층"];
const crackAreasByFloor = {
  "1층 균열": ["강철의 묘", "녹색 탄광", "빙하굴", "핏빛 성채"],
  "2층 균열": ["검귀의 동굴", "망자의제단", "안개의 거석 폐허", "총포사막", "홉고블린 요새"],
  "3층 균열": ["백색신전"],
  "4층 균열": ["천공신탁소"],
};
const areaFloorLookup = new Map(Object.entries(crackAreasByFloor)
  .flatMap(([floor, areas]) => areas.map((area) => [normalizeLocationName(area), floor])));
const areaLabelLookup = new Map(Object.values(crackAreasByFloor)
  .flatMap((areas) => areas.map((area) => [normalizeLocationName(area), area])));

const els = {
  search: document.querySelector("#searchInput"),
  floor: document.querySelector("#floorFilter"),
  area: document.querySelector("#areaFilter"),
  grade: document.querySelector("#gradeFilter"),
  character: document.querySelector("#characterFilter"),
  sailingFilter: document.querySelector("#sailingFilter"),
  sort: document.querySelector("#sortFilter"),
  effectSortChips: document.querySelector("#effectSortChips"),
  effectSortSummary: document.querySelector("#effectSortSummary"),
  statSort: document.querySelector("#statSortFilter"),
  statChips: document.querySelector("#statChips"),
  statSortSummary: document.querySelector("#statSortSummary"),
  visitorToday: document.querySelector("#visitorToday"),
  visitorTotal: document.querySelector("#visitorTotal"),
  visitorStatus: document.querySelector("#visitorStatus"),
  homeNoticeFilters: document.querySelector("#homeNoticeFilters"),
  homeNoticeCounts: document.querySelector("#homeNoticeCounts"),
  homeNoticeList: document.querySelector("#homeNoticeList"),
  homeNoticePagination: document.querySelector("#homeNoticePagination"),
  homeNoticeStatus: document.querySelector("#homeNoticeStatus"),
  results: document.querySelector("#results"),
  resultTitle: document.querySelector("#resultTitle"),
  resultCount: document.querySelector("#resultCount"),
  gameDays: document.querySelector("#gameDays"),
  gameHours: document.querySelector("#gameHours"),
  timeResult: document.querySelector("#timeResult"),
  currentCondition: document.querySelector("#currentCondition"),
  neededCondition: document.querySelector("#neededCondition"),
  remainingCondition: document.querySelector("#remainingCondition"),
  conditionGuide: document.querySelector("#conditionGuide"),
  numbersSearch: document.querySelector("#numbersSearch"),
  numbersFloor: document.querySelector("#numbersFloor"),
  numbersArea: document.querySelector("#numbersArea"),
  numbersLevel: document.querySelector("#numbersLevel"),
  numbersSort: document.querySelector("#numbersSort"),
  numbersEffectSortChips: document.querySelector("#numbersEffectSortChips"),
  numbersEffectSortSummary: document.querySelector("#numbersEffectSortSummary"),
  numbersCount: document.querySelector("#numbersCount"),
  numbersResults: document.querySelector("#numbersResults"),
  numbersPagination: document.querySelector("#numbersPagination"),
  reportForm: document.querySelector("#reportForm"),
  reportDataset: document.querySelector("#reportDataset"),
  reportMode: document.querySelector("#reportMode"),
  reportNickname: document.querySelector("#reportNickname"),
  reportMonster: document.querySelector("#reportMonster"),
  editNameHint: document.querySelector("#editNameHint"),
  reportOriginalMonsterField: document.querySelector("#reportOriginalMonsterField"),
  reportOriginalMonster: document.querySelector("#reportOriginalMonster"),
  reportGrade: document.querySelector("#reportGrade"),
  reportFloor: document.querySelector("#reportFloor"),
  reportArea: document.querySelector("#reportArea"),
  reportSailing: document.querySelector("#reportSailing"),
  reportRecommendations: document.querySelectorAll(".report-recommendation"),
  reportStats: document.querySelector("#reportStats"),
  reportPassive: document.querySelector("#reportPassive"),
  reportActive: document.querySelector("#reportActive"),
  reportActive2: document.querySelector("#reportActive2"),
  reportActive3: document.querySelector("#reportActive3"),
  reportNumberName: document.querySelector("#reportNumberName"),
  reportNumberCode: document.querySelector("#reportNumberCode"),
  reportNumberLevel: document.querySelector("#reportNumberLevel"),
  reportNumberEffect: document.querySelector("#reportNumberEffect"),
  reportNumberSlot: document.querySelector("#reportNumberSlot"),
  reportNumberSourceFloor: document.querySelector("#reportNumberSourceFloor"),
  reportNumberSource: document.querySelector("#reportNumberSource"),
  monsterOptions: document.querySelector("#monsterOptions"),
  numberOptions: document.querySelector("#numberOptions"),
  editMonsterMatches: document.querySelector("#editMonsterMatches"),
  editNumberMatches: document.querySelector("#editNumberMatches"),
  reportSyncStatus: document.querySelector("#reportSyncStatus"),
  pendingCount: document.querySelector("#pendingCount"),
  pendingReports: document.querySelector("#pendingReports"),
  approvedCount: document.querySelector("#approvedCount"),
  approvedReports: document.querySelector("#approvedReports"),
  copyApproved: document.querySelector("#copyApproved"),
  adminCodeInput: document.querySelector("#adminCodeInput"),
  adminUnlock: document.querySelector("#adminUnlock"),
  adminLock: document.querySelector("#adminLock"),
  adminStatus: document.querySelector("#adminStatus"),
  buildForm: document.querySelector("#buildForm"),
  buildTitle: document.querySelector("#buildTitle"),
  buildAuthor: document.querySelector("#buildAuthor"),
  buildPassword: document.querySelector("#buildPassword"),
  buildCharacterCount: document.querySelector("#buildCharacterCount"),
  buildEssenceOptions: document.querySelector("#buildEssenceOptions"),
  buildCharacterSlots: document.querySelector("#buildCharacterSlots"),
  buildNote: document.querySelector("#buildNote"),
  buildCount: document.querySelector("#buildCount"),
  buildSort: document.querySelector("#buildSort"),
  buildSyncStatus: document.querySelector("#buildSyncStatus"),
  openBuildForm: document.querySelector("#openBuildForm"),
  closeBuildForm: document.querySelector("#closeBuildForm"),
  buildFormModal: document.querySelector("#buildFormModal"),
  buildDeleteModal: document.querySelector("#buildDeleteModal"),
  buildDeleteGuide: document.querySelector("#buildDeleteGuide"),
  buildDeletePassword: document.querySelector("#buildDeletePassword"),
  buildDeleteStatus: document.querySelector("#buildDeleteStatus"),
  cancelBuildDelete: document.querySelector("#cancelBuildDelete"),
  confirmBuildDelete: document.querySelector("#confirmBuildDelete"),
  copyCurrentBuild: document.querySelector("#copyCurrentBuild"),
  sharedBuildView: document.querySelector("#sharedBuildView"),
  buildList: document.querySelector("#buildList"),
  essencePickerModal: document.querySelector("#essencePickerModal"),
  essencePickerClose: document.querySelector("#essencePickerClose"),
  essencePickerSearch: document.querySelector("#essencePickerSearch"),
  essencePickerFloor: document.querySelector("#essencePickerFloor"),
  essencePickerArea: document.querySelector("#essencePickerArea"),
  essencePickerTable: document.querySelector("#essencePickerTable"),
  quickEditModal: document.querySelector("#quickEditModal"),
  quickEditForm: document.querySelector("#quickEditForm"),
  quickEditClose: document.querySelector("#quickEditClose"),
  quickEditNickname: document.querySelector("#quickEditNickname"),
  quickEditOriginalMonster: document.querySelector("#quickEditOriginalMonster"),
  quickEditMonster: document.querySelector("#quickEditMonster"),
  quickEditGrade: document.querySelector("#quickEditGrade"),
  quickEditFloor: document.querySelector("#quickEditFloor"),
  quickEditArea: document.querySelector("#quickEditArea"),
  quickEditStats: document.querySelector("#quickEditStats"),
  quickEditPassive: document.querySelector("#quickEditPassive"),
  quickEditActive: document.querySelector("#quickEditActive"),
  quickEditActive2: document.querySelector("#quickEditActive2"),
  quickEditActive3: document.querySelector("#quickEditActive3"),
  quickEditSailing: document.querySelector("#quickEditSailing"),
  quickEditRecommendations: document.querySelectorAll(".quick-edit-recommendation"),
  quickEditStatus: document.querySelector("#quickEditStatus"),
};

let approvedReports = loadStoredRows(storageKeys.approved);
let approvedReportItems = loadStoredRows(storageKeys.approvedReportItems);
let pendingReports = loadStoredRows(storageKeys.pending);
let savedBuilds = loadStoredRows(storageKeys.builds);
let buildLikes = new Map();
let buildLikeRecordIds = new Set();
let likedBuildIds = new Set();
let buildLikeIpPromise = null;
let pendingDeleteBuild = null;
let essenceRows = mergeApprovedRows(data["정수"] || [], approvedReports);
let numbersRows = mergeNumbersRows(data["넘버스"] || [], approvedReportItems);
let adminUnlocked = localStorage.getItem(storageKeys.adminUnlocked) === "1";
let activeEssenceInput = null;
let activeStatNames = [];
let activeEffectSortKey = "";
let pinnedEssenceNames = loadStoredRows(storageKeys.pinnedEssences);
let homeNotices = [];
let activeHomeNoticeFilter = "all";
let activeHomeNoticePage = 1;
const homeNoticePageSize = 10;
let activeNumbersPage = 1;
const numbersPageSize = 10;
const statNoneLabel = "스탯 선택 안 함";

function revealCurrentNavItem() {
  const current = document.querySelector(".site-nav [aria-current='page']");
  if (!current || window.innerWidth > 720) return;
  current.scrollIntoView({ block: "nearest", inline: "center" });
}

function textOf(value) {
  return String(value ?? "").trim();
}

function currentAuthNickname() {
  return textOf(window.DUKHUBUSTERS_AUTH?.getDisplayName?.());
}

function requireLoggedInNickname(statusTarget, actionLabel = "등록") {
  const user = window.DUKHUBUSTERS_AUTH?.getUser?.();
  if (!user) {
    if (statusTarget) {
      statusTarget.textContent = `${actionLabel}하려면 Google 로그인이 필요합니다.`;
      statusTarget.className = "build-sync-status is-offline";
    }
    window.DUKHUBUSTERS_AUTH?.signIn?.();
    return false;
  }
  if (!window.DUKHUBUSTERS_AUTH?.hasNickname?.()) {
    if (statusTarget) {
      statusTarget.textContent = `${actionLabel}하려면 닉네임을 먼저 설정해주세요.`;
      statusTarget.className = "build-sync-status is-offline";
    }
    window.DUKHUBUSTERS_AUTH?.openNickname?.();
    return false;
  }
  return true;
}

function normalizeLocationName(value) {
  return textOf(value).replace(/\s+/g, "").toLowerCase();
}

function sameLocationName(left, right) {
  return normalizeLocationName(left) === normalizeLocationName(right);
}

function sailingValue(value) {
  return ["1", "true", "yes", "y", "o", "항해"].includes(textOf(value).toLowerCase());
}

function activeSkillsWithoutSailing(value) {
  return splitSkills(value)
    .filter((skill) => skill !== sailingMarker
      && !skill.startsWith(recommendationMarkerPrefix)
      && !skill.startsWith(authorNicknameMarkerPrefix))
    .join("\n") || "-";
}

function isSailingRow(row) {
  return sailingValue(row?.["항해"]) || splitSkills(row?.["액티브"]).includes(sailingMarker);
}

function recommendedCharactersFrom(value) {
  return textOf(value).split(",").map(textOf).filter(Boolean);
}

function recommendedCharacterFromActive(value) {
  const marker = splitSkills(value).find((skill) => skill.startsWith(recommendationMarkerPrefix));
  return marker ? marker.slice(recommendationMarkerPrefix.length) : "";
}

function authorNicknameFromActive(value) {
  const marker = splitSkills(value).find((skill) => skill.startsWith(authorNicknameMarkerPrefix));
  return marker ? marker.slice(authorNicknameMarkerPrefix.length) : "";
}

function isRecommendedFor(row, character) {
  return recommendedCharactersFrom(row?.["추천 캐릭터"]).includes(character);
}

function reportActiveForStorage(report) {
  const skills = splitSkills(report.active)
    .filter((skill) => skill !== sailingMarker && !skill.startsWith(recommendationMarkerPrefix));
  if (report.sailing) skills.push(sailingMarker);
  if (report.recommendedCharacters) skills.push(`${recommendationMarkerPrefix}${report.recommendedCharacters}`);
  if (report.authorNickname) skills.push(`${authorNicknameMarkerPrefix}${report.authorNickname}`);
  return skills.join("\n") || "-";
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

function monsterKey(value) {
  return textOf(value).toLowerCase();
}

function isPinnedEssence(row) {
  return pinnedEssenceNames.map(monsterKey).includes(monsterKey(row?.["몬스터"]));
}

function savePinnedEssences() {
  pinnedEssenceNames = unique(pinnedEssenceNames.map(textOf).filter(Boolean));
  saveStoredRows(storageKeys.pinnedEssences, pinnedEssenceNames);
}

function mergeApprovedRows(baseRows, approvedRows) {
  const merged = [...baseRows];
  [...approvedRows].reverse().forEach((row) => {
    const monster = textOf(row["몬스터"]);
    const originalMonster = textOf(row["_originalMonster"]) || monster;
    const originalIndex = merged.findIndex((item) => textOf(item["몬스터"]) === originalMonster);
    const index = originalIndex >= 0
      ? originalIndex
      : merged.findIndex((item) => textOf(item["몬스터"]) === monster);
    if (index >= 0) {
      merged[index] = { ...merged[index], ...row };
    } else {
      merged.unshift(row);
    }
  });
  return merged;
}

function isNumbersReport(report) {
  return textOf(report?.monster).startsWith(numbersReportPrefix);
}

function visibleReportName(report) {
  return isNumbersReport(report) ? textOf(report.monster).slice(numbersReportPrefix.length) : textOf(report.monster);
}

function numbersReportToRow(report) {
  return {
    "_reportId": report.id,
    "번호": report.floor,
    "이름": visibleReportName(report),
    "효과": report.stats,
    "아이템 레벨(Lv)": report.grade,
    "착용부위": report.area === "-" ? "" : report.area,
    "획득처": report.passive === "-" ? "" : report.passive,
  };
}

function isNumbersDeleteReport(report) {
  return report?.mode === "delete" || splitSkills(report?.active || "").includes(numbersDeleteMarker);
}

function mergeNumbersRows(baseRows, reports) {
  const merged = [...baseRows];
  reports.filter((report) => report.status === "approved" && isNumbersReport(report)).forEach((report) => {
    if (isNumbersDeleteReport(report)) {
      const deleteName = visibleReportName(report);
      const index = merged.findIndex((item) => textOf(item["이름"]) === deleteName);
      if (index >= 0) merged.splice(index, 1);
      return;
    }
    const row = numbersReportToRow(report);
    const index = merged.findIndex((item) => textOf(item["이름"]) === textOf(row["이름"]));
    if (index >= 0) merged[index] = { ...merged[index], ...row };
    else merged.unshift(row);
  });
  return merged;
}

function numberFrom(value) {
  const match = textOf(value).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Infinity;
}

function displayNumber(value) {
  const number = textOf(value);
  return /^\d+$/.test(number) ? `#${number}` : number || "미확인";
}

function numberCodeClass(value) {
  return /^\d+$/.test(textOf(value)) ? "number-code" : "number-code is-unknown";
}

function displayLevel(value) {
  const level = textOf(value);
  return level ? `Lv ${level}` : "미확인";
}

function numberReportUrl(row, mode = "edit") {
  const params = new URLSearchParams({
    dataset: "numbers",
    mode,
    number: textOf(row["이름"]),
  });
  return `./report.html?${params.toString()}`;
}

function cooldownOf(row) {
  const cooldowns = [...textOf(row["액티브"]).matchAll(/(\d+)\s*s/gi)].map((match) => Number(match[1]));
  return cooldowns.length ? Math.min(...cooldowns) : Infinity;
}

function selectedEffectSort() {
  return effectSortDefinitions[activeEffectSortKey] || null;
}

function effectText(row) {
  return [row["효과"], row["패시브"], row["액티브"]].map(textOf).join("\n");
}

function effectMatchLines(row, effect) {
  return effectText(row)
    .split(/\r?\n|\//)
    .map((line) => line.replace(/\(\d+\s*s\)/gi, "").trim())
    .filter((line) => effect.pattern.test(line));
}

function effectSortScore(row, effect) {
  const lines = effectMatchLines(row, effect);
  if (!lines.length) return { matched: false, value: 0, penalized: false };
  const values = (effect.scorePatterns || []).flatMap((pattern) =>
    lines.map((line) => line.match(pattern)?.[1]).filter(Boolean).map((value) => Math.abs(Number(value)))
  );
  return {
    matched: true,
    value: values.length ? Math.max(...values) : 0,
    penalized: Boolean(effect.penaltyPattern && lines.some((line) => effect.penaltyPattern.test(line))),
  };
}

function floorRank(value) {
  const floor = textOf(value);
  const knownIndex = floorOptions.indexOf(floor);
  if (knownIndex >= 0) return knownIndex;
  const match = floor.match(/\d+/);
  return match ? Number(match[0]) * 10 + (floor.includes("균열") ? 1 : 0) : 999;
}

function unique(values) {
  return [...new Set(values.map(textOf).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
}

function optionList(select, values, allLabel) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = [allLabel, ...values]
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function placeholderOptionList(select, values, placeholder) {
  optionList(select, values, placeholder);
  if (select?.options?.[0]) select.options[0].value = "";
}

function selectedOptionValues(select) {
  return [...(select?.selectedOptions || [])].map((option) => option.value).filter(Boolean);
}

function setSelectedOptionValues(select, values) {
  const wanted = new Set(values.map(textOf).filter(Boolean));
  [...(select?.options || [])].forEach((option) => {
    option.selected = wanted.has(option.value);
  });
}

function multiOptionList(select, values) {
  if (!select) return;
  const selected = new Set(selectedOptionValues(select));
  select.innerHTML = values
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  [...select.options].forEach((option) => {
    option.selected = selected.has(option.value);
  });
}

function floorOptionValues(rows = []) {
  const extras = unique(rows.map((row) => row["층"])).filter((floor) => !floorOptions.includes(floor));
  return [...floorOptions, ...extras];
}

function allConfiguredAreas() {
  return Object.values(crackAreasByFloor).flat();
}

function areaOptionsForFloor(floor, rows = []) {
  if (crackAreasByFloor[floor]) return crackAreasByFloor[floor];
  if (floor && floor !== "전체 층") {
    return unique(rows.filter((row) => sameLocationName(row["층"], floor)).map((row) => row["구역"]));
  }
  return unique([...allConfiguredAreas(), ...rows.map((row) => row["구역"])]);
}

function refreshEssenceAreaOptions() {
  optionList(els.area, areaOptionsForFloor(els.floor?.value, essenceRows), "전체 구역");
}

function refreshReportAreaOptions() {
  placeholderOptionList(els.reportArea, areaOptionsForFloor(els.reportFloor?.value, essenceRows), "구역 선택");
}

function sourceAreaLabels(source) {
  const normalizedSource = normalizeLocationName(source);
  const configuredMatches = [...areaLabelLookup.entries()]
    .filter(([normalizedArea]) => normalizedSource.includes(normalizedArea))
    .sort(([left], [right]) => normalizedSource.indexOf(left) - normalizedSource.indexOf(right))
    .map(([, label]) => label);
  if (configuredMatches.length) return unique(configuredMatches);
  return unique(textOf(source).split(/[,\u3001/]/).map((part) => areaLabelLookup.get(normalizeLocationName(part)) || textOf(part)).filter(Boolean));
}

function sourcePillList(value) {
  const sources = sourceAreaLabels(value);
  if (!sources.length) return `<span class="muted">-</span>`;
  return `<div class="source-pill-list">${sources
    .map((source) => `<span class="source-pill">${escapeHtml(source)}</span>`)
    .join("")}</div>`;
}

function firstSourceAreaLabel(source) {
  return sourceAreaLabels(source)[0] || "";
}

function sourceMatchesArea(source, area) {
  return normalizeLocationName(source).includes(normalizeLocationName(area));
}

function numberSourceMatchesFloor(row, floor) {
  const source = textOf(row["획득처"]);
  const configuredAreas = crackAreasByFloor[floor] || [];
  if (configuredAreas.length) return configuredAreas.some((area) => sourceMatchesArea(source, area));
  return normalizeLocationName(source).includes(normalizeLocationName(floor));
}

function numberSourceMatchesArea(row, area) {
  return sourceMatchesArea(row["획득처"], area);
}

function numbersAreaOptionsForFloor(floor) {
  if (crackAreasByFloor[floor]) return crackAreasByFloor[floor];
  const rows = floor && floor !== "전체 층"
    ? numbersRows.filter((row) => numberSourceMatchesFloor(row, floor))
    : numbersRows;
  const configured = floor && floor !== "전체 층" ? [] : allConfiguredAreas();
  return unique([...configured, ...rows.flatMap((row) => sourceAreaLabels(row["획득처"]))]);
}

function refreshNumbersAreaOptions() {
  optionList(els.numbersArea, numbersAreaOptionsForFloor(els.numbersFloor?.value), "전체 구역");
}

function refreshNumbersControls() {
  optionList(els.numbersFloor, floorOptions, "전체 층");
  refreshNumbersAreaOptions();
  optionList(els.numbersLevel, unique(numbersRows.map((row) => row["아이템 레벨(Lv)"])), "전체 레벨");
}

function refreshReportNumberSourceOptions() {
  multiOptionList(els.reportNumberSource, numbersAreaOptionsForFloor(els.reportNumberSourceFloor?.value));
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
  revealCurrentNavItem();
  if (els.homeNoticeList) initHomeNotices();
  if (els.search) initEssences();
  if (els.numbersResults) initNumbers();
  if (els.reportForm) initReport();
  else if (els.pendingReports) initAdminReview();
  if (els.buildForm) initBuilds();
  if (els.timeResult) initMazeTime();
  if (els.visitorToday) recordVisit();
}

function initHomeNotices() {
  els.homeNoticeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-notice-filter]");
    if (!button) return;
    activeHomeNoticeFilter = button.dataset.noticeFilter;
    activeHomeNoticePage = 1;
    els.homeNoticeFilters.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    renderHomeNotices();
  });
  els.homeNoticePagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-notice-page]");
    if (!button) return;
    activeHomeNoticePage = Number(button.dataset.noticePage) || 1;
    renderHomeNotices();
  });
  loadHomeNotices();
}

function recentNoticeDate(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function recentNoticeDateLabel(value) {
  const date = recentNoticeDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

function noticeWithinWeek(value) {
  const date = recentNoticeDate(value);
  return date && date.getTime() >= Date.now() - (7 * 24 * 60 * 60 * 1000);
}

function homeNoticeLink(type, id, row) {
  if (type === "essence") return `./essences.html?search=${encodeURIComponent(visibleReportName(row))}#results`;
  if (type === "numbers") return `./numbers.html?search=${encodeURIComponent(visibleReportName(row))}#numbersResults`;
  if (type === "guide") return `./guides.html?post=${encodeURIComponent(id)}`;
  return `./builds.html?build=${encodeURIComponent(encodeBuild(normalizeRemoteBuild(row)))}`;
}

function noticeFromReport(row) {
  const report = normalizeRemoteReport(row);
  const numbers = isNumbersReport(report);
  const date = report.reviewedAt || report.createdAt;
  if (!noticeWithinWeek(date)) return null;
  return {
    id: report.id,
    type: numbers ? "numbers" : "essence",
    label: numbers ? "넘버스" : "정수",
    title: visibleReportName(report),
    summary: numbers
      ? `${displayNumber(report.floor)} · ${displayLevel(report.grade)} · ${report.passive || "획득처 미기록"}`
      : `${report.floor || "층 미기록"} · ${report.area || "구역 미기록"} · ${report.grade || "등급 미기록"}`,
    date,
    href: homeNoticeLink(numbers ? "numbers" : "essence", report.id, report),
  };
}

function homeBuildNotices(rows) {
  const deletedIds = new Set(rows
    .filter((row) => row.title === buildDeleteMarker)
    .map((row) => textOf(row.note))
    .filter(Boolean));
  return rows
    .filter((row) => row.title !== buildLikeMarker && row.title !== buildDeleteMarker
      && row.title !== visitorBuildMarkers.total && row.title !== visitorBuildMarkers.daily
      && !deletedIds.has(row.id) && noticeWithinWeek(row.created_at || row.createdAt))
    .map((row) => {
      const build = normalizeRemoteBuild(row);
      return {
        id: build.id,
        type: "build",
        label: "빌드공유",
        title: build.title || "이름 없는 빌드",
        summary: `${build.author || "익명"} · ${build.members.length}명 구성`,
        date: build.createdAt,
        href: homeNoticeLink("build", build.id, row),
      };
    });
}

function homeGuideNotices(rows) {
  return rows
    .filter((row) => !textOf(row.title).startsWith("__guide_comment__:")
      && !textOf(row.title).startsWith("__guide_like__:")
      && noticeWithinWeek(row.updated_at || row.created_at))
    .map((row) => {
      const title = textOf(row.title).replace(/^\[(보스|파밍|빌드|정보)\]\s*/, "");
      const category = textOf(row.title).match(/^\[(보스|파밍|빌드|정보)\]/)?.[1] || "일반";
      return {
        id: row.id,
        type: "guide",
        label: "공략글",
        title,
        summary: `${category} · ${textOf(row.author) || "익명"}`,
        date: row.updated_at || row.created_at,
        href: homeNoticeLink("guide", row.id, row),
      };
    });
}

async function loadHomeNotices() {
  if (!reportBackend.url || !reportBackend.anonKey || !buildBackend.url || !buildBackend.anonKey
    || !guideBackend.url || !guideBackend.anonKey) {
    els.homeNoticeStatus.textContent = "공개 저장소가 연결되면 최근 공지사항이 표시됩니다.";
    renderHomeNotices();
    return;
  }
  const requests = await Promise.allSettled([
    fetch(reportStoreUrl("?select=*&status=eq.approved&order=reviewed_at.desc"), { headers: reportStoreHeaders() }),
    fetch(buildStoreUrl("?select=*&order=created_at.desc"), { headers: buildStoreHeaders() }),
    fetch(`${guideBackend.url}/rest/v1/${guideBackend.table}?select=*&order=updated_at.desc`, {
      headers: { apikey: guideBackend.anonKey, Authorization: `Bearer ${guideBackend.anonKey}` },
    }),
  ]);
  const [reports, builds, guides] = await Promise.all(requests.map(async (request) => {
    if (request.status !== "fulfilled" || !request.value.ok) return [];
    return request.value.json();
  }));
  homeNotices = [
    ...reports.map(noticeFromReport).filter(Boolean),
    ...homeBuildNotices(builds),
    ...homeGuideNotices(guides),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const failedCount = requests.filter((request) => request.status !== "fulfilled" || !request.value.ok).length;
  els.homeNoticeStatus.textContent = failedCount
    ? "일부 최근 소식을 불러오지 못했습니다. 잠시 후 다시 확인해주세요."
    : "항목을 누르면 해당 정보 화면으로 바로 이동합니다.";
  renderHomeNotices();
}

function renderHomeNotices() {
  const types = [
    { key: "essence", label: "정수" },
    { key: "numbers", label: "넘버스" },
    { key: "build", label: "빌드공유" },
    { key: "guide", label: "공략글" },
  ];
  els.homeNoticeCounts.innerHTML = types.map((type) => `
    <span class="home-notice-count type-${type.key}">
      <b>${escapeHtml(type.label)}</b>
      <strong>${homeNotices.filter((item) => item.type === type.key).length}</strong>
    </span>
  `).join("");
  const visible = activeHomeNoticeFilter === "all"
    ? homeNotices
    : homeNotices.filter((item) => item.type === activeHomeNoticeFilter);
  const pageCount = Math.max(1, Math.ceil(visible.length / homeNoticePageSize));
  activeHomeNoticePage = Math.min(activeHomeNoticePage, pageCount);
  const pageStart = (activeHomeNoticePage - 1) * homeNoticePageSize;
  const pageNotices = visible.slice(pageStart, pageStart + homeNoticePageSize);
  els.homeNoticeList.innerHTML = pageNotices.length
    ? pageNotices.map((notice) => `
      <a class="home-notice-item type-${escapeHtml(notice.type)}" href="${escapeHtml(notice.href)}">
        <span class="home-notice-type">${escapeHtml(notice.label)}</span>
        <span class="home-notice-copy">
          <strong>${escapeHtml(notice.title)}</strong>
          <small>${escapeHtml(notice.summary)}</small>
        </span>
        <time datetime="${escapeHtml(notice.date)}">${escapeHtml(recentNoticeDateLabel(notice.date))}</time>
        <i aria-hidden="true">보기</i>
      </a>
    `).join("")
    : `<div class="home-notice-empty">최근 7일 내 공개된 ${activeHomeNoticeFilter === "all" ? "새 소식이" : "항목이"} 없습니다.</div>`;
  els.homeNoticePagination.innerHTML = visible.length > homeNoticePageSize
    ? Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button type="button" data-notice-page="${page}" class="${page === activeHomeNoticePage ? "is-active" : ""}"${page === activeHomeNoticePage ? ' aria-current="page"' : ""}>${page}</button>`;
    }).join("")
    : "";
}

function initNumbers() {
  els.numbersSearch.value = new URLSearchParams(location.search).get("search") || "";
  refreshNumbersControls();
  els.numbersSearch.addEventListener("input", () => {
    activeNumbersPage = 1;
    renderNumbers();
  });
  els.numbersFloor.addEventListener("change", () => {
    refreshNumbersAreaOptions();
    activeNumbersPage = 1;
    renderNumbers();
  });
  els.numbersArea.addEventListener("change", () => {
    activeNumbersPage = 1;
    renderNumbers();
  });
  els.numbersLevel.addEventListener("change", () => {
    activeNumbersPage = 1;
    renderNumbers();
  });
  els.numbersSort.addEventListener("change", () => {
    activeEffectSortKey = "";
    activeNumbersPage = 1;
    renderNumbersEffectSortChips();
    renderNumbers();
  });
  els.numbersPagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-numbers-page]");
    if (!button) return;
    activeNumbersPage = Number(button.dataset.numbersPage) || 1;
    renderNumbers();
    els.numbersResults.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  renderNumbersEffectSortChips();
  renderNumbers();
  loadPublicApprovedReports();
}

function initEssences() {
  els.search.value = new URLSearchParams(location.search).get("search") || "";
  refreshControls();
  renderEffectSortChips();
  renderStatChips();

  els.sort.addEventListener("change", () => {
    if (els.sort.value !== "default") {
      activeEffectSortKey = "";
      renderEffectSortChips();
    }
  });

  els.statSort.addEventListener("change", () => {
    const value = els.statSort.value;
    activeStatNames = value && value !== statNoneLabel ? [value] : [];
    if (activeStatNames.length) {
      activeEffectSortKey = "";
      renderEffectSortChips();
    }
    render();
  });

  els.floor.addEventListener("change", refreshEssenceAreaOptions);

  document.querySelectorAll(".compact-layout input, .compact-layout select").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  els.results.addEventListener("change", handleEssenceResultChange);
  els.results.addEventListener("click", handleEssenceResultClick);
  initQuickEditModal();
  render();
  loadPublicApprovedReports();
}

function initQuickEditModal() {
  if (!els.quickEditModal || !els.quickEditForm) return;
  placeholderOptionList(els.quickEditFloor, floorOptionValues(essenceRows), "층 선택");
  refreshQuickEditAreaOptions();
  els.quickEditFloor.addEventListener("change", refreshQuickEditAreaOptions);
  els.quickEditClose.addEventListener("click", closeQuickEditModal);
  els.quickEditModal.addEventListener("click", (event) => {
    if (event.target === els.quickEditModal) closeQuickEditModal();
  });
  els.quickEditForm.addEventListener("submit", submitQuickEditReport);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.quickEditModal.hidden) closeQuickEditModal();
  });
}

function initMazeTime() {
  [els.gameDays, els.gameHours, els.currentCondition].forEach((field) => {
    field.addEventListener("input", renderTime);
    field.addEventListener("change", renderTime);
  });
  renderTime();
}

function initReport() {
  fillMonsterOptions();
  updateReportDataset();
  els.reportDataset.addEventListener("change", updateReportDataset);
  els.reportMode.addEventListener("change", updateReportMode);
  els.reportFloor.addEventListener("change", refreshReportAreaOptions);
  els.reportNumberSourceFloor.addEventListener("change", refreshReportNumberSourceOptions);
  els.reportMonster.addEventListener("input", handleReportMonsterInput);
  els.reportNumberName.addEventListener("input", handleReportNumberInput);
  els.editMonsterMatches.addEventListener("click", handleEditMonsterClick);
  els.editNumberMatches.addEventListener("click", handleEditNumberClick);
  els.reportForm.addEventListener("submit", submitReport);
  els.pendingReports.addEventListener("click", handlePendingAction);
  els.approvedReports?.addEventListener("click", handleApprovedAction);
  els.copyApproved.addEventListener("click", copyApprovedRows);
  els.adminUnlock.addEventListener("click", unlockAdmin);
  els.adminLock.addEventListener("click", lockAdmin);
  els.adminCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") unlockAdmin();
  });
  applyReportQueryParams();
  updateAdminUi();
  renderPendingReports();
  renderApprovedReports();
  loadPublicReports();
}

function initAdminReview() {
  adminUnlocked = false;
  els.pendingReports.addEventListener("click", handlePendingAction);
  els.approvedReports?.addEventListener("click", handleApprovedAction);
  els.copyApproved?.addEventListener("click", copyApprovedRows);
  els.adminUnlock?.addEventListener("click", () => window.DUKHUBUSTERS_AUTH?.signIn?.());
  els.adminLock?.addEventListener("click", () => window.DUKHUBUSTERS_AUTH?.signOut?.());
  window.addEventListener("dukhubusters:auth", (event) => updateAdminAccess(event.detail?.user));
  updateAdminAccess(window.DUKHUBUSTERS_AUTH?.getUser?.());
  renderPendingReports();
  renderApprovedReports();
  loadPublicReports();
}

function initBuilds() {
  fillBuildEssenceOptions();
  initEssencePicker();
  renderBuildCharacterSlots();
  loadBuildFromUrl();
  els.buildCharacterCount.addEventListener("change", renderBuildCharacterSlots);
  els.buildCharacterSlots.addEventListener("change", (event) => {
    if (event.target.matches(".build-member-level")) renderBuildCharacterSlots();
    if (event.target.matches(".build-essence-input")) updateBuildActiveSkills(event.target);
    if (event.target.matches(".build-active-color")) {
      const input = event.target.closest(".build-essence-slot")?.querySelector(".build-essence-input");
      if (input) updateBuildActiveSkills(input, ["on"], event.target.value);
    }
  });
  els.buildCharacterSlots.addEventListener("input", (event) => {
    if (event.target.matches(".build-essence-input")) updateBuildActiveSkills(event.target);
  });
  els.buildCharacterSlots.addEventListener("click", handleBuildSlotClick);
  els.buildForm.addEventListener("submit", submitBuild);
  els.copyCurrentBuild.addEventListener("click", copyCurrentBuildLink);
  els.buildSort.addEventListener("change", renderBuilds);
  els.openBuildForm.addEventListener("click", openBuildFormModal);
  els.closeBuildForm.addEventListener("click", closeBuildFormModal);
  els.buildFormModal.addEventListener("click", (event) => {
    if (event.target === els.buildFormModal) closeBuildFormModal();
  });
  els.buildDeleteModal.addEventListener("click", (event) => {
    if (event.target === els.buildDeleteModal) closeBuildDeleteModal();
  });
  els.cancelBuildDelete.addEventListener("click", closeBuildDeleteModal);
  els.confirmBuildDelete.addEventListener("click", confirmBuildDelete);
  els.buildDeletePassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") confirmBuildDelete();
  });
  els.buildList.addEventListener("click", handleBuildListClick);
  renderBuilds();
  loadPublicBuilds();
}

function openBuildFormModal() {
  els.buildFormModal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => els.buildTitle.focus(), 20);
}

function closeBuildFormModal() {
  els.buildFormModal.hidden = true;
  if (els.essencePickerModal.hidden && els.buildDeleteModal.hidden) document.body.classList.remove("modal-open");
}

function initEssencePicker() {
  optionList(els.essencePickerFloor, unique(essenceRows.map((row) => row["층"])), "전체 층");
  optionList(els.essencePickerArea, unique(essenceRows.map((row) => row["구역"])), "전체 구역");
  els.essencePickerClose.addEventListener("click", closeEssencePicker);
  els.essencePickerModal.addEventListener("click", (event) => {
    if (event.target === els.essencePickerModal) closeEssencePicker();
  });
  els.essencePickerSearch.addEventListener("input", renderEssencePickerTable);
  els.essencePickerFloor.addEventListener("change", renderEssencePickerTable);
  els.essencePickerArea.addEventListener("change", renderEssencePickerTable);
  els.essencePickerTable.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-monster]");
    if (!row || !activeEssenceInput) return;
    activeEssenceInput.value = row.dataset.monster;
    updateBuildActiveSkills(activeEssenceInput);
    closeEssencePicker();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!els.essencePickerModal.hidden) closeEssencePicker();
    else if (!els.buildDeleteModal.hidden) closeBuildDeleteModal();
    else if (!els.buildFormModal.hidden) closeBuildFormModal();
  });
  renderEssencePickerTable();
}

function handleBuildSlotClick(event) {
  const button = event.target.closest(".open-essence-picker");
  if (!button) return;
  activeEssenceInput = button.closest(".essence-input-row")?.querySelector(".build-essence-input") || null;
  openEssencePicker();
}

function openEssencePicker() {
  els.essencePickerModal.hidden = false;
  document.body.classList.add("modal-open");
  els.essencePickerSearch.value = "";
  els.essencePickerFloor.value = "전체 층";
  els.essencePickerArea.value = "전체 구역";
  renderEssencePickerTable();
  setTimeout(() => els.essencePickerSearch.focus(), 20);
}

function closeEssencePicker() {
  els.essencePickerModal.hidden = true;
  if (els.buildFormModal.hidden && els.buildDeleteModal.hidden) document.body.classList.remove("modal-open");
}

function essencePickerRows() {
  const query = textOf(els.essencePickerSearch.value).toLowerCase();
  return essenceRows.filter((row) => {
    if (els.essencePickerFloor.value !== "전체 층" && textOf(row["층"]) !== els.essencePickerFloor.value) return false;
    if (els.essencePickerArea.value !== "전체 구역" && textOf(row["구역"]) !== els.essencePickerArea.value) return false;
    if (!query) return true;
    return [
      row["몬스터"],
      row["등급"],
      row["층"],
      row["구역"],
      row["주요 스탯"],
      row["패시브"],
      row["액티브"],
      isSailingRow(row) ? "항해" : "",
    ].some((value) => textOf(value).toLowerCase().includes(query));
  });
}

function renderEssencePickerTable() {
  const rows = essencePickerRows();
  els.essencePickerTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>몬스터</th>
          <th>주요 스탯</th>
          <th>패시브</th>
          <th>액티브</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr data-monster="${escapeHtml(row["몬스터"])}">
            <td data-label="몬스터"><strong>${escapeHtml(row["몬스터"])}</strong>${isSailingRow(row) ? `<span class="sailing-pill">항해</span>` : ""}</td>
            <td data-label="주요 스탯">${escapeHtml(row["주요 스탯"] || "-")}</td>
            <td data-label="패시브">${skillText(row["패시브"])}</td>
            <td data-label="액티브">${skillText(row["액티브"])}</td>
          </tr>
        `).join("") || `<tr><td colspan="4">조건에 맞는 정수가 없습니다.</td></tr>`}
      </tbody>
    </table>
  `;
}

const buildCharacters = ["비요른", "에르웬", "미샤", "아이나르", "레이븐", "아우옌"];

function essenceOptionList() {
  return unique(essenceRows.map((row) => row["몬스터"]));
}

function fillBuildEssenceOptions() {
  els.buildEssenceOptions.innerHTML = essenceOptionList()
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function readMemberDrafts() {
  const cards = [...els.buildCharacterSlots.querySelectorAll(".build-member-card")];
  return cards.map((card) => ({
    character: card.querySelector(".build-member-character")?.value || "",
    level: Number(card.querySelector(".build-member-level")?.value || 1),
    essences: [...card.querySelectorAll(".build-essence-input")].map((input) => input.value),
    activeSkillStates: [...card.querySelectorAll(".build-essence-slot")].map((slot) =>
      [...slot.querySelectorAll(".build-active-skill-state")].map((select) => select.value)
    ),
    activeColors: [...card.querySelectorAll(".build-essence-slot")].map((slot) =>
      slot.querySelector(".build-active-color")?.value || ""
    ),
  }));
}

function levelOptions(selected = 1) {
  return [1, 2, 3, 4, 5, 6]
    .map((level) => `<option value="${level}"${Number(selected) === level ? " selected" : ""}>${level}레벨</option>`)
    .join("");
}

function characterOptions(selected = "") {
  return buildCharacters
    .map((name) => `<option value="${escapeHtml(name)}"${selected === name ? " selected" : ""}>${escapeHtml(name)}</option>`)
    .join("");
}

function activeSkillsForEssence(name) {
  const row = essenceRows.find((item) => textOf(item["몬스터"]) === textOf(name));
  return row ? splitSkills(activeSkillsWithoutSailing(row["액티브"])) : [];
}

const activeColorPattern = /^(빨강|주황|노랑|초록|청록|파랑|보라|검정|갈색|무색)\s*-\s*/;

function activeSkillColor(skill) {
  return textOf(skill).match(activeColorPattern)?.[1] || "";
}

function colorChoiceSkills(skills) {
  const colors = [...new Set(skills.map(activeSkillColor).filter(Boolean))];
  return skills.length > 1 && colors.length > 1 && skills.every((skill) => activeSkillColor(skill));
}

function activeStateOptions(selected = "on") {
  return [
    ["on", "스킬 ON"],
    ["off", "스킬 OFF"],
  ].map(([value, label]) => `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`).join("");
}

function skillShortName(skill) {
  return textOf(skill).split(":")[0] || "액티브";
}

function buildActiveSkillsMarkup(skills, states = []) {
  return skills.map((skill, index) => `
    <label class="build-active-skill">
      <span title="${escapeHtml(skill)}">${escapeHtml(skillShortName(skill))}</span>
      <select class="build-active-skill-state">${activeStateOptions(states[index] || "on")}</select>
    </label>
  `).join("");
}

function buildActiveSettingsMarkup(skills, states = [], selectedColor = "") {
  if (!colorChoiceSkills(skills)) return buildActiveSkillsMarkup(skills, states);
  const selectedSkill = skills.find((skill) => activeSkillColor(skill) === selectedColor) || skills[0];
  const color = activeSkillColor(selectedSkill);
  const selectedIndex = skills.indexOf(selectedSkill);
  const state = states.length === 1 ? states[0] : states[selectedIndex] || "on";
  return `
    <label class="field build-color-choice">
      <span>사용 색상</span>
      <select class="build-active-color">
        ${skills.map((skill) => {
          const skillColor = activeSkillColor(skill);
          return `<option value="${escapeHtml(skillColor)}"${skillColor === color ? " selected" : ""}>${escapeHtml(skillColor)} - ${escapeHtml(skillShortName(skill).replace(activeColorPattern, ""))}</option>`;
        }).join("")}
      </select>
    </label>
    <label class="build-active-skill build-selected-color-skill">
      <span><i class="essence-color-pill color-${escapeHtml(color)}">${escapeHtml(color)}</i>${escapeHtml(skillShortName(selectedSkill).replace(activeColorPattern, ""))}</span>
      <select class="build-active-skill-state">${activeStateOptions(state)}</select>
    </label>
  `;
}

function updateBuildActiveSkills(input, states = [], selectedColor = "") {
  const slot = input.closest(".build-essence-slot");
  if (!slot) return;
  const control = slot.querySelector(".build-active-toggle");
  const skills = activeSkillsForEssence(input.value);
  control.hidden = !skills.length;
  control.querySelector(".build-active-skills").innerHTML = buildActiveSettingsMarkup(skills, states, selectedColor);
}

function renderBuildCharacterSlots() {
  const drafts = readMemberDrafts();
  const count = Number(els.buildCharacterCount.value || 1);
  els.buildCharacterSlots.innerHTML = Array.from({ length: count }, (_, index) => {
    const draft = drafts[index] || {};
    const character = draft.character || buildCharacters[index] || buildCharacters[0];
    const level = Number(draft.level || 1);
    const essenceInputs = Array.from({ length: level }, (__, essenceIndex) => {
      const name = draft.essences?.[essenceIndex] || "";
      const skills = activeSkillsForEssence(name);
      const states = draft.activeSkillStates?.[essenceIndex]
        || skills.map(() => draft.activeStates?.[essenceIndex] || "on");
      const selectedColor = draft.activeColors?.[essenceIndex] || "";
      return `
        <div class="build-essence-slot">
          <label class="field">
            <span>정수 ${essenceIndex + 1}</span>
            <span class="essence-input-row">
              <input class="build-essence-input" list="buildEssenceOptions" placeholder="정수 선택, 직접 입력, 빈칸 가능" value="${escapeHtml(name)}">
              <button class="open-essence-picker" type="button">선택</button>
            </span>
          </label>
          <div class="field build-active-toggle"${skills.length ? "" : " hidden"}>
            <span>액티브 스킬별 설정</span>
            <div class="build-active-skills">${buildActiveSettingsMarkup(skills, states, selectedColor)}</div>
          </div>
        </div>
      `;
    }).join("");
    return `
      <section class="build-member-card">
        <div class="build-member-head">
          <strong>캐릭터 ${index + 1}</strong>
          <label class="field">
            <span>캐릭터</span>
            <select class="build-member-character">${characterOptions(character)}</select>
          </label>
          <label class="field">
            <span>레벨</span>
            <select class="build-member-level">${levelOptions(level)}</select>
          </label>
        </div>
        <div class="build-essence-slots">${essenceInputs}</div>
      </section>
    `;
  }).join("");
}

function normalizeBuild(build) {
  const members = Array.isArray(build.members) ? build.members : [{
    character: build.character || "비요른",
    level: Number(build.level || 1),
    essences: build.essences || [],
  }];
  return {
    ...build,
    members: members.map((member) => ({
      ...member,
      essences: Array.isArray(member.essences) ? member.essences : [],
      activeStates: Array.isArray(member.activeStates) ? member.activeStates : [],
      activeSkillStates: Array.isArray(member.activeSkillStates) ? member.activeSkillStates : [],
      activeColors: Array.isArray(member.activeColors) ? member.activeColors : [],
    })),
    deleteHash: build.deleteHash || members[0]?._deleteHash || "",
  };
}

function readBuildMembers() {
  return [...els.buildCharacterSlots.querySelectorAll(".build-member-card")].map((card) => {
    const level = Number(card.querySelector(".build-member-level").value || 1);
    return {
      character: card.querySelector(".build-member-character").value,
      level,
      essences: [...card.querySelectorAll(".build-essence-input")].map((input) => textOf(input.value)),
      activeSkillStates: [...card.querySelectorAll(".build-essence-slot")].map((slot) =>
        [...slot.querySelectorAll(".build-active-skill-state")].map((select) => select.value)
      ),
      activeColors: [...card.querySelectorAll(".build-essence-slot")].map((slot) =>
        slot.querySelector(".build-active-color")?.value || ""
      ),
    };
  });
}

function hasPublicBuildStore() {
  return Boolean(buildBackend.url && buildBackend.anonKey);
}

function buildStoreHeaders(extra = {}) {
  return {
    apikey: buildBackend.anonKey,
    Authorization: `Bearer ${buildBackend.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function buildStoreUrl(query = "") {
  return `${buildBackend.url}/rest/v1/${buildBackend.table}${query}`;
}

function setBuildSyncStatus(message, mode = "") {
  if (!els.buildSyncStatus) return;
  els.buildSyncStatus.textContent = message;
  els.buildSyncStatus.className = `build-sync-status ${mode}`.trim();
}

function normalizeRemoteBuild(row) {
  return normalizeBuild({
    id: row.id,
    title: row.title,
    author: row.author || "익명",
    members: Array.isArray(row.members) ? row.members : [],
    note: row.note || "",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  });
}

function isVisitorBuild(build) {
  return build?.title === visitorBuildMarkers.total || build?.title === visitorBuildMarkers.daily;
}

function isBuildLike(build) {
  return build?.title === buildLikeMarker;
}

function isBuildDelete(build) {
  return build?.title === buildDeleteMarker;
}

function collectPublicBuildRows(rows) {
  const normalizedRows = rows.map(normalizeRemoteBuild);
  buildLikes = new Map();
  buildLikeRecordIds = new Set();
  normalizedRows.filter(isBuildLike).forEach((like) => {
    const buildId = textOf(like.note);
    if (!buildId) return;
    buildLikes.set(buildId, (buildLikes.get(buildId) || 0) + 1);
    buildLikeRecordIds.add(like.id);
  });
  const deletedIds = new Set(normalizedRows.filter(isBuildDelete).map((build) => textOf(build.note)).filter(Boolean));
  savedBuilds = normalizedRows.filter((build) => !isVisitorBuild(build) && !isBuildLike(build) && !isBuildDelete(build) && !deletedIds.has(build.id));
}

function prependBuild(build) {
  savedBuilds = [build, ...savedBuilds.filter((item) => item.id !== build.id)]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  saveStoredRows(storageKeys.builds, savedBuilds);
}

async function loadPublicBuilds() {
  if (!hasPublicBuildStore()) {
    setBuildSyncStatus("공개 저장소 연결 전입니다. 지금 등록한 빌드는 이 브라우저에만 임시 저장됩니다.", "is-offline");
    return;
  }
  setBuildSyncStatus("공개 빌드 목록을 불러오는 중입니다.", "is-online");
  try {
    const response = await fetch(buildStoreUrl("?select=*&order=created_at.desc"), {
      headers: buildStoreHeaders(),
    });
    if (!response.ok) throw new Error(`load failed: ${response.status}`);
    collectPublicBuildRows(await response.json());
    saveStoredRows(storageKeys.builds, savedBuilds);
    renderBuilds();
    markLikedBuildsForVisitor();
    setBuildSyncStatus("공개 저장소에 연결되었습니다. 등록한 빌드는 모든 방문자에게 표시됩니다.", "is-online");
  } catch {
    setBuildSyncStatus("공개 저장소 연결에 실패해 임시 저장 목록을 보여줍니다.", "is-offline");
    renderBuilds();
  }
}

async function buildLikeIp() {
  if (!buildLikeIpPromise) {
    buildLikeIpPromise = fetch("https://api64.ipify.org?format=json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("ip unavailable");
        return response.json();
      })
      .then((row) => textOf(row.ip));
  }
  return buildLikeIpPromise;
}

async function buildLikeId(buildId) {
  const ip = await buildLikeIp();
  if (!ip) throw new Error("ip unavailable");
  const source = new TextEncoder().encode(`dukhubusters:build-like:${buildId}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `like-${hash}`;
}

async function markLikedBuildsForVisitor() {
  try {
    const entries = await Promise.all(savedBuilds.map(async (build) => [build.id, await buildLikeId(build.id)]));
    likedBuildIds = new Set(entries.filter((entry) => buildLikeRecordIds.has(entry[1])).map((entry) => entry[0]));
    renderBuilds();
  } catch {
    likedBuildIds = new Set();
  }
}

async function savePublicBuildLike(build) {
  const likeId = await buildLikeId(build.id);
  if (buildLikeRecordIds.has(likeId)) {
    likedBuildIds.add(build.id);
    renderBuilds();
    return;
  }
  const response = await fetch(buildStoreUrl(), {
    method: "POST",
    headers: buildStoreHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify({
      id: likeId,
      title: buildLikeMarker,
      author: "like",
      members: [],
      note: build.id,
      created_at: new Date().toISOString(),
    }),
  });
  if (!response.ok && response.status !== 409) throw new Error(`like failed: ${response.status}`);
  likedBuildIds.add(build.id);
  await loadPublicBuilds();
}

async function savePublicBuild(build) {
  const members = build.members.map((member, index) => index === 0
    ? { ...member, _deleteHash: build.deleteHash || "" }
    : member);
  const response = await fetch(buildStoreUrl(), {
    method: "POST",
    headers: buildStoreHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      id: build.id,
      title: build.title,
      author: build.author,
      members,
      note: build.note,
      created_at: build.createdAt,
    }),
  });
  if (!response.ok) throw new Error(`save failed: ${response.status}`);
  const rows = await response.json();
  return normalizeRemoteBuild(rows[0] || build);
}

async function buildDeleteHash(buildId, password) {
  const source = new TextEncoder().encode(`dukhubusters:build-delete:${buildId}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readBuildForm() {
  const members = readBuildMembers();
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title: textOf(els.buildTitle.value),
    author: textOf(els.buildAuthor.value) || "익명",
    members,
    note: textOf(els.buildNote.value),
    createdAt: new Date().toISOString(),
  };
}

async function submitBuild(event) {
  event.preventDefault();
  const build = readBuildForm();
  build.deleteHash = await buildDeleteHash(build.id, textOf(els.buildPassword.value));
  const submitButton = els.buildForm.querySelector("[type='submit']");
  if (submitButton) submitButton.disabled = true;
  try {
    const saved = hasPublicBuildStore() ? await savePublicBuild(build) : build;
    prependBuild(saved);
    els.buildForm.reset();
    renderBuildCharacterSlots();
    renderBuilds();
    closeBuildFormModal();
    setBuildSyncStatus(
      hasPublicBuildStore()
        ? "빌드가 공개 저장소에 등록되었습니다."
        : "공개 저장소 연결 전이라 이 브라우저에 임시 저장했습니다.",
      hasPublicBuildStore() ? "is-online" : "is-offline"
    );
  } catch {
    prependBuild(build);
    renderBuilds();
    setBuildSyncStatus("공개 저장소 저장에 실패해 이 브라우저에 임시 저장했습니다.", "is-offline");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

function applyBuildToForm(build) {
  if (!build) return;
  const normalized = normalizeBuild(build);
  els.buildTitle.value = build.title || "";
  els.buildAuthor.value = build.author || "";
  els.buildCharacterCount.value = String(Math.min(Math.max(normalized.members.length, 1), 5));
  renderBuildCharacterSlots();
  els.buildCharacterSlots.querySelectorAll(".build-member-card").forEach((card, index) => {
    const member = normalized.members[index] || {};
    card.querySelector(".build-member-character").value = member.character || buildCharacters[index] || buildCharacters[0];
    card.querySelector(".build-member-level").value = String(member.level || 1);
  });
  renderBuildCharacterSlots();
  els.buildCharacterSlots.querySelectorAll(".build-member-card").forEach((card, index) => {
    const member = normalized.members[index] || {};
    card.querySelectorAll(".build-essence-input").forEach((input, essenceIndex) => {
      input.value = member.essences?.[essenceIndex] || "";
      const skills = activeSkillsForEssence(input.value);
      const states = member.activeSkillStates?.[essenceIndex]
        || skills.map(() => member.activeStates?.[essenceIndex] || "on");
      updateBuildActiveSkills(input, states, member.activeColors?.[essenceIndex] || "");
    });
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

function openBuildDeleteModal(build) {
  pendingDeleteBuild = build;
  els.buildDeleteGuide.textContent = build.deleteHash
    ? "등록할 때 입력한 삭제용 비밀번호를 입력하세요."
    : "기존에 등록된 공개 빌드입니다. 운영자 비밀번호를 입력하면 삭제할 수 있습니다.";
  els.buildDeletePassword.value = "";
  els.buildDeleteStatus.textContent = "";
  els.buildDeleteModal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => els.buildDeletePassword.focus(), 20);
}

function closeBuildDeleteModal() {
  pendingDeleteBuild = null;
  els.buildDeleteModal.hidden = true;
  if (els.buildFormModal.hidden && els.essencePickerModal.hidden) document.body.classList.remove("modal-open");
}

async function deleteBuild(build, password) {
  const enteredPassword = textOf(password);
  const matchesOwnerPassword = Boolean(build.deleteHash)
    && await buildDeleteHash(build.id, enteredPassword) === build.deleteHash;
  const matchesAdminPassword = enteredPassword === adminCode;
  if (!matchesOwnerPassword && !matchesAdminPassword) {
    els.buildDeleteStatus.textContent = build.deleteHash
      ? "삭제용 비밀번호가 맞지 않습니다."
      : "운영자 비밀번호가 맞지 않습니다.";
    els.buildDeleteStatus.className = "build-sync-status is-offline";
    return false;
  }
  if (hasPublicBuildStore()) {
    const deletion = {
      id: `deleted-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      title: buildDeleteMarker,
      author: "delete",
      members: [],
      note: build.id,
      createdAt: new Date().toISOString(),
      deleteHash: "",
    };
    await savePublicBuild(deletion);
  }
  savedBuilds = savedBuilds.filter((item) => item.id !== build.id);
  saveStoredRows(storageKeys.builds, savedBuilds);
  renderBuilds();
  setBuildSyncStatus(
    hasPublicBuildStore() ? "빌드가 삭제되었습니다." : "이 브라우저의 임시 빌드를 삭제했습니다.",
    hasPublicBuildStore() ? "is-online" : "is-offline"
  );
  closeBuildDeleteModal();
  return true;
}

async function confirmBuildDelete() {
  if (!pendingDeleteBuild) return;
  const button = els.confirmBuildDelete;
  button.disabled = true;
  try {
    await deleteBuild(pendingDeleteBuild, els.buildDeletePassword.value);
  } catch {
    els.buildDeleteStatus.textContent = "빌드 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.";
    els.buildDeleteStatus.className = "build-sync-status is-offline";
  } finally {
    button.disabled = false;
  }
}

async function handleBuildListClick(event) {
  const button = event.target.closest("button[data-build-action]");
  if (!button) return;
  const build = savedBuilds.find((item) => item.id === button.closest("[data-build-id]")?.dataset.buildId);
  if (!build) return;
  if (button.dataset.buildAction === "share") {
    copyText(shareUrlForBuild(build), button, "공유 링크 복사");
  }
  if (button.dataset.buildAction === "load") {
    applyBuildToForm(build);
    openBuildFormModal();
  }
  if (button.dataset.buildAction === "like") {
    if (!hasPublicBuildStore()) {
      setBuildSyncStatus("좋아요는 공개 저장소에 연결된 상태에서 사용할 수 있습니다.", "is-offline");
      return;
    }
    button.disabled = true;
    savePublicBuildLike(build).catch(() => {
      setBuildSyncStatus("좋아요 확인에 실패했습니다. 잠시 후 다시 시도해주세요.", "is-offline");
      renderBuilds();
    });
  }
  if (button.dataset.buildAction === "delete") {
    openBuildDeleteModal(build);
  }
}

function sortedBuilds() {
  return [...savedBuilds].sort((a, b) => {
    const newestFirst = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (els.buildSort.value !== "likes") return newestFirst;
    return (buildLikes.get(b.id) || 0) - (buildLikes.get(a.id) || 0) || newestFirst;
  });
}

function renderBuilds() {
  els.buildCount.textContent = `${hasPublicBuildStore() ? "공개 빌드" : "등록된 빌드"} ${savedBuilds.length}개`;
  els.buildList.innerHTML = savedBuilds.length
    ? sortedBuilds().map((build) => buildCard(build, false)).join("")
    : `<div class="empty compact-empty">등록된 빌드가 없습니다.</div>`;
}

function formatBuildDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "-";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildEssenceRow(name) {
  return essenceRows.find((row) => textOf(row["몬스터"]) === textOf(name));
}

function buildMemberStatTotals(member) {
  const totals = new Map();
  (member.essences || []).forEach((name) => {
    const row = buildEssenceRow(name);
    textOf(row?.["주요 스탯"]).split(",").forEach((part) => {
      const match = part.trim().match(/^(.+?)\s+(-?\d+)/);
      if (!match) return;
      const statName = cleanStatName(match[1]);
      totals.set(statName, (totals.get(statName) || 0) + Number(match[2]));
    });
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

function buildMemberStatSummary(member) {
  const totals = buildMemberStatTotals(member);
  if (!totals.length) return `<span class="build-total-empty">정수 스탯 없음</span>`;
  return totals.map(([name, value]) => `
    <span class="build-total-stat">
      <b>${escapeHtml(name)}</b>
      <strong>${value > 0 ? "+" : ""}${escapeHtml(value)}</strong>
    </span>
  `).join("");
}

function buildConfiguredSkillList(row, states = [], selectedColor = "") {
  const skills = row ? activeSkillsForEssence(row["몬스터"]) : [];
  if (!skills.length) return `<span class="muted">없음</span>`;
  const visibleSkills = colorChoiceSkills(skills) && selectedColor
    ? skills.filter((skill) => activeSkillColor(skill) === selectedColor)
    : skills;
  const visibleStates = colorChoiceSkills(skills) && selectedColor
    ? [states[0] || "on"]
    : states;
  return `
    <div class="build-detail-skills">
      ${visibleSkills.map((skill, index) => `
        <span>
          ${selectedColor ? `<i class="essence-color-pill color-${escapeHtml(selectedColor)}">${escapeHtml(selectedColor)}</i>` : ""}
          ${escapeHtml(selectedColor ? skill.replace(activeColorPattern, "") : skill)}
          ${visibleStates[index] ? `<i class="build-active-state is-${escapeHtml(visibleStates[index])}">${visibleStates[index] === "off" ? "OFF" : "ON"}</i>` : ""}
        </span>
      `).join("")}
    </div>
  `;
}

function buildMemberDetails(member) {
  const filledEssences = (member.essences || []).map((name, index) => ({ name, index })).filter(({ name }) => name);
  if (!filledEssences.length) return `<p class="build-detail-empty">장착된 정수가 없습니다.</p>`;
  return `
    <div class="build-member-details">
      ${filledEssences.map(({ name, index }) => {
        const row = buildEssenceRow(name);
        const skills = row ? activeSkillsForEssence(row["몬스터"]) : [];
        const states = member.activeSkillStates?.[index]
          || skills.map(() => member.activeStates?.[index] || "");
        const selectedColor = member.activeColors?.[index] || "";
        if (!row) return `
          <article class="build-essence-detail">
            <h4>${escapeHtml(name)}</h4>
            <p class="build-detail-empty">등록된 상세 정보가 없습니다.</p>
          </article>
        `;
        return `
          <article class="build-essence-detail">
            <div class="build-detail-title">
              <h4>${escapeHtml(name)}</h4>
              <span>${escapeHtml(row["층"] || "-")} · ${escapeHtml(row["구역"] || "-")} · ${escapeHtml(row["등급"] || "-")}</span>
            </div>
            <dl>
              <dt>주요 스탯</dt><dd>${escapeHtml(row["주요 스탯"] || "-")}</dd>
              <dt>패시브</dt><dd>${escapeHtml(row["패시브"] || "-")}</dd>
              <dt>액티브</dt><dd>${buildConfiguredSkillList(row, states, selectedColor)}</dd>
            </dl>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function buildMemberBoard(members, className = "") {
  return `
    <div class="build-member-board${className ? ` ${className}` : ""}">
      ${members.map((member) => `
        <section class="build-member-loadout">
          <details class="build-member-detail-toggle">
            <summary class="build-member-loadout-head">
              <div class="build-member-top">
                <strong>${escapeHtml(member.character)}</strong>
                <span class="build-member-level">Lv.${escapeHtml(member.level)}</span>
                <span class="build-detail-action">상세 보기</span>
              </div>
              <div class="build-total-panel">
                <small>정수 스탯 합계</small>
                <div class="build-total-stats" aria-label="착용 정수 총 스탯">
                  ${buildMemberStatSummary(member)}
                </div>
              </div>
            </summary>
            ${buildMemberDetails(member)}
          </details>
          <div class="build-loadout-essences">
            ${(member.essences || []).map((name, index) => {
              const skills = activeSkillsForEssence(name);
              const states = member.activeSkillStates?.[index]
                || skills.map(() => member.activeStates?.[index] || "");
              const selectedColor = member.activeColors?.[index] || "";
              const visibleSkills = colorChoiceSkills(skills) && selectedColor
                ? skills.filter((skill) => activeSkillColor(skill) === selectedColor)
                : skills;
              const visibleStates = colorChoiceSkills(skills) && selectedColor
                ? [states[0] || "on"]
                : states;
              return `
                <div class="${name ? "build-loadout-item" : "build-loadout-item is-empty"}">
                  <span><b>${index + 1}</b>${escapeHtml(name || "비어 있음")}${selectedColor ? `<i class="essence-color-pill color-${escapeHtml(selectedColor)}">${escapeHtml(selectedColor)}</i>` : ""}</span>
                  ${name && visibleSkills.length && visibleStates.some(Boolean) ? `<div class="build-loadout-skills">${visibleSkills.map((skill, skillIndex) => `<small>${escapeHtml(selectedColor ? skillShortName(skill).replace(activeColorPattern, "") : skillShortName(skill))}<i class="build-active-state is-${escapeHtml(visibleStates[skillIndex] || "on")}">${visibleStates[skillIndex] === "off" ? "OFF" : "ON"}</i></small>`).join("")}</div>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function buildCard(build, shared) {
  const normalized = normalizeBuild(build);
  const memberSummary = normalized.members
    .map((member) => `${member.character} ${member.level}레벨`)
    .join(" · ");
  if (!shared) {
    const likeCount = buildLikes.get(build.id) || 0;
    const liked = likedBuildIds.has(build.id);
    return `
      <article class="build-card build-public-card" data-build-id="${escapeHtml(build.id || "")}">
        <header class="build-public-head">
          <div class="build-row-title">
            <strong>${escapeHtml(build.title || "이름 없는 빌드")}</strong>
            <span>${escapeHtml(build.author || "익명")} · ${escapeHtml(formatBuildDate(build.createdAt))}</span>
          </div>
          <div class="pending-actions">
            <button class="build-like-button${liked ? " is-liked" : ""}" type="button" data-build-action="like"${liked ? " disabled" : ""}>${liked ? "좋아요 완료" : "좋아요"} ${likeCount}</button>
            <button type="button" data-build-action="share">공유 링크 복사</button>
            <button type="button" data-build-action="load">수정</button>
            <button class="build-delete-button" type="button" data-build-action="delete">삭제</button>
          </div>
        </header>
        <div class="build-public-summary">
          <span>${escapeHtml(memberSummary)}</span>
          ${build.note ? `<p>${escapeHtml(build.note)}</p>` : ""}
        </div>
        ${buildMemberBoard(normalized.members)}
      </article>
    `;
  }
  return `
    <article class="build-card" data-build-id="${escapeHtml(build.id || "")}">
      <div class="build-card-head">
        <div>
          <strong>${escapeHtml(build.title || "이름 없는 빌드")}</strong>
          <span>${escapeHtml(memberSummary)} · ${escapeHtml(build.author || "익명")}</span>
        </div>
        ${shared ? `<span class="grade-pill">공유 빌드</span>` : ""}
      </div>
      ${buildMemberBoard(normalized.members, "is-shared")}
      ${build.note ? `<p>${escapeHtml(build.note)}</p>` : ""}
      ${shared ? "" : `
        <div class="pending-actions">
          <button type="button" data-build-action="share">공유 링크 복사</button>
          <button type="button" data-build-action="load">수정</button>
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
  renderApprovedReports();
}

function lockAdmin() {
  adminUnlocked = false;
  localStorage.removeItem(storageKeys.adminUnlocked);
  updateAdminUi();
  renderPendingReports();
  renderApprovedReports();
}

function updateAdminAccess(user) {
  const email = textOf(user?.email).toLowerCase();
  const configured = adminEmails.length > 0;
  const allowed = configured && adminEmails.includes(email);
  adminUnlocked = allowed;
  if (allowed) localStorage.setItem(storageKeys.adminUnlocked, "1");
  else localStorage.removeItem(storageKeys.adminUnlocked);
  updateAdminUi(user, { configured, allowed });
  renderPendingReports();
  renderApprovedReports();
}

function updateAdminUi() {
  if (!els.adminStatus) return;
  const user = window.DUKHUBUSTERS_AUTH?.getUser?.();
  const email = textOf(user?.email).toLowerCase();
  const authManaged = !els.adminCodeInput;
  if (authManaged) {
    if (!adminEmails.length) {
      els.adminStatus.textContent = "관리자 이메일이 아직 설정되지 않았습니다. config.js의 adminEmails에 본인 구글 이메일을 추가해주세요.";
    } else if (!user) {
      els.adminStatus.textContent = "관리자 구글 계정으로 로그인하면 검수 목록이 열립니다.";
    } else if (!adminEmails.includes(email)) {
      els.adminStatus.textContent = `${email} 계정은 관리자 권한이 없습니다.`;
    } else {
      els.adminStatus.textContent = "관리자 권한이 확인되었습니다. 검수와 삭제 처리가 가능합니다.";
    }
    if (els.adminUnlock) els.adminUnlock.hidden = Boolean(user);
    if (els.adminLock) els.adminLock.hidden = !user;
    if (els.copyApproved) els.copyApproved.hidden = !adminUnlocked;
    document.body.classList.toggle("admin-review-unlocked", adminUnlocked);
    return;
  }

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
  els.numberOptions.innerHTML = unique(numbersRows.map((row) => row["이름"]))
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join("");
}

function isNumbersReportMode() {
  return els.reportDataset?.value === "numbers";
}

function updateReportDataset() {
  const numbersMode = isNumbersReportMode();
  document.querySelectorAll(".essence-report-field").forEach((element) => {
    element.hidden = numbersMode;
  });
  document.querySelectorAll(".numbers-report-field").forEach((element) => {
    element.hidden = !numbersMode;
  });
  [els.reportMonster, els.reportGrade, els.reportFloor, els.reportArea, els.reportStats, els.reportPassive].forEach((field) => {
    field.required = !numbersMode;
    field.disabled = numbersMode;
  });
  [els.reportActive, els.reportActive2, els.reportActive3, els.reportSailing, ...els.reportRecommendations].forEach((field) => {
    field.disabled = numbersMode;
  });
  [els.reportNumberName, els.reportNumberLevel, els.reportNumberEffect].forEach((field) => {
    field.required = numbersMode;
    field.disabled = !numbersMode;
  });
  els.reportNumberCode.required = false;
  els.reportNumberCode.disabled = !numbersMode;
  [els.reportNumberSlot, els.reportNumberSourceFloor, els.reportNumberSource].forEach((field) => {
    field.disabled = !numbersMode;
  });
  placeholderOptionList(els.reportFloor, floorOptionValues(essenceRows), "층 선택");
  refreshReportAreaOptions();
  optionList(els.reportNumberSourceFloor, floorOptions, "전체 층");
  refreshReportNumberSourceOptions();
  updateReportMode();
}

function updateReportMode() {
  const editMode = els.reportMode.value === "edit" || els.reportMode.value === "delete";
  const numbersMode = isNumbersReportMode();
  els.reportOriginalMonsterField.hidden = !editMode || numbersMode;
  els.editNameHint.hidden = !editMode || numbersMode;
  els.reportMonster.placeholder = editMode ? "새 몬스터명 입력 가능" : "예: 얼음 와이번";
  els.reportNumberName.placeholder = editMode ? "수정/삭제할 넘버스를 검색하세요" : "예: 차원 자루";
  els.editMonsterMatches.hidden = !editMode || numbersMode;
  els.editNumberMatches.hidden = !editMode || !numbersMode;
  if (editMode && numbersMode) {
    renderEditNumberMatches();
    fillNumberFromExactName();
  } else if (editMode) {
    renderEditMonsterMatches();
    fillReportFromExactMonster();
  } else {
    els.editMonsterMatches.innerHTML = "";
    els.editMonsterMatches.hidden = true;
    els.editNumberMatches.innerHTML = "";
    els.editNumberMatches.hidden = true;
  }
  if (!editMode || numbersMode) els.reportOriginalMonster.value = "";
}

function applyReportQueryParams() {
  const params = new URLSearchParams(location.search);
  const dataset = params.get("dataset") || params.get("type");
  const mode = params.get("mode");
  const numberName = params.get("number") || params.get("name");
  if (dataset === "numbers" && els.reportDataset) {
    els.reportDataset.value = "numbers";
  }
  if (mode && [...els.reportMode.options].some((option) => option.value === mode)) {
    els.reportMode.value = mode;
  }
  updateReportDataset();
  if (isNumbersReportMode() && numberName) {
    els.reportNumberName.value = numberName;
    fillNumberFromExactName();
    renderEditNumberMatches();
    if (els.reportMode.value === "delete") {
      els.reportNumberEffect.value = `[삭제 요청] ${numberName} 정보를 삭제해주세요.`;
      setReportSyncStatus("넘버스 삭제 요청 정보가 자동으로 채워졌습니다. 로그인 후 등록하면 검수 대기에 올라갑니다.");
    }
  }
}

function handleReportMonsterInput() {
  if (els.reportMode.value !== "edit" || isNumbersReportMode()) return;
  renderEditMonsterMatches();
}

function handleReportNumberInput() {
  if (!["edit", "delete"].includes(els.reportMode.value) || !isNumbersReportMode()) return;
  renderEditNumberMatches();
  fillNumberFromExactName();
}

function handleEditMonsterClick(event) {
  const button = event.target.closest("button[data-monster]");
  if (!button) return;
  fillReportFromRow(findMonsterRow(button.dataset.monster));
}

function handleEditNumberClick(event) {
  const button = event.target.closest("button[data-number-name]");
  if (!button) return;
  fillNumberFromRow(findNumberRow(button.dataset.numberName));
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
  els.reportOriginalMonster.value = textOf(row["몬스터"]);
  els.reportMonster.value = textOf(row["몬스터"]);
  els.reportGrade.value = textOf(row["등급"]);
  els.reportFloor.value = textOf(row["층"]);
  refreshReportAreaOptions();
  els.reportArea.value = textOf(row["구역"]);
  els.reportStats.value = textOf(row["주요 스탯"]);
  els.reportPassive.value = textOf(row["패시브"]);
  els.reportSailing.checked = isSailingRow(row);
  const recommendedCharacters = recommendedCharactersFrom(row["추천 캐릭터"]);
  els.reportRecommendations.forEach((field) => {
    field.checked = recommendedCharacters.includes(field.value);
  });
  const activeSkills = splitSkills(activeSkillsWithoutSailing(row["액티브"]));
  els.reportActive.value = activeSkills[0] || "";
  els.reportActive2.value = activeSkills[1] || "";
  els.reportActive3.value = activeSkills[2] || "";
  renderEditMonsterMatches();
}

function refreshQuickEditAreaOptions() {
  if (!els.quickEditArea) return;
  placeholderOptionList(els.quickEditArea, areaOptionsForFloor(els.quickEditFloor?.value, essenceRows), "구역 선택");
}

function openQuickEditModal(row) {
  if (!row || !els.quickEditModal) return;
  els.quickEditOriginalMonster.value = textOf(row["몬스터"]);
  els.quickEditMonster.value = textOf(row["몬스터"]);
  els.quickEditGrade.value = textOf(row["등급"]);
  els.quickEditFloor.value = textOf(row["층"]);
  refreshQuickEditAreaOptions();
  els.quickEditArea.value = textOf(row["구역"]);
  els.quickEditStats.value = textOf(row["주요 스탯"]);
  els.quickEditPassive.value = textOf(row["패시브"]);
  els.quickEditSailing.checked = isSailingRow(row);
  const recommendedCharacters = recommendedCharactersFrom(row["추천 캐릭터"]);
  els.quickEditRecommendations.forEach((field) => {
    field.checked = recommendedCharacters.includes(field.value);
  });
  const activeSkills = splitSkills(activeSkillsWithoutSailing(row["액티브"]));
  els.quickEditActive.value = activeSkills[0] || "";
  els.quickEditActive2.value = activeSkills[1] || "";
  els.quickEditActive3.value = activeSkills[2] || "";
  els.quickEditStatus.textContent = "";
  els.quickEditModal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => els.quickEditMonster.focus(), 20);
}

function closeQuickEditModal() {
  if (!els.quickEditModal) return;
  els.quickEditModal.hidden = true;
  if ((!els.essencePickerModal || els.essencePickerModal.hidden)
    && (!els.buildFormModal || els.buildFormModal.hidden)
    && (!els.buildDeleteModal || els.buildDeleteModal.hidden)) {
    document.body.classList.remove("modal-open");
  }
}

function handleEssenceResultChange(event) {
  const checkbox = event.target.closest(".pin-essence-checkbox");
  if (!checkbox) return;
  const name = checkbox.dataset.monster;
  if (checkbox.checked) {
    if (!pinnedEssenceNames.map(monsterKey).includes(monsterKey(name))) pinnedEssenceNames.push(name);
  } else {
    pinnedEssenceNames = pinnedEssenceNames.filter((item) => monsterKey(item) !== monsterKey(name));
  }
  savePinnedEssences();
  render();
}

function handleEssenceResultClick(event) {
  const button = event.target.closest("button[data-edit-monster]");
  if (!button) return;
  const row = findMonsterRow(button.dataset.editMonster);
  openQuickEditModal(row);
}

async function submitQuickEditReport(event) {
  event.preventDefault();
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: "edit",
    authorNickname: textOf(els.quickEditNickname.value),
    monster: textOf(els.quickEditMonster.value),
    originalMonster: textOf(els.quickEditOriginalMonster.value),
    grade: textOf(els.quickEditGrade.value),
    floor: textOf(els.quickEditFloor.value),
    area: textOf(els.quickEditArea.value),
    stats: textOf(els.quickEditStats.value),
    passive: textOf(els.quickEditPassive.value),
    sailing: Boolean(els.quickEditSailing.checked),
    recommendedCharacters: [...els.quickEditRecommendations]
      .filter((field) => field.checked)
      .map((field) => field.value)
      .join(", "),
    active: [els.quickEditActive, els.quickEditActive2, els.quickEditActive3]
      .map((field) => textOf(field.value))
      .filter(Boolean)
      .join("\n") || "-",
    createdAt: new Date().toISOString(),
  };
  const button = els.quickEditForm.querySelector("[type='submit']");
  if (button) button.disabled = true;
  els.quickEditStatus.textContent = "수정 제보를 등록하는 중입니다.";
  try {
    const saved = hasPublicReportStore()
      ? { ...(await savePublicReport(report)), authorNickname: report.authorNickname }
      : report;
    pendingReports = sortReportsByDate([saved, ...pendingReports.filter((item) => item.id !== saved.id)]);
    saveStoredRows(storageKeys.pending, pendingReports);
    els.quickEditStatus.textContent = "수정 제보가 검수 대기에 등록되었습니다.";
    setTimeout(closeQuickEditModal, 700);
  } catch {
    pendingReports = sortReportsByDate([report, ...pendingReports.filter((item) => item.id !== report.id)]);
    saveStoredRows(storageKeys.pending, pendingReports);
    els.quickEditStatus.textContent = "저장소 연결이 불안정해 임시 검수 대기에 저장했습니다.";
  } finally {
    if (button) button.disabled = false;
  }
}

function findNumberRow(name) {
  const target = textOf(name).toLowerCase();
  return numbersRows.find((row) => textOf(row["이름"]).toLowerCase() === target);
}

function fillNumberFromExactName() {
  const row = findNumberRow(els.reportNumberName.value);
  if (row) fillNumberFromRow(row);
}

function fillNumberFromRow(row) {
  if (!row) return;
  els.reportNumberName.value = textOf(row["이름"]);
  els.reportNumberCode.value = textOf(row["번호"]);
  els.reportNumberLevel.value = textOf(row["아이템 레벨(Lv)"]);
  els.reportNumberEffect.value = textOf(row["효과"]);
  els.reportNumberSlot.value = textOf(row["착용부위"]);
  const sourceAreas = sourceAreaLabels(row["획득처"]);
  const sourceFloors = unique(sourceAreas.map((area) => areaFloorLookup.get(normalizeLocationName(area))).filter(Boolean));
  els.reportNumberSourceFloor.value = sourceFloors.length === 1 ? sourceFloors[0] : "전체 층";
  refreshReportNumberSourceOptions();
  setSelectedOptionValues(els.reportNumberSource, sourceAreas);
  renderEditNumberMatches();
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
        <span>${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])} · ${escapeHtml(row["등급"] || "-")}${isSailingRow(row) ? " · 항해" : ""}</span>
      </button>
    `).join("")
    : `<div class="edit-match-empty">일치하는 몬스터가 없습니다.</div>`;
}

function renderEditNumberMatches() {
  const query = textOf(els.reportNumberName.value).toLowerCase();
  const rows = numbersRows
    .filter((row) => !query || textOf(row["이름"]).toLowerCase().includes(query) || textOf(row["효과"]).toLowerCase().includes(query))
    .slice(0, 8);
  els.editNumberMatches.hidden = els.reportMode.value !== "edit" || !isNumbersReportMode();
  els.editNumberMatches.innerHTML = rows.length
    ? rows.map((row) => `
      <button type="button" data-number-name="${escapeHtml(row["이름"])}">
        <strong>${escapeHtml(row["이름"])}</strong>
        <span>${escapeHtml(displayNumber(row["번호"]))} · ${escapeHtml(displayLevel(row["아이템 레벨(Lv)"]))}</span>
      </button>
    `).join("")
    : `<div class="edit-match-empty">일치하는 넘버스가 없습니다.</div>`;
}

function refreshControls() {
  optionList(els.floor, floorOptionValues(essenceRows), "전체 층");
  refreshEssenceAreaOptions();
  optionList(els.grade, ["4등급", "5등급", "6등급", "7등급", "8등급", "9등급", "수호자"], "전체 등급");
  optionList(els.character, unique(essenceRows.flatMap((row) => recommendedCharactersFrom(row["추천 캐릭터"]))), "전체 캐릭터");
  optionList(els.statSort, statNames(), statNoneLabel);
}

function selectedStatName() {
  return selectedStatNames()[0] || statNoneLabel;
}

function selectedStatNames() {
  const validStats = statNames();
  activeStatNames = activeStatNames.filter((name) => validStats.includes(name));
  return [...activeStatNames];
}

function hasStatSort() {
  return selectedStatNames().length > 0;
}

function renderStatChips() {
  selectedStatNames();
  els.statChips.innerHTML = [
    `<button type="button" class="stat-chip" data-stat="${escapeHtml(statNoneLabel)}">${escapeHtml(statNoneLabel)}</button>`,
    ...statNames().map((name) => `<button type="button" class="stat-chip" data-stat="${escapeHtml(name)}">${escapeHtml(name)}</button>`),
  ].join("");
  els.statSort.value = activeStatNames[0] || statNoneLabel;

  els.statChips.onclick = (event) => {
    const button = event.target.closest("button[data-stat]");
    if (!button) return;
    const statName = button.dataset.stat;
    if (statName === statNoneLabel) {
      activeStatNames = [];
    } else if (activeStatNames.includes(statName)) {
      activeStatNames = activeStatNames.filter((name) => name !== statName);
    } else {
      activeStatNames = [...activeStatNames, statName];
    }
    if (activeStatNames.length) {
      activeEffectSortKey = "";
      renderEffectSortChips();
    }
    els.statSort.value = activeStatNames[0] || statNoneLabel;
    render();
  };
}

function renderEffectSortChips() {
  els.effectSortChips.innerHTML = [
    `<button type="button" class="effect-chip${activeEffectSortKey ? "" : " is-active"}" data-effect="">선택 안 함</button>`,
    ...Object.entries(effectSortDefinitions).map(([key, effect]) => `
      <button type="button" class="effect-chip${activeEffectSortKey === key ? " is-active" : ""}" data-effect="${escapeHtml(key)}">
        ${escapeHtml(effect.label)}
      </button>
    `),
  ].join("");
  const selected = selectedEffectSort();
  els.effectSortSummary.textContent = selected
    ? `패시브 또는 액티브에 ${selected.label} 효과가 있는 정수를 우선 표시합니다. 수치가 있으면 높은 순으로 정렬됩니다.`
    : "패시브와 액티브에서 원하는 효과를 찾아 먼저 표시합니다.";
  els.effectSortChips.onclick = (event) => {
    const button = event.target.closest("button[data-effect]");
    if (!button) return;
    activeEffectSortKey = button.dataset.effect;
    if (activeEffectSortKey) {
      activeStatNames = [];
      els.sort.value = "default";
    }
    renderEffectSortChips();
    render();
  };
}

function renderNumbersEffectSortChips() {
  els.numbersEffectSortChips.innerHTML = [
    `<button type="button" class="effect-chip${activeEffectSortKey ? "" : " is-active"}" data-effect="">선택 안 함</button>`,
    ...Object.entries(effectSortDefinitions).map(([key, effect]) => `
      <button type="button" class="effect-chip${activeEffectSortKey === key ? " is-active" : ""}" data-effect="${escapeHtml(key)}">
        ${escapeHtml(effect.label)}
      </button>
    `),
  ].join("");
  const selected = selectedEffectSort();
  els.numbersEffectSortSummary.textContent = selected
    ? `${selected.label} 효과가 있는 넘버스를 우선 표시합니다. 수치가 있으면 높은 순으로 정렬됩니다.`
    : "원하는 효과를 누르면 해당 넘버스가 먼저 표시됩니다.";
  els.numbersEffectSortChips.onclick = (event) => {
    const button = event.target.closest("button[data-effect]");
    if (!button) return;
    activeEffectSortKey = button.dataset.effect;
    if (activeEffectSortKey) els.numbersSort.value = "number";
    activeNumbersPage = 1;
    renderNumbersEffectSortChips();
    renderNumbers();
  };
}

function updateStatSortUi() {
  const activeStats = selectedStatNames();
  els.statChips.querySelectorAll("button[data-stat]").forEach((button) => {
    const isActive = button.dataset.stat === statNoneLabel
      ? activeStats.length === 0
      : activeStats.includes(button.dataset.stat);
    button.classList.toggle("is-active", isActive);
    if (button.dataset.stat === statNoneLabel) {
      button.textContent = statNoneLabel;
    } else {
      button.textContent = `${button.dataset.stat}${isActive ? " 선택됨" : " +"}`;
    }
  });

  if (!activeStats.length) {
    els.statSortSummary.textContent = "스탯을 누르면 높은 순으로 정렬합니다.";
  } else if (activeStats.length === 1) {
    els.statSortSummary.textContent = `${activeStats[0]} 높은 순으로 정렬 중`;
  } else {
    els.statSortSummary.textContent = `선택 순서대로 높은 순 정렬 중: ${activeStats.join(", ")}`;
  }
}

function collectEssenceRows() {
  let rows = essenceRows.map((row) => ({ type: "정수", row }));
  rows = applyFilters(rows);
  return sortEssenceRows(rows);
}

function applyFilters(rows) {
  const query = textOf(els.search.value).toLowerCase();

  if (els.floor.value !== "전체 층") {
    rows = rows.filter(({ row }) => sameLocationName(row["층"], els.floor.value));
  }

  if (els.area.value !== "전체 구역") {
    rows = rows.filter(({ row }) => sameLocationName(row["구역"], els.area.value));
  }

  if (els.grade.value !== "전체 등급") {
    const selectedGrade = els.grade.value;
    rows = rows.filter(({ row }) => (
      selectedGrade === "수호자"
        ? textOf(row["등급"]).includes("수호자")
        : `${numberFrom(row["등급"])}등급` === selectedGrade
    ));
  }

  if (els.character.value !== "전체 캐릭터") {
    rows = rows.filter(({ row }) => isRecommendedFor(row, els.character.value));
  }

  if (els.sailingFilter?.checked) {
    rows = rows.filter(({ row }) => isSailingRow(row));
  }

  if (query) {
    rows = rows.filter(({ row }) => Object.values(row).join(" ").toLowerCase().includes(query));
  }

  return rows;
}

function sortEssenceRows(rows) {
  const selectedStats = selectedStatNames();
  const mode = els.sort.value;
  const filteredRows = selectedStats.length
    ? rows.filter(({ row }) => hasAllSelectedStats(row, selectedStats))
    : rows;
  const copy = [...filteredRows];

  if (selectedStats.length) {
    return copy.sort((a, b) => {
      for (const statName of selectedStats) {
        const statDiff = statValue(b.row, statName) - statValue(a.row, statName);
        if (statDiff) return statDiff;
      }
      return floorAreaMonsterSort(a, b);
    });
  }

  if (mode === "cooldown") {
    return copy.sort((a, b) => cooldownOf(a.row) - cooldownOf(b.row) || floorAreaMonsterSort(a, b));
  }

  if (mode === "sailing") {
    return copy.sort((a, b) => Number(isSailingRow(b.row)) - Number(isSailingRow(a.row)) || floorAreaMonsterSort(a, b));
  }

  const effect = selectedEffectSort();
  if (effect) {
    return copy.sort((a, b) => {
      const aScore = effectSortScore(a.row, effect);
      const bScore = effectSortScore(b.row, effect);
      return Number(bScore.matched) - Number(aScore.matched)
        || Number(aScore.penalized) - Number(bScore.penalized)
        || bScore.value - aScore.value
        || floorAreaMonsterSort(a, b);
    });
  }

  if (mode.startsWith("recommend:")) {
    const character = mode.slice("recommend:".length);
    return copy.sort((a, b) => Number(isRecommendedFor(b.row, character)) - Number(isRecommendedFor(a.row, character)) || floorAreaMonsterSort(a, b));
  }

  if (mode === "floor-desc") {
    return copy.sort(floorAreaMonsterSortDescending);
  }

  return copy.sort(floorAreaMonsterSort);
}

function hasAllSelectedStats(row, selectedStats = selectedStatNames()) {
  return selectedStats.every((statName) => statValue(row, statName) !== 0);
}

function floorAreaMonsterSort(a, b) {
  return floorRank(a.row["층"]) - floorRank(b.row["층"])
    || textOf(a.row["층"]).localeCompare(textOf(b.row["층"]), "ko")
    || textOf(a.row["구역"]).localeCompare(textOf(b.row["구역"]), "ko")
    || textOf(a.row["몬스터"]).localeCompare(textOf(b.row["몬스터"]), "ko");
}

function floorAreaMonsterSortDescending(a, b) {
  return floorRank(b.row["층"]) - floorRank(a.row["층"])
    || textOf(b.row["층"]).localeCompare(textOf(a.row["층"]), "ko")
    || textOf(a.row["구역"]).localeCompare(textOf(b.row["구역"]), "ko")
    || textOf(a.row["몬스터"]).localeCompare(textOf(b.row["몬스터"]), "ko");
}

function render() {
  const rows = pinEssenceRows(collectEssenceRows());
  const selectedStats = selectedStatNames();
  const selectedEffect = selectedEffectSort();
  const recommendedSortCharacter = els.sort.value.startsWith("recommend:") ? els.sort.value.slice("recommend:".length) : "";
  updateStatSortUi();
  els.resultTitle.textContent = selectedStats.length > 1
    ? "스탯 조합 정렬"
    : hasStatSort() ? `${selectedStats[0]} 정렬`
      : selectedEffect ? `${selectedEffect.label} 효과 정렬`
      : recommendedSortCharacter ? `${recommendedSortCharacter} 추천 정수`
        : "정수 목록";
  els.resultCount.textContent = `${rows.length}건`;
  els.results.innerHTML = rows.length
    ? essenceTemplate(rows)
    : `<div class="empty">조건에 맞는 정수가 없습니다. 필터를 조금 넓혀보세요.</div>`;

}

function pinEssenceRows(rows) {
  if (!pinnedEssenceNames.length) return rows;
  const pinnedKeys = pinnedEssenceNames.map(monsterKey);
  const pinnedRows = pinnedEssenceNames
    .map((name) => essenceRows.find((row) => monsterKey(row["몬스터"]) === monsterKey(name)))
    .filter(Boolean)
    .map((row) => ({ type: "정수", row }));
  const rest = rows.filter(({ row }) => !pinnedKeys.includes(monsterKey(row["몬스터"])));
  return [...pinnedRows, ...rest];
}

function essenceTemplate(rows) {
  const pinnedRows = rows.filter(({ row }) => isPinnedEssence(row));
  const regularRows = rows.filter(({ row }) => !isPinnedEssence(row));
  if (pinnedRows.length) {
    const pinnedSection = `
      <section class="essence-group pinned-essence-group">
        <div class="group-title pinned-title">
          <h3>정수 비교하기</h3>
          <span>${pinnedRows.length}마리 비교 중</span>
        </div>
        <div class="essence-table-wrap">${essenceTable(pinnedRows)}</div>
      </section>
    `;
    if (hasStatSort() || selectedEffectSort()) {
      return `${pinnedSection}<div class="essence-table-wrap">${essenceTable(regularRows)}</div>`;
    }
    return `${pinnedSection}${essenceTemplateWithoutPinned(regularRows)}`;
  }
  return essenceTemplateWithoutPinned(rows);
}

function essenceTemplateWithoutPinned(rows) {
  if (hasStatSort() || selectedEffectSort()) {
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
          <th>고정</th>
          <th>몬스터</th>
          <th>등급</th>
          <th>추천</th>
          <th>주요 스탯</th>
          <th>패시브</th>
          <th>액티브</th>
          <th>수정</th>
        </tr>
      </thead>
      <tbody>${items.map(({ row }) => essenceRowTemplate(row)).join("")}</tbody>
    </table>
  `;
}

function essenceRowTemplate(row) {
  const activeStats = hasStatSort() ? selectedStatNames() : [];
  const selectedEffect = selectedEffectSort();
  const effectScore = selectedEffect ? effectSortScore(row, selectedEffect) : null;
  const highlightText = activeStats.length
    ? activeStats.map((statName) => `${statName} ${statValue(row, statName)}`).join(" · ")
    : "";
  return `
    <tr>
      <td data-label="고정" class="pin-cell">
        <label class="pin-essence-control">
          <input class="pin-essence-checkbox" type="checkbox" data-monster="${escapeHtml(row["몬스터"])}" ${isPinnedEssence(row) ? "checked" : ""}>
        </label>
      </td>
      <td data-label="몬스터">
        <div class="monster-title-line">
          <strong class="monster-name">${escapeHtml(row["몬스터"])}</strong>
          ${isSailingRow(row) ? `<span class="sailing-pill">항해</span>` : ""}
          ${effectScore?.matched ? `<span class="effect-sort-pill${effectScore.penalized ? " is-warning" : ""}">${escapeHtml(selectedEffect.label)}${effectScore.penalized ? " · 증가" : effectScore.value ? ` · ${escapeHtml(effectScore.value)}` : ""}</span>` : ""}
          <span class="location-pill">${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])}</span>
        </div>
      </td>
      <td data-label="등급"><span class="grade-pill">${escapeHtml(row["등급"] || "-")}</span></td>
      <td data-label="추천">${row["추천 캐릭터"] ? `<span class="character-pill">${escapeHtml(row["추천 캐릭터"])}</span>` : `<span class="muted">-</span>`}</td>
      <td data-label="주요 스탯">
        ${activeStats.length ? `<div class="sorted-stat">${escapeHtml(highlightText)}</div>` : ""}
        <div class="stat-list">${statBadges(row["주요 스탯"])}</div>
      </td>
      <td data-label="패시브" class="skill-cell">${skillText(row["패시브"])}</td>
      <td data-label="액티브" class="skill-cell">${skillText(row["액티브"])}</td>
      <td data-label="수정" class="essence-edit-cell">
        <button type="button" class="quick-edit-button" data-edit-monster="${escapeHtml(row["몬스터"])}">수정</button>
      </td>
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
  if (text === "-") return escapeHtml(text);
  const skills = splitSkills(text);
  return `<div class="skill-list">${skills.map((skill) => {
    const [name, ...rest] = skill.split(":");
    if (!rest.length) return `<span>${escapeHtml(skill)}</span>`;
    return `<span><b>${escapeHtml(name.trim())}</b>: ${escapeHtml(rest.join(":").trim())}</span>`;
  }).join("")}</div>`;
}

function splitSkills(value) {
  return textOf(value).split(/\r?\n+/).map((skill) => skill.trim()).filter((skill) => skill && skill !== "-");
}

function renderNumbers() {
  const query = textOf(els.numbersSearch.value).toLowerCase();
  const floor = els.numbersFloor.value;
  const area = els.numbersArea.value;
  const level = els.numbersLevel.value;
  const sort = els.numbersSort.value;
  let rows = numbersRows.filter((row) => {
    if (floor !== "전체 층" && !numberSourceMatchesFloor(row, floor)) return false;
    if (area !== "전체 구역" && !numberSourceMatchesArea(row, area)) return false;
    if (level !== "전체 레벨" && textOf(row["아이템 레벨(Lv)"]) !== level) return false;
    if (!query) return true;
    return [row["번호"], row["이름"], row["효과"], row["아이템 레벨(Lv)"], row["착용부위"], row["획득처"]]
      .some((value) => textOf(value).toLowerCase().includes(query));
  });
  const selectedEffect = selectedEffectSort();
  rows = [...rows].sort((a, b) => {
    if (selectedEffect) {
      const aScore = effectSortScore(a, selectedEffect);
      const bScore = effectSortScore(b, selectedEffect);
      return Number(bScore.matched) - Number(aScore.matched)
        || Number(aScore.penalized) - Number(bScore.penalized)
        || bScore.value - aScore.value
        || numberFrom(a["번호"]) - numberFrom(b["번호"]);
    }
    if (sort === "level-desc") return numberFrom(b["아이템 레벨(Lv)"]) - numberFrom(a["아이템 레벨(Lv)"]);
    if (sort === "level-asc") return numberFrom(a["아이템 레벨(Lv)"]) - numberFrom(b["아이템 레벨(Lv)"]);
    return numberFrom(a["번호"]) - numberFrom(b["번호"]);
  });
  const pageCount = Math.max(1, Math.ceil(rows.length / numbersPageSize));
  activeNumbersPage = Math.min(activeNumbersPage, pageCount);
  const pageStart = (activeNumbersPage - 1) * numbersPageSize;
  const pageRows = rows.slice(pageStart, pageStart + numbersPageSize);
  els.numbersCount.textContent = rows.length
    ? `총 ${rows.length}건 · ${activeNumbersPage}/${pageCount}쪽`
    : "0건";
  els.numbersResults.innerHTML = pageRows.length
    ? `
      <div class="numbers-card-list">${pageRows.map((row) => {
        const effectScore = selectedEffect ? effectSortScore(row, selectedEffect) : null;
        return `
          <article class="number-card">
            <div class="number-card-head">
              <div class="number-title-line">
                <span class="${numberCodeClass(row["번호"])}">${escapeHtml(displayNumber(row["번호"]))}</span>
                <strong>${escapeHtml(row["이름"] || "이름 미확인")}</strong>
              </div>
              <div class="number-card-head-side">
                <span class="grade-pill">${escapeHtml(displayLevel(row["아이템 레벨(Lv)"]))}</span>
                <div class="number-card-actions" aria-label="넘버스 정보 관리">
                  <a href="${escapeHtml(numberReportUrl(row, "edit"))}">수정</a>
                  <a class="is-danger" href="${escapeHtml(numberReportUrl(row, "delete"))}">삭제 요청</a>
                </div>
              </div>
            </div>
            <div class="number-card-meta">
              <span><b>착용부위</b>${escapeHtml(row["착용부위"] || "-")}</span>
            </div>
            <div class="number-card-meta number-source-block">
              <b>획득처</b>
              ${sourcePillList(row["획득처"])}
            </div>
            <div class="number-card-meta number-effect-block">
              <b>효과</b>
              <p>${effectScore?.matched ? `<span class="effect-sort-pill${effectScore.penalized ? " is-warning" : ""}">${escapeHtml(selectedEffect.label)}${effectScore.value ? ` · ${escapeHtml(effectScore.value)}` : ""}</span>` : ""}${escapeHtml(row["효과"] || "-")}</p>
            </div>
          </article>
        `;
      }).join("")}</div>`
    : `<div class="empty">조건에 맞는 넘버스 정보가 없습니다.</div>`;
  els.numbersPagination.innerHTML = rows.length > numbersPageSize
    ? Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button type="button" data-numbers-page="${page}" class="${page === activeNumbersPage ? "is-active" : ""}"${page === activeNumbersPage ? ' aria-current="page"' : ""}>${page}</button>`;
    }).join("")
    : "";
}

function hasVisitorStore() {
  return Boolean(visitorBackend.url && visitorBackend.anonKey);
}

function visitorHeaders(extra = {}) {
  return {
    apikey: visitorBackend.anonKey,
    Authorization: `Bearer ${visitorBackend.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function visitorUrl(table, query = "") {
  return `${visitorBackend.url}/rest/v1/${table}${query}`;
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getVisitorId() {
  let id = localStorage.getItem(storageKeys.visitorId);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKeys.visitorId, id);
  }
  return id;
}

function countFromRange(value) {
  const match = textOf(value).match(/\/(\d+)$/);
  return match ? Number(match[1]).toLocaleString("ko-KR") : "-";
}

function setVisitorStatus(message) {
  if (els.visitorStatus) els.visitorStatus.textContent = message;
}

async function upsertVisit(table, body, onConflict) {
  const response = await fetch(visitorUrl(table, `?on_conflict=${encodeURIComponent(onConflict)}`), {
    method: "POST",
    headers: visitorHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!response.ok && response.status !== 409) throw new Error(`visit save failed: ${response.status}`);
}

async function countRows(table, query = "") {
  const response = await fetch(visitorUrl(table, `${query ? `?${query}` : ""}`), {
    headers: visitorHeaders({
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });
  if (!response.ok) throw new Error(`visit count failed: ${response.status}`);
  return countFromRange(response.headers.get("content-range"));
}

async function recordVisit() {
  if (!els.visitorToday || !els.visitorTotal) return;
  if (!hasVisitorStore()) {
    setVisitorStatus("방문자 저장소 연결 전입니다.");
    return;
  }
  const visitorId = getVisitorId();
  const date = todayKey();
  try {
    if (localStorage.getItem(storageKeys.lastVisitDate) !== date) {
      await upsertVisit(visitorBackend.visitorTable, { visitor_id: visitorId, first_seen: date }, "visitor_id");
      await upsertVisit(visitorBackend.dailyTable, { visitor_id: visitorId, visit_date: date }, "visitor_id,visit_date");
      localStorage.setItem(storageKeys.lastVisitDate, date);
    }
    const [today, total] = await Promise.all([
      countRows(visitorBackend.dailyTable, `select=visitor_id&visit_date=eq.${date}`),
      countRows(visitorBackend.dailyTable, "select=visitor_id"),
    ]);
    els.visitorToday.textContent = today;
    els.visitorTotal.textContent = total;
    setVisitorStatus("");
  } catch {
    els.visitorToday.textContent = "-";
    els.visitorTotal.textContent = "-";
    setVisitorStatus("방문자 수 저장소 연결을 확인 중입니다.");
  }
}

function hasVisitorStore() {
  return hasPublicBuildStore();
}

async function insertVisitorBuild(row) {
  const response = await fetch(buildStoreUrl(), {
    method: "POST",
    headers: buildStoreHeaders({ Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify(row),
  });
  if (!response.ok && response.status !== 409) throw new Error(`visitor build save failed: ${response.status}`);
}

async function countBuildRows(query = "") {
  const response = await fetch(buildStoreUrl(`${query ? `?${query}` : ""}`), {
    headers: buildStoreHeaders({
      Prefer: "count=exact",
      Range: "0-0",
    }),
  });
  if (!response.ok) throw new Error(`visitor count failed: ${response.status}`);
  return countFromRange(response.headers.get("content-range"));
}

async function recordVisit() {
  if (!els.visitorToday || !els.visitorTotal) return;
  if (!hasVisitorStore()) {
    setVisitorStatus("방문자 저장소 연결 전입니다.");
    return;
  }
  const visitorId = getVisitorId();
  const date = todayKey();
  try {
    if (localStorage.getItem(storageKeys.lastVisitDate) !== date) {
      await insertVisitorBuild({
        id: `visitor-daily-${date}-${visitorId}`,
        title: visitorBuildMarkers.daily,
        author: "system",
        members: [],
        note: date,
        created_at: new Date().toISOString(),
      });
      localStorage.setItem(storageKeys.lastVisitDate, date);
    }
    const [today, total] = await Promise.all([
      countBuildRows(`select=id&title=eq.${encodeURIComponent(visitorBuildMarkers.daily)}&note=eq.${date}`),
      countBuildRows(`select=id&title=eq.${encodeURIComponent(visitorBuildMarkers.daily)}`),
    ]);
    els.visitorToday.textContent = today;
    els.visitorTotal.textContent = total;
    setVisitorStatus("");
  } catch {
    els.visitorToday.textContent = "-";
    els.visitorTotal.textContent = "-";
    setVisitorStatus("방문자 수 저장소 연결을 확인 중입니다.");
  }
}

function hasPublicReportStore() {
  return Boolean(reportBackend.url && reportBackend.anonKey);
}

function reportStoreHeaders(extra = {}) {
  return {
    apikey: reportBackend.anonKey,
    Authorization: `Bearer ${reportBackend.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function reportStoreUrl(query = "") {
  return `${reportBackend.url}/rest/v1/${reportBackend.table}${query}`;
}

function setReportSyncStatus(message, mode = "") {
  if (!els.reportSyncStatus) return;
  els.reportSyncStatus.textContent = message;
  els.reportSyncStatus.className = `build-sync-status ${mode}`.trim();
}

function normalizeRemoteReport(row) {
  return {
    id: row.id,
    mode: row.mode || "new",
    monster: row.monster || "",
    originalMonster: row.original_monster || row.originalMonster || "",
    grade: row.grade || "",
    floor: row.floor || "",
    area: row.area || "",
    stats: row.stats || "",
    passive: row.passive || "",
    active: activeSkillsWithoutSailing(row.active || ""),
    authorNickname: row.author_nickname || row.authorNickname || authorNicknameFromActive(row.active || ""),
    sailing: splitSkills(row.active || "").includes(sailingMarker),
    recommendedCharacters: recommendedCharacterFromActive(row.active || ""),
    status: row.status || "pending",
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    reviewedAt: row.reviewed_at || row.reviewedAt || "",
  };
}

function sortReportsByDate(rows) {
  return rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function syncApprovedRows() {
  approvedReports = approvedReportItems.filter((report) => !isNumbersReport(report)).map(reportToRow);
  saveStoredRows(storageKeys.approvedReportItems, approvedReportItems);
  saveStoredRows(storageKeys.approved, approvedReports);
  essenceRows = mergeApprovedRows(data["정수"] || [], approvedReports);
  numbersRows = mergeNumbersRows(data["넘버스"] || [], approvedReportItems);
  if (els.monsterOptions) fillMonsterOptions();
  if (els.numbersResults) {
    refreshNumbersControls();
    renderNumbers();
  }
}

function updateApprovedFromReports(reports) {
  approvedReportItems = sortReportsByDate(reports.filter((report) => report.status === "approved"));
  syncApprovedRows();
  if (els.search) {
    refreshControls();
    renderStatChips();
    render();
  }
  renderApprovedReports();
}

async function loadPublicApprovedReports() {
  if (!hasPublicReportStore()) return;
  try {
    const response = await fetch(reportStoreUrl("?select=*&status=eq.approved&order=reviewed_at.desc"), {
      headers: reportStoreHeaders(),
    });
    if (!response.ok) throw new Error(`approved load failed: ${response.status}`);
    updateApprovedFromReports((await response.json()).map(normalizeRemoteReport));
  } catch {
    if (els.reportSyncStatus) setReportSyncStatus("승인 데이터 저장소 연결에 실패해 임시 승인 목록을 사용합니다.", "is-offline");
  }
}

async function loadPublicReports() {
  if (!hasPublicReportStore()) {
    setReportSyncStatus("공개 저장소 연결 전입니다. 지금 제보한 내용은 이 브라우저의 검수 대기에 임시 저장됩니다.", "is-offline");
    return;
  }
  setReportSyncStatus("제보 저장소를 불러오는 중입니다.", "is-online");
  try {
    const response = await fetch(reportStoreUrl("?select=*&status=in.(pending,approved)&order=created_at.desc"), {
      headers: reportStoreHeaders(),
    });
    if (!response.ok) throw new Error(`report load failed: ${response.status}`);
    const reports = (await response.json()).map(normalizeRemoteReport);
    pendingReports = sortReportsByDate(reports.filter((report) => report.status === "pending"));
    saveStoredRows(storageKeys.pending, pendingReports);
    updateApprovedFromReports(reports);
    renderPendingReports();
    setReportSyncStatus("제보 저장소에 연결되었습니다. 새 제보는 검수 대기에 공개 저장됩니다.", "is-online");
  } catch {
    setReportSyncStatus("제보 저장소 연결에 실패해 이 브라우저의 임시 목록을 사용합니다.", "is-offline");
    renderPendingReports();
  }
}

async function savePublicReport(report) {
  const payload = {
    id: report.id,
    mode: report.mode,
    monster: report.monster,
    original_monster: report.originalMonster || "",
    grade: report.grade,
    floor: report.floor,
    area: report.area,
    stats: report.stats,
    passive: report.passive,
    active: reportActiveForStorage(report),
    author_nickname: report.authorNickname || "",
    status: "pending",
    created_at: report.createdAt,
  };
  let response = await fetch(reportStoreUrl(), {
    method: "POST",
    headers: reportStoreHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify(payload),
  });
  if (!response.ok && report.authorNickname) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.author_nickname;
    response = await fetch(reportStoreUrl(), {
      method: "POST",
      headers: reportStoreHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(fallbackPayload),
    });
  }
  if (!response.ok) throw new Error(`report save failed: ${response.status}`);
  const rows = await response.json();
  return normalizeRemoteReport(rows[0] || report);
}

async function updatePublicReportStatus(id, status) {
  const response = await fetch(reportStoreUrl(`?id=eq.${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: reportStoreHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      status,
      reviewed_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`report update failed: ${response.status}`);
  const rows = await response.json();
  return rows[0] ? normalizeRemoteReport(rows[0]) : null;
}

function reportToRow(report) {
  return {
    "_reportId": report.id,
    "_originalMonster": report.originalMonster || "",
    "층": report.floor,
    "구역": report.area,
    "몬스터": report.monster,
    "등급": report.grade,
    "주요 스탯": report.stats,
    "패시브": report.passive,
    "액티브": report.active,
    "항해": report.sailing ? "Y" : "",
    "추천 캐릭터": report.recommendedCharacters || "",
    "출처": report.mode === "edit" ? "수정 승인" : "제보 승인",
    "승인일": new Date().toISOString(),
  };
}

async function submitReport(event) {
  event.preventDefault();
  if (!requireLoggedInNickname(els.reportSyncStatus, "정보 제보/수정")) return;
  const authorNickname = currentAuthNickname();
  const numbersMode = isNumbersReportMode();
  if (!numbersMode && els.reportMode.value === "edit" && !textOf(els.reportOriginalMonster.value)) {
    setReportSyncStatus("수정할 기존 몬스터를 목록에서 먼저 선택해주세요.", "is-offline");
    return;
  }
  const report = numbersMode ? {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: els.reportMode.value,
    authorNickname,
    monster: `${numbersReportPrefix}${textOf(els.reportNumberName.value)}`,
    grade: textOf(els.reportNumberLevel.value),
    floor: textOf(els.reportNumberCode.value) || "미확인",
    area: textOf(els.reportNumberSlot.value) || "-",
    stats: textOf(els.reportNumberEffect.value),
    passive: selectedOptionValues(els.reportNumberSource).join(", ") || "-",
    active: els.reportMode.value === "delete" ? numbersDeleteMarker : "-",
    createdAt: new Date().toISOString(),
  } : {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: els.reportMode.value,
    authorNickname,
    monster: textOf(els.reportMonster.value),
    originalMonster: els.reportMode.value === "edit" ? textOf(els.reportOriginalMonster.value) : "",
    grade: textOf(els.reportGrade.value),
    floor: textOf(els.reportFloor.value),
    area: textOf(els.reportArea.value),
    stats: textOf(els.reportStats.value),
    passive: textOf(els.reportPassive.value),
    sailing: Boolean(els.reportSailing.checked),
    recommendedCharacters: [...els.reportRecommendations]
      .filter((field) => field.checked)
      .map((field) => field.value)
      .join(", "),
    active: [els.reportActive, els.reportActive2, els.reportActive3]
      .map((field) => textOf(field.value))
      .filter(Boolean)
      .join("\n") || "-",
    createdAt: new Date().toISOString(),
  };
  const submitButton = els.reportForm.querySelector("[type='submit']");
  if (submitButton) submitButton.disabled = true;
  try {
    const saved = hasPublicReportStore()
      ? { ...(await savePublicReport(report)), authorNickname: report.authorNickname }
      : report;
    pendingReports = sortReportsByDate([saved, ...pendingReports.filter((item) => item.id !== saved.id)]);
    saveStoredRows(storageKeys.pending, pendingReports);
    els.reportForm.reset();
    if (els.reportDataset) updateReportDataset();
    renderPendingReports();
    setReportSyncStatus(
      hasPublicReportStore()
        ? "제보가 공개 저장소의 검수 대기에 등록되었습니다."
        : "공개 저장소 연결 전이라 이 브라우저의 검수 대기에 임시 저장했습니다.",
      hasPublicReportStore() ? "is-online" : "is-offline"
    );
  } catch {
    pendingReports = sortReportsByDate([report, ...pendingReports.filter((item) => item.id !== report.id)]);
    saveStoredRows(storageKeys.pending, pendingReports);
    renderPendingReports();
    setReportSyncStatus("제보 저장소 저장에 실패해 이 브라우저의 검수 대기에 임시 저장했습니다.", "is-offline");
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

async function handlePendingAction(event) {
  if (!adminUnlocked) return;
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest("[data-report-id]")?.dataset.reportId;
  const report = pendingReports.find((item) => item.id === id);
  if (!report) return;
  button.disabled = true;

  try {
    if (hasPublicReportStore()) {
      await updatePublicReportStatus(id, button.dataset.action === "approve" ? "approved" : "rejected");
    }
  } catch {
    setReportSyncStatus("공개 저장소 검수 상태 업데이트에 실패했습니다. 임시 목록만 변경합니다.", "is-offline");
  }

  pendingReports = pendingReports.filter((item) => item.id !== id);
  saveStoredRows(storageKeys.pending, pendingReports);

  if (button.dataset.action === "approve") {
    const approvedReport = { ...report, status: "approved", reviewedAt: new Date().toISOString() };
    approvedReportItems = sortReportsByDate([approvedReport, ...approvedReportItems.filter((item) => item.id !== id)]);
    syncApprovedRows();
    if (els.search) {
      refreshControls();
      renderStatChips();
    }
  }

  if (els.search) render();
  else {
    renderPendingReports();
    renderApprovedReports();
  }
}

function renderPendingReports() {
  els.pendingCount.textContent = `검수 대기 ${pendingReports.length}건`;
  if (!adminUnlocked) {
    els.pendingReports.innerHTML = `<div class="empty compact-empty">관리자 모드를 열면 검수 대기 목록이 표시됩니다.</div>`;
    return;
  }
  els.pendingReports.innerHTML = pendingReports.length
    ? pendingReports.map((report) => isNumbersReport(report) ? `
      <article class="pending-card" data-report-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">넘버스</span> ${escapeHtml(visibleReportName(report))}</strong>
          <span>${report.mode === "edit" ? "수정" : "신규"} · #${escapeHtml(report.floor)} · Lv ${escapeHtml(report.grade)}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>효과</b> ${escapeHtml(report.stats)}</p>
        <p><b>착용부위</b> ${escapeHtml(report.area === "-" ? "미기록" : report.area)} · <b>획득처</b> ${escapeHtml(report.passive === "-" ? "미기록" : report.passive)}</p>
        <div class="pending-actions">
          <button type="button" data-action="approve">승인해서 추가</button>
          <button type="button" data-action="reject">반려</button>
        </div>
      </article>
    ` : `
      <article class="pending-card" data-report-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">정수</span> ${escapeHtml(report.monster)}</strong>
          <span>${report.mode === "edit" ? `수정 (${escapeHtml(report.originalMonster || report.monster)} → ${escapeHtml(report.monster)})` : "신규"} · ${escapeHtml(report.floor)} · ${escapeHtml(report.area)} · ${escapeHtml(report.grade)} ${report.sailing ? `<b class="sailing-pill">항해</b>` : ""} ${report.recommendedCharacters ? `<b class="character-pill">${escapeHtml(report.recommendedCharacters)} 추천</b>` : ""}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>스탯</b> ${escapeHtml(report.stats)}</p>
        <p><b>패시브</b> ${escapeHtml(report.passive)}</p>
        <p class="multi-skill"><b>액티브</b> ${escapeHtml(report.active)}</p>
        <div class="pending-actions">
          <button type="button" data-action="approve">승인해서 추가</button>
          <button type="button" data-action="reject">반려</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty compact-empty">검수 대기 제보가 없습니다.</div>`;
}

async function handleApprovedAction(event) {
  if (!adminUnlocked) return;
  const button = event.target.closest("button[data-approved-action]");
  if (!button) return;
  const id = button.closest("[data-approved-id]")?.dataset.approvedId;
  const report = approvedReportItems.find((item) => item.id === id);
  if (!report) return;
  button.disabled = true;

  try {
    if (hasPublicReportStore()) await updatePublicReportStatus(id, "deleted");
    approvedReportItems = approvedReportItems.filter((item) => item.id !== id);
    syncApprovedRows();
    if (els.search) {
      refreshControls();
      renderStatChips();
      render();
    }
    renderApprovedReports();
    setReportSyncStatus("등록된 정수를 삭제 처리했습니다.", "is-online");
  } catch {
    button.disabled = false;
    setReportSyncStatus("등록된 정수 삭제에 실패했습니다.", "is-offline");
  }
}

function renderApprovedReports() {
  if (!els.approvedReports || !els.approvedCount) return;
  els.approvedCount.textContent = `등록된 정보 ${approvedReportItems.length}건`;
  if (!adminUnlocked) {
    els.approvedReports.innerHTML = `<div class="empty compact-empty">관리자 모드를 열면 등록된 정수 삭제 목록이 표시됩니다.</div>`;
    return;
  }
  els.approvedReports.innerHTML = approvedReportItems.length
    ? approvedReportItems.map((report) => isNumbersReport(report) ? `
      <article class="pending-card" data-approved-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">넘버스</span> ${escapeHtml(visibleReportName(report))}</strong>
          <span>${report.mode === "edit" ? "수정 승인" : "신규 승인"} · #${escapeHtml(report.floor)} · Lv ${escapeHtml(report.grade)}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>효과</b> ${escapeHtml(report.stats)}</p>
        <p><b>착용부위</b> ${escapeHtml(report.area === "-" ? "미기록" : report.area)} · <b>획득처</b> ${escapeHtml(report.passive === "-" ? "미기록" : report.passive)}</p>
        <div class="pending-actions">
          <button type="button" data-approved-action="delete">등록 정보 삭제</button>
        </div>
      </article>
    ` : `
      <article class="pending-card" data-approved-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">정수</span> ${escapeHtml(report.monster)}</strong>
          <span>${report.mode === "edit" ? `수정 승인 (${escapeHtml(report.originalMonster || report.monster)} → ${escapeHtml(report.monster)})` : "신규 승인"} · ${escapeHtml(report.floor)} · ${escapeHtml(report.area)} · ${escapeHtml(report.grade)} ${report.sailing ? `<b class="sailing-pill">항해</b>` : ""} ${report.recommendedCharacters ? `<b class="character-pill">${escapeHtml(report.recommendedCharacters)} 추천</b>` : ""}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>스탯</b> ${escapeHtml(report.stats)}</p>
        <p><b>패시브</b> ${escapeHtml(report.passive)}</p>
        <p class="multi-skill"><b>액티브</b> ${escapeHtml(report.active)}</p>
        <div class="pending-actions">
          <button type="button" data-approved-action="delete">등록 정수 삭제</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty compact-empty">승인되어 등록된 제보 정수가 없습니다.</div>`;
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
  const neededCondition = Math.floor(totalGameHours / 2);
  const currentCondition = Math.min(100, Math.max(0, Number(els.currentCondition.value || 0)));
  const remainingCondition = Math.max(0, currentCondition - neededCondition);
  els.neededCondition.textContent = String(neededCondition);
  els.remainingCondition.textContent = String(remainingCondition);
  els.conditionGuide.textContent = neededCondition > currentCondition
    ? `현재 컨디션보다 ${neededCondition - currentCondition} 부족합니다.`
    : "현재 컨디션으로 진행할 수 있습니다.";
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
