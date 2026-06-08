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
const staticDataVersion = textOf(siteConfig.staticDataVersion) || "20260607-static-index";
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
const profileBackend = {
  url: textOf(siteConfig.supabaseUrl).replace(/\/$/, ""),
  anonKey: textOf(siteConfig.supabaseAnonKey),
  table: textOf(siteConfig.profileTable) || "user_profiles",
};
const adminEmails = Array.isArray(siteConfig.adminEmails)
  ? siteConfig.adminEmails.map((email) => textOf(email).toLowerCase()).filter(Boolean)
  : [];
const visitorBuildMarkers = {
  total: "__visitor_total__",
  daily: "__visitor_daily__",
};
const sessionTimeMarker = "__session_time__";
const buildLikeMarker = "__build_like__";
const buildDeleteMarker = "__build_deleted__";
const buildRestoreMarker = "__build_restored__";
const buildReviewMarker = "__build_review__";
const buildReportMarker = "__build_report__";
const guideCommentPrefix = "__guide_comment__:";
const guideLikePrefix = "__guide_like__:";
const guideReportPrefix = "__guide_report__:";
const numbersReportPrefix = "__numbers__:";
const numbersDeleteMarker = "__numbers_deleted__";
const reportDeleteMarker = "__report_deleted__";
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
  continuous: {
    label: "연속",
    pattern: /연속/i,
    scorePatterns: [
      /연속\s*([+-]?\d+(?:\.\d+)?)\s*(?:회|번|타|초)?/i,
      /([+-]?\d+(?:\.\d+)?)\s*(?:회|번|타|초)?\s*연속/i,
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

const floorOptions = ["1층", "1층 균열", "2층", "2층 균열", "3층", "3층 균열", "4층", "4층 균열", "5층", "5층 균열", "6층"];
const crackAreasByFloor = {
  "1층 균열": ["강철의 묘", "녹색 탄광", "빙하굴", "핏빛 성채"],
  "2층 균열": ["검귀의 동굴", "망자의제단", "안개의 거석 폐허", "총포사막", "홉고블린 요새"],
  "3층 균열": ["백색신전"],
  "4층 균열": ["천공신탁소"],
  "5층 균열": ["결빙의 성소"],
};
const areaFloorPairs = [];
Object.entries(crackAreasByFloor).forEach(([floor, areas]) => {
  areas.forEach((area) => areaFloorPairs.push([normalizeLocationName(area), floor]));
});
const areaFloorLookup = new Map(areaFloorPairs);
const areaLabelPairs = [];
Object.values(crackAreasByFloor).forEach((areas) => {
  areas.forEach((area) => areaLabelPairs.push([normalizeLocationName(area), area]));
});
const areaLabelLookup = new Map(areaLabelPairs);

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
  homeNoticeList: document.querySelector("#homeNoticeList"),
  homeNoticePagination: document.querySelector("#homeNoticePagination"),
  homeNoticeStatus: document.querySelector("#homeNoticeStatus"),
  homePopularGuides: document.querySelector("#homePopularGuides"),
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
  reportModeCards: document.querySelector("#reportModeCards"),
  reportNickname: document.querySelector("#reportNickname"),
  reportMonster: document.querySelector("#reportMonster"),
  editNameHint: document.querySelector("#editNameHint"),
  reportOriginalMonsterField: document.querySelector("#reportOriginalMonsterField"),
  reportOriginalMonster: document.querySelector("#reportOriginalMonster"),
  reportGrade: document.querySelector("#reportGrade"),
  reportFloor: document.querySelector("#reportFloor"),
  reportAreaCandidate: document.querySelector("#reportAreaCandidate"),
  reportAreaAdd: document.querySelector("#reportAreaAdd"),
  reportAreaTags: document.querySelector("#reportAreaTags"),
  reportArea: document.querySelector("#reportArea"),
  reportSailing: document.querySelector("#reportSailing"),
  reportRecommendations: document.querySelectorAll(".report-recommendation"),
  reportStats: document.querySelector("#reportStats"),
  reportPassive: document.querySelector("#reportPassive"),
  reportActive: document.querySelector("#reportActive"),
  reportActive2: document.querySelector("#reportActive2"),
  reportActive3: document.querySelector("#reportActive3"),
  reportActive4: document.querySelector("#reportActive4"),
  reportActiveAdd: document.querySelector("#reportActiveAdd"),
  reportNumberName: document.querySelector("#reportNumberName"),
  reportNumberCode: document.querySelector("#reportNumberCode"),
  reportNumberLevel: document.querySelector("#reportNumberLevel"),
  reportNumberEffect: document.querySelector("#reportNumberEffect"),
  reportNumberSlot: document.querySelector("#reportNumberSlot"),
  reportNumberSourceFloor: document.querySelector("#reportNumberSourceFloor"),
  reportNumberSourceCandidate: document.querySelector("#reportNumberSourceCandidate"),
  reportNumberSourceAdd: document.querySelector("#reportNumberSourceAdd"),
  reportNumberSourceTags: document.querySelector("#reportNumberSourceTags"),
  reportNumberSource: document.querySelector("#reportNumberSource"),
  monsterOptions: document.querySelector("#monsterOptions"),
  numberOptions: document.querySelector("#numberOptions"),
  editMonsterMatches: document.querySelector("#editMonsterMatches"),
  editNumberMatches: document.querySelector("#editNumberMatches"),
  reportPreview: document.querySelector("#reportPreview"),
  myReportCount: document.querySelector("#myReportCount"),
  myReports: document.querySelector("#myReports"),
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
  adminStatsGrid: document.querySelector("#adminStatsGrid"),
  adminGuideCount: document.querySelector("#adminGuideCount"),
  adminGuideList: document.querySelector("#adminGuideList"),
  adminBuildCount: document.querySelector("#adminBuildCount"),
  adminBuildList: document.querySelector("#adminBuildList"),
  adminDeletedBuildCount: document.querySelector("#adminDeletedBuildCount"),
  adminDeletedBuildList: document.querySelector("#adminDeletedBuildList"),
  adminUserCount: document.querySelector("#adminUserCount"),
  adminUserList: document.querySelector("#adminUserList"),
  adminSiteStats: document.querySelector("#adminSiteStats"),
  adminQualityList: document.querySelector("#adminQualityList"),
  adminDataHealthList: document.querySelector("#adminDataHealthList"),
  adminRefreshCenter: document.querySelector("#adminRefreshCenter"),
  adminExportReports: document.querySelector("#adminExportReports"),
  adminExportGuides: document.querySelector("#adminExportGuides"),
  adminExportBuilds: document.querySelector("#adminExportBuilds"),
  adminExportAll: document.querySelector("#adminExportAll"),
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
  quickEditAreaCandidate: document.querySelector("#quickEditAreaCandidate"),
  quickEditAreaAdd: document.querySelector("#quickEditAreaAdd"),
  quickEditAreaTags: document.querySelector("#quickEditAreaTags"),
  quickEditArea: document.querySelector("#quickEditArea"),
  quickEditStats: document.querySelector("#quickEditStats"),
  quickEditPassive: document.querySelector("#quickEditPassive"),
  quickEditActive: document.querySelector("#quickEditActive"),
  quickEditActive2: document.querySelector("#quickEditActive2"),
  quickEditActive3: document.querySelector("#quickEditActive3"),
  quickEditActive4: document.querySelector("#quickEditActive4"),
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
let buildReviews = new Map();
let buildLikeIpPromise = null;
let pendingDeleteBuild = null;
let essenceRows = mergeApprovedRows(data["정수"] || [], approvedReports);
let numbersRows = mergeNumbersRows(data["넘버스"] || [], approvedReportItems);
let adminUnlocked = localStorage.getItem(storageKeys.adminUnlocked) === "1";
let adminCenterData = {
  guides: [],
  builds: [],
  users: [],
  visitors: { total: null, today: null },
  loadedAt: "",
};
let adminStatsRangeDays = 14;
let adminStatsExcludeAdmin = false;
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

function isAdminUser(user = window.DUKHUBUSTERS_AUTH?.getUser?.()) {
  const email = textOf(user?.email).toLowerCase();
  return Boolean(adminEmails.length && adminEmails.includes(email));
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
      && skill !== numbersDeleteMarker
      && skill !== reportDeleteMarker
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
    .filter((skill) => skill !== sailingMarker
      && skill !== numbersDeleteMarker
      && skill !== reportDeleteMarker
      && !skill.startsWith(recommendationMarkerPrefix)
      && !skill.startsWith(authorNicknameMarkerPrefix));
  if (report.mode === "delete") skills.push(reportDeleteMarker);
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

function compactSearchText(value) {
  return textOf(value).toLowerCase().replace(/\s+/g, "");
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
    if (row["_mode"] === "delete" || row["출처"] === "삭제 승인") {
      for (let index = merged.length - 1; index >= 0; index -= 1) {
        const itemMonster = textOf(merged[index]["몬스터"]);
        if (itemMonster === originalMonster || itemMonster === monster) merged.splice(index, 1);
      }
      return;
    }
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

function reportModeLabel(report) {
  if (isDeleteReport(report)) return "삭제";
  if (report?.mode === "edit") return "수정";
  return "신규";
}

function cleanNumberSources(value) {
  return unique(textOf(value)
    .split(/[,、/]/)
    .map(textOf)
    .filter((source) => source && source !== "4층 보스 드랍"))
    .join(", ");
}

function normalizeNumberCode(value) {
  const raw = textOf(value).replace(/^NO\.?\s*/i, "");
  if (!raw || raw === "미확인") return "";
  const match = raw.match(/^\d{1,4}$/);
  if (!match) return "";
  const number = Number(match[0]);
  return number >= 0 && number <= 9999 ? String(number) : "";
}

function normalizeGradeNumber(value) {
  const match = textOf(value).match(/\d+/);
  return match ? match[0] : "";
}

function gradeLabelFromInput(value) {
  const grade = normalizeGradeNumber(value);
  return grade ? `${grade}등급` : "";
}

function hasConfirmedNumber(value) {
  return normalizeNumberCode(value) !== "";
}

function numberIdentity(row) {
  const code = normalizeNumberCode(row?.["번호"]);
  return code ? `no:${code}` : `name:${textOf(row?.["이름"]).toLowerCase()}`;
}

function mergeNumberSources(left, right) {
  return unique([
    ...cleanNumberSources(left).split(",").map(textOf),
    ...cleanNumberSources(right).split(",").map(textOf),
  ].filter(Boolean)).join(", ");
}

function combineNumberRows(current, incoming) {
  return {
    ...current,
    ...incoming,
    "_baseNumber": Boolean(current?._baseNumber),
    "획득처": mergeNumberSources(current?.["획득처"], incoming?.["획득처"]),
  };
}

function dedupeNumberRows(rows, options = {}) {
  const merged = [];
  const indexByKey = new Map();
  rows.forEach((row) => {
    const cleanRow = {
      ...row,
      "_baseNumber": Boolean(options.base),
      "번호": normalizeNumberCode(row["번호"]) || "미확인",
      "획득처": cleanNumberSources(row["획득처"]),
    };
    const key = numberIdentity(cleanRow);
    if (key === "name:") {
      merged.push(cleanRow);
      return;
    }
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, merged.length);
      merged.push(cleanRow);
    } else {
      merged[existingIndex] = combineNumberRows(merged[existingIndex], cleanRow);
    }
  });
  return merged;
}

function numbersReportToRow(report) {
  return {
    "_reportId": report.id,
    "번호": normalizeNumberCode(report.floor) || "미확인",
    "이름": visibleReportName(report),
    "효과": report.stats,
    "아이템 레벨(Lv)": report.grade,
    "착용부위": report.area === "-" ? "" : report.area,
    "획득처": report.passive === "-" ? "" : cleanNumberSources(report.passive),
  };
}

function isNumbersDeleteReport(report) {
  return isDeleteReport(report);
}

function isDeleteReport(report) {
  const rawActive = [report?.active, report?.rawActive, report?._rawActive].map(textOf).join("\n");
  const skills = splitSkills(rawActive);
  const rawMode = textOf(report?.mode || report?.report_mode || report?._mode).toLowerCase();
  const stats = textOf(report?.stats || report?.["주요 스탯"] || report?.effect || report?.["효과"]);
  return report?._deleteRequested === true
    || rawMode === "delete"
    || rawMode === "삭제"
    || rawMode === "remove"
    || rawMode === "deleted"
    || skills.includes(numbersDeleteMarker)
    || skills.includes(reportDeleteMarker)
    || /^\[(삭제\s*요청|관리자\s*삭제)\]/.test(stats)
    || /삭제\s*(요청|해주세요|바랍니다|처리)/.test(stats);
}

function reportTargetsSame(left, right) {
  if (isNumbersReport(left) !== isNumbersReport(right)) return false;
  if (isNumbersReport(left)) {
    const leftCode = normalizeNumberCode(left?.floor);
    const rightCode = normalizeNumberCode(right?.floor);
    if (leftCode && rightCode) return leftCode === rightCode;
    const leftName = textOf(visibleReportName(left)).toLowerCase();
    const rightName = textOf(visibleReportName(right)).toLowerCase();
    return Boolean(leftName && rightName && leftName === rightName);
  }
  const leftNames = [left?.originalMonster, left?.monster].map(monsterKey).filter(Boolean);
  const rightNames = [right?.originalMonster, right?.monster].map(monsterKey).filter(Boolean);
  return leftNames.some((name) => rightNames.includes(name));
}

function mergeNumbersRows(baseRows, reports) {
  const merged = dedupeNumberRows(baseRows, { base: true });
  [...reports].filter((report) => report.status === "approved" && isNumbersReport(report)).reverse().forEach((report) => {
    const reportName = visibleReportName(report);
    const reportNumber = normalizeNumberCode(report.floor);
    if (isNumbersDeleteReport(report)) {
      for (let index = merged.length - 1; index >= 0; index -= 1) {
        const item = merged[index];
        if (textOf(item["이름"]) === reportName || (reportNumber && normalizeNumberCode(item["번호"]) === reportNumber)) {
          merged.splice(index, 1);
        }
      }
      return;
    }
    const row = numbersReportToRow(report);
    const rowKey = numberIdentity(row);
    const index = merged.findIndex((item) => numberIdentity(item) === rowKey || textOf(item["이름"]) === textOf(row["이름"]));
    if (index >= 0) merged[index] = combineNumberRows(merged[index], row);
    else merged.unshift(row);
  });
  return merged;
}

function numberFrom(value) {
  const match = textOf(value).replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Infinity;
}

function displayNumber(value) {
  const number = normalizeNumberCode(value);
  return number ? `NO.${number}` : "미확인";
}

function numberCodeClass(value) {
  return hasConfirmedNumber(value) ? "number-code" : "number-code is-unknown";
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
  const values = [];
  (effect.scorePatterns || []).forEach((pattern) => {
    lines.forEach((line) => {
      const value = line.match(pattern)?.[1];
      if (value) values.push(Math.abs(Number(value)));
    });
  });
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
  const areas = [];
  Object.values(crackAreasByFloor).forEach((items) => {
    items.forEach((area) => areas.push(area));
  });
  return areas;
}

function areaOptionsForFloor(floor, rows = []) {
  if (crackAreasByFloor[floor]) return crackAreasByFloor[floor];
  if (floor && floor !== "전체 층") {
    const areas = [];
    rows.filter((row) => sameLocationName(row["층"], floor)).forEach((row) => {
      essenceAreaLabels(row["구역"]).forEach((area) => areas.push(area));
    });
    return unique(areas);
  }
  const rowAreas = [];
  rows.forEach((row) => {
    essenceAreaLabels(row["구역"]).forEach((area) => rowAreas.push(area));
  });
  return unique([...allConfiguredAreas(), ...rowAreas]);
}

function refreshEssenceAreaOptions() {
  optionList(els.area, areaOptionsForFloor(els.floor?.value, essenceRows), "전체 구역");
}

function essenceAreaLabels(value) {
  return sourceAreaLabels(value);
}

function essenceAreaMatches(rowArea, area) {
  return essenceAreaLabels(rowArea).some((item) => sameLocationName(item, area));
}

function refreshReportAreaOptions() {
  const selected = selectedOptionValues(els.reportArea);
  const options = areaOptionsForFloor(els.reportFloor?.value, essenceRows);
  multiOptionList(els.reportArea, unique([...selected, ...options]));
  optionList(els.reportAreaCandidate, options, "구역 선택");
  renderReportAreaTags();
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
  const rowAreas = [];
  rows.forEach((row) => {
    sourceAreaLabels(row["획득처"]).forEach((area) => rowAreas.push(area));
  });
  return unique([...configured, ...rowAreas]);
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
  const selected = selectedOptionValues(els.reportNumberSource);
  const options = numbersAreaOptionsForFloor(els.reportNumberSourceFloor?.value);
  multiOptionList(els.reportNumberSource, unique([...selected, ...options]));
  optionList(els.reportNumberSourceCandidate, options, "획득처 선택");
  renderReportNumberSourceTags();
}

function addReportNumberSource() {
  const value = textOf(els.reportNumberSourceCandidate?.value);
  if (!value || value === "획득처 선택") return;
  const selected = unique([...selectedOptionValues(els.reportNumberSource), value]);
  multiOptionList(els.reportNumberSource, selected);
  setSelectedOptionValues(els.reportNumberSource, selected);
  renderReportNumberSourceTags();
  renderReportPreview();
}

function removeReportNumberSource(value) {
  const selected = selectedOptionValues(els.reportNumberSource).filter((item) => item !== value);
  const options = numbersAreaOptionsForFloor(els.reportNumberSourceFloor?.value);
  multiOptionList(els.reportNumberSource, unique([...selected, ...options]));
  setSelectedOptionValues(els.reportNumberSource, selected);
  renderReportNumberSourceTags();
  renderReportPreview();
}

function renderReportNumberSourceTags() {
  if (!els.reportNumberSourceTags) return;
  const selected = selectedOptionValues(els.reportNumberSource);
  els.reportNumberSourceTags.innerHTML = selected.length
    ? selected.map((source) => `
      <button type="button" class="source-tag" data-remove-number-source="${escapeHtml(source)}">
        ${escapeHtml(source)} <span aria-hidden="true">×</span>
      </button>
    `).join("")
    : `<span class="source-tag-empty">선택된 획득처가 없습니다.</span>`;
}

function addSelectedArea(select, candidate, tags) {
  const value = textOf(candidate?.value);
  if (!value || value === "구역 선택") return;
  const selected = unique([...selectedOptionValues(select), value]);
  multiOptionList(select, selected);
  setSelectedOptionValues(select, selected);
  renderAreaTags(select, tags);
}

function removeSelectedArea(select, tags, area) {
  const selected = selectedOptionValues(select).filter((item) => item !== area);
  multiOptionList(select, selected);
  setSelectedOptionValues(select, selected);
  renderAreaTags(select, tags);
}

function renderAreaTags(select, tags) {
  if (!tags || !select) return;
  const selected = selectedOptionValues(select);
  tags.innerHTML = selected.length
    ? selected.map((area) => `
      <button type="button" class="source-tag" data-remove-area="${escapeHtml(area)}">
        ${escapeHtml(area)} <span aria-hidden="true">×</span>
      </button>
    `).join("")
    : `<span class="source-tag-empty">선택된 구역이 없습니다.</span>`;
}

function renderReportAreaTags() {
  renderAreaTags(els.reportArea, els.reportAreaTags);
}

function renderQuickEditAreaTags() {
  renderAreaTags(els.quickEditArea, els.quickEditAreaTags);
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
  const fromEssence = [];
  essenceRows.forEach((row) => {
    textOf(row["주요 스탯"])
      .split(",")
      .map((part) => cleanStatName(part.trim().match(/^(.+?)\s+\d+/)?.[1]))
      .filter(Boolean)
      .forEach((name) => fromEssence.push(name));
  });
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
      && row.title !== buildReviewMarker && row.title !== buildReportMarker
      && row.title !== visitorBuildMarkers.total && row.title !== visitorBuildMarkers.daily
      && !deletedIds.has(row.id) && noticeWithinWeek(row.created_at || row.createdAt))
    .map((row) => {
      const build = normalizeRemoteBuild(row);
      return {
        id: build.id,
        type: "build",
        label: "빌드",
        title: build.title || "이름 없는 빌드",
        summary: `${build.author || "익명"} · ${build.members.length}명 구성`,
        date: build.createdAt,
        href: homeNoticeLink("build", build.id, row),
      };
    });
}

function homeGuideNotices(rows) {
  return rows
    .filter((row) => !textOf(row.title).startsWith(guideCommentPrefix)
      && !textOf(row.title).startsWith(guideLikePrefix)
      && !textOf(row.title).startsWith(guideReportPrefix)
      && noticeWithinWeek(row.updated_at || row.created_at))
    .map((row) => {
      const title = textOf(row.title).replace(/^\[(질문|보스|파밍|빌드|정보)\]\s*/, "");
      const category = textOf(row.title).match(/^\[(질문|보스|파밍|빌드|정보)\]/)?.[1] || "일반";
      return {
        id: row.id,
        type: "guide",
        label: "게시판",
        title,
        summary: `${category} · ${textOf(row.author) || "익명"}`,
        date: row.updated_at || row.created_at,
        href: homeNoticeLink("guide", row.id, row),
      };
    });
}

function guideMediaRows(row) {
  return Array.isArray(row.media) ? row.media : [];
}

function guideViewCount(row) {
  const counter = guideMediaRows(row).find((item) => item?.kind === "guide-view-counter");
  return Number(counter?.views || 0);
}

function guidePlainTitle(row) {
  return textOf(row.title).replace(/^\[(질문|보스|파밍|빌드|정보)\]\s*/, "");
}

function guideCategory(row) {
  return textOf(row.title).match(/^\[(질문|보스|파밍|빌드|정보)\]/)?.[1] || "일반";
}

function renderHomePopularGuides(rows) {
  if (!els.homePopularGuides) return;
  const comments = new Map();
  const likes = new Map();
  rows.forEach((row) => {
    const title = textOf(row.title);
    if (title.startsWith(guideCommentPrefix)) {
      const postId = title.slice(guideCommentPrefix.length);
      comments.set(postId, (comments.get(postId) || 0) + 1);
    }
    if (title.startsWith(guideLikePrefix)) {
      const postId = title.slice(guideLikePrefix.length);
      likes.set(postId, (likes.get(postId) || 0) + 1);
    }
  });
  const popular = rows
    .filter((row) => !textOf(row.title).startsWith(guideCommentPrefix)
      && !textOf(row.title).startsWith(guideLikePrefix)
      && !textOf(row.title).startsWith(guideReportPrefix))
    .map((row) => {
      const viewCount = guideViewCount(row);
      const likeCount = likes.get(row.id) || 0;
      const commentCount = comments.get(row.id) || 0;
      return {
        id: row.id,
        title: guidePlainTitle(row),
        category: guideCategory(row),
        author: textOf(row.author) || "익명",
        views: viewCount,
        likes: likeCount,
        comments: commentCount,
        score: viewCount + likeCount * 5 + commentCount * 3,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  els.homePopularGuides.innerHTML = popular.length ? popular.map((post, index) => `
    <a class="home-popular-item" href="./guides.html?post=${encodeURIComponent(post.id)}">
      <span>${index + 1}</span>
      <strong>${escapeHtml(post.title || "제목 없는 게시글")}</strong>
      <small>${escapeHtml(post.category)} · ${escapeHtml(post.author)} · 조회 ${post.views} · 좋아요 ${post.likes} · 댓글 ${post.comments}</small>
    </a>
  `).join("") : `<div class="home-notice-empty">아직 집계된 인기 게시글이 없습니다.</div>`;
}

async function loadHomeNotices() {
  try {
    const [reports, builds, guides] = await Promise.all([
      fetchStaticRows("reports-index"),
      fetchStaticRows("builds-index"),
      fetchStaticRows("guides-index"),
    ]);
    homeNotices = [
      ...reports.map(noticeFromReport).filter(Boolean),
      ...homeBuildNotices(builds),
      ...homeGuideNotices(guides),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    renderHomePopularGuides(guides);
    els.homeNoticeStatus.textContent = "가벼운 공개 목록으로 최근 소식을 표시합니다.";
    renderHomeNotices();
    return;
  } catch {
    // Static data is the free-tier path. Fall back to Firestore when the snapshot is not available yet.
  }
  if (!reportBackend.url || !reportBackend.anonKey || !buildBackend.url || !buildBackend.anonKey
    || !guideBackend.url || !guideBackend.anonKey) {
    els.homeNoticeStatus.textContent = "공개 저장소가 연결되면 최근 공지사항이 표시됩니다.";
    renderHomePopularGuides([]);
    renderHomeNotices();
    return;
  }
  const requests = await Promise.allSettled([
    fetch(reportStoreUrl("?select=*&status=eq.approved&order=reviewed_at.desc"), { headers: reportStoreHeaders() }),
    fetch(buildStoreUrl(publicBuildRowsQuery()), { headers: buildStoreHeaders() }),
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
  renderHomePopularGuides(guides);
  const failedCount = requests.filter((request) => request.status !== "fulfilled" || !request.value.ok).length;
  els.homeNoticeStatus.textContent = failedCount
    ? "일부 최근 소식을 불러오지 못했습니다. 잠시 후 다시 확인해주세요."
    : "항목을 누르면 해당 정보 화면으로 바로 이동합니다.";
  renderHomeNotices();
}

function renderHomeNotices() {
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
    ? noticePaginationMarkup(pageCount, activeHomeNoticePage)
    : "";
}

function noticePaginationMarkup(pageCount, currentPage) {
  const pages = new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1]);
  const validPages = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const parts = [];
  let previous = 0;
  validPages.forEach((page) => {
    if (page - previous > 1) parts.push(`<span class="home-notice-page-gap">...</span>`);
    parts.push(`<button type="button" data-notice-page="${page}" class="${page === currentPage ? "is-active" : ""}"${page === currentPage ? ' aria-current="page"' : ""}>${page}</button>`);
    previous = page;
  });
  return `
    <button type="button" data-notice-page="${Math.max(1, currentPage - 1)}"${currentPage === 1 ? " disabled" : ""}>이전</button>
    ${parts.join("")}
    <button type="button" data-notice-page="${Math.min(pageCount, currentPage + 1)}"${currentPage === pageCount ? " disabled" : ""}>다음</button>
  `;
}

function initNumbers() {
  els.numbersSearch.value = new URLSearchParams(location.search).get("search") || "";
  adminUnlocked = isAdminUser();
  window.addEventListener("dukhubusters:auth", (event) => {
    adminUnlocked = isAdminUser(event.detail?.user);
    renderNumbers();
  });
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
  els.numbersResults.addEventListener("click", handleNumberCardAction);
  renderNumbersEffectSortChips();
  renderNumbers();
  loadPublicApprovedReports();
}

async function handleNumberCardAction(event) {
  const button = event.target.closest("button[data-number-admin-delete]");
  if (!button) return;
  if (!adminUnlocked || !isAdminUser()) {
    alert("관리자 계정으로 로그인해야 바로 삭제할 수 있습니다.");
    return;
  }
  const row = findNumberRow(button.dataset.numberAdminDelete);
  if (!row) return;
  if (!confirm(`${textOf(row["이름"])} 정보를 바로 삭제할까요?`)) return;
  button.disabled = true;
  button.textContent = "삭제 중";
  try {
    await adminDeleteNumber(row);
  } catch {
    alert("삭제 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    button.disabled = false;
    button.textContent = "관리자 삭제";
  }
}

async function adminDeleteNumber(row) {
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: "delete",
    authorNickname: currentAuthNickname() || "관리자",
    monster: `${numbersReportPrefix}${textOf(row["이름"])}`,
    grade: textOf(row["아이템 레벨(Lv)"]),
    floor: textOf(row["번호"]) || "미확인",
    area: textOf(row["착용부위"]) || "-",
    stats: `[관리자 삭제] ${textOf(row["이름"])} 정보 삭제`,
    passive: textOf(row["획득처"]) || "-",
    active: numbersDeleteMarker,
    status: "approved",
    createdAt: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
  };
  const saved = hasPublicReportStore()
    ? await saveApprovedNumberDeleteReport(report)
    : report;
  approvedReportItems = sortReportsByDate([saved, ...approvedReportItems.filter((item) => item.id !== saved.id)]);
  updateApprovedFromReports([...approvedReportItems]);
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
  els.quickEditAreaAdd?.addEventListener("click", () => addSelectedArea(els.quickEditArea, els.quickEditAreaCandidate, els.quickEditAreaTags));
  els.quickEditAreaCandidate?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSelectedArea(els.quickEditArea, els.quickEditAreaCandidate, els.quickEditAreaTags);
  });
  els.quickEditAreaTags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-area]");
    if (button) removeSelectedArea(els.quickEditArea, els.quickEditAreaTags, button.dataset.removeArea);
  });
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
  els.reportModeCards?.addEventListener("click", handleReportModeCardClick);
  els.reportFloor.addEventListener("change", refreshReportAreaOptions);
  els.reportAreaAdd?.addEventListener("click", () => {
    addSelectedArea(els.reportArea, els.reportAreaCandidate, els.reportAreaTags);
    renderReportPreview();
  });
  els.reportAreaCandidate?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSelectedArea(els.reportArea, els.reportAreaCandidate, els.reportAreaTags);
    renderReportPreview();
  });
  els.reportAreaTags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-area]");
    if (!button) return;
    removeSelectedArea(els.reportArea, els.reportAreaTags, button.dataset.removeArea);
    renderReportPreview();
  });
  els.reportNumberSourceFloor.addEventListener("change", refreshReportNumberSourceOptions);
  els.reportNumberSourceAdd?.addEventListener("click", addReportNumberSource);
  els.reportActiveAdd?.addEventListener("click", addReportActiveField);
  els.reportNumberSourceCandidate?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addReportNumberSource();
  });
  els.reportNumberSourceTags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-number-source]");
    if (button) removeReportNumberSource(button.dataset.removeNumberSource);
  });
  els.reportMonster.addEventListener("input", handleReportMonsterInput);
  els.reportNumberName.addEventListener("input", handleReportNumberInput);
  els.editMonsterMatches.addEventListener("click", handleEditMonsterClick);
  els.editNumberMatches.addEventListener("click", handleEditNumberClick);
  els.reportForm.addEventListener("submit", submitReport);
  els.reportForm.addEventListener("input", handleReportFormChange);
  els.reportForm.addEventListener("change", handleReportFormChange);
  window.addEventListener("dukhubusters:auth", renderMyReports);
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
  renderMyReports();
  loadPublicReports();
}

