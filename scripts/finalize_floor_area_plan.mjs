import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "outputs/floor-area-review/정수_층_구역_변경안.xlsx";
const outputPath = "outputs/floor-area-review/정수_층_구역_최종안.xlsx";
const previewDir = path.join(process.env.TEMP, "ghostbusters-floor-area-final");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const summary = workbook.worksheets.getItem("요약");
const detail = workbook.worksheets.getItem("전체 변경안");
const structure = workbook.worksheets.getItem("구역 구조");
const review = workbook.worksheets.getItem("확인 필요");
const detailRows = detail.getRange("A6:J232").values.map((row) => [...row]);

const has = (value, needle) => String(value || "").includes(needle);
for (const row of detailRows) {
  const currentFloor = String(row[2] || "");
  const currentArea = String(row[3] || "");
  let nextFloor = String(row[4] || "");
  let nextArea = String(row[5] || "");
  let basis = String(row[7] || "");
  let note = String(row[8] || "");

  if (has(currentArea, "홉고블린 요새") || has(nextArea, "홉고블린 요새")) {
    nextFloor = "2층 균열";
    nextArea = "홉고블린 요새";
    basis = "사용자 확정 규칙";
    note = "홉고블린 요새와 하위방을 2층 균열로 통합";
  }
  if (has(currentArea, "잠든 거인의 안식처") || has(nextArea, "잠든 거인의 안식처")) {
    nextFloor = "2층 균열";
    nextArea = "안개의 거석 폐허";
    basis = "사용자 확정 규칙";
    note = "잠든 거인의 안식처 항목 제거 후 상위 구역으로 통합";
  }
  if (has(currentArea, "혼령의 회랑") || has(nextArea, "혼령의 회랑")) {
    nextFloor = "3층 균열";
    nextArea = "백색신전";
    basis = "사용자 확정 규칙";
    note = "혼령의 회랑 항목 제거 후 백색신전으로 통합";
  }
  if (nextFloor === "4층" && nextArea === "군주") {
    nextFloor = currentFloor;
    nextArea = currentArea;
    basis = "사용자 확정 규칙";
    note = "4층 군주 항목을 만들지 않고 현재 4층 구역 유지";
  }
  if (currentFloor.startsWith("6층") || nextFloor.startsWith("6층")) {
    nextFloor = "6층";
    nextArea = "대해";
    basis = "사용자 확정 규칙";
    note = "6층 구역을 대해 하나로 통일";
  }

  row[4] = nextFloor;
  row[5] = nextArea;
  row[6] = currentFloor === nextFloor && currentArea === nextArea ? "유지" : "변경";
  row[7] = basis;
  row[8] = note;
}
detail.getRange("A6:J232").values = detailRows;

summary.getRange("A5:H8").values = [
  ["1", "일반 층과 균열 층을 다시 분리", null, "예: 1층 / 1층 균열", null, null, null, null],
  ["2", "균열 구역은 별도 층 아래 배치", null, "예: 1층 균열 → 고블린 숲, 빙하굴, 강철의 묘", null, null, null, null],
  ["3", "갱신 전 사이트 위치를 우선 복원", null, "기존 등록 정수의 이전 층·구역을 기준으로 대조", null, null, null, null],
  ["4", "사용자가 확정한 예외 규칙 반영", null, "홉고블린 요새·하위 구역 제거·5층 균열 추가·6층 대해 통일", null, null, null, null],
];
summary.getRange("A16:H20").values = [
  ["몬스터/구역", "현재 층", "현재 구역", null, "변경 층", "변경 구역", null, "이유"],
  ["홉고블린 요새", "2층", "홉고블린 요새 대족장의 방", null, "2층 균열", "홉고블린 요새", null, "사용자 확정 규칙"],
  ["잠든 거인의 안식처", "2층", "안개의 거석 폐허 (잠든 거인의 안식처)", null, "2층 균열", "안개의 거석 폐허", null, "하위 구역 제거"],
  ["5층 균열", "-", "-", null, "5층 균열", "결빙의 성소 / 중력의 묘", null, "구역 2개 추가"],
  ["6층 전체", "6층", "섬·황야·미기록", null, "6층", "대해", null, "대해 하나로 통일"],
];

const structureMap = new Map();
for (const row of detailRows) {
  const key = `${row[4]}\t${row[5]}`;
  if (!structureMap.has(key)) structureMap.set(key, { floor: row[4], area: row[5], monsters: [] });
  structureMap.get(key).monsters.push(row[1]);
}
for (const area of ["결빙의 성소", "중력의 묘"]) {
  const key = `5층 균열\t${area}`;
  if (!structureMap.has(key)) structureMap.set(key, { floor: "5층 균열", area, monsters: [] });
}
const structureRows = [...structureMap.values()]
  .sort((a, b) => String(a.floor).localeCompare(String(b.floor), "ko", { numeric: true }) || String(a.area).localeCompare(String(b.area), "ko"))
  .map((item, index) => [index + 1, item.floor, item.area, item.monsters.length, item.monsters.slice(0, 5).join(", ") || "-", item.monsters.length > 5 ? `외 ${item.monsters.length - 5}개` : ""]);
