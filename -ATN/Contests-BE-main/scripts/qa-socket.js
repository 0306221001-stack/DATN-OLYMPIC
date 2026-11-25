// QA socket: kiểm thử xác thực, phân quyền, dữ liệu sai, mất kết nối, restart, tải 40 thí sinh.
// Chạy: node scripts/qa-socket.js   (cần: MySQL XAMPP đang chạy, DB contests_db_demo có trận id=43 slug tran-dau-1
// với 40 thí sinh có tài khoản; script tự bật backend demo ở cổng 3001 nếu chưa chạy).
// CHỈ chạy trên bản demo: script ghi token vào bảng users, đổi trạng thái trận, kill/khởi động lại cổng 3001.
const { createRequire } = require("module");
const path = require("path");
const os = require("os");
const BE = path.resolve(__dirname, "..").split(path.sep).join("/");
const jwt = createRequire(BE + "/package.json")("jsonwebtoken");
const { io } = createRequire(BE + "/../Contests-FE-main/package.json")("socket.io-client");
const fs = require("fs");
const { execSync, spawn } = require("child_process");

const SP = os.tmpdir().split(path.sep).join("/");
const envTxt = fs.readFileSync(BE + "/.env", "utf8");
const getEnv = k => new RegExp("^" + k + "=(.*)$", "m").exec(envTxt)[1].trim().replace(/^["']|["']$/g, "");
const SECRET = getEnv("JWT_SECRET");
const DEMO_DB = getEnv("DATABASE_URL").replace(/\/contests_db$/, "/contests_db_demo");
const BASE = "http://localhost:3001", M = 43, SLUG = "tran-dau-1";
const sql = q => execSync(`"C:/xampp/mysql/bin/mysql.exe" -uroot --default-character-set=utf8mb4 contests_db_demo -N -e "${q}"`).toString().trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = () => fetch(BASE + "/health", { signal: AbortSignal.timeout(2500) }).then(r => r.ok).catch(() => false);

function startServer() {
  const out = fs.openSync(SP + "/qa_server.log", "a");
  const c = spawn("node", ["node_modules/ts-node/dist/bin.js", "-r", "tsconfig-paths/register", "src/server.ts"], {
    cwd: BE, detached: true, stdio: ["ignore", out, out],
    env: { ...process.env, DATABASE_URL: DEMO_DB, PORT: "3001", TS_NODE_TRANSPILE_ONLY: "1", CORS_ORIGIN: "http://localhost:5180,http://localhost:5174" },
  });
  c.unref();
}
function killServer() { try { execSync(`powershell -NoProfile -c "Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"`); } catch {} }
async function ensureAlive() {
  if (await alive()) return false;
  startServer();
  for (let i = 0; i < 60; i++) { await sleep(1000); if (await alive()) return true; }
  throw new Error("Server không khởi động lại được");
}
const serverRss = () => { try { return +execSync(`powershell -NoProfile -c "(Get-Process -Id (Get-NetTCPConnection -LocalPort 3001 -State Listen).OwningProcess).WorkingSet64/1MB"`).toString().trim().replace(",", "."); } catch { return NaN; } };

const sign = (u, role, o = {}) => jwt.sign({ userId: u.id, username: u.username, email: u.email, role, type: o.type || "access" }, o.secret || SECRET,
  { expiresIn: o.expiresIn || "2h", issuer: "contest-api", audience: "contest-app" });
const conn = (ns, tok, o = {}) => new Promise(res => {
  const s = io(BASE + ns, { extraHeaders: tok === null ? {} : { cookie: "accessToken=" + tok }, transports: o.transports || ["websocket"], reconnection: !!o.reconnection, forceNew: true, ...o.extra });
  s.on("connect", () => res({ s, ok: true })); s.on("connect_error", e => res({ s, ok: false, err: e.message }));
});
const ack = (s, ev, data, t = 2500) => new Promise(r => {
  const to = setTimeout(() => r({ timeout: true }), t);
  const cb = (...a) => { clearTimeout(to); r(a.length > 1 && a[0] == null ? a[1] : a[0]); };
  data === undefined ? s.emit(ev, cb) : s.emit(ev, data, cb);
});
const pct = (a, p) => { a = a.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; };

// ---- dữ liệu ----
sql("set @r=(select coalesce(max(registrationNumber),0) from contestant_matches where matchId=43); insert into contestant_matches (contestantId,matchId,groupId,registrationNumber,status,isActive,createdAt,updatedAt) select c.id,43,118+((c.id-1) mod 2),@r:=@r+1,'in_progress',1,now(),now() from contestants c where c.id not in (select contestantId from contestant_matches where matchId=43) order by c.id");
const rows = sql(`select u.id,u.username,u.email from contestant_matches cm join contestants c on c.id=cm.contestantId join students s on s.id=c.studentId join users u on u.id=s.userId where cm.matchId=${M} order by cm.registrationNumber`).split("\n").map(l => l.split("\t"));
const stu = rows.map(([id, username, email]) => ({ id: +id, username, email }));
const cidOf = u => +sql(`select c.id from contestants c join students s on s.id=c.studentId where s.userId=${u.id} limit 1`);
const adminRow = sql("select id,username,email from users where role='Admin' limit 1").split("\t");
const admin = { id: +adminRow[0], username: adminRow[1], email: adminRow[2] };
const noContRow = sql("select u.id,u.username,u.email from users u join students s on s.userId=u.id left join contestants c on c.studentId=s.id where c.id is null limit 1").split("\t");
const noCont = noContRow[0] ? { id: +noContRow[0], username: noContRow[1], email: noContRow[2] } : null;
const otherMatch = sql(`select id,slug from matches where id<>${M} limit 1`).split("\t");
for (const u of stu) { u.tok = sign(u, "Student"); sql(`update users set token='${u.tok}' where id=${u.id}`); }
admin.tok = sign(admin, "Admin"); sql(`update users set token='${admin.tok}' where id=${admin.id}`);
if (noCont) { noCont.tok = sign(noCont, "Student"); sql(`update users set token='${noCont.tok}' where id=${noCont.id}`); }

const results = [];
const rec = (id, name, pass, detail, sev = "") => { results.push({ id, name, pass, detail, sev }); console.log(`${pass ? "PASS" : "FAIL"} ${id} ${name} :: ${detail}`); };
const resetDb = () => {
  sql(`update matches set status='ongoing', currentQuestion=6, remainingTime=60 where id=${M}`);
  sql(`update screen_controls set controlKey='matchDiagram' where matchId=${M}`);
  sql(`update contestant_matches set status='in_progress', eliminatedAtQuestionOrder=null where matchId=${M}`);
  sql(`delete from results where match_id=${M} and questionOrder=6`);
};
const dbState = () => sql(`select concat_ws('|',(select currentQuestion from matches where id=${M}),(select remainingTime from matches where id=${M}),(select status from matches where id=${M}),(select controlKey from screen_controls where matchId=${M}),(select group_concat(status order by contestantId) from contestant_matches where matchId=${M}))`);

async function joinAll(socks) {
  await Promise.all(socks.map(async s => { await ack(s, "student:joinMatch", { matchSlug: SLUG }); await ack(s, "joinMatchRoom", M); }));
}
const closeAll = list => list.forEach(x => { try { (x.s || x).close(); } catch {} });

(async () => {
  resetDb();
  if (await ensureAlive()) console.log("(server đã được khởi động lại trước khi test)");

  // ================= A. XÁC THỰC =================
  let r;
  r = await conn("/student", null); rec("A1", "Kết nối không cookie", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  r = await conn("/student", "abc.def.ghi"); rec("A2", "Token rác", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  r = await conn("/student", sign(stu[0], "Student", { secret: "sai-khoa-bi-mat-xxxxxxxxxxxxxxxxxxxxxxxxxxxx" })); rec("A3", "Token ký sai khóa", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  r = await conn("/student", sign(stu[0], "Student", { expiresIn: "-10s" })); rec("A4", "Token đã hết hạn", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  r = await conn("/match-control", sign(admin, "Admin", { type: "refresh" })); rec("A5", "Dùng refresh token (type=refresh) để kết nối admin", !r.ok, r.ok ? "Server NHẬN refresh token như access token (không kiểm tra type)" : r.err, "Trung bình"); r.s.close();
  r = await conn("/student", sign({ id: 99999999, username: "ma", email: "ma@x.vn" }, "Student")); rec("A6", "Token của người dùng không tồn tại", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  sql(`update users set isActive=0 where id=${stu[3].id}`); r = await conn("/student", stu[3].tok); sql(`update users set isActive=1 where id=${stu[3].id}`);
  rec("A7", "Tài khoản bị khóa", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  if (noCont) { r = await conn("/student", noCont.tok); rec("A8", "Học sinh chưa là thí sinh", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close(); } else rec("A8", "Học sinh chưa là thí sinh", true, "bỏ qua: không có dữ liệu");
  r = await conn("/student", admin.tok); let dropped = false;
  if (r.ok) { r.s.on("disconnect", () => dropped = true); await sleep(1500); }
  rec("A9", "Admin kết nối vào namespace /student", !r.ok || dropped, r.ok ? (dropped ? "nối rồi bị server ngắt" : "VẪN Ở LẠI /student") : r.err); r.s.close();
  r = await conn("/khong-ton-tai", stu[0].tok); rec("A10", "Namespace không tồn tại", !r.ok, r.ok ? "VẪN NỐI ĐƯỢC" : r.err); r.s.close();
  r = await conn("/student", stu[0].tok, { transports: ["polling"] }); rec("A11", "Kết nối bằng long-polling (khi WebSocket bị chặn)", r.ok, r.ok ? "nối được" : r.err); r.s.close();
  r = await conn("/student", stu[0].tok, { transports: ["polling", "websocket"] }); await sleep(800); rec("A12", "Polling rồi nâng cấp lên WebSocket", r.ok && r.s.io.engine.transport.name === "websocket", r.ok ? "transport=" + r.s.io.engine.transport.name : r.err); r.s.close();

  // ================= B. PHÂN QUYỀN =================
  const before = dbState();
  r = await conn("/match-control", stu[0].tok); const acks = [];
  if (r.ok) {
    const attempts = [["screen:update", { match: SLUG, controlKey: "question" }], ["currentQuestion:get", { match: SLUG, questionOrder: 2 }], ["timer:play", { match: SLUG }],
      ["match:start", { matchId: SLUG }], ["match:end", { matchId: SLUG }], ["update:Eliminated", { match: SLUG, questionOrder: 6 }], ["update:Rescued", { match: SLUG }], ["showQrRescue", { match: SLUG }], ["update:award", {}]];
    for (const [ev, d] of attempts) { const a = await ack(r.s, ev, d, 900); if (!a.timeout) acks.push(ev); }
  }
  await sleep(500); const after = dbState();
  rec("B1", "Thí sinh gửi lệnh admin (đổi câu, bấm giờ, loại, kết thúc trận...) qua /match-control", r.ok && after === before && acks.length === 0,
    `${r.ok ? "nối được" : "không nối"}; lệnh được phản hồi: ${acks.length ? acks.join(",") : "không có"}; dữ liệu ${after === before ? "không đổi" : "BỊ ĐỔI: " + before + " -> " + after}`); r.s?.close(); resetDb();
  r = await conn("/match-control", stu[0].tok); const sub = r.ok ? await ack(r.s, "contestants:subscribe", { contestSlug: "x" }) : { timeout: true };
  rec("B2", "Thí sinh đăng ký nhận danh sách thí sinh của admin", r.ok && (sub.timeout || sub.success === false), JSON.stringify(sub).slice(0, 80)); r.s?.close();

  // confirmStart: thí sinh khác / bị cấm
  const A = await conn("/student", stu[4].tok); const Bc = cidOf(stu[5]);
  sql(`update contestant_matches set status='not_started' where matchId=${M} and contestantId=${Bc}`);
  A.s.emit("student:confirmStart", { contestantId: Bc, matchId: M }); await sleep(900);
  const bStatus = sql(`select status from contestant_matches where matchId=${M} and contestantId=${Bc}`);
  rec("B3", "Thí sinh A xác nhận bắt đầu THAY thí sinh B", bStatus !== "in_progress", `trạng thái của B sau đó: ${bStatus}`, "Cao"); A.s.close();
  const C = await conn("/student", stu[6].tok); const Cc = cidOf(stu[6]);
  sql(`update contestant_matches set status='banned' where matchId=${M} and contestantId=${Cc}`);
  C.s.emit("student:confirmStart", { contestantId: Cc, matchId: M }); await sleep(900);
  const cStatus = sql(`select status from contestant_matches where matchId=${M} and contestantId=${Cc}`);
  rec("B4", "Thí sinh đã bị cấm tự xác nhận bắt đầu để gỡ cấm", cStatus === "banned", `trạng thái sau đó: ${cStatus}`, "Cao"); C.s.close();
  resetDb();

  // rò rỉ câu hỏi
  sql(`update screen_controls set controlKey='matchDiagram' where matchId=${M}`);
  const L = await conn("/student", stu[7].tok); await ack(L.s, "student:joinMatch", { matchSlug: SLUG });
  const fut = await ack(L.s, "student:getQuestion", { matchId: M, questionOrder: 2 });
  const cur = await ack(L.s, "student:getQuestion", { matchId: M, questionOrder: 6 });
  rec("B5", "Thí sinh tự xin nội dung câu hỏi khi admin CHƯA chiếu", !(fut.success && fut.data?.text) && !(cur.success && cur.data?.text),
    `câu 2 (chưa tới): ${fut.success ? "TRẢ NỘI DUNG" : "từ chối"}; câu hiện tại 6 (chưa chiếu): ${cur.success ? "TRẢ NỘI DUNG" : "từ chối"}`, "Cao");
  await ack(L.s, "joinMatchRoom", +otherMatch[0]); const st = await ack(L.s, "student:getMatchStatus");
  rec("B6", "Thí sinh đổi sang xem trạng thái trận khác (joinMatchRoom id khác)", !(st.success && st.data?.matchData?.matchId === +otherMatch[0]), st.success ? `nhận dữ liệu trận ${st.data.matchData.matchId}` : "từ chối", "Thấp"); L.s.close();

  // ================= C. DỮ LIỆU SAI / SERVER CÓ SỐNG KHÔNG =================
  const S = await conn("/student", stu[8].tok); await ack(S.s, "student:joinMatch", { matchSlug: SLUG });
  const payloads = [undefined, null, 5, "x", [], {}, { matchSlug: {} }, { matchSlug: "a".repeat(200000) }];
  let noAck = 0; for (const p of payloads) { const a = await ack(S.s, "student:joinMatch", p, 1200); if (a.timeout) noAck++; }
  rec("C1", "student:joinMatch với 8 kiểu dữ liệu sai", await alive(), `server sống; ${noAck}/8 không có phản hồi`);
  const dead = [];
  for (const p of [undefined, null, 5, "x", {}, { contestantId: "x" }, []]) {
    S.s.emit("student:confirmStart", p); await sleep(700);
    if (!(await alive())) { dead.push(JSON.stringify(p) ?? "undefined"); await ensureAlive(); resetDb(); S.s.close(); const n = await conn("/student", stu[8].tok); Object.assign(S, n); }
  }
  rec("C2", "student:confirmStart với dữ liệu sai", dead.length === 0, dead.length ? `LÀM SẬP SERVER với dữ liệu: ${dead.join(" ; ")}` : "server sống", "Rất cao");
  const dead2 = [];
  for (const p of [undefined, null, 5, "x", {}, { matchId: "x" }, { matchId: 1e30, questionOrder: -1 }]) {
    S.s.emit("student:getQuestion", p); await sleep(500);
    if (!(await alive())) { dead2.push(JSON.stringify(p) ?? "undefined"); await ensureAlive(); resetDb(); S.s.close(); const n = await conn("/student", stu[8].tok); Object.assign(S, n); }
  }
  rec("C3", "student:getQuestion với dữ liệu sai", dead2.length === 0, dead2.length ? `SẬP SERVER: ${dead2.join(" ; ")}` : "server sống", "Rất cao");
  const dead3 = [];
  for (const p of [undefined, null, 5, "x", [], {}, { matchSlug: null }]) { S.s.emit("leaveMatchRoom", p); S.s.emit("joinMatchRoom", p); await sleep(300); if (!(await alive())) { dead3.push(JSON.stringify(p) ?? "undefined"); await ensureAlive(); resetDb(); S.s.close(); const n = await conn("/student", stu[8].tok); Object.assign(S, n); } }
  rec("C4", "joinMatchRoom/leaveMatchRoom với dữ liệu sai", dead3.length === 0, dead3.length ? `SẬP SERVER: ${dead3.join(" ; ")}` : "server sống", "Rất cao");
  // gói rất lớn
  let big = false; S.s.on("disconnect", () => big = true);
  S.s.emit("student:joinMatch", { matchSlug: "z".repeat(3 * 1024 * 1024) }); await sleep(2500);
  rec("C5", "Gói tin 3 MB", await alive(), `server ${await alive() ? "sống" : "CHẾT"}; client ${big ? "bị ngắt (đúng)" : "không bị ngắt"}`); S.s.close();
  // flood
  const F = await conn("/student", stu[9].tok), P = await conn("/student", stu[10].tok); await ack(P.s, "student:joinMatch", { matchSlug: SLUG });
  const tFlood = Date.now(); for (let i = 0; i < 3000; i++) F.s.emit("student:getMatchStatus", () => {});
  const lat = await ack(P.s, "student:getMatchStatus"); const latMs = Date.now() - tFlood;
  rec("C6", "Một máy gửi dồn 3000 yêu cầu getMatchStatus", await alive() && lat.success, `máy khác vẫn được phục vụ sau ${latMs} ms (bình thường ~50 ms)`, latMs > 3000 ? "Trung bình" : ""); F.s.close(); P.s.close();
  await sleep(1500);

  // admin: dữ liệu sai
  const AD = await conn("/match-control", admin.tok); const evs = ["screen:update", "currentQuestion:get", "timer:play", "timer:pause", "update:Eliminated", "update:Rescued", "statistics:update", "statisticsContestant:update", "showQrRescue", "showQrChart", "timerLeft:Rescue", "match:start", "match:showQuestion", "match:end", "match:getStatus", "update:winGold", "update:award"];
  const killers = [];
  for (const ev of evs) {
    for (const p of [undefined, null, 5, "x", [], {}, { match: null }]) { if (p === undefined) AD.s.emit(ev); else AD.s.emit(ev, p); }
    await sleep(500);
    if (!(await alive())) { killers.push(ev); await ensureAlive(); resetDb(); AD.s.close(); Object.assign(AD, await conn("/match-control", admin.tok)); }
  }
  rec("C7", `Admin gửi dữ liệu sai cho ${evs.length} sự kiện điều khiển`, killers.length === 0, killers.length ? `SẬP SERVER ở: ${killers.join(", ")}` : "server sống", "Rất cao");
  AD.s.close();

  // ================= D. PHÁT SỰ KIỆN / ĐỒNG HỒ VỚI 40 THÍ SINH =================
  resetDb(); await ensureAlive();
  const cs = await Promise.all(stu.map(u => conn("/student", u.tok))); const ss = cs.filter(c => c.ok).map(c => c.s);
  await joinAll(ss);
  const A2 = await conn("/match-control", admin.tok); await ack(A2.s, "joinMatchRoom", SLUG);
  const gotShown = new Map(), t0 = {}; ss.forEach((s, i) => s.on("match:questionShown", () => { if (!gotShown.has(i)) gotShown.set(i, Date.now() - t0.v); }));
  t0.v = Date.now(); await ack(A2.s, "screen:update", { match: SLUG, controlKey: "question" }); await sleep(1500);
  const lats = [...gotShown.values()];
  rec("D1", "Admin chiếu câu hỏi: 40 máy cùng nhận nội dung", gotShown.size === 40, `${gotShown.size}/40 máy; trễ trung vị ${pct(lats, 0.5)} ms, lớn nhất ${Math.max(...lats)} ms`);

  sql(`update matches set remainingTime=5 where id=${M}`);
  const ticks = ss.map(() => []), ended = ss.map(() => false); let tStart = Date.now();
  ss.forEach((s, i) => { s.on("timer:update", d => ticks[i].push(Date.now() - tStart)); s.on("timer:ended", () => ended[i] = true); });
  tStart = Date.now(); const tp = await ack(A2.s, "timer:play", { match: SLUG }); await sleep(8500);
  const nTicks = ticks.map(t => t.length); const gaps = ticks.flatMap(t => t.slice(1).map((v, k) => v - t[k]));
  rec("D2", "Đồng hồ 5 giây: mỗi máy nhận đủ nhịp đếm và tín hiệu hết giờ", nTicks.every(n => n >= 5) && ended.every(Boolean),
    `ack=${JSON.stringify(tp).slice(0, 50)}; nhịp/máy min ${Math.min(...nTicks)} max ${Math.max(...nTicks)}; hết giờ ${ended.filter(Boolean).length}/40; khoảng cách giữa nhịp ${pct(gaps, 0.05)}–${pct(gaps, 0.95)} ms`);

  // ================= E. RỚT MẠNG / TỰ NỐI LẠI =================
  closeAll(cs); await sleep(500);
  const U = stu[12]; const RC = await conn("/student", U.tok, { reconnection: true, extra: { reconnectionDelay: 300, reconnectionDelayMax: 1000 } });
  await ack(RC.s, "student:joinMatch", { matchSlug: SLUG }); let shownRC = 0; RC.s.on("match:questionShown", () => shownRC++);
  let tDrop = Date.now(), tBack = 0; RC.s.on("connect", () => { if (tDrop && !tBack && RC.s.recovered === undefined) {} });
  const reconnected = new Promise(res => RC.s.io.on("reconnect", () => { tBack = Date.now(); res(true); }));
  tDrop = Date.now(); RC.s.io.engine.transport.ws?.terminate?.() ?? RC.s.io.engine.close();
  const okBack = await Promise.race([reconnected, sleep(8000).then(() => false)]);
  rec("E1", "Mất mạng đột ngột (cắt TCP, không báo đóng): tự nối lại", okBack, okBack ? `nối lại sau ${tBack - tDrop} ms` : "không nối lại trong 8 giây");
  await sleep(300); await ack(A2.s, "screen:update", { match: SLUG, controlKey: "question" }); await sleep(700);
  rec("E2", "Sau khi tự nối lại, thí sinh CÓ nhận sự kiện của admin mà không cần vào lại phòng", shownRC > 0,
    shownRC > 0 ? "nhận được" : "KHÔNG nhận (mất phòng khi nối lại): app Flutter đã tự vào lại phòng nên không ảnh hưởng, nhưng client khác (web) quên vào lại sẽ bị mất sự kiện", "Thấp");
  await ack(RC.s, "student:joinMatch", { matchSlug: SLUG }); shownRC = 0; await ack(A2.s, "screen:update", { match: SLUG, controlKey: "question" }); await sleep(700);
  rec("E3", "Sau khi vào lại phòng, nhận đúng 1 lần (không bị nhận trùng do kết nối ma)", shownRC === 1, `nhận ${shownRC} lần`);
  RC.s.close();

  // ma trận mất kết nối: thông báo cho admin
  const adminGot = []; A2.s.on("student:disconnected", d => adminGot.push(d)); await ack(A2.s, "joinMatchRoom", M);
  const D = await conn("/student", stu[13].tok); await ack(D.s, "student:joinMatch", { matchSlug: SLUG }); await ack(D.s, "joinMatchRoom", M); D.s.close(); await sleep(1200);
  rec("E4", "Admin được báo khi một thí sinh mất kết nối", adminGot.length > 0, adminGot.length ? "có thông báo" : "KHÔNG: server gửi vào phòng sai namespace/tên phòng nên admin không bao giờ biết thí sinh rớt mạng", "Trung bình");
  A2.s.close();

  // ================= F. TẢI / RÒ RỈ =================
  const rss0 = serverRss(); let failed = 0; const t1 = Date.now();
  for (let cycle = 0; cycle < 8; cycle++) {
    const cc = await Promise.all(stu.map(u => conn("/student", u.tok))); failed += cc.filter(c => !c.ok).length;
    await Promise.all(cc.filter(c => c.ok).map(c => ack(c.s, "student:getMatchStatus"))); closeAll(cc); await sleep(150);
  }
  const rss1 = serverRss();
  rec("F1", "40 thí sinh vào/ra liên tục 8 vòng (320 kết nối)", failed === 0 && (isNaN(rss1) || rss1 - rss0 < 80), `${failed} lỗi kết nối; ${((Date.now() - t1) / 1000).toFixed(1)} s; bộ nhớ server ${rss0.toFixed(0)} -> ${rss1.toFixed(0)} MB`);

  // ================= G. SERVER RESTART GIỮA TRẬN =================
  resetDb();
  const live = stu.map(u => ({ u, st: { t: 0, n: 0 } }));
  const gs = await Promise.all(live.map(x => conn("/student", x.u.tok, { reconnection: true, extra: { reconnectionDelay: 500, reconnectionDelayMax: 2000 } })));
  gs.forEach((c, i) => { const x = live[i]; x.s = c.s; x.shown = 0; c.s.on("match:questionShown", () => x.shown++);
    c.s.io.on("reconnect", async () => { x.st.t = Date.now(); await ack(c.s, "student:joinMatch", { matchSlug: SLUG }); await ack(c.s, "joinMatchRoom", M); x.st.joined = Date.now(); }); });
  await joinAll(gs.map(c => c.s));
  killServer(); const tKill = Date.now(); await sleep(2500); startServer();
  let up = 0; for (let i = 0; i < 60; i++) { await sleep(1000); if (await alive()) { up = Date.now(); break; } }
  await sleep(9000);
  const back = live.filter(x => x.st.joined); const delays = back.map(x => x.st.joined - up);
  rec("G1", "Server restart giữa trận: 40 máy tự nối lại và vào lại phòng", back.length === 40, `${back.length}/40 máy; server lên sau ${((up - tKill) / 1000).toFixed(1)} s; máy cuối cùng vào lại phòng sau khi server lên ${back.length ? Math.max(...delays) : "-"} ms`);
  const A3 = await conn("/match-control", admin.tok); await ack(A3.s, "joinMatchRoom", SLUG); await ack(A3.s, "screen:update", { match: SLUG, controlKey: "question" }); await sleep(1500);
  const got = live.filter(x => x.shown > 0).length;
  rec("G2", "Sau restart, admin chiếu câu hỏi: 40 máy nhận được", got === 40, `${got}/40 máy nhận`); A3.s.close();
  closeAll(live.map(x => x.s));

  // dọn
  resetDb(); sql(`update matches set remainingTime=60 where id=${M}`);
  fs.writeFileSync(SP + "/qa_socket.out.json", JSON.stringify(results, null, 1));
  const f = results.filter(x => !x.pass);
  console.log(`\nTỔNG: ${results.length} ca, đạt ${results.length - f.length}, KHÔNG đạt ${f.length}`);
  process.exit(0);
})().catch(e => { console.error("LỖI SCRIPT", e); fs.writeFileSync(SP + "/qa_socket.out.json", JSON.stringify(results, null, 1)); process.exit(1); });