function initAdminReview() {
  adminUnlocked = false;
  els.pendingReports.addEventListener("click", handlePendingAction);
  els.approvedReports?.addEventListener("click", handleApprovedAction);
  els.copyApproved?.addEventListener("click", copyApprovedRows);
  els.adminUnlock?.addEventListener("click", () => window.DUKHUBUSTERS_AUTH?.signIn?.());
  els.adminLock?.addEventListener("click", () => window.DUKHUBUSTERS_AUTH?.signOut?.());
  els.adminRefreshCenter?.addEventListener("click", loadAdminCenter);
  els.adminSiteStats?.addEventListener("click", handleAdminStatsControls);
  els.adminGuideList?.addEventListener("click", handleAdminGuideAction);
  els.adminBuildList?.addEventListener("click", handleAdminBuildAction);
  els.adminExportReports?.addEventListener("click", () => exportAdminData("reports"));
  els.adminExportGuides?.addEventListener("click", () => exportAdminData("guides"));
  els.adminExportBuilds?.addEventListener("click", () => exportAdminData("builds"));
  els.adminExportAll?.addEventListener("click", () => exportAdminData("all"));
  window.addEventListener("dukhubusters:auth", (event) => updateAdminAccess(event.detail?.user));
  updateAdminAccess(window.DUKHUBUSTERS_AUTH?.getUser?.());
  renderPendingReports();
  renderApprovedReports();
  loadPublicReports();
  loadAdminCenter();
}

function initBuilds() {
  fillBuildEssenceOptions();
  initEssencePicker();
  renderBuildCharacterSlots();
  loadBuildFromUrl();
  if (els.buildAuthor) els.buildAuthor.value = currentAuthNickname();
  window.addEventListener("dukhubusters:auth", () => {
    if (els.buildAuthor) els.buildAuthor.value = currentAuthNickname();
  });
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
  els.buildList.addEventListener("submit", handleBuildReviewSubmit);
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
            <td data-label="액티브">${skillText(row["액티브"], { colorMarkers: true })}</td>
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

const activeColorPattern = /^\(?\s*(빨강|빨간색|주황|주황색|노랑|노란색|초록|초록색|청록|청록색|파랑|파란색|보라|보라색|검정|검은색|갈색|무색|백색|흰색|황금|금색)\s*\)?\s*(?:-|:|：|\)|\s+)\s*/;
const activeColorAliases = {
  빨간색: "빨강",
  주황색: "주황",
  노란색: "노랑",
  초록색: "초록",
  청록색: "청록",
  파란색: "파랑",
  보라색: "보라",
  검은색: "검정",
  흰색: "백색",
  금색: "황금",
};

