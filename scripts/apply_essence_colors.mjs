import fs from "node:fs";
import vm from "node:vm";

const pck = fs.readFileSync(`${process.env.TEMP}\\labyrinth-analysis\\index.pck`);
const base = Number(pck.readBigUInt64LE(24));
let cursor = Number(pck.readBigUInt64LE(32));
const entryCount = pck.readUInt32LE(cursor); cursor += 4;
const entries = new Map();
for (let i = 0; i < entryCount; i += 1) {
  const length = pck.readUInt32LE(cursor); cursor += 4;
  const name = pck.subarray(cursor, cursor + length).toString("utf8").replace(/\0+$/, ""); cursor += length;
  const offset = Number(pck.readBigUInt64LE(cursor));
  const size = Number(pck.readBigUInt64LE(cursor + 8)); cursor += 36;
  entries.set(name, { offset, size });
}

function readJson(name) {
  const { offset, size } = entries.get(name);
  return JSON.parse(pck.subarray(base + offset, base + offset + size).toString("utf8").replace(/^\uFEFF/, ""));
}

const colorNames = {
  red: "빨강", orange: "주황", yellow: "노랑", green: "초록", blue: "파랑", purple: "보라",
  rainbow: "무지개", gray: "회색", cyan: "청록", black: "검정", brown: "갈색", brass: "황동",
  white: "백색", deepblue: "남색", gold: "황금", silver: "은색", dark: "암흑",
};
const aliases = {
  "무덤지기일레톤": "grave_keeper_aleton",
  "홉 고블린 폭탄병(JS)": "hobgoblin_bomber",
  "홉 고블린 사수(JS)": "hobgoblin_archer",
  "그림": "gremlin",
  "그렘": "gremlin",
  "셀레멘더": "salamander",
  "항해사 망력": "drowned_navigator",
  "잿불 시전자": "hellfire_caster",
  "해적 선장(빨강)": "pirate_captain",
  "뱀파이어(수호자)": "vampire_guardian",
  "안개의 리빙아머": "living_armor",
  "백색 구울": "ghoul",
  "백색 스켈레톤": "skeleton",
  "백색 머미": "mummy",
  "백색 노움": "noum",
  "녹갑 탐사병": "green_armor",
};
const normalize = (value) => String(value || "").replace(/\s+/g, "").replace(/데쓰/g, "데스").replace(/바이쿤/g, "뷔쿤").toLowerCase();

const essences = readJson("data/essences.json").essences || [];
const skills = readJson("data/skills.json").manual_skills || [];
const essenceByName = new Map(essences.map((row) => [normalize(row.name), row]));
const essenceById = new Map(essences.map((row) => [row.id, row]));
const skillById = new Map(skills.map((row) => [row.id, row]));

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("ghost-data.js", "utf8"), sandbox);
const data = sandbox.window.GHOST_DATA;
const rows = data["정수"] || [];
const unresolvedNames = [];
const missingDescriptionSkills = [];
let matched = 0;
let activeSkills = 0;
let describedSkills = 0;
let guardianCount = 0;

for (const row of rows) {
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "string" && value.trim().toLowerCase() === "undefined") row[key] = "-";
  }
  delete row["정수 색깔"];
  const monster = String(row["몬스터"] || "");
  const source = essenceByName.get(normalize(monster)) || essenceById.get(aliases[monster]);
  if (!source) {
    unresolvedNames.push(monster);
    continue;
  }

  if (source.type === "guardian") {
    row["등급"] = `${source.grade}등급(수호자)`;
    guardianCount += 1;
  }

  const sourceActives = source.actives || [];
  row["액티브"] = sourceActives.length ? sourceActives.map((active, index) => {
    const skill = skillById.get(active.skill_id) || {};
    const colorKey = Array.isArray(source.color) ? source.color[index] : source.color;
    const color = colorKey ? (colorNames[colorKey] || colorKey) : "공통";
    const name = skill.name || active.skill_id || "액티브";
    const cooldownValue = Number(skill.cooldown);
    const cooldown = Number.isFinite(cooldownValue) && cooldownValue > 0 ? `(${cooldownValue}s)` : "";
    const description = String(skill.effect || skill.desc || skill.description || active.description || "").trim();
    activeSkills += 1;
    if (description) describedSkills += 1;
    else missingDescriptionSkills.push(`${monster}: ${name}`);
    return `${color} - ${name}${cooldown}${description ? `: ${description}` : ""}`;
  }).join("\n") : "-";
  matched += 1;
}

data._snapshotUpdatedAt = "2026-06-18T20:25:00+09:00";
fs.writeFileSync("ghost-data.js", `window.GHOST_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");

const colorFieldCount = rows.filter((row) => Object.hasOwn(row, "정수 색깔")).length;
const undefinedValues = rows.flatMap((row) => Object.entries(row).filter(([, value]) => typeof value === "string" && value.trim().toLowerCase() === "undefined").map(([key]) => `${row["몬스터"]}: ${key}`));
const malformedGuardians = rows.filter((row) => String(row["등급"] || "").includes("수호자") && !/^\d+등급\(수호자\)$/.test(String(row["등급"]))).map((row) => row["몬스터"]);
const floorSeven = rows.filter((row) => /^7층/.test(String(row["층"] || ""))).map((row) => row["몬스터"]);
const floorFourSummit = rows.filter((row) => row["층"] === "4층" && row["구역"] === "4층 정상").map((row) => row["몬스터"]);
const floorSixAreas = [...new Set(rows.filter((row) => row["층"] === "6층").map((row) => row["구역"]))];
const floorFiveCracks = (data["균열"] || []).filter((row) => row["층"] === "5층 균열").map((row) => row["구역"]);
console.log(JSON.stringify({
  total: rows.length,
  matched,
  unresolvedNames,
  activeSkills,
  describedSkills,
  missingDescriptionSkills,
  guardianCount,
  malformedGuardians,
  colorFieldCount,
  undefinedValues,
  floorSeven,
  floorFourSummit,
  floorSixAreas,
  floorFiveCracks,
}));
