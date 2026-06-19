import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

// ── Firebase 설정 ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyDdhs01usjOPXu5F0GW6XFwYDoDJ9uirJ4",
  authDomain: "afterschool-qrcode.firebaseapp.com",
  projectId: "afterschool-qrcode",
  storageBucket: "afterschool-qrcode.firebasestorage.app",
  messagingSenderId: "10514487470",
  appId: "1:10514487470:web:6355e713fbdda56bc0353f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── 상수 ──────────────────────────────────────────────────────────────────
const CLASSES = ["수학반", "영어반", "과학반", "코딩반", "미술반"];

function generateQRUrl(text, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=1a3a5c&bgcolor=ffffff&qzone=2`;
}

function generateId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `AS-${year}-${rand}`;
}

function nowTime() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate() {
  return new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

// ── Badge ──────────────────────────────────────────────────────────────────
function Badge({ type }) {
  const cfg = {
    입실: { bg: "#e8f5e9", color: "#2e7d32", label: "✓ 입실" },
    퇴실: { bg: "#e3f2fd", color: "#1565c0", label: "✓ 퇴실" },
    결석: { bg: "#fce4ec", color: "#c62828", label: "✗ 결석" },
    미확인: { bg: "#f5f5f5", color: "#757575", label: "— 미확인" },
  };
  const s = cfg[type] || cfg["미확인"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ── QR Modal ───────────────────────────────────────────────────────────────
function QRModal({ student, onClose }) {
  const qrData = JSON.stringify({ id: student.id, name: student.name, class: student.class });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 340, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#1a3a5c", fontWeight: 700, marginBottom: 4 }}>방과후학교 출결 QR</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0d1f3c", marginBottom: 2 }}>{student.name}</div>
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 20 }}>{student.grade} · {student.class}</div>
        <div style={{ background: "#f0f5fb", borderRadius: 16, padding: 16, display: "inline-block", marginBottom: 16 }}>
          <img src={generateQRUrl(qrData, 200)} alt="QR" width={200} height={200} style={{ display: "block", borderRadius: 8 }} />
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#3a5a7a", background: "#f0f5fb", borderRadius: 8, padding: "6px 14px", marginBottom: 20 }}>
          {student.id}
        </div>
        <button onClick={onClose} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>닫기</button>
      </div>
    </div>
  );
}

// ── QR Scanner ────────────────────────────────────────────────────────────
function QRScanner({ students, attendance, onScan, onClose }) {
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  function handleScan() {
    const id = inputId.trim().toUpperCase();
    const student = students.find(s => s.id === id);
    if (!student) { setResult({ error: true, msg: "등록되지 않은 QR코드입니다." }); return; }
    const att = attendance[student.id];
    if (att?.checkout) { setResult({ error: true, msg: "이미 퇴실 처리되었습니다." }); return; }
    const type = att?.checkin ? "퇴실" : "입실";
    setScanning(true);
    setTimeout(() => {
      onScan(student, type);
      setResult({ student, type });
      setInputId("");
      setScanning(false);
    }, 600);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#0d1f3c", borderRadius: 24, padding: "40px 44px", maxWidth: 420, width: "92%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>QR 코드 스캔</div>
          <div style={{ fontSize: 13, color: "#7a9abf", marginTop: 4 }}>{fmtDate()}</div>
        </div>
        <div style={{ position: "relative", background: "#000", borderRadius: 16, height: 160, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
          {[["0%","0%","border-top","border-left"],["auto","0%","border-bottom","border-left"],["0%","auto","border-top","border-right"],["auto","auto","border-bottom","border-right"]].map(([t,l,bt,bl], i) => (
            <div key={i} style={{ position: "absolute", top: t==="auto"?undefined:16, bottom: t==="auto"?16:undefined, left: l==="auto"?undefined:16, right: l==="auto"?16:undefined, width: 28, height: 28, [bt]: "3px solid #4fc3f7", [bl]: "3px solid #4fc3f7", borderRadius: 3 }} />
          ))}
          <div style={{ color: scanning ? "#4fc3f7" : "#5a7a9a", fontSize: 13, fontWeight: scanning ? 700 : 400 }}>
            {scanning ? "스캔 중..." : "아래에 학생 ID를 입력하세요"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input value={inputId} onChange={e => setInputId(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleScan()}
            placeholder="학생 ID (예: AS-2024-001)"
            style={{ flex: 1, background: "#1a3a5c", border: "1px solid #2a5a8c", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
          <button onClick={handleScan} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, cursor: "pointer" }}>확인</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#5a7a9a", marginBottom: 8 }}>빠른 선택</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {students.slice(0, 6).map(s => (
              <button key={s.id} onClick={() => setInputId(s.id)}
< truncated lines 129-370 >
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="이름, 학번, 학년반 검색..."
                style={{ flex: 1, minWidth: 200, border: "1.5px solid #d0dce8", borderRadius: 10, padding: "10px 16px", fontSize: 14, outline: "none", background: "#fff" }} />
              <div style={{ display: "flex", gap: 6 }}>
                {allClasses.map(c => (
                  <button key={c} onClick={() => setFilterClass(c)} style={{ padding: "10px 14px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filterClass === c ? "#1a3a5c" : "#fff", color: filterClass === c ? "#fff" : "#5a7a9a" }}>
                    {c}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowRegForm(true)} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                + 수강생 등록
              </button>
            </div>

            {/* Student List */}
            {activeTab === "students" && (
              <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(26,58,92,0.08)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f0f5fb" }}>
                      {["고유번호","이름","학년·반","수강 과목","연락처","출결 현황","QR 코드","빠른 처리"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#5a7a9a", borderBottom: "1.5px solid #e8f0fa" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const att = attendance[s.id];
                      const status = !att ? "미확인" : att.checkout ? "퇴실" : att.checkin ? "입실" : "미확인";
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f0f5fb", background: i % 2 === 0 ? "#fff" : "#fafcff" }}>
                          <td style={{ padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: "#3a5a7a" }}>{s.id}</td>
                          <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0d1f3c", fontSize: 15 }}>{s.name}</td>
                          <td style={{ padding: "14px 16px", fontSize: 13, color: "#5a7a9a" }}>{s.grade}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ background: "#e8f0fa", color: "#1a3a5c", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{s.class}</span>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: "#7a9abf" }}>{s.parentPhone}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <Badge type={status} />
                              {att?.checkin && <span style={{ fontSize: 11, color: "#7a9abf" }}>입실 {att.checkin}{att.checkout && ` · 퇴실 ${att.checkout}`}</span>}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <button onClick={() => setShowQR(s)} style={{ background: "#e8f0fa", color: "#1a3a5c", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>QR 보기</button>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 5 }}>
                              {!att?.checkin && <button onClick={() => handleScan(s, "입실")} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>입실↓</button>}
                              {att?.checkin && !att?.checkout && <button onClick={() => handleScan(s, "퇴실")} style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>퇴실↑</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aabcd4" }}>등록된 수강생이 없습니다.</div>}
              </div>
            )}

            {/* Attendance Summary */}
            {activeTab === "attendance" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {CLASSES.map(cls => {
                  const classStudents = students.filter(s => s.class === cls);
                  const checkins = classStudents.filter(s => attendance[s.id]?.checkin).length;
                  const checkouts = classStudents.filter(s => attendance[s.id]?.checkout).length;
                  return (
                    <div key={cls} style={{ background: "#fff", borderRadius: 16, padding: "22px 24px", boxShadow: "0 2px 16px rgba(26,58,92,0.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0d1f3c" }}>{cls}</div>
                        <div style={{ fontSize: 12, color: "#7a9abf" }}>총 {classStudents.length}명</div>
                      </div>
                      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                        {[["입실", checkins, "#e8f5e9", "#2e7d32"],["퇴실", checkouts, "#e3f2fd", "#1565c0"],["미확인", classStudents.length - checkins, "#f5f5f5", "#757575"]].map(([label, cnt, bg, color]) => (
                          <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color }}>{cnt}</div>
                            <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ height: 6, background: "#f0f5fb", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{ height: "100%", width: `${classStudents.length ? (checkins / classStudents.length) * 100 : 0}%`, background: "linear-gradient(90deg, #4fc3f7, #2e7d32)", borderRadius: 3 }} />
                      </div>
                      {classStudents.map(s => {
                        const att = attendance[s.id];
                        const status = !att ? "미확인" : att.checkout ? "퇴실" : att.checkin ? "입실" : "미확인";
                        return (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f0f5fb" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#0d1f3c" }}>{s.name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {att?.checkin && <span style={{ fontSize: 11, color: "#7a9abf" }}>{att.checkin}</span>}
                              <Badge type={status} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {notification && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "success" ? "#1b5e20" : "#b71c1c", color: "#fff", borderRadius: 12, padding: "14px 20px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", zIndex: 2000 }}>
          {notification.msg}
        </div>
      )}

      {showQR && <QRModal student={showQR} onClose={() => setShowQR(null)} />}
      {showScanner && <QRScanner students={students} attendance={attendance} onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {showRegForm && <RegistrationForm onAdd={addStudent} onClose={() => setShowRegForm(false)} />}

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}