function activeSkillColor(skill) {
  const color = textOf(skill).match(activeColorPattern)?.[1] || "";
  return activeColorAliases[color] || color;
}

function activeSkillDisplayName(skill) {
  return textOf(skill).replace(activeColorPattern, "").trim();
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
          return `<option value="${escapeHtml(skillColor)}"${skillColor === color ? " selected" : ""}>${escapeHtml(skillColor)} - ${escapeHtml(activeSkillDisplayName(skillShortName(skill)))}</option>`;
        }).join("")}
      </select>
    </label>
    <label class="build-active-skill build-selected-color-skill">
      <span><i class="essence-color-pill color-${escapeHtml(color)}">${escapeHtml(color)}</i>${escapeHtml(activeSkillDisplayName(skillShortName(selectedSkill)))}</span>
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

function publicBuildRowsQuery(limit = 2000) {
  const excludedTitles = [visitorBuildMarkers.total, visitorBuildMarkers.daily, sessionTimeMarker]
    .map((title) => `title=neq.${encodeURIComponent(title)}`)
    .join("&");
  return `?select=*&${excludedTitles}&order=created_at.desc&limit=${limit}`;
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
  return build?.title === visitorBuildMarkers.total || build?.title === visitorBuildMarkers.daily || build?.title === sessionTimeMarker;
}

function isBuildLike(build) {
  return build?.title === buildLikeMarker;
}

function isBuildDelete(build) {
  return build?.title === buildDeleteMarker;
}

function isBuildRestore(build) {
  return build?.title === buildRestoreMarker;
}

function isBuildReview(build) {
  return build?.title === buildReviewMarker;
}

function isBuildReport(build) {
  return build?.title === buildReportMarker;
}