for (const table of [...structure.tables.items]) table.delete();
structure.getRange("A6:F200").clear({ applyTo: "contents" });
structure.getRange(`A6:F${structureRows.length + 5}`).values = structureRows;
structure.getRange(`A6:F${structureRows.length + 5}`).format = { borders: { preset: "all", style: "thin", color: "#D7E0EA" }, wrapText: true, verticalAlignment: "center", font: { name: "맑은 고딕", color: "#243447", size: 10 } };
structure.getRange(`B6:C${structureRows.length + 5}`).format.fill = "#E8F7F4";
structure.tables.add(`A5:F${structureRows.length + 5}`, true, "FloorAreaStructureTable").style = "TableStyleMedium2";

const reviewRows = detailRows.filter((row) => row[7] === "확인 필요" || row[7] === "신규 항목 유지");
for (const table of [...review.tables.items]) table.delete();
review.getRange("A6:J200").clear({ applyTo: "contents" });
if (reviewRows.length) review.getRange(`A6:J${reviewRows.length + 5}`).values = reviewRows;
review.getRange(`A6:J${Math.max(reviewRows.length + 5, 6)}`).format = { borders: { preset: "all", style: "thin", color: "#D7E0EA" }, wrapText: true, verticalAlignment: "center", font: { name: "맑은 고딕", color: "#243447", size: 10 } };
if (reviewRows.length) {
  review.getRange(`H6:I${reviewRows.length + 5}`).format.fill = "#FFF4D6";
  review.tables.add(`A5:J${reviewRows.length + 5}`, true, "FloorAreaReviewTable").style = "TableStyleMedium9";
}

const sandbox = { window: {} };
vm.runInNewContext(await fs.readFile("ghost-data.js", "utf8"), sandbox);
const data = sandbox.window.GHOST_DATA;
data["정수"] = (data["정수"] || []).filter((row) => row["몬스터"] !== "천공의 군주" && row["구역"] !== "4층 정상");
const planByMonster = new Map(detailRows.map((row) => [String(row[1]), { floor: String(row[4]), area: String(row[5]) }]));
for (const row of data["정수"] || []) {
  const plan = planByMonster.get(String(row["몬스터"]));
  if (!plan) continue;
  row["층"] = plan.floor;
  row["구역"] = plan.area;
}
const forbidden = ["잠든 거인의 안식처", "혼령의 회랑"];
data["균열"] = (data["균열"] || []).filter((row) => {
  const text = `${row["층"] || ""} ${row["구역"] || ""} ${row["균열"] || ""}`;
  return !forbidden.some((word) => text.includes(word)) && !(row["층"] === "4층" && row["구역"] === "군주");
});
for (const area of ["결빙의 성소", "중력의 묘"]) {
  if (!data["균열"].some((row) => row["층"] === "5층 균열" && row["구역"] === area)) {
    data["균열"].push({ "층": "5층 균열", "구역": area, "균열": area });
  }
}
data._snapshotUpdatedAt = "2026-06-18T19:20:00+09:00";
await fs.writeFile("ghost-data.js", `window.GHOST_DATA = ${JSON.stringify(data, null, 2)};\n`, "utf8");

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range, fileName] of [
  ["요약", "A1:H20", "summary.png"],
  ["전체 변경안", "A1:J32", "detail.png"],
  ["구역 구조", `A1:F${Math.min(structureRows.length + 5, 45)}`, "structure.png"],
  ["확인 필요", `A1:J${Math.min(reviewRows.length + 5, 35)}`, "review.png"],
]) {
  const image = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
  await fs.writeFile(path.join(previewDir, fileName), new Uint8Array(await image.arrayBuffer()));
}
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const essenceRows = data["정수"] || [];
const mismatches = essenceRows.filter((row) => {
  const plan = planByMonster.get(String(row["몬스터"]));
  return !plan || row["층"] !== plan.floor || row["구역"] !== plan.area;
});
const floorSixAreas = [...new Set(essenceRows.filter((row) => row["층"] === "6층").map((row) => row["구역"]))];
const forbiddenEssences = essenceRows.filter((row) => forbidden.some((word) => String(row["구역"] || "").includes(word)) || (row["층"] === "4층" && row["구역"] === "군주"));
const floorFiveCracks = data["균열"].filter((row) => row["층"] === "5층 균열").map((row) => row["구역"]);
console.log(JSON.stringify({ changed: detailRows.filter((row) => row[6] === "변경").length, review: reviewRows.length, structure: structureRows.length, mismatches: mismatches.length, floorSixAreas, forbiddenEssences: forbiddenEssences.length, floorFiveCracks, errors: errors.ndjson, previewDir }));
