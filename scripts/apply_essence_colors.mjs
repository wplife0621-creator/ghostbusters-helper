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
const manualColors = {
  "백색 구울": "백색",
  "백색 스켈레톤": "백색",
  "백색 머미": "백색",
  "백색 노움": "백색",
  "소울이터": "정수 없음",
};
const manualActiveColors = {
  "무덤지기일레톤": ["회색", "검정"],
};
const prefixPattern = /^\(?\s*(빨강|빨간색|주황|주황색|노랑|노란색|초록|초록색|청록|청록색|파랑|파란색|남색|보라|보라색|검정|검은색|갈색|회색|무색|백색|흰색|황동|황금|금색|은색|암흑|무지개|미확인)\s*\)?\s*(?:-|:|：|\)|\s+)\s*/;
const prefixAliases = { 빨간색: "빨강", 주황색: "주황", 노란색: "노랑", 초록색: "초록", 청록색: "청록", 파란색: "파랑", 보라색: "보라", 검은색: "검정", 무색: "회색", 흰색: "백색", 금색: "황금" };
const normalize = (value) => String(value || "").replace(/\s+/g, "").replace(/데쓰/g, "데스").replace(/바이쿤/g, "뷔쿤").toLowerCase();

const essencePayload = readJson("data/essences.json");
const essences = essencePayload.essences || [];
const skills = readJson("data/skills.json").manual_skills || [];
const essenceByName = new Map(essences.map((row) => [normalize(row.name), row]));
const essenceById = new Map(essences.map((row) => [row.id, row]));
const skillById = new Map(skills.map((row) => [row.id, row]));

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync("ghost-data.js", "utf8"), sandbox);
const data = sandbox.window.GHOST_DATA;
let matched = 0;
let unresolved = 0;
const unresolvedNames = [];

for (const row of data["정수"] || []) {
  const monster = String(row["몬스터"] || "");
  const source = essenceByName.get(normalize(monster)) || essenceById.get(aliases[monster]);
  if (!source) {
    const existingPrefix = String(row["액티브"] || "").match(prefixPattern)?.[1];
    row["정수 색깔"] = manualColors[monster] || prefixAliases[existingPrefix] || existingPrefix || "확인 필요";
    const currentActive = String(row["액티브"] || "").trim();
    if (currentActive && !["-", "?", "x", "X"].includes(currentActive)) {
      row["액티브"] = currentActive.split(/\r?\n/).map((line) => prefixPattern.test(line) ? line : `미확인 - ${line}`).join("\n");
    }
    unresolved += 1;
    unresolvedNames.push(monster);
    continue;
  }

  const sourceColors = (Array.isArray(source.color) ? source.color : [source.color]).filter(Boolean);
  const displayColors = sourceColors.map((color) => colorNames[color] || color);
  row["정수 색깔"] = manualColors[monster] || displayColors.join(", ") || "확인 필요";

  const sourceActives = source.actives || [];
  const currentLines = String(row["액티브"] || "").split(/\r?\n/).map((line) => line.trim()).filter((line) => line && line !== "-");
  if (currentLines.length) {
    const usedIndexes = new Set();
    row["액티브"] = currentLines.map((line, lineIndex) => {
      const existingPrefix = line.match(prefixPattern)?.[1] || "";
      const cleanLine = line.replace(prefixPattern, "").trim();
      const cleanKey = normalize(cleanLine.split(":")[0].replace(/\([^)]*\)/g, ""));
      let activeIndex = sourceActives.findIndex((active, index) => {
        if (usedIndexes.has(index)) return false;
        const skillName = normalize(skillById.get(active.skill_id)?.name);
        return skillName && (cleanKey.includes(skillName) || skillName.includes(cleanKey));
      });
      if (activeIndex < 0) activeIndex = Math.min(lineIndex, Math.max(0, sourceActives.length - 1));
      usedIndexes.add(activeIndex);
      const colorKey = Array.isArray(source.color)
        ? (source.color[activeIndex] || "")
        : source.color;
      const color = manualActiveColors[monster]?.[lineIndex]
        || colorNames[colorKey]
        || colorKey
        || prefixAliases[existingPrefix]
        || existingPrefix
        || "공통";
      return `${color} - ${cleanLine}`;
    }).join("\n");
  }
  matched += 1;
}

data._snapshotUpdatedAt = "2026-06-18T17:20:00+09:00";
fs.writeFileSync("ghost-data.js", `window.GHOST_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");
const rows = data["정수"] || [];
const missingColor = rows.filter((row) => !String(row["정수 색깔"] || "").trim()).map((row) => row["몬스터"]);
const unmarkedActives = rows.filter((row) => String(row["액티브"] || "").split(/\r?\n/).some((line) => {
  const text = line.trim();
  return text && !["-", "?", "x", "X"].includes(text) && !prefixPattern.test(text);
})).map((row) => row["몬스터"]);
const floorSeven = rows.filter((row) => /^7층/.test(String(row["층"] || ""))).map((row) => row["몬스터"]);
console.log(JSON.stringify({ total: rows.length, matched, unresolved, unresolvedNames, missingColor, unmarkedActives, floorSeven }));