function parseBuildMarkerNote(note) {
  try {
    const parsed = JSON.parse(textOf(note));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function visiblePublicBuilds(rows, deletedIds) {
  return rows.filter((build) => !isVisitorBuild(build) && !isBuildLike(build) && !isBuildDelete(build) && !isBuildRestore(build)
    && !isBuildReview(build) && !isBuildReport(build) && !deletedIds.has(build.id));
}

function collectPublicBuildRows(rows, options = {}) {
  const normalizedRows = rows.map(normalizeRemoteBuild);
  const previousBuilds = options.keepLocal === false ? [] : savedBuilds;
  buildLikes = new Map();
  buildLikeRecordIds = new Set();
  buildReviews = new Map();
  normalizedRows.filter(isBuildLike).forEach((like) => {
    const buildId = textOf(like.note);
    if (!buildId) return;
    buildLikes.set(buildId, (buildLikes.get(buildId) || 0) + 1);
    buildLikeRecordIds.add(like.id);
  });
  normalizedRows.filter(isBuildReview).forEach((review) => {
    const note = parseBuildMarkerNote(review.note);
    const buildId = textOf(note.buildId);
    const content = textOf(note.content);
    if (!buildId || !content) return;
    const list = buildReviews.get(buildId) || [];
    list.push({
      id: review.id,
      author: review.author || "익명",
      content,
      createdAt: review.createdAt,
    });
    buildReviews.set(buildId, list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
  });
  const deletedIds = deletedBuildIdSet(normalizedRows);
  const merged = new Map();
  visiblePublicBuilds(previousBuilds, deletedIds).forEach((build) => merged.set(build.id, build));
  visiblePublicBuilds(normalizedRows, deletedIds).forEach((build) => merged.set(build.id, build));
  savedBuilds = [...merged.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function prependBuild(build) {
  savedBuilds = [build, ...savedBuilds.filter((item) => item.id !== build.id)]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  saveStoredRows(storageKeys.builds, savedBuilds);
}

async function loadPublicBuilds(options = {}) {
  if (!hasPublicBuildStore()) {
    setBuildSyncStatus("공개 저장소 연결 전입니다. 지금 등록한 빌드는 이 브라우저에만 임시 저장됩니다.", "is-offline");
    return;
  }
  if (!options.preferLive) {
    try {
      collectPublicBuildRows(await fetchStaticRows("builds-index"));
      saveStoredRows(storageKeys.builds, savedBuilds);
      renderBuilds();
      markLikedBuildsForVisitor();
      setBuildSyncStatus("가벼운 공개 빌드 목록을 불러왔습니다. 등록과 좋아요는 정상 저장됩니다.", "is-online");
      return;
    } catch {
      // Fall through to the live store for pages deployed before the static index exists.
    }
  }
  setBuildSyncStatus("공개 빌드 목록을 불러오는 중입니다.", "is-online");
  try {
    const response = await fetch(buildStoreUrl(publicBuildRowsQuery()), {
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
  await loadPublicBuilds({ preferLive: true });
}

async function savePublicBuildReview(build, content) {
  if (!requireLoggedInNickname(els.buildSyncStatus, "빌드 후기 작성")) return false;
  const cleanContent = textOf(content).slice(0, 500);
  if (!cleanContent) return false;
  const review = {
    id: `build-review-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    title: buildReviewMarker,
    author: currentAuthNickname(),
    members: [],
    note: JSON.stringify({ buildId: build.id, content: cleanContent }),
    createdAt: new Date().toISOString(),
  };
  if (hasPublicBuildStore()) {
    const response = await fetch(buildStoreUrl(), {
      method: "POST",
      headers: buildStoreHeaders({ Prefer: "return=minimal" }),
      body: JSON.stringify({
        id: review.id,
        title: review.title,
        author: review.author,
        members: review.members,
        note: review.note,
        created_at: review.createdAt,
      }),
    });
    if (!response.ok) throw new Error(`review failed: ${response.status}`);
    await loadPublicBuilds({ preferLive: true });
  } else {
    const list = buildReviews.get(build.id) || [];
    buildReviews.set(build.id, [{ ...review, content: cleanContent }, ...list]);
    renderBuilds();
  }
  return true;
}

async function savePublicBuildReport(build) {
  if (!requireLoggedInNickname(els.buildSyncStatus, "빌드 신고")) return;
  const reason = window.prompt("빌드 신고 사유를 간단히 입력해주세요.");
  if (!reason?.trim()) return;
  try {
    if (hasPublicBuildStore()) {
      const response = await fetch(buildStoreUrl(), {
        method: "POST",
        headers: buildStoreHeaders({ Prefer: "return=minimal" }),
        body: JSON.stringify({
          id: `build-report-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
          title: buildReportMarker,
          author: currentAuthNickname(),
          members: [],
          note: JSON.stringify({ buildId: build.id, reason: reason.trim().slice(0, 500) }),
          created_at: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error(`report failed: ${response.status}`);
    }
    setBuildSyncStatus("신고가 접수되었습니다. 운영자가 확인할게요.", hasPublicBuildStore() ? "is-online" : "is-offline");
  } catch {
    setBuildSyncStatus("신고 접수에 실패했습니다.", "is-offline");
  }
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
    author: currentAuthNickname(),
    members,
    note: textOf(els.buildNote.value),
    createdAt: new Date().toISOString(),
  };
}

async function submitBuild(event) {
  event.preventDefault();
  if (!requireLoggedInNickname(els.buildSyncStatus, "빌드 만들기")) return;
  els.buildAuthor.value = currentAuthNickname();
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
  els.buildAuthor.value = currentAuthNickname();
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
  copyText(shareUrlForBuild(build), els.copyCurrentBuild, "현재 빌드 링크 복사");
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
  if (button.dataset.buildAction === "report") {
    savePublicBuildReport(build);
  }
}

async function handleBuildReviewSubmit(event) {
  if (!event.target.matches("[data-build-review-form]")) return;
  event.preventDefault();
  const card = event.target.closest("[data-build-id]");
  const build = savedBuilds.find((item) => item.id === card?.dataset.buildId);
  const textarea = event.target.querySelector("[data-build-review-content]");
  if (!build || !textarea) return;
  const button = event.target.querySelector("button");
  button.disabled = true;
  try {
    const saved = await savePublicBuildReview(build, textarea.value);
    if (saved) {
      textarea.value = "";
      setBuildSyncStatus("빌드 후기가 등록되었습니다.", hasPublicBuildStore() ? "is-online" : "is-offline");
    }
  } catch {
    setBuildSyncStatus("빌드 후기 저장에 실패했습니다.", "is-offline");
  } finally {
    button.disabled = false;
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

function buildReviewMarkup(build) {
  const reviews = buildReviews.get(build.id) || [];
  return `
    <section class="build-review-box" aria-label="빌드 후기">
      <div class="build-review-head">
        <strong>빌드 후기</strong>
        <span>${reviews.length}개</span>
      </div>
      <div class="build-review-list">
        ${reviews.length ? reviews.slice(0, 3).map((review) => `
          <article class="build-review-item">
            <b>${escapeHtml(review.author || "익명")}</b>
            <span>${escapeHtml(formatBuildDate(review.createdAt))}</span>
            <p>${escapeHtml(review.content).replaceAll("\n", "<br>")}</p>
          </article>
        `).join("") : `<p class="build-review-empty">아직 후기가 없습니다. 사용감을 남겨주세요.</p>`}
      </div>
      <form class="build-review-form" data-build-review-form>
        <textarea data-build-review-content maxlength="500" rows="2" placeholder="이 빌드를 써본 느낌이나 보완점을 적어주세요."></textarea>
        <button class="submit-report" type="submit">후기 등록</button>
      </form>
    </section>
  `;
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
          ${escapeHtml(selectedColor ? activeSkillDisplayName(skill) : skill)}
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
                  ${name && visibleSkills.length && visibleStates.some(Boolean) ? `<div class="build-loadout-skills">${visibleSkills.map((skill, skillIndex) => `<small>${escapeHtml(selectedColor ? activeSkillDisplayName(skillShortName(skill)) : skillShortName(skill))}<i class="build-active-state is-${escapeHtml(visibleStates[skillIndex] || "on")}">${visibleStates[skillIndex] === "off" ? "OFF" : "ON"}</i></small>`).join("")}</div>` : ""}
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
            <button type="button" data-build-action="report">신고</button>
            <button class="build-delete-button" type="button" data-build-action="delete">삭제</button>
          </div>
        </header>
        <div class="build-public-summary">
          <span>${escapeHtml(memberSummary)}</span>
          ${build.note ? `<p>${escapeHtml(build.note)}</p>` : ""}
        </div>
        ${buildMemberBoard(normalized.members)}
        ${buildReviewMarkup(build)}
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
  renderAdminCenter();
  if (allowed) loadAdminCenter();
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
    renderAdminCenter();
    return;
  }

  els.adminStatus.textContent = adminUnlocked
    ? "관리자 모드가 열려 있습니다. 검수 승인과 반려가 가능합니다."
    : "관리자 모드가 잠겨 있습니다.";
  els.adminUnlock.hidden = adminUnlocked;
  els.adminLock.hidden = !adminUnlocked;
  els.adminCodeInput.disabled = adminUnlocked;
  els.copyApproved.hidden = !adminUnlocked;
  renderAdminCenter();
}

function adminStoreHeaders(backend, extra = {}) {
  return {
    apikey: backend.anonKey,
    Authorization: `Bearer ${backend.anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function guideStoreUrl(query = "") {
  return `${guideBackend.url}/rest/v1/${guideBackend.table}${query}`;
}

function hasAdminBackend(backend) {
  return Boolean(backend.url && backend.anonKey);
}

async function fetchAdminRows(backend, table, query = "?select=*") {
  if (!hasAdminBackend(backend)) return [];
  const response = await fetch(`${backend.url}/rest/v1/${table}${query}`, {
    headers: adminStoreHeaders(backend),
  });
  if (!response.ok) throw new Error(`admin fetch failed: ${table}`);
  return response.json();
}

function guideRowKind(row) {
  const title = textOf(row.title);
  if (title.startsWith(guideCommentPrefix)) return "comment";
  if (title.startsWith(guideLikePrefix)) return "like";
  if (title.startsWith(guideReportPrefix)) return "report";
  return "post";
}

function guideCategoryTitle(row) {
  const title = textOf(row.title);
  const match = title.match(/^\[(질문|보스|파밍|빌드|정보)\]\s*/);
  return {
    category: match?.[1] || "일반",
    title: match ? title.slice(match[0].length) : title,
  };
}

function guideViewCount(row) {
  const media = Array.isArray(row.media) ? row.media : [];
  return Number(media.find((item) => item?.kind === "guide-view-counter")?.views || 0);
}

function normalizeAdminGuide(row) {
  const kind = guideRowKind(row);
  const parsed = guideCategoryTitle(row);
  return {
    id: row.id,
    kind,
    postId: kind === "comment" ? textOf(row.post_id) || textOf(row.title).slice(guideCommentPrefix.length) : row.id,
    title: parsed.title || "(제목 없음)",
    category: parsed.category,
    author: textOf(row.author) || "익명",
    content: textOf(row.content),
    views: guideViewCount(row),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || row.created_at || "",
  };
}

function adminGuidePosts() {
  const likes = new Map();
  const comments = new Map();
  adminCenterData.guides.forEach((row) => {
    if (row.kind === "like") likes.set(row.postId, (likes.get(row.postId) || 0) + 1);
    if (row.kind === "comment") comments.set(row.postId, (comments.get(row.postId) || 0) + 1);
  });
  return adminCenterData.guides
    .filter((row) => row.kind === "post")
    .map((post) => ({
      ...post,
      likes: likes.get(post.id) || 0,
      commentCount: comments.get(post.id) || 0,
    }))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function adminGuideComments() {
  return adminCenterData.guides
    .filter((row) => row.kind === "comment")
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function activeAdminBuilds() {
  const rows = adminCenterData.builds.map(normalizeRemoteBuild);
  const deleted = deletedBuildIdSet(rows);
  const likes = new Map();
  rows.filter(isBuildLike).forEach((row) => likes.set(textOf(row.note), (likes.get(textOf(row.note)) || 0) + 1));
  return rows
    .filter((row) => !isVisitorBuild(row) && !isBuildLike(row) && !isBuildDelete(row) && !isBuildRestore(row)
      && !isBuildReview(row) && !isBuildReport(row) && !deleted.has(row.id))
    .map((row) => ({ ...row, likes: likes.get(row.id) || 0 }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function buildVisibilityActions(rows) {
  const actions = new Map();
  rows
    .filter((row) => isBuildDelete(row) || isBuildRestore(row))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .forEach((row) => {
      const buildId = textOf(row.note);
      if (!buildId) return;
      actions.set(buildId, {
        buildId,
        markerId: row.id,
        type: isBuildDelete(row) ? "delete" : "restore",
        createdAt: row.createdAt,
      });
    });
  return actions;
}

function deletedBuildIdSet(rows) {
  return new Set([...buildVisibilityActions(rows).values()]
    .filter((action) => action.type === "delete")
    .map((action) => action.buildId));
}

function deletedAdminBuilds() {
  const rows = adminCenterData.builds.map(normalizeRemoteBuild);
  const buildsById = new Map(rows.map((row) => [row.id, row]));
  return [...buildVisibilityActions(rows).values()]
    .filter((action) => action.type === "delete")
    .map((action) => {
      const build = buildsById.get(action.buildId);
      if (!build || isVisitorBuild(build) || isBuildLike(build) || isBuildDelete(build)
        || isBuildReview(build) || isBuildReport(build)) return null;
      return {
        ...build,
        deletedAt: action.createdAt,
        deleteMarkerId: action.markerId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));
}

function adminBuildHealth() {
  const rows = adminCenterData.builds.map(normalizeRemoteBuild);
  const active = activeAdminBuilds();
  const deleted = deletedAdminBuilds();
  const counters = {
    totalRows: rows.length,
    active: active.length,
    deleted: deleted.length,
    restores: rows.filter(isBuildRestore).length,
    likes: rows.filter(isBuildLike).length,
    reviews: rows.filter(isBuildReview).length,
    reports: rows.filter(isBuildReport).length,
    sessionLogs: rows.filter((row) => row.title === sessionTimeMarker).length,
    dailyLogs: rows.filter((row) => row.title === visitorBuildMarkers.daily).length,
    totalLogs: rows.filter((row) => row.title === visitorBuildMarkers.total).length,
  };
  counters.operationRows = counters.likes + counters.reviews + counters.reports + counters.deleted + counters.restores;
  counters.visitorRows = counters.sessionLogs + counters.dailyLogs + counters.totalLogs;
  return counters;
}

function dateLabel(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function adminQualityItems(posts, builds) {
  const duplicateNumbers = Object.entries(numbersRows.reduce((acc, row) => {
    const code = normalizeNumberCode(row["번호"]);
    if (code) acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {})).filter(([, count]) => count > 1).length;
  const shortGuides = posts.filter((post) => post.content.length < 80).length;
  const emptyBuilds = builds.filter((build) => !build.members.length).length;
  return [
    { label: "검수", value: pendingReports.length ? `${pendingReports.length}건 대기` : "없음", warn: pendingReports.length > 0, href: "#admin-pending" },
    { label: "넘버스 중복", value: duplicateNumbers ? `${duplicateNumbers}개` : "없음", warn: duplicateNumbers > 0, href: "./numbers.html" },
    { label: "짧은 게시글", value: shortGuides ? `${shortGuides}건` : "양호", warn: shortGuides > 0, href: "./guides.html" },
    { label: "빈 빌드", value: emptyBuilds ? `${emptyBuilds}건` : "없음", warn: emptyBuilds > 0, href: "#admin-builds" },
  ];
}

function qualityWarningCount(posts, builds) {
  return adminQualityItems(posts, builds).filter((item) => item.warn).length;
}

async function loadAdminCenter() {
  if (!els.adminStatsGrid) return;
  if (!adminUnlocked || !isAdminUser()) {
    renderAdminCenter();
    return;
  }
  els.adminStatsGrid.innerHTML = `<div class="empty compact-empty">관리자 데이터를 불러오는 중입니다.</div>`;
  const [guideResult, buildResult, userResult, visitorResult, dailyResult] = await Promise.allSettled([
    fetchAdminRows(guideBackend, guideBackend.table, "?select=*&order=updated_at.desc"),
    fetchAdminRows(buildBackend, buildBackend.table, publicBuildRowsQuery(3000)),
    fetchAdminRows(profileBackend, profileBackend.table, "?select=*&order=updated_at.desc"),
    fetchAdminRows(visitorBackend, visitorBackend.visitorTable, "?select=visitor_id"),
    fetchAdminRows(visitorBackend, visitorBackend.dailyTable, "?select=visitor_id,visit_date&order=visit_date.desc"),
  ]);
  adminCenterData = {
    guides: guideResult.status === "fulfilled" ? guideResult.value.map(normalizeAdminGuide) : [],
    builds: buildResult.status === "fulfilled" ? buildResult.value : [],
    users: userResult.status === "fulfilled" ? userResult.value : [],
    visitors: {
      total: visitorResult.status === "fulfilled" ? visitorResult.value.length : null,
      today: dailyResult.status === "fulfilled"
        ? dailyResult.value.filter((row) => textOf(row.visit_date) === new Date().toISOString().slice(0, 10)).length
        : null,
    },
    errors: {
      guides: guideResult.status !== "fulfilled",
      builds: buildResult.status !== "fulfilled",
      users: userResult.status !== "fulfilled",
      visitors: visitorResult.status !== "fulfilled" || dailyResult.status !== "fulfilled",
    },
    loadedAt: new Date().toISOString(),
  };
  renderAdminCenter();
}

function renderAdminCenter() {
  if (!els.adminStatsGrid) return;
  const locked = !adminUnlocked || !isAdminUser();
  document.querySelectorAll(".admin-dashboard, .admin-ops-grid, .admin-backup-grid").forEach((element) => {
    element.classList.toggle("is-locked", locked);
  });
  if (locked) {
    const message = `<div class="empty compact-empty">wplife0621@gmail.com Google 계정으로 로그인해야 관리자 기능이 열립니다.</div>`;
    els.adminStatsGrid.innerHTML = message;
    if (els.adminGuideList) els.adminGuideList.innerHTML = message;
    if (els.adminBuildList) els.adminBuildList.innerHTML = message;
    if (els.adminDeletedBuildList) els.adminDeletedBuildList.innerHTML = message;
    if (els.adminUserList) els.adminUserList.innerHTML = message;
    if (els.adminSiteStats) els.adminSiteStats.innerHTML = message;
    if (els.adminQualityList) els.adminQualityList.innerHTML = message;
    if (els.adminDataHealthList) els.adminDataHealthList.innerHTML = message;
    return;
  }
  const posts = adminGuidePosts();
  const comments = adminGuideComments();
  const builds = activeAdminBuilds();
  const stats = [
    { label: "검수", value: `${pendingReports.length}건`, hint: "대기 제보", href: "#admin-pending" },
    { label: "등록", value: `${approvedReportItems.length}건`, hint: "승인 정보", href: "#admin-approved" },
    { label: "게시글", value: `${posts.length}건`, hint: "게시판", href: "./guides.html" },
    { label: "댓글", value: `${comments.length}건`, hint: "최근 댓글", href: "#admin-guides" },
    { label: "빌드", value: `${builds.length}건`, hint: "공개 빌드", href: "./builds.html" },
    { label: "회원", value: `${adminCenterData.users.length}명`, hint: "닉네임", href: "#admin-users" },
    { label: "방문", value: `${adminCenterData.visitors.today ?? "-"}명`, hint: "오늘 방문", href: "#admin-stats" },
    { label: "점검", value: qualityWarningCount(posts, builds) ? `${qualityWarningCount(posts, builds)}건` : "양호", hint: "품질 상태", href: "#admin-quality" },
  ];
  els.adminStatsGrid.innerHTML = stats.map((item) => `
    <a class="admin-stat-card" href="${escapeHtml(item.href)}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.hint)}</small>
    </a>
  `).join("");
  renderAdminGuides(posts, comments);
  renderAdminBuilds(builds);
  renderAdminDeletedBuilds();
  renderAdminUsers();
  renderAdminSiteStats();
  renderAdminQuality(posts, builds);
  renderAdminDataHealth();
}

function renderAdminGuides(posts, comments) {
  if (!els.adminGuideList || !els.adminGuideCount) return;
  els.adminGuideCount.textContent = `게시글 ${posts.length}건 · 댓글 ${comments.length}건`;
  const postHtml = posts.slice(0, 3).map((post) => `
    <article class="admin-management-card" data-admin-guide-id="${escapeHtml(post.id)}" data-admin-guide-kind="post">
      <div>
        <strong><a href="./guides.html?post=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></strong>
        <span>${escapeHtml(post.category)} · ${escapeHtml(post.author)}</span>
        <small>조회 ${post.views} · 좋아요 ${post.likes} · 댓글 ${post.commentCount} · ${escapeHtml(dateLabel(post.updatedAt))}</small>
      </div>
      <div class="pending-actions">
        <a href="./guides.html?post=${encodeURIComponent(post.id)}">열기</a>
        <button type="button" data-admin-guide-action="delete-post">삭제</button>
      </div>
    </article>
  `).join("");
  const commentHtml = comments.slice(0, 3).map((comment) => `
    <article class="admin-management-card" data-admin-guide-id="${escapeHtml(comment.id)}" data-admin-guide-kind="comment">
      <div>
        <strong><a href="./guides.html?post=${encodeURIComponent(comment.postId)}">댓글 · ${escapeHtml(comment.author)}</a></strong>
        <span>${escapeHtml(comment.content.slice(0, 90))}${comment.content.length > 90 ? "..." : ""}</span>
        <small>${escapeHtml(dateLabel(comment.createdAt))}</small>
      </div>
      <div class="pending-actions">
        <a href="./guides.html?post=${encodeURIComponent(comment.postId)}">원글</a>
        <button type="button" data-admin-guide-action="delete-comment">삭제</button>
      </div>
    </article>
  `).join("");
  const more = posts.length + comments.length > 6
    ? `<a class="admin-more-link" href="./guides.html">게시판에서 전체 보기</a>`
    : "";
  els.adminGuideList.innerHTML = postHtml || commentHtml
    ? `${postHtml}${commentHtml}${more}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.guides ? "게시글 저장소를 불러오지 못했습니다." : "등록된 게시글이 없습니다."}</div>`;
}

function renderAdminBuilds(builds) {
  if (!els.adminBuildList || !els.adminBuildCount) return;
  els.adminBuildCount.textContent = `공개 빌드 ${builds.length}건`;
  els.adminBuildList.innerHTML = builds.length
    ? `${builds.slice(0, 4).map((build) => `
      <article class="admin-management-card" data-admin-build-id="${escapeHtml(build.id)}">
        <div>
          <strong><a href="${escapeHtml(shareUrlForBuild(build))}">${escapeHtml(build.title || "이름 없는 빌드")}</a></strong>
          <span>${escapeHtml(build.author || "익명")} · 캐릭터 ${build.members.length}명</span>
          <small>좋아요 ${build.likes} · ${escapeHtml(dateLabel(build.createdAt))}</small>
        </div>
        <div class="pending-actions">
          <a href="${escapeHtml(shareUrlForBuild(build))}">열기</a>
          <button type="button" data-admin-build-action="delete">삭제</button>
        </div>
      </article>
    `).join("")}${builds.length > 4 ? `<a class="admin-more-link" href="./builds.html">빌드 페이지에서 전체 보기</a>` : ""}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.builds ? "빌드 저장소를 불러오지 못했습니다." : "등록된 공개 빌드가 없습니다."}</div>`;
}

function renderAdminDeletedBuilds() {
  if (!els.adminDeletedBuildList || !els.adminDeletedBuildCount) return;
  const deleted = deletedAdminBuilds();
  els.adminDeletedBuildCount.textContent = `삭제된 빌드 ${deleted.length}건`;
  els.adminDeletedBuildList.innerHTML = deleted.length
    ? `${deleted.slice(0, 6).map((build) => `
      <article class="admin-management-card" data-admin-build-id="${escapeHtml(build.id)}" data-admin-delete-marker-id="${escapeHtml(build.deleteMarkerId)}">
        <div>
          <strong>${escapeHtml(build.title || "이름 없는 빌드")}</strong>
          <span>${escapeHtml(build.author || "익명")} · 캐릭터 ${build.members.length}명</span>
          <small>삭제 처리 ${escapeHtml(dateLabel(build.deletedAt))} · 원본 등록 ${escapeHtml(dateLabel(build.createdAt))}</small>
        </div>
        <div class="pending-actions">
          <a href="${escapeHtml(shareUrlForBuild(build))}">미리보기</a>
          <button type="button" data-admin-build-action="restore">복구</button>
        </div>
      </article>
    `).join("")}${deleted.length > 6 ? `<span class="admin-more-link is-static">나머지 ${deleted.length - 6}건은 빌드 백업에서 확인</span>` : ""}`
    : `<div class="empty compact-empty">복구 가능한 삭제 빌드가 없습니다.</div>`;
}

function renderAdminDataHealth() {
  if (!els.adminDataHealthList) return;
  const health = adminBuildHealth();
  const items = [
    {
      label: "빌드 저장소",
      value: `전체 ${health.totalRows}행 · 공개 ${health.active}건 · 삭제 ${health.deleted}건`,
      hint: "공개 빌드는 통계/좋아요/삭제 마커를 제외해 표시합니다.",
      warn: false,
    },
    {
      label: "운영 마커",
      value: `좋아요 ${health.likes}건 · 복구 ${health.restores}건 · 후기 ${health.reviews}건 · 신고 ${health.reports}건`,
      hint: "빌드 본문과 분리해서 집계되는 운영 기록입니다. 삭제/복구도 마커로 안전하게 처리합니다.",
      warn: false,
    },
    {
      label: "통계 로그",
      value: `체류 ${health.sessionLogs}건 · 일별 ${health.dailyLogs}건 · 누적 ${health.totalLogs}건`,
      hint: "현재 빌드 화면에서는 통계 로그를 서버 단계에서 제외합니다. 추후 별도 테이블 분리를 권장합니다.",
      warn: health.visitorRows > 500,
    },
    {
      label: "백업 상태",
      value: health.totalRows ? "내보내기 가능" : "확인 필요",
      hint: "전체 백업은 공개 빌드, 삭제 빌드, 원본 rows, 방문 통계를 함께 저장합니다.",
      warn: !health.totalRows,
    },
  ];
  els.adminDataHealthList.innerHTML = items.map((item) => `
    <article class="admin-management-card ${item.warn ? "is-warning" : "is-ok"}">
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.value)}</span>
        <small>${escapeHtml(item.hint)}</small>
      </div>
    </article>
  `).join("");
}

function renderAdminUsers() {
  if (!els.adminUserList || !els.adminUserCount) return;
  els.adminUserCount.textContent = `사용자 닉네임 ${adminCenterData.users.length}명`;
  els.adminUserList.innerHTML = adminCenterData.users.length
    ? `${adminCenterData.users.slice(0, 5).map((user) => `
      <article class="admin-management-card">
        <div>
          <strong>${escapeHtml(user.nickname || "닉네임 없음")}</strong>
          <span>${escapeHtml(user.email || "이메일 미기록")}</span>
          <small>${escapeHtml(dateLabel(user.updated_at || user.created_at))}</small>
        </div>
      </article>
    `).join("")}${adminCenterData.users.length > 5 ? `<span class="admin-more-link is-static">나머지 ${adminCenterData.users.length - 5}명은 백업에서 확인</span>` : ""}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.users ? "닉네임 저장소 권한 또는 테이블 설정을 확인해주세요." : "등록된 닉네임이 없습니다."}</div>`;
}

function renderAdminSiteStats() {
  if (!els.adminSiteStats) return;
  const total = adminCenterData.visitors.total ?? "확인 실패";
  const today = adminCenterData.visitors.today ?? "확인 실패";
  els.adminSiteStats.innerHTML = `
    <article class="admin-management-card">
      <div>
        <strong>방문자</strong>
        <span>오늘 ${escapeHtml(today)} · 누적 ${escapeHtml(total)}</span>
        <small>마지막 갱신 ${escapeHtml(dateLabel(adminCenterData.loadedAt))}</small>
      </div>
    </article>
  `;
}

function renderAdminQuality(posts, builds) {
  if (!els.adminQualityList) return;
  els.adminQualityList.innerHTML = adminQualityItems(posts, builds).map((item) => `
    <article class="admin-management-card ${item.warn ? "is-warning" : "is-ok"}">
      <div>
        <strong><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></strong>
        <span>${escapeHtml(item.value)}</span>
      </div>
    </article>
  `).join("");
}

async function handleAdminGuideAction(event) {
  const button = event.target.closest("button[data-admin-guide-action]");
  if (!button || !adminUnlocked || !isAdminUser()) return;
  const card = button.closest("[data-admin-guide-id]");
  const id = card?.dataset.adminGuideId;
  const kind = card?.dataset.adminGuideKind;
  if (!id) return;
  const label = kind === "comment" ? "댓글" : "게시글";
  if (!confirm(`${label}을 관리자 권한으로 삭제할까요?`)) return;
  button.disabled = true;
  try {
    await deleteAdminGuideRows(id, kind);
    await loadAdminCenter();
  } catch {
    alert(`${label} 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.`);
    button.disabled = false;
  }
}

async function deleteAdminGuideRows(id, kind) {
  if (!hasAdminBackend(guideBackend)) throw new Error("guide backend unavailable");
  const targets = kind === "comment"
    ? [`?id=eq.${encodeURIComponent(id)}`]
    : [
      `?id=eq.${encodeURIComponent(id)}`,
      `?title=eq.${encodeURIComponent(`__guide_comment__:${id}`)}`,
      `?title=eq.${encodeURIComponent(`__guide_like__:${id}`)}`,
    ];
  for (const query of targets) {
    const response = await fetch(guideStoreUrl(query), {
      method: "DELETE",
      headers: adminStoreHeaders(guideBackend),
    });
    if (!response.ok) throw new Error("guide delete failed");
  }
}

async function handleAdminBuildAction(event) {
  const button = event.target.closest("button[data-admin-build-action]");
  if (!button || !adminUnlocked || !isAdminUser()) return;
  const card = button.closest("[data-admin-build-id]");
  const id = card?.dataset.adminBuildId;
  const action = button.dataset.adminBuildAction;
  const build = action === "restore"
    ? deletedAdminBuilds().find((item) => item.id === id)
    : activeAdminBuilds().find((item) => item.id === id);
  if (!build) return;
  if (action === "restore") {
    if (!confirm(`${build.title || "이 빌드"}를 공개 목록으로 복구할까요?`)) return;
    button.disabled = true;
    try {
      await adminRestoreBuild(build);
      await loadAdminCenter();
    } catch {
      alert("빌드 복구에 실패했습니다. 잠시 후 다시 시도해주세요.");
      button.disabled = false;
    }
    return;
  }
  if (!confirm(`${build.title || "이 빌드"}를 공개 목록에서 삭제할까요?`)) return;
  button.disabled = true;
  try {
    await adminDeleteBuild(build);
    await loadAdminCenter();
  } catch {
    alert("빌드 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    button.disabled = false;
  }
}

async function adminDeleteBuild(build) {
  if (!hasPublicBuildStore()) throw new Error("build backend unavailable");
  await savePublicBuild({
    id: `deleted-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
    title: buildDeleteMarker,
    author: "admin",
    members: [],
    note: build.id,
    createdAt: new Date().toISOString(),
  });
}

async function adminRestoreBuild(build) {
  if (!hasPublicBuildStore()) throw new Error("build restore unavailable");
  const response = await fetch(buildStoreUrl(), {
    method: "POST",
    headers: buildStoreHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({
      id: `restored-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`,
      title: buildRestoreMarker,
      author: "admin",
      members: [],
      note: build.id,
      created_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error("build restore failed");
}

function adminExportPayload(type) {
  const payload = {
    exportedAt: new Date().toISOString(),
    site: "겜바바 버스터즈",
  };
  if (type === "reports" || type === "all") {
    payload.reports = { pending: pendingReports, approved: approvedReportItems };
  }
  if (type === "guides" || type === "all") payload.guides = adminCenterData.guides;
  if (type === "builds" || type === "all") {
    payload.builds = {
      active: activeAdminBuilds(),
      deleted: deletedAdminBuilds(),
      health: adminBuildHealth(),
      raw: adminCenterData.builds,
    };
  }
  if (type === "all") {
    payload.users = adminCenterData.users;
    payload.visitors = adminCenterData.visitors;
  }
  return payload;
}

function exportAdminData(type) {
  if (!adminUnlocked || !isAdminUser()) return;
  const payload = adminExportPayload(type);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dukhubusters-${type}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
  [els.reportMonster, els.reportGrade, els.reportFloor, els.reportStats, els.reportPassive].forEach((field) => {
    field.required = !numbersMode;
    field.disabled = numbersMode;
  });
  [els.reportArea, els.reportAreaCandidate, els.reportAreaAdd].forEach((field) => {
    if (field) field.disabled = numbersMode;
  });
  [...reportActiveFields(), els.reportSailing, ...els.reportRecommendations].forEach((field) => {
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
  syncReportModeCards();
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
  renderReportPreview();
  renderReportActiveFields();
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
  if (!["edit", "delete"].includes(els.reportMode.value) || isNumbersReportMode()) return;
  renderEditMonsterMatches();
}

function handleReportNumberInput() {
  if (!["edit", "delete"].includes(els.reportMode.value) || !isNumbersReportMode()) return;
  renderEditNumberMatches();
  fillNumberFromExactName();
}

function handleReportModeCardClick(event) {
  const button = event.target.closest("button[data-report-mode-card]");
  if (!button) return;
  els.reportMode.value = button.dataset.reportModeCard;
  updateReportMode();
}

function syncReportModeCards() {
  if (!els.reportModeCards) return;
  els.reportModeCards.querySelectorAll("button[data-report-mode-card]").forEach((button) => {
    const active = button.dataset.reportModeCard === els.reportMode.value;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function handleReportFormChange() {
  renderReportPreview();
  renderReportActiveFields();
}

function handleEditMonsterClick(event) {
  const deleteButton = event.target.closest("button[data-delete-monster]");
  if (deleteButton) {
    fillDeleteReportFromRow(findMonsterRow(deleteButton.dataset.deleteMonster));
    return;
  }
  const button = event.target.closest("button[data-monster]");
  if (!button) return;
  fillReportFromRow(findMonsterRow(button.dataset.monster));
}

function handleEditNumberClick(event) {
  const deleteButton = event.target.closest("button[data-delete-number-name]");
  if (deleteButton) {
    fillDeleteNumberFromRow(findNumberRow(deleteButton.dataset.deleteNumberName));
    return;
  }
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
  els.reportGrade.value = normalizeGradeNumber(row["등급"]);
  els.reportFloor.value = textOf(row["층"]);
  refreshReportAreaOptions();
  const areas = essenceAreaLabels(row["구역"]);
  multiOptionList(els.reportArea, unique([...areas, ...areaOptionsForFloor(els.reportFloor?.value, essenceRows)]));
  setSelectedOptionValues(els.reportArea, areas);
  renderReportAreaTags();
  els.reportStats.value = textOf(row["주요 스탯"]);
  els.reportPassive.value = textOf(row["패시브"]);
  els.reportSailing.checked = isSailingRow(row);
  const recommendedCharacters = recommendedCharactersFrom(row["추천 캐릭터"]);
  els.reportRecommendations.forEach((field) => {
    field.checked = recommendedCharacters.includes(field.value);
  });
  const activeSkills = splitSkills(activeSkillsWithoutSailing(row["액티브"]));
  reportActiveFields().forEach((field, index) => {
    if (field) field.value = activeSkills[index] || "";
  });
  renderReportActiveFields(activeSkills.length || 1);
  renderReportPreview();
  renderEditMonsterMatches();
}

function fillDeleteReportFromRow(row) {
  if (!row) return;
  els.reportMode.value = "delete";
  updateReportMode();
  fillReportFromRow(row);
  setReportSyncStatus(`${textOf(row["몬스터"])} 삭제 요청 정보가 자동으로 채워졌습니다. 로그인 후 등록하면 검수 대기에 올라갑니다.`);
}

function reportActiveFields() {
  return [els.reportActive, els.reportActive2, els.reportActive3, els.reportActive4].filter(Boolean);
}

function reportActiveFieldLabels() {
  return [...document.querySelectorAll(".report-active-field")];
}

function visibleReportActiveCount() {
  let lastFilled = -1;
  reportActiveFields().forEach((field, index) => {
    if (textOf(field.value)) lastFilled = index;
  });
  return Math.max(1, lastFilled + 1);
}

function renderReportActiveFields(forceCount = 0) {
  const labels = reportActiveFieldLabels();
  if (!labels.length) return;
  const visibleCount = Math.min(labels.length, Math.max(forceCount, visibleReportActiveCount()));
  labels.forEach((label, index) => {
    label.hidden = index >= visibleCount;
  });
  if (els.reportActiveAdd) {
    els.reportActiveAdd.hidden = visibleCount >= labels.length;
  }
}

function addReportActiveField() {
  const visibleCount = reportActiveFieldLabels().filter((label) => !label.hidden).length;
  renderReportActiveFields(visibleCount + 1);
}

function quickEditActiveFields() {
  return [els.quickEditActive, els.quickEditActive2, els.quickEditActive3, els.quickEditActive4].filter(Boolean);
}

function refreshQuickEditAreaOptions() {
  if (!els.quickEditArea) return;
  const selected = selectedOptionValues(els.quickEditArea);
  const options = areaOptionsForFloor(els.quickEditFloor?.value, essenceRows);
  multiOptionList(els.quickEditArea, unique([...selected, ...options]));
  optionList(els.quickEditAreaCandidate, options, "구역 선택");
  renderQuickEditAreaTags();
}

function openQuickEditModal(row) {
  if (!row || !els.quickEditModal) return;
  els.quickEditOriginalMonster.value = textOf(row["몬스터"]);
  els.quickEditMonster.value = textOf(row["몬스터"]);
  els.quickEditGrade.value = textOf(row["등급"]);
  els.quickEditFloor.value = textOf(row["층"]);
  refreshQuickEditAreaOptions();
  const areas = essenceAreaLabels(row["구역"]);
  multiOptionList(els.quickEditArea, unique([...areas, ...areaOptionsForFloor(els.quickEditFloor?.value, essenceRows)]));
  setSelectedOptionValues(els.quickEditArea, areas);
  renderQuickEditAreaTags();
  els.quickEditStats.value = textOf(row["주요 스탯"]);
  els.quickEditPassive.value = textOf(row["패시브"]);
  els.quickEditSailing.checked = isSailingRow(row);
  const recommendedCharacters = recommendedCharactersFrom(row["추천 캐릭터"]);
  els.quickEditRecommendations.forEach((field) => {
    field.checked = recommendedCharacters.includes(field.value);
  });
  const activeSkills = splitSkills(activeSkillsWithoutSailing(row["액티브"]));
  quickEditActiveFields().forEach((field, index) => {
    field.value = activeSkills[index] || "";
  });
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
  if (!selectedOptionValues(els.quickEditArea).length) {
    els.quickEditStatus.textContent = "몬스터가 나오는 구역을 하나 이상 추가해주세요.";
    return;
  }
  const report = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: "edit",
    authorNickname: textOf(els.quickEditNickname.value),
    monster: textOf(els.quickEditMonster.value),
    originalMonster: textOf(els.quickEditOriginalMonster.value),
    grade: textOf(els.quickEditGrade.value),
    floor: textOf(els.quickEditFloor.value),
    area: selectedOptionValues(els.quickEditArea).join(", "),
    stats: textOf(els.quickEditStats.value),
    passive: textOf(els.quickEditPassive.value),
    sailing: Boolean(els.quickEditSailing.checked),
    recommendedCharacters: [...els.quickEditRecommendations]
      .filter((field) => field.checked)
      .map((field) => field.value)
      .join(", "),
    active: quickEditActiveFields()
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

function findNumberRowByCode(code) {
  const target = normalizeNumberCode(code);
  if (!target) return null;
  return numbersRows.find((row) => normalizeNumberCode(row["번호"]) === target);
}

function fillNumberFromExactName() {
  const row = findNumberRow(els.reportNumberName.value);
  if (row) fillNumberFromRow(row);
}

function fillNumberFromRow(row) {
  if (!row) return;
  els.reportNumberName.value = textOf(row["이름"]);
  els.reportNumberCode.value = normalizeNumberCode(row["번호"]);
  els.reportNumberLevel.value = textOf(row["아이템 레벨(Lv)"]);
  els.reportNumberEffect.value = textOf(row["효과"]);
  els.reportNumberSlot.value = textOf(row["착용부위"]);
  const sourceAreas = sourceAreaLabels(row["획득처"]);
  const sourceFloors = unique(sourceAreas.map((area) => areaFloorLookup.get(normalizeLocationName(area))).filter(Boolean));
  els.reportNumberSourceFloor.value = sourceFloors.length === 1 ? sourceFloors[0] : "전체 층";
  refreshReportNumberSourceOptions();
  setSelectedOptionValues(els.reportNumberSource, sourceAreas);
  renderReportNumberSourceTags();
  renderReportPreview();
  renderEditNumberMatches();
}

function fillDeleteNumberFromRow(row) {
  if (!row) return;
  els.reportMode.value = "delete";
  updateReportMode();
  fillNumberFromRow(row);
  els.reportNumberEffect.value = `[삭제 요청] ${textOf(row["이름"])} 정보를 삭제해주세요.`;
  renderReportPreview();
  setReportSyncStatus(`${textOf(row["이름"])} 삭제 요청 정보가 자동으로 채워졌습니다. 로그인 후 등록하면 검수 대기에 올라갑니다.`);
}

function reportCurrentEssenceValues() {
  return {
    "몬스터명": textOf(els.reportMonster.value),
    "등급": gradeLabelFromInput(els.reportGrade.value),
    "층": textOf(els.reportFloor.value),
    "구역": selectedOptionValues(els.reportArea).join(", "),
    "스탯": textOf(els.reportStats.value),
    "패시브": textOf(els.reportPassive.value),
    "액티브": reportActiveFields().map((field) => textOf(field.value)).filter(Boolean).join(" / ") || "-",
    "항해": els.reportSailing.checked ? "Y" : "",
    "추천 캐릭터": [...els.reportRecommendations].filter((field) => field.checked).map((field) => field.value).join(", "),
  };
}

function reportOriginalEssenceValues(row) {
  if (!row) return null;
  return {
    "몬스터명": textOf(row["몬스터"]),
    "등급": textOf(row["등급"]),
    "층": textOf(row["층"]),
    "구역": textOf(row["구역"]),
    "스탯": textOf(row["주요 스탯"]),
    "패시브": textOf(row["패시브"]),
    "액티브": splitSkills(activeSkillsWithoutSailing(row["액티브"])).join(" / ") || "-",
    "항해": isSailingRow(row) ? "Y" : "",
    "추천 캐릭터": recommendedCharactersFrom(row["추천 캐릭터"]).join(", "),
  };
}

function reportCurrentNumberValues() {
  return {
    "이름": textOf(els.reportNumberName.value),
    "번호": normalizeNumberCode(els.reportNumberCode.value) || "미확인",
    "아이템 레벨": textOf(els.reportNumberLevel.value),
    "착용부위": textOf(els.reportNumberSlot.value),
    "획득처": cleanNumberSources(selectedOptionValues(els.reportNumberSource).join(", ")) || "-",
    "효과": textOf(els.reportNumberEffect.value),
  };
}

function reportOriginalNumberValues(row) {
  if (!row) return null;
  return {
    "이름": textOf(row["이름"]),
    "번호": normalizeNumberCode(row["번호"]) || "미확인",
    "아이템 레벨": textOf(row["아이템 레벨(Lv)"]),
    "착용부위": textOf(row["착용부위"]),
    "획득처": cleanNumberSources(row["획득처"]) || "-",
    "효과": textOf(row["효과"]),
  };
}

function reportChangedItems(original, current) {
  if (!original) return [];
  return Object.keys(current)
    .filter((key) => textOf(original[key]) !== textOf(current[key]))
    .map((key) => ({ key, before: textOf(original[key]) || "-", after: textOf(current[key]) || "-" }));
}

function renderReportPreview() {
  if (!els.reportPreview) return;
  const editMode = ["edit", "delete"].includes(els.reportMode.value);
  const numbersMode = isNumbersReportMode();
  const originalRow = numbersMode
    ? findNumberRow(els.reportNumberName.value)
    : findMonsterRow(els.reportOriginalMonster.value || els.reportMonster.value);
  const original = numbersMode ? reportOriginalNumberValues(originalRow) : reportOriginalEssenceValues(originalRow);
  const current = numbersMode ? reportCurrentNumberValues() : reportCurrentEssenceValues();
  const hasCurrentName = numbersMode ? textOf(current["이름"]) : textOf(current["몬스터명"]);
  if (!editMode && !hasCurrentName) {
    els.reportPreview.hidden = true;
    els.reportPreview.innerHTML = "";
    return;
  }
  const changed = reportChangedItems(original, current);
  const summary = els.reportMode.value === "delete"
    ? `<li><b>삭제 요청</b><span>${escapeHtml(numbersMode ? current["이름"] : current["몬스터명"])}</span></li>`
    : changed.length
      ? changed.map((item) => `<li><b>${escapeHtml(item.key)}</b><span>${escapeHtml(item.before)} → ${escapeHtml(item.after)}</span></li>`).join("")
      : `<li><b>변경 없음</b><span>기존 정보와 같은 값입니다.</span></li>`;
  els.reportPreview.hidden = false;
  els.reportPreview.innerHTML = `
    <div class="report-preview-head">
      <strong>${editMode ? "기존 정보 미리보기" : "신규 제보 미리보기"}</strong>
      <span>${escapeHtml(reportModeLabel({ mode: els.reportMode.value }))}</span>
    </div>
    ${original ? `
      <div class="report-preview-original">
        ${Object.entries(original).map(([key, value]) => `<span><b>${escapeHtml(key)}</b>${escapeHtml(value || "-")}</span>`).join("")}
      </div>
    ` : editMode ? `<p class="report-preview-empty">기존 정보를 검색하거나 목록에서 선택하면 미리보기가 나타납니다.</p>` : ""}
    <div class="report-change-summary">
      <strong>변경 요약</strong>
      <ul>${summary}</ul>
    </div>
  `;
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

  els.editMonsterMatches.hidden = !["edit", "delete"].includes(els.reportMode.value);
  els.editMonsterMatches.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="edit-match-card">
        <button type="button" data-monster="${escapeHtml(row["몬스터"])}">
          <strong>${escapeHtml(row["몬스터"])}</strong>
          <span>${escapeHtml(row["층"])} · ${escapeHtml(row["구역"])} · ${escapeHtml(row["등급"] || "-")}${isSailingRow(row) ? " · 항해" : ""}</span>
        </button>
        <button class="edit-match-delete" type="button" data-delete-monster="${escapeHtml(row["몬스터"])}">삭제 요청</button>
      </div>
    `).join("")
    : `<div class="edit-match-empty">일치하는 몬스터가 없습니다.</div>`;
}

function renderEditNumberMatches() {
  const query = textOf(els.reportNumberName.value).toLowerCase();
  const rows = numbersRows
    .filter((row) => !query || textOf(row["이름"]).toLowerCase().includes(query) || textOf(row["효과"]).toLowerCase().includes(query))
    .slice(0, 8);
  els.editNumberMatches.hidden = !["edit", "delete"].includes(els.reportMode.value) || !isNumbersReportMode();
  els.editNumberMatches.innerHTML = rows.length
    ? rows.map((row) => `
      <div class="edit-match-card">
        <button type="button" data-number-name="${escapeHtml(row["이름"])}">
          <strong>${escapeHtml(row["이름"])}</strong>
          <span>${escapeHtml(displayNumber(row["번호"]))} · ${escapeHtml(displayLevel(row["아이템 레벨(Lv)"]))}</span>
        </button>
        <button class="edit-match-delete" type="button" data-delete-number-name="${escapeHtml(row["이름"])}">삭제 요청</button>
      </div>
    `).join("")
    : `<div class="edit-match-empty">일치하는 넘버스가 없습니다.</div>`;
}

function refreshControls() {
  optionList(els.floor, floorOptionValues(essenceRows), "전체 층");
  refreshEssenceAreaOptions();
  optionList(els.grade, ["4등급", "5등급", "6등급", "7등급", "8등급", "9등급", "수호자"], "전체 등급");
  optionList(els.character, unique(allRecommendedCharacters(essenceRows)), "전체 캐릭터");
  optionList(els.statSort, statNames(), statNoneLabel);
}

function allRecommendedCharacters(rows) {
  const characters = [];
  rows.forEach((row) => {
    recommendedCharactersFrom(row["추천 캐릭터"]).forEach((character) => characters.push(character));
  });
  return characters;
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
  const query = compactSearchText(els.search.value);

  if (els.floor.value !== "전체 층") {
    rows = rows.filter(({ row }) => sameLocationName(row["층"], els.floor.value));
  }

  if (els.area.value !== "전체 구역") {
    rows = rows.filter(({ row }) => essenceAreaMatches(row["구역"], els.area.value));
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
    rows = rows.filter(({ row }) => compactSearchText(row["몬스터"]).includes(query));
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
      <td data-label="액티브" class="skill-cell">${skillText(row["액티브"], { colorMarkers: true })}</td>
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

function skillText(value, options = {}) {
  const text = textOf(value) || "-";
  if (text === "-") return escapeHtml(text);
  const skills = splitSkills(text);
  return `<div class="skill-list">${skills.map((skill) => {
    const [name, ...rest] = skill.split(":");
    if (!rest.length) return `<span>${skillNameMarkup(skill, options)}</span>`;
    return `<span>${skillNameMarkup(name, options)}: ${escapeHtml(rest.join(":").trim())}</span>`;
  }).join("")}</div>`;
}

function skillNameMarkup(value, options = {}) {
  const name = textOf(value);
  const color = activeSkillColor(name);
  if (!color || !options.colorMarkers) return `<b>${escapeHtml(name)}</b>`;
  return `<b class="skill-color-text"><i class="skill-color-drop color-${escapeHtml(color)}" aria-hidden="true"></i><em class="skill-color-name">${escapeHtml(color)}</em>${escapeHtml(activeSkillDisplayName(name))}</b>`;
}

function splitSkills(value) {
  const skills = [];
  textOf(value).split(/\r?\n+/).forEach((line) => {
    splitActiveSkillLine(line).forEach((skill) => {
      const trimmed = skill.trim();
      if (trimmed && trimmed !== "-") skills.push(trimmed);
    });
  });
  return skills;
}

function splitActiveSkillLine(line) {
  const parts = textOf(line).split(/[,，]/);
  if (parts.length <= 1) return [line];
  const result = [];
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    if (result.length && activeSkillColor(trimmed)) {
      result.push(trimmed);
      return;
    }
    if (!result.length) {
      result.push(trimmed);
      return;
    }
    result[result.length - 1] = `${result[result.length - 1]}, ${trimmed}`;
  });
  return result;
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
                  ${adminUnlocked ? `<button class="is-danger" type="button" data-number-admin-delete="${escapeHtml(row["이름"])}">관리자 삭제</button>` : ""}
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
  const rawActive = row.active || "";
  const activeSkills = splitSkills(rawActive);
  const deleteRequested = row._deleteRequested === true
    || textOf(row.mode || row.report_mode).toLowerCase() === "delete"
    || activeSkills.includes(numbersDeleteMarker)
    || activeSkills.includes(reportDeleteMarker)
    || /^\[(삭제\s*요청|관리자\s*삭제)\]/.test(textOf(row.stats))
    || /삭제\s*(요청|해주세요|바랍니다|처리)/.test(textOf(row.stats));
  return {
    id: row.id,
    mode: deleteRequested ? "delete" : row.mode || row.report_mode || "new",
    monster: row.monster || "",
    originalMonster: row.original_monster || row.originalMonster || "",
    grade: row.grade || "",
    floor: row.floor || "",
    area: row.area || "",
    stats: row.stats || "",
    passive: row.passive || "",
    active: activeSkillsWithoutSailing(rawActive),
    rawActive,
    _rawActive: rawActive,
    _deleteRequested: deleteRequested,
    authorNickname: row.author_nickname || row.authorNickname || authorNicknameFromActive(rawActive),
    sailing: activeSkills.includes(sailingMarker),
    recommendedCharacters: recommendedCharacterFromActive(rawActive),
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
  renderAdminCenter();
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
    renderMyReports();
    renderAdminCenter();
    setReportSyncStatus("제보 저장소에 연결되었습니다. 새 제보는 검수 대기에 공개 저장됩니다.", "is-online");
  } catch {
    setReportSyncStatus("제보 저장소 연결에 실패해 이 브라우저의 임시 목록을 사용합니다.", "is-offline");
    renderPendingReports();
    renderMyReports();
    renderAdminCenter();
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

async function saveApprovedNumberDeleteReport(report) {
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
    reviewed_at: report.reviewedAt || new Date().toISOString(),
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
  if (!response.ok) throw new Error(`approved number delete save failed: ${response.status}`);
  const rows = await response.json();
  const inserted = normalizeRemoteReport(rows[0] || report);
  return await updatePublicReportStatus(inserted.id, "approved") || inserted;
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
    "_mode": report.mode || "new",
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
    "출처": report.mode === "delete" ? "삭제 승인" : report.mode === "edit" ? "수정 승인" : "제보 승인",
    "승인일": new Date().toISOString(),
  };
}

async function submitReport(event) {
  event.preventDefault();
  if (!requireLoggedInNickname(els.reportSyncStatus, "정보 제보/수정")) return;
  const authorNickname = currentAuthNickname();
  const numbersMode = isNumbersReportMode();
  if (numbersMode) {
    const enteredCode = textOf(els.reportNumberCode.value);
    const normalizedCode = normalizeNumberCode(enteredCode);
    if (enteredCode && !normalizedCode) {
      setReportSyncStatus("넘버스 번호는 0부터 9999 사이의 정수만 입력할 수 있습니다.", "is-offline");
      return;
    }
    const currentName = textOf(els.reportNumberName.value);
    const existingByCode = findNumberRowByCode(normalizedCode);
    if (normalizedCode && existingByCode && textOf(existingByCode["이름"]) !== currentName) {
      setReportSyncStatus(`이미 NO.${normalizedCode} 번호를 사용하는 넘버스가 있습니다: ${textOf(existingByCode["이름"])}`, "is-offline");
      return;
    }
    els.reportNumberCode.value = normalizedCode;
  }
  if (!numbersMode && ["edit", "delete"].includes(els.reportMode.value) && !textOf(els.reportOriginalMonster.value)) {
    setReportSyncStatus("수정/삭제할 기존 몬스터를 목록에서 먼저 선택해주세요.", "is-offline");
    return;
  }
  if (!numbersMode && !selectedOptionValues(els.reportArea).length) {
    setReportSyncStatus("몬스터가 나오는 구역을 하나 이상 추가해주세요.", "is-offline");
    return;
  }
  const report = numbersMode ? {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: els.reportMode.value,
    authorNickname,
    monster: `${numbersReportPrefix}${textOf(els.reportNumberName.value)}`,
    grade: textOf(els.reportNumberLevel.value),
    floor: normalizeNumberCode(els.reportNumberCode.value) || "미확인",
    area: textOf(els.reportNumberSlot.value) || "-",
    stats: els.reportMode.value === "delete" && !/삭제\s*요청/.test(textOf(els.reportNumberEffect.value))
      ? `[삭제 요청] ${textOf(els.reportNumberName.value)} 정보를 삭제해주세요.`
      : textOf(els.reportNumberEffect.value),
    passive: cleanNumberSources(selectedOptionValues(els.reportNumberSource).join(", ")) || "-",
    active: els.reportMode.value === "delete" ? numbersDeleteMarker : "-",
    createdAt: new Date().toISOString(),
  } : {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    mode: els.reportMode.value,
    authorNickname,
    monster: textOf(els.reportMonster.value),
    originalMonster: ["edit", "delete"].includes(els.reportMode.value) ? textOf(els.reportOriginalMonster.value) : "",
    grade: gradeLabelFromInput(els.reportGrade.value),
    floor: textOf(els.reportFloor.value),
    area: selectedOptionValues(els.reportArea).join(", "),
    stats: els.reportMode.value === "delete" && !/삭제\s*요청/.test(textOf(els.reportStats.value))
      ? `[삭제 요청] ${textOf(els.reportOriginalMonster.value || els.reportMonster.value)} 정보를 삭제해주세요.`
      : textOf(els.reportStats.value),
    passive: textOf(els.reportPassive.value),
    sailing: Boolean(els.reportSailing.checked),
    recommendedCharacters: [...els.reportRecommendations]
      .filter((field) => field.checked)
      .map((field) => field.value)
      .join(", "),
    active: reportActiveFields()
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
    renderMyReports();
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
    renderMyReports();
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
    const approvedReport = { ...report, mode: isDeleteReport(report) ? "delete" : report.mode, status: "approved", reviewedAt: new Date().toISOString() };
    let nextApprovedItems = approvedReportItems.filter((item) => item.id !== id);
    if (isDeleteReport(approvedReport)) {
      const relatedReports = nextApprovedItems.filter((item) => reportTargetsSame(approvedReport, item));
      nextApprovedItems = nextApprovedItems.filter((item) => !reportTargetsSame(approvedReport, item));
      if (hasPublicReportStore() && relatedReports.length) {
        await Promise.allSettled(relatedReports.map((item) => updatePublicReportStatus(item.id, "deleted")));
      }
    }
    approvedReportItems = sortReportsByDate([approvedReport, ...nextApprovedItems]);
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
    renderAdminCenter();
  }
  renderMyReports();
}

function renderPendingReports() {
  els.pendingCount.textContent = `검수 대기 ${pendingReports.length}건`;
  if (!adminUnlocked) {
    els.pendingReports.innerHTML = `<div class="empty compact-empty">관리자 모드를 열면 검수 대기 목록이 표시됩니다.</div>`;
    return;
  }
  els.pendingReports.innerHTML = pendingReports.length
    ? pendingReports.map((report) => {
      const deleteRequested = isDeleteReport(report);
      const approveLabel = deleteRequested ? "삭제 승인" : report.mode === "edit" ? "수정 승인" : "승인해서 추가";
      return isNumbersReport(report) ? `
      <article class="pending-card" data-report-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">넘버스</span> ${escapeHtml(visibleReportName(report))}</strong>
          <span>${escapeHtml(reportModeLabel(report))} · #${escapeHtml(report.floor)} · Lv ${escapeHtml(report.grade)}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>효과</b> ${escapeHtml(report.stats)}</p>
        <p><b>착용부위</b> ${escapeHtml(report.area === "-" ? "미기록" : report.area)} · <b>획득처</b> ${escapeHtml(report.passive === "-" ? "미기록" : report.passive)}</p>
        <div class="pending-actions">
          <button type="button" data-action="approve">${escapeHtml(approveLabel)}</button>
          <button type="button" data-action="reject">반려</button>
        </div>
      </article>
    ` : `
      <article class="pending-card" data-report-id="${escapeHtml(report.id)}">
        <div>
          <strong><span class="data-kind-pill">정수</span> ${escapeHtml(report.monster)}</strong>
          <span>${isDeleteReport(report) ? `삭제 (${escapeHtml(report.originalMonster || report.monster)})` : report.mode === "edit" ? `수정 (${escapeHtml(report.originalMonster || report.monster)} → ${escapeHtml(report.monster)})` : "신규"} · ${escapeHtml(report.floor)} · ${escapeHtml(report.area)} · ${escapeHtml(report.grade)} ${report.sailing ? `<b class="sailing-pill">항해</b>` : ""} ${report.recommendedCharacters ? `<b class="character-pill">${escapeHtml(report.recommendedCharacters)} 추천</b>` : ""}</span>
          ${report.authorNickname ? `<small class="report-author">올린사람 ${escapeHtml(report.authorNickname)}</small>` : ""}
        </div>
        <p><b>스탯</b> ${escapeHtml(report.stats)}</p>
        <p><b>패시브</b> ${escapeHtml(report.passive)}</p>
        <p class="multi-skill"><b>액티브</b> ${escapeHtml(report.active)}</p>
        <div class="pending-actions">
          <button type="button" data-action="approve">${escapeHtml(approveLabel)}</button>
          <button type="button" data-action="reject">반려</button>
        </div>
      </article>
    `;
    }).join("")
    : `<div class="empty compact-empty">검수 대기 제보가 없습니다.</div>`;
}

function reportCardTitle(report) {
  return isNumbersReport(report) ? visibleReportName(report) : textOf(report.monster);
}

function renderMyReports() {
  if (!els.myReports || !els.myReportCount) return;
  const nickname = currentAuthNickname();
  if (!nickname) {
    els.myReportCount.textContent = "내 제보 0건";
    els.myReports.innerHTML = `<div class="empty compact-empty">로그인 후 내가 등록한 제보를 확인할 수 있습니다.</div>`;
    return;
  }
  const rows = [
    ...pendingReports.map((report) => ({ ...report, _statusLabel: "검수 대기" })),
    ...approvedReportItems.map((report) => ({ ...report, _statusLabel: isDeleteReport(report) ? "삭제 승인" : "승인 완료" })),
  ]
    .filter((report) => textOf(report.authorNickname) === nickname)
    .sort((a, b) => new Date(b.createdAt || b.reviewedAt || 0) - new Date(a.createdAt || a.reviewedAt || 0));
  els.myReportCount.textContent = `내 제보 ${rows.length}건`;
  els.myReports.innerHTML = rows.length
    ? rows.slice(0, 12).map((report) => `
      <article class="my-report-card">
        <div>
          <strong>${escapeHtml(reportCardTitle(report))}</strong>
          <span>${isNumbersReport(report) ? "넘버스" : "정수"} · ${escapeHtml(reportModeLabel(report))} · ${escapeHtml(report._statusLabel)}</span>
        </div>
        <small>${escapeHtml(dateLabel(report.createdAt || report.reviewedAt))}</small>
      </article>
    `).join("")
    : `<div class="empty compact-empty">아직 등록한 제보가 없습니다.</div>`;
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
    renderAdminCenter();
    renderMyReports();
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
          <span>${isDeleteReport(report) ? "삭제 승인" : report.mode === "edit" ? "수정 승인" : "신규 승인"} · #${escapeHtml(report.floor)} · Lv ${escapeHtml(report.grade)}</span>
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
          <span>${isDeleteReport(report) ? `삭제 승인 (${escapeHtml(report.originalMonster || report.monster)})` : report.mode === "edit" ? `수정 승인 (${escapeHtml(report.originalMonster || report.monster)} → ${escapeHtml(report.monster)})` : "신규 승인"} · ${escapeHtml(report.floor)} · ${escapeHtml(report.area)} · ${escapeHtml(report.grade)} ${report.sailing ? `<b class="sailing-pill">항해</b>` : ""} ${report.recommendedCharacters ? `<b class="character-pill">${escapeHtml(report.recommendedCharacters)} 추천</b>` : ""}</span>
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

function renderAdminCenter() {
  if (!els.adminStatsGrid) return;
  const opsBrief = document.querySelector("#adminOpsBrief");
  const locked = !adminUnlocked || !isAdminUser();
  document.querySelectorAll(".admin-dashboard, .admin-command-center, .admin-ops-grid, .admin-backup-grid").forEach((element) => {
    element.classList.toggle("is-locked", locked);
  });
  if (locked) {
    const message = `<div class="empty compact-empty">wplife0621@gmail.com Google 계정으로 로그인하면 관리자 센터가 열립니다.</div>`;
    els.adminStatsGrid.innerHTML = message;
    if (opsBrief) opsBrief.innerHTML = message;
    if (els.adminGuideList) els.adminGuideList.innerHTML = message;
    if (els.adminBuildList) els.adminBuildList.innerHTML = message;
    if (els.adminDeletedBuildList) els.adminDeletedBuildList.innerHTML = message;
    if (els.adminUserList) els.adminUserList.innerHTML = message;
    if (els.adminSiteStats) els.adminSiteStats.innerHTML = message;
    if (els.adminQualityList) els.adminQualityList.innerHTML = message;
    if (els.adminDataHealthList) els.adminDataHealthList.innerHTML = message;
    return;
  }

  const posts = adminGuidePosts();
  const comments = adminGuideComments();
  const builds = activeAdminBuilds();
  const deletedBuilds = deletedAdminBuilds();
  const health = adminBuildHealth();
  const warningCount = qualityWarningCount(posts, builds);
  renderAdminOpsBrief(posts, comments, builds, deletedBuilds, health, warningCount);
  const stats = [
    { label: "검수 대기", value: `${pendingReports.length}건`, hint: "정수/넘버스 제보", href: "#admin-pending", tone: pendingReports.length ? "warn" : "ok" },
    { label: "등록 정보", value: `${approvedReportItems.length}건`, hint: "승인된 도감 정보", href: "#admin-approved", tone: "normal" },
    { label: "게시글", value: `${posts.length}건`, hint: `댓글 ${comments.length}건`, href: "#admin-guides", tone: "normal" },
    { label: "공개 빌드", value: `${builds.length}건`, hint: "유저 공유 빌드", href: "#admin-builds", tone: "normal" },
    { label: "삭제 빌드", value: `${deletedBuilds.length}건`, hint: "복구 가능 항목", href: "#admin-deleted-builds", tone: deletedBuilds.length ? "warn" : "ok" },
    { label: "회원", value: `${adminCenterData.users.length}명`, hint: "닉네임 등록", href: "#admin-users", tone: "normal" },
    { label: "오늘 방문", value: `${adminCenterData.visitors.today ?? "-"}명`, hint: `누적 ${adminCenterData.visitors.total ?? "-"}명`, href: "#admin-stats", tone: "normal" },
    { label: "통계 로그", value: `${health.visitorRows}건`, hint: "빌드 목록에서 자동 제외", href: "#admin-data-health", tone: health.visitorRows > 500 ? "warn" : "normal" },
    { label: "운영 점검", value: warningCount ? `${warningCount}건` : "양호", hint: "품질 체크", href: "#admin-quality", tone: warningCount ? "warn" : "ok" },
    { label: "백업", value: "내보내기", hint: "운영 데이터 저장", href: "#admin-backup", tone: "normal" },
  ];
  els.adminStatsGrid.innerHTML = stats.map((item) => `
    <a class="admin-stat-card admin-stat-${escapeHtml(item.tone)}" href="${escapeHtml(item.href)}">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
      <small>${escapeHtml(item.hint)}</small>
    </a>
  `).join("");

  renderAdminGuides(posts, comments);
  renderAdminBuilds(builds);
  renderAdminDeletedBuilds();
  renderAdminUsers();
  renderAdminSiteStats();
  renderAdminQuality(posts, builds);
  renderAdminDataHealth();
}

function isAdminToday(value) {
  return textOf(value).slice(0, 10) === todayKey();
}

function adminPendingDeleteReports() {
  return pendingReports.filter((report) => isDeleteReport(report));
}

function adminOpsTaskItems(deletedBuilds, warningCount) {
  const items = [];
  const deletePending = adminPendingDeleteReports();
  if (pendingReports.length) {
    items.push({
      label: "제보 검수",
      value: `${pendingReports.length}건`,
      detail: deletePending.length ? `삭제 요청 ${deletePending.length}건 포함` : "신규/수정 요청 확인",
      href: "#admin-pending",
      tone: "warn",
    });
  }
  if (deletedBuilds.length) {
    items.push({
      label: "삭제된 빌드",
      value: `${deletedBuilds.length}건`,
      detail: "필요하면 복구 가능",
      href: "#admin-deleted-builds",
      tone: "warn",
    });
  }
  if (warningCount) {
    items.push({
      label: "품질 점검",
      value: `${warningCount}건`,
      detail: "중복/누락/짧은 글 확인",
      href: "#admin-quality",
      tone: "warn",
    });
  }
  if (adminCenterData.errors?.guides || adminCenterData.errors?.builds || adminCenterData.errors?.users || adminCenterData.errors?.visitors) {
    items.push({
      label: "저장소 연결",
      value: "확인 필요",
      detail: "일부 데이터를 불러오지 못했습니다",
      href: "#admin-data-health",
      tone: "danger",
    });
  }
  return items.length ? items : [{
    label: "긴급 처리",
    value: "없음",
    detail: "지금은 큰 이상 신호가 없습니다",
    href: "#admin-stats",
    tone: "ok",
  }];
}

function renderAdminOpsBrief(posts, comments, builds, deletedBuilds, health, warningCount) {
  const target = document.querySelector("#adminOpsBrief");
  if (!target) return;
  const todayPosts = posts.filter((post) => isAdminToday(post.createdAt || post.updatedAt)).length;
  const todayComments = comments.filter((comment) => isAdminToday(comment.createdAt)).length;
  const todayBuilds = builds.filter((build) => isAdminToday(build.createdAt || build.created_at)).length;
  const todayStayRows = adminFilterStayDays(adminCenterData.visitors.stayStats?.daily || []).filter((row) => row.date === todayKey());
  const todayStaySeconds = todayStayRows.reduce((sum, row) => sum + row.seconds, 0);
  const taskItems = adminOpsTaskItems(deletedBuilds, warningCount);
  const briefItems = [
    {
      label: "오늘 방문",
      value: `${adminCenterData.visitors.today ?? "-"}명`,
      detail: `누적 ${adminCenterData.visitors.total ?? "-"}명`,
      href: "#admin-stats",
      tone: "info",
    },
    {
      label: "오늘 콘텐츠",
      value: `${todayPosts + todayComments + todayBuilds}건`,
      detail: `글 ${todayPosts} · 댓글 ${todayComments} · 빌드 ${todayBuilds}`,
      href: "#admin-guides",
      tone: "info",
    },
    {
      label: "로그인 체류",
      value: todayStaySeconds ? adminFormatMinutes(todayStaySeconds) : "-",
      detail: "오늘 로그인 사용자 합계",
      href: "#admin-stats",
      tone: "info",
    },
    {
      label: "데이터 행",
      value: `${health.totalRows}행`,
      detail: `통계 로그 ${health.visitorRows}건`,
      href: "#admin-data-health",
      tone: health.visitorRows > 500 ? "warn" : "info",
    },
  ];
  target.innerHTML = `
    <div class="admin-command-summary">
      ${briefItems.map((item) => `
        <a class="admin-brief-card admin-brief-${escapeHtml(item.tone)}" href="${escapeHtml(item.href)}">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
          <small>${escapeHtml(item.detail)}</small>
        </a>
      `).join("")}
    </div>
    <div class="admin-task-board">
      <div>
        <strong>오늘 할 일</strong>
        <span>처리가 필요한 항목만 추려서 보여줍니다.</span>
      </div>
      <div class="admin-task-list">
        ${taskItems.map((item) => `
          <a class="admin-task-card admin-task-${escapeHtml(item.tone)}" href="${escapeHtml(item.href)}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <small>${escapeHtml(item.detail)}</small>
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAdminGuides(posts, comments) {
  if (!els.adminGuideList || !els.adminGuideCount) return;
  els.adminGuideCount.textContent = `게시판 ${posts.length}건 · 댓글 ${comments.length}건`;
  const postHtml = posts.slice(0, 2).map((post) => `
    <article class="admin-management-card" data-admin-guide-id="${escapeHtml(post.id)}" data-admin-guide-kind="post">
      <div>
        <strong><a href="./guides.html?post=${encodeURIComponent(post.id)}">${escapeHtml(post.title)}</a></strong>
        <span>${escapeHtml(post.category)} · ${escapeHtml(post.author)} · 조회 ${post.views} · 좋아요 ${post.likes} · 댓글 ${post.commentCount}</span>
        <small>${escapeHtml(dateLabel(post.updatedAt))}</small>
      </div>
      <div class="pending-actions">
        <a href="./guides.html?post=${encodeURIComponent(post.id)}">보기</a>
        <button type="button" data-admin-guide-action="delete-post">삭제</button>
      </div>
    </article>
  `).join("");
  const commentHtml = comments.slice(0, 2).map((comment) => `
    <article class="admin-management-card" data-admin-guide-id="${escapeHtml(comment.id)}" data-admin-guide-kind="comment">
      <div>
        <strong><a href="./guides.html?post=${encodeURIComponent(comment.postId)}">댓글 · ${escapeHtml(comment.author)}</a></strong>
        <span>${escapeHtml(comment.content.slice(0, 72))}${comment.content.length > 72 ? "..." : ""}</span>
        <small>${escapeHtml(dateLabel(comment.createdAt))}</small>
      </div>
      <div class="pending-actions">
        <a href="./guides.html?post=${encodeURIComponent(comment.postId)}">원문</a>
        <button type="button" data-admin-guide-action="delete-comment">삭제</button>
      </div>
    </article>
  `).join("");
  const more = posts.length + comments.length > 4
    ? `<a class="admin-more-link" href="./guides.html">게시판 전체 보기</a>`
    : "";
  els.adminGuideList.innerHTML = postHtml || commentHtml
    ? `${postHtml}${commentHtml}${more}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.guides ? "게시글 저장소를 불러오지 못했습니다." : "등록된 게시글이 없습니다."}</div>`;
}

function renderAdminBuilds(builds) {
  if (!els.adminBuildList || !els.adminBuildCount) return;
  els.adminBuildCount.textContent = `공개 빌드 ${builds.length}건`;
  els.adminBuildList.innerHTML = builds.length
    ? `${builds.slice(0, 3).map((build) => `
      <article class="admin-management-card" data-admin-build-id="${escapeHtml(build.id)}">
        <div>
          <strong><a href="${escapeHtml(shareUrlForBuild(build))}">${escapeHtml(build.title || "이름 없는 빌드")}</a></strong>
          <span>${escapeHtml(build.author || "익명")} · 캐릭터 ${build.members.length}명 · 좋아요 ${build.likes}</span>
          <small>${escapeHtml(dateLabel(build.createdAt))}</small>
        </div>
        <div class="pending-actions">
          <a href="${escapeHtml(shareUrlForBuild(build))}">보기</a>
          <button type="button" data-admin-build-action="delete">삭제</button>
        </div>
      </article>
    `).join("")}${builds.length > 3 ? `<a class="admin-more-link" href="./builds.html">빌드 전체 보기</a>` : ""}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.builds ? "빌드 저장소를 불러오지 못했습니다." : "등록된 공개 빌드가 없습니다."}</div>`;
}

function renderAdminUsers() {
  if (!els.adminUserList || !els.adminUserCount) return;
  els.adminUserCount.textContent = `사용자 닉네임 ${adminCenterData.users.length}명`;
  els.adminUserList.innerHTML = adminCenterData.users.length
    ? `${adminCenterData.users.slice(0, 4).map((user) => `
      <article class="admin-management-card">
        <div>
          <strong>${escapeHtml(user.nickname || "닉네임 없음")}</strong>
          <span>${escapeHtml(user.email || "이메일 미기록")}</span>
          <small>${escapeHtml(dateLabel(user.updated_at || user.created_at))}</small>
        </div>
      </article>
    `).join("")}${adminCenterData.users.length > 4 ? `<span class="admin-more-link is-static">나머지 ${adminCenterData.users.length - 4}명은 백업에서 확인</span>` : ""}`
    : `<div class="empty compact-empty">${adminCenterData.errors?.users ? "닉네임 저장소 권한 또는 테이블 설정을 확인해주세요." : "등록된 닉네임이 없습니다."}</div>`;
}

function renderAdminSiteStats() {
  if (!els.adminSiteStats) return;
  const total = adminCenterData.visitors.total ?? "확인 실패";
  const today = adminCenterData.visitors.today ?? "확인 실패";
  els.adminSiteStats.innerHTML = `
    <article class="admin-management-card admin-mini-summary">
      <div>
        <strong>방문 흐름</strong>
        <span>오늘 ${escapeHtml(today)} · 누적 ${escapeHtml(total)}</span>
        <small>마지막 갱신 ${escapeHtml(dateLabel(adminCenterData.loadedAt))}</small>
      </div>
    </article>
  `;
}

function renderAdminQuality(posts, builds) {
  if (!els.adminQualityList) return;
  els.adminQualityList.innerHTML = adminQualityItems(posts, builds).map((item) => `
    <article class="admin-management-card ${item.warn ? "is-warning" : "is-ok"}">
      <div>
        <strong><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></strong>
        <span>${escapeHtml(item.value)}</span>
      </div>
    </article>
  `).join("");
}

async function loadAdminCenter() {
  if (!els.adminStatsGrid) return;
  if (!adminUnlocked || !isAdminUser()) {
    renderAdminCenter();
    return;
  }
  els.adminStatsGrid.innerHTML = `<div class="empty compact-empty">관리자 데이터를 불러오는 중입니다.</div>`;
  const [guideResult, buildResult, buildLogResult, userResult, visitorResult, dailyResult] = await Promise.allSettled([
    fetchAdminRows(guideBackend, guideBackend.table, "?select=*&order=updated_at.desc"),
    fetchAdminRows(buildBackend, buildBackend.table, publicBuildRowsQuery(3000)),
    fetchAdminRows(buildBackend, buildBackend.table, "?select=*&order=created_at.desc&limit=1200"),
    fetchAdminRows(profileBackend, profileBackend.table, "?select=*&order=updated_at.desc"),
    fetchAdminRows(visitorBackend, visitorBackend.visitorTable, "?select=visitor_id"),
    fetchAdminRows(visitorBackend, visitorBackend.dailyTable, "?select=visitor_id,visit_date&order=visit_date.desc"),
  ]);
  const buildRows = mergeAdminBuildRows(
    buildResult.status === "fulfilled" ? buildResult.value : [],
    buildLogResult.status === "fulfilled" ? buildLogResult.value : [],
  );
  const buildVisitorStats = adminBuildVisitorStats(buildRows);
  const dailyRows = dailyResult.status === "fulfilled" ? dailyResult.value : [];
  const tableDaily = adminDailyVisitorCounts(dailyRows);
  const dailyCounts = buildVisitorStats.dailyCounts.length ? buildVisitorStats.dailyCounts : tableDaily;
  const today = todayKey();
  adminCenterData = {
    guides: guideResult.status === "fulfilled" ? guideResult.value.map(normalizeAdminGuide) : [],
    builds: buildRows,
    users: userResult.status === "fulfilled" ? userResult.value : [],
    visitors: {
      total: buildVisitorStats.total || (visitorResult.status === "fulfilled" ? visitorResult.value.length : null),
      today: buildVisitorStats.today ?? tableDaily.find((row) => row.date === today)?.count ?? null,
      dailyCounts,
      stayStats: adminSessionStayStats(buildRows),
    },
    errors: {
      guides: guideResult.status !== "fulfilled",
      builds: buildResult.status !== "fulfilled",
      users: userResult.status !== "fulfilled",
      visitors: buildLogResult.status !== "fulfilled" && (visitorResult.status !== "fulfilled" || dailyResult.status !== "fulfilled"),
    },
    loadedAt: new Date().toISOString(),
  };
  renderAdminCenter();
}

function adminBuildVisitorStats(rows) {
  const dailyRows = rows.filter((row) => textOf(row.title) === visitorBuildMarkers.daily);
  const dailyMap = new Map();
  dailyRows.forEach((row) => {
    const date = textOf(row.note) || textOf(row.created_at || row.createdAt).slice(0, 10);
    if (!date) return;
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });
  const dailyCounts = [...dailyMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
  return {
    total: dailyRows.length,
    today: dailyMap.get(todayKey()) || 0,
    dailyCounts,
  };
}

function mergeAdminBuildRows(primaryRows, logRows) {
  const map = new Map();
  [...primaryRows, ...logRows].forEach((row) => {
    if (!row?.id || map.has(row.id)) return;
    map.set(row.id, row);
  });
  return [...map.values()];
}

function adminDailyVisitorCounts(rows) {
  const dailyMap = new Map();
  rows.forEach((row) => {
    const date = textOf(row.visit_date);
    if (!date) return;
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });
  return [...dailyMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);
}

function adminSessionStayStats(rows) {
  const dailyMap = new Map();
  const accountMap = new Map();
  const pageMap = new Map();
  rows.filter((row) => textOf(row.title) === sessionTimeMarker).forEach((row) => {
    const parsed = parseBuildMarkerNote(row.note);
    const date = textOf(parsed.date) || textOf(row.created_at || row.createdAt).slice(0, 10);
    const seconds = Math.max(0, Number(parsed.seconds || 0));
    if (!date || !seconds) return;
    const bucket = dailyMap.get(date) || { date, seconds: 0, records: 0 };
    bucket.seconds += Math.min(seconds, 600);
    bucket.records += 1;
    dailyMap.set(date, bucket);
    const account = textOf(parsed.email) || textOf(parsed.nickname) || textOf(row.author) || "계정 미확인";
    const nickname = textOf(parsed.nickname) || textOf(row.author) || account;
    const key = `${account}__${date}`;
    const accountBucket = accountMap.get(key) || { account, nickname, date, seconds: 0, records: 0 };
    accountBucket.seconds += Math.min(seconds, 600);
    accountBucket.records += 1;
    accountMap.set(key, accountBucket);
    const path = normalizeAdminPagePath(parsed.path);
    const pageBucket = pageMap.get(path) || { path, label: adminPageLabel(path), seconds: 0, records: 0, accounts: new Set() };
    pageBucket.seconds += Math.min(seconds, 600);
    pageBucket.records += 1;
    pageBucket.accounts.add(account);
    pageMap.set(path, pageBucket);
  });
  return {
    daily: [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    accounts: [...accountMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date) || b.seconds - a.seconds)
      .slice(0, 80),
    pages: [...pageMap.values()]
      .map((row) => ({ ...row, accounts: row.accounts.size, averageSeconds: row.records ? row.seconds / row.records : 0 }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 20),
  };
}

function normalizeAdminPagePath(path) {
  const raw = textOf(path) || "/";
  const cleaned = raw.split("?")[0].split("#")[0] || "/";
  return cleaned.endsWith("/") ? `${cleaned}index.html` : cleaned;
}

function adminPageLabel(path) {
  const file = normalizeAdminPagePath(path).split("/").pop() || "index.html";
  const labels = {
    "index.html": "홈",
    "codex.html": "도감",
    "essences.html": "정수",
    "numbers.html": "넘버스",
    "builds.html": "빌드",
    "guides.html": "게시판",
    "report.html": "정보 제보/수정",
    "maze-time.html": "미궁 시간 계산기",
    "maze-log.html": "미궁 일지",
    "admin.html": "관리자 센터",
    "about.html": "사이트 소개",
    "privacy.html": "개인정보처리방침",
    "terms.html": "운영정책",
    "contact.html": "문의하기",
  };
  return labels[file] || file;
}

function adminFormatMinutes(seconds) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function adminRangeStartDate() {
  if (!adminStatsRangeDays) return "";
  const date = new Date();
  date.setDate(date.getDate() - (adminStatsRangeDays - 1));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function adminWithinRange(date) {
  const key = textOf(date).slice(0, 10);
  const start = adminRangeStartDate();
  return Boolean(key && (!start || key >= start));
}

function adminFilterStayAccounts(rows) {
  return rows
    .filter((row) => adminWithinRange(row.date))
    .filter((row) => !adminStatsExcludeAdmin || !adminEmails.includes(textOf(row.account).toLowerCase()));
}

function adminFilterStayDays(rows) {
  return rows.filter((row) => adminWithinRange(row.date));
}

function adminFilterStayPages(rows) {
  if (!adminStatsRangeDays) return rows;
  return rows;
}

function adminContentActivityStats(posts, comments, builds) {
  const dayMap = new Map();
  const touch = (date) => {
    const key = textOf(date).slice(0, 10);
    if (!key || !adminWithinRange(key)) return null;
    const bucket = dayMap.get(key) || { date: key, posts: 0, comments: 0, builds: 0 };
    dayMap.set(key, bucket);
    return bucket;
  };
  posts.forEach((post) => {
    const bucket = touch(post.createdAt || post.updatedAt);
    if (bucket) bucket.posts += 1;
  });
  comments.forEach((comment) => {
    const bucket = touch(comment.createdAt);
    if (bucket) bucket.comments += 1;
  });
  builds.forEach((build) => {
    const bucket = touch(build.createdAt || build.created_at);
    if (bucket) bucket.builds += 1;
  });
  return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function adminActivityChartMarkup(rows) {
  if (!rows.length) return `<div class="empty compact-empty">선택한 기간에 콘텐츠 활동 기록이 없습니다.</div>`;
  const max = Math.max(...rows.map((row) => row.posts + row.comments + row.builds), 1);
  return `
    <div class="admin-activity-chart" aria-label="콘텐츠 활동 그래프">
      ${rows.map((row) => {
        const total = row.posts + row.comments + row.builds;
        const height = Math.max(10, Math.round((total / max) * 100));
        return `
          <div class="admin-chart-bar admin-activity-bar" title="${escapeHtml(row.date)} 게시글 ${row.posts}, 댓글 ${row.comments}, 빌드 ${row.builds}">
            <span style="height:${height}%"></span>
            <b>${total}</b>
            <small>${escapeHtml(row.date.slice(5).replace("-", "/"))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function adminPopularContentMarkup(posts, builds) {
  const topPosts = posts
    .filter((post) => adminWithinRange(post.updatedAt || post.createdAt))
    .sort((a, b) => (b.likes + b.views + b.commentCount) - (a.likes + a.views + a.commentCount))
    .slice(0, 5);
  const topBuilds = builds
    .filter((build) => adminWithinRange(build.createdAt || build.created_at))
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 5);
  return `
    <div class="admin-popular-grid">
      <section>
        <h3>인기 게시글 TOP 5</h3>
        ${topPosts.length ? topPosts.map((post) => `
          <a href="./guides.html?post=${encodeURIComponent(post.id)}">
            <b>${escapeHtml(post.title)}</b>
            <span>조회 ${post.views} · 좋아요 ${post.likes} · 댓글 ${post.commentCount}</span>
          </a>
        `).join("") : `<p>선택한 기간에 게시글 기록이 없습니다.</p>`}
      </section>
      <section>
        <h3>인기 빌드 TOP 5</h3>
        ${topBuilds.length ? topBuilds.map((build) => `
          <a href="${escapeHtml(shareUrlForBuild(build))}">
            <b>${escapeHtml(build.title || "이름 없는 빌드")}</b>
            <span>${escapeHtml(build.author || "익명")} · 좋아요 ${build.likes}</span>
          </a>
        `).join("") : `<p>선택한 기간에 빌드 기록이 없습니다.</p>`}
      </section>
    </div>
  `;
}

function adminStatsControlsMarkup() {
  const ranges = [
    { label: "7일", value: 7 },
    { label: "14일", value: 14 },
    { label: "30일", value: 30 },
    { label: "전체", value: 0 },
  ];
  return `
    <div class="admin-stats-controls">
      <div>
        ${ranges.map((item) => `
          <button type="button" class="${adminStatsRangeDays === item.value ? "is-active" : ""}" data-admin-stats-range="${item.value}">
            ${item.label}
          </button>
        `).join("")}
      </div>
      <button type="button" class="${adminStatsExcludeAdmin ? "is-active" : ""}" data-admin-stats-exclude-admin>
        관리자 제외
      </button>
    </div>
  `;
}

function adminVisitorChartMarkup(rows) {
  if (!rows?.length) return `<div class="empty compact-empty">아직 표시할 일자별 방문 기록이 없습니다.</div>`;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return `
    <div class="admin-visitor-chart" aria-label="일자별 방문자 수 그래프">
      ${rows.map((row) => {
        const height = Math.max(10, Math.round((row.count / max) * 100));
        return `
          <div class="admin-chart-bar" title="${escapeHtml(row.date)} ${row.count}명">
            <span style="height:${height}%"></span>
            <b>${row.count}</b>
            <small>${escapeHtml(row.date.slice(5).replace("-", "/"))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function adminStayChartMarkup(rows) {
  if (!rows?.length) return `<div class="empty compact-empty">아직 표시할 일자별 체류 기록이 없습니다.</div>`;
  const max = Math.max(...rows.map((row) => row.seconds), 1);
  return `
    <div class="admin-stay-chart" aria-label="일자별 로그인 사용자 체류 시간 그래프">
      ${rows.map((row) => {
        const height = Math.max(10, Math.round((row.seconds / max) * 100));
        return `
          <div class="admin-chart-bar admin-stay-bar" title="${escapeHtml(row.date)} ${escapeHtml(adminFormatMinutes(row.seconds))}">
            <span style="height:${height}%"></span>
            <b>${escapeHtml(adminFormatMinutes(row.seconds))}</b>
            <small>${escapeHtml(row.date.slice(5).replace("-", "/"))}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function adminAccountStayTableMarkup(rows) {
  if (!rows?.length) {
    return `<div class="empty compact-empty">계정별 체류 기록이 아직 없습니다. 로그인 사용자가 사이트에 머문 뒤부터 집계됩니다.</div>`;
  }
  return `
    <div class="admin-account-stay-table">
      <div class="admin-account-stay-head">
        <span>계정</span>
        <span>날짜</span>
        <span>체류 시간</span>
        <span>기록</span>
      </div>
      ${rows.map((row) => `
        <div class="admin-account-stay-row">
          <span>
            <b>${escapeHtml(row.nickname)}</b>
            <small>${escapeHtml(row.account)}</small>
          </span>
          <span>${escapeHtml(row.date)}</span>
          <strong>${escapeHtml(adminFormatMinutes(row.seconds))}</strong>
          <span>${row.records}회</span>
        </div>
      `).join("")}
    </div>
  `;
}

function adminPageStayTableMarkup(rows) {
  if (!rows?.length) {
    return `<div class="empty compact-empty">페이지별 체류 기록이 아직 없습니다. 로그인 사용자가 사이트에 머문 뒤부터 집계됩니다.</div>`;
  }
  return `
    <div class="admin-page-stay-summary">
      <strong>가장 오래 머문 페이지: ${escapeHtml(rows[0].label)}</strong>
      <span>총 ${escapeHtml(adminFormatMinutes(rows[0].seconds))} · 평균 ${escapeHtml(adminFormatMinutes(rows[0].averageSeconds))} · 계정 ${rows[0].accounts}명</span>
    </div>
    <div class="admin-page-stay-table">
      <div class="admin-page-stay-head">
        <span>페이지</span>
        <span>총 체류</span>
        <span>평균</span>
        <span>계정</span>
        <span>기록</span>
      </div>
      ${rows.map((row) => `
        <div class="admin-page-stay-row">
          <span>
            <b>${escapeHtml(row.label)}</b>
            <small>${escapeHtml(row.path)}</small>
          </span>
          <strong>${escapeHtml(adminFormatMinutes(row.seconds))}</strong>
          <span>${escapeHtml(adminFormatMinutes(row.averageSeconds))}</span>
          <span>${row.accounts}명</span>
          <span>${row.records}회</span>
        </div>
      `).join("")}
    </div>
  `;
}

function handleAdminStatsControls(event) {
  const rangeButton = event.target.closest("button[data-admin-stats-range]");
  if (rangeButton) {
    adminStatsRangeDays = Number(rangeButton.dataset.adminStatsRange || 14);
    renderAdminSiteStats();
    return;
  }
  const excludeButton = event.target.closest("button[data-admin-stats-exclude-admin]");
  if (excludeButton) {
    adminStatsExcludeAdmin = !adminStatsExcludeAdmin;
    renderAdminSiteStats();
  }
}

function renderAdminSiteStats() {
  if (!els.adminSiteStats) return;
  const posts = adminGuidePosts();
  const comments = adminGuideComments();
  const builds = activeAdminBuilds();
  const total = adminCenterData.visitors.total ?? "확인 실패";
  const today = adminCenterData.visitors.today ?? "확인 실패";
  const stayRows = adminFilterStayDays(adminCenterData.visitors.stayStats?.daily || []);
  const accountRows = adminFilterStayAccounts(adminCenterData.visitors.stayStats?.accounts || []);
  const pageRows = adminFilterStayPages(adminCenterData.visitors.stayStats?.pages || []);
  const dailyCounts = (adminCenterData.visitors.dailyCounts || []).filter((row) => adminWithinRange(row.date));
  const activityRows = adminContentActivityStats(posts, comments, builds);
  const todayStay = stayRows.find((row) => row.date === todayKey());
  const avgStaySeconds = todayStay?.records ? todayStay.seconds / todayStay.records : 0;
  const totalStaySeconds = stayRows.reduce((sum, row) => sum + row.seconds, 0);
  const activeAccountsToday = new Set(accountRows.filter((row) => row.date === todayKey()).map((row) => row.account)).size;
  const topPage = pageRows[0];
  els.adminSiteStats.innerHTML = `
    ${adminStatsControlsMarkup()}
    <article class="admin-site-overview">
      <div class="admin-site-metric">
        <span>오늘 방문</span>
        <strong>${escapeHtml(today)}명</strong>
      </div>
      <div class="admin-site-metric">
        <span>누적 방문</span>
        <strong>${escapeHtml(total)}명</strong>
      </div>
      <div class="admin-site-metric">
        <span>오늘 평균 체류</span>
        <strong>${avgStaySeconds ? escapeHtml(adminFormatMinutes(avgStaySeconds)) : "-"}</strong>
      </div>
      <div class="admin-site-metric">
        <span>최근 로그인 체류 합계</span>
        <strong>${totalStaySeconds ? escapeHtml(adminFormatMinutes(totalStaySeconds)) : "-"}</strong>
      </div>
      <div class="admin-site-metric">
        <span>오늘 활동 계정</span>
        <strong>${activeAccountsToday || "-"}명</strong>
      </div>
      <div class="admin-site-metric">
        <span>계정별 집계</span>
        <strong>${accountRows.length}건</strong>
      </div>
      <div class="admin-site-metric">
        <span>최장 체류 페이지</span>
        <strong>${topPage ? escapeHtml(topPage.label) : "-"}</strong>
      </div>
      <div class="admin-site-metric">
        <span>기간 내 활동</span>
        <strong>${activityRows.reduce((sum, row) => sum + row.posts + row.comments + row.builds, 0)}건</strong>
      </div>
      <small>마지막 갱신 ${escapeHtml(dateLabel(adminCenterData.loadedAt))}</small>
    </article>
    <div class="admin-analytics-grid">
      <section>
        <h3>일자별 방문자 수</h3>
        ${adminVisitorChartMarkup(dailyCounts)}
      </section>
      <section>
        <h3>일자별 로그인 체류 시간</h3>
        ${adminStayChartMarkup(stayRows)}
      </section>
      <section>
        <h3>콘텐츠 활동량</h3>
        ${adminActivityChartMarkup(activityRows)}
      </section>
    </div>
    ${adminPopularContentMarkup(posts, builds)}
    <div class="admin-stay-list admin-account-stay">
      <strong>계정별 일자별 체류 시간</strong>
      ${adminAccountStayTableMarkup(accountRows)}
    </div>
    <div class="admin-stay-list admin-page-stay">
      <strong>페이지별 체류 시간</strong>
      ${adminPageStayTableMarkup(pageRows)}
    </div>
  `;
}

init();
