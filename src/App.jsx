import { useState, useEffect, useRef, useCallback } from "react";

// ── QR Code generator (pure JS, no external lib) ──────────────────────────
// Minimal QR data-URL generator using a simple matrix approach via canvas
function generateQRDataURL(text, size = 200) {
  // We'll use the QR code via a public API rendered as image src
  // (In production, use qrcode.js library)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=1a3a5c&bgcolor=ffffff&qzone=2`;
}

// ── Sample Data ────────────────────────────────────────────────────────────
const CLASSES = ["수학반", "영어반", "과학반", "코딩반", "미술반"];

const initialStudents = [
  { id: "AS-2024-001", name: "김민준", grade: "3학년 1반", class: "수학반", parentPhone: "010-1234-5678", parentEmail: "parent1@email.com" },
  { id: "AS-2024-002", name: "이서연", grade: "3학년 2반", class: "영어반", parentPhone: "010-2345-6789", parentEmail: "parent2@email.com" },
  { id: "AS-2024-003", name: "박지호", grade: "4학년 1반", class: "수학반", parentPhone: "010-3456-7890", parentEmail: "parent3@email.com" },
  { id: "AS-2024-004", name: "최수아", grade: "4학년 3반", class: "코딩반", parentPhone: "010-4567-8901", parentEmail: "parent4@email.com" },
  { id: "AS-2024-005", name: "정태양", grade: "5학년 2반", class: "과학반", parentPhone: "010-5678-9012", parentEmail: "parent5@email.com" },
  { id: "AS-2024-006", name: "한나은", grade: "5학년 1반", class: "미술반", parentPhone: "010-6789-0123", parentEmail: "parent6@email.com" },
  { id: "AS-2024-007", name: "윤도현", grade: "6학년 2반", class: "영어반", parentPhone: "010-7890-1234", parentEmail: "parent7@email.com" },
  { id: "AS-2024-008", name: "임채원", grade: "6학년 1반", class: "코딩반", parentPhone: "010-8901-2345", parentEmail: "parent8@email.com" },
];

const today = new Date().toISOString().split("T")[0];

// ── Helpers ────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d = new Date()) {
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}
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
  const qrUrl = generateQRDataURL(qrData, 220);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 340, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#1a3a5c", fontWeight: 700, marginBottom: 4, textTransform: "uppercase" }}>방과후학교 출결 QR</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#0d1f3c", marginBottom: 2 }}>{student.name}</div>
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 20 }}>{student.grade} · {student.class}</div>
        <div style={{ background: "#f0f5fb", borderRadius: 16, padding: 16, display: "inline-block", marginBottom: 16 }}>
          <img src={qrUrl} alt="QR Code" width={200} height={200} style={{ display: "block", borderRadius: 8 }} />
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#3a5a7a", background: "#f0f5fb", borderRadius: 8, padding: "6px 14px", marginBottom: 20 }}>
          {student.id}
        </div>
        <button onClick={onClose} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          닫기
        </button>
      </div>
    </div>
  );
}

// ── QR Scanner Simulator ───────────────────────────────────────────────────
function QRScanner({ students, attendance, onScan, onClose }) {
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleScan() {
    const id = inputId.trim().toUpperCase();
    const student = students.find(s => s.id === id);
    if (!student) { setResult({ error: true, msg: "등록되지 않은 QR코드입니다." }); return; }
    const att = attendance[student.id];
    let type = "입실";
    if (att?.checkin && !att?.checkout) type = "퇴실";
    if (att?.checkin && att?.checkout) { setResult({ error: true, msg: "이미 퇴실 처리되었습니다." }); return; }
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
      <div style={{ background: "#0d1f3c", borderRadius: 24, padding: "40px 44px", maxWidth: 420, width: "92%", boxShadow: "0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>QR 코드 스캔</div>
          <div style={{ fontSize: 13, color: "#7a9abf", marginTop: 4 }}>{fmtDate()}</div>
        </div>
        {/* Simulated camera viewfinder */}
        <div style={{ position: "relative", background: "#000", borderRadius: 16, height: 180, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0d1f3c22 0%, #1a3a5c33 100%)" }} />
          {/* Corner markers */}
          {[["0%","0%","border-top","border-left"],["auto","0%","border-bottom","border-left"],["0%","auto","border-top","border-right"],["auto","auto","border-bottom","border-right"]].map(([t,l,bt,bl], i) => (
            <div key={i} style={{ position: "absolute", top: t === "auto" ? undefined : 16, bottom: t === "auto" ? 16 : undefined, left: l === "auto" ? undefined : 16, right: l === "auto" ? 16 : undefined, width: 28, height: 28, [bt]: "3px solid #4fc3f7", [bl]: "3px solid #4fc3f7", borderRadius: 3 }} />
          ))}
          {scanning ? (
            <div style={{ color: "#4fc3f7", fontWeight: 700, fontSize: 15 }}>스캔 중...</div>
          ) : (
            <div style={{ color: "#5a7a9a", fontSize: 13 }}>아래에 학생 ID를 입력하세요</div>
          )}
          {/* Scan line animation */}
          {scanning && <div style={{ position: "absolute", left: 16, right: 16, height: 2, background: "linear-gradient(90deg, transparent, #4fc3f7, transparent)", animation: "scan 0.6s ease-in-out", top: "50%" }} />}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input ref={inputRef} value={inputId} onChange={e => setInputId(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            placeholder="학생 ID 입력 (예: AS-2024-001)"
            style={{ flex: 1, background: "#1a3a5c", border: "1px solid #2a5a8c", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, fontFamily: "monospace", outline: "none" }} />
          <button onClick={handleScan} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            확인
          </button>
        </div>
        {/* Quick scan buttons */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#5a7a9a", marginBottom: 8, letterSpacing: 1 }}>빠른 선택 (데모용)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {students.slice(0, 6).map(s => (
              <button key={s.id} onClick={() => { setInputId(s.id); }}
                style={{ background: "#1a3a5c", color: "#a0c4e8", border: "1px solid #2a5a8c", borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {result && (
          <div style={{ background: result.error ? "#2d0f0f" : "#0f2d1a", border: `1px solid ${result.error ? "#8b2020" : "#1b5e20"}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
            {result.error ? (
              <div style={{ color: "#ef9a9a", fontWeight: 700 }}>⚠ {result.msg}</div>
            ) : (
              <div>
                <div style={{ color: "#a5d6a7", fontWeight: 800, fontSize: 15 }}>✓ {result.type} 처리 완료</div>
                <div style={{ color: "#81c784", fontSize: 13, marginTop: 4 }}>
                  {result.student.name} ({result.student.class}) · {now()}
                </div>
              </div>
            )}
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", background: "transparent", color: "#5a7a9a", border: "1px solid #2a5a8c", borderRadius: 10, padding: "11px", fontSize: 14, cursor: "pointer" }}>
          닫기
        </button>
      </div>
      <style>{`@keyframes scan { 0%{top:20%} 50%{top:80%} 100%{top:20%} }`}</style>
    </div>
  );
}

// ── Registration Form ──────────────────────────────────────────────────────
function RegistrationForm({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", grade: "", class: CLASSES[0], parentPhone: "", parentEmail: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleSubmit() {
    if (!form.name || !form.grade || !form.parentPhone) return alert("필수 항목을 입력해 주세요.");
    const id = `AS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`;
    onAdd({ ...form, id });
    onClose();
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #d0dce8", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#f8fafd", color: "#0d1f3c" };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#5a7a9a", letterSpacing: 0.5, display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "36px 40px", maxWidth: 440, width: "92%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0d1f3c", marginBottom: 24 }}>수강생 등록</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[["name","이름 *","text","예: 김민준"],["grade","학년·반 *","text","예: 3학년 1반"],["parentPhone","보호자 연락처 *","tel","010-0000-0000"],["parentEmail","보호자 이메일","email","parent@email.com"]].map(([k, lbl, type, ph]) => (
            <div key={k}>
              <label style={labelStyle}>{lbl}</label>
              <input type={type} placeholder={ph} value={form[k]} onChange={set(k)} style={inputStyle} />
            </div>
          ))}
          <div>
            <label style={labelStyle}>수강 과목 *</label>
            <select value={form.class} onChange={set("class")} style={{ ...inputStyle }}>
              {CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#f0f5fb", color: "#5a7a9a", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>취소</button>
          <button onClick={handleSubmit} style={{ flex: 2, background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>등록하기</button>
        </div>
      </div>
    </div>
  );
}

// ── Parent View ────────────────────────────────────────────────────────────
function ParentView({ students, attendance, onBack }) {
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState(null);
  const [searched, setSearched] = useState(false);

  function search() {
    const s = students.find(st => st.parentPhone.replace(/-/g, "") === phone.replace(/-/g, ""));
    setFound(s || null);
    setSearched(true);
  }

  const att = found ? attendance[found.id] : null;
  const status = !att ? "미확인" : att.checkout ? "퇴실" : att.checkin ? "입실" : "미확인";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px" }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "#1a3a5c", fontSize: 14, cursor: "pointer", marginBottom: 20, fontWeight: 700 }}>← 돌아가기</button>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 40px", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(26,58,92,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>👨‍👩‍👧</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#0d1f3c" }}>학부모 출결 조회</div>
          <div style={{ fontSize: 13, color: "#7a9abf", marginTop: 4 }}>{fmtDate()}</div>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && search()}
            placeholder="보호자 연락처 입력 (예: 010-1234-5678)"
            style={{ flex: 1, border: "1.5px solid #d0dce8", borderRadius: 10, padding: "12px 16px", fontSize: 14, outline: "none", background: "#f8fafd" }} />
          <button onClick={search} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}>조회</button>
        </div>
        {searched && !found && (
          <div style={{ textAlign: "center", color: "#c62828", padding: "20px", background: "#fce4ec", borderRadius: 12 }}>등록된 연락처를 찾을 수 없습니다.</div>
        )}
        {found && (
          <div style={{ background: "linear-gradient(135deg, #f0f7ff, #e8f4fd)", borderRadius: 16, padding: "24px", border: "1.5px solid #c5dff7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0d1f3c" }}>{found.name}</div>
                <div style={{ fontSize: 13, color: "#5a7a9a", marginTop: 2 }}>{found.grade} · {found.class}</div>
                <div style={{ fontSize: 11, color: "#8aaac8", fontFamily: "monospace", marginTop: 4 }}>{found.id}</div>
              </div>
              <Badge type={status} />
            </div>
            <div style={{ borderTop: "1px solid #c5dff7", paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center", background: "#fff", borderRadius: 12, padding: "14px 10px" }}>
                <div style={{ fontSize: 11, color: "#7a9abf", fontWeight: 700, marginBottom: 6 }}>입실 시간</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: att?.checkin ? "#2e7d32" : "#bdbdbd" }}>
                  {att?.checkin || "—"}
                </div>
              </div>
              <div style={{ textAlign: "center", background: "#fff", borderRadius: 12, padding: "14px 10px" }}>
                <div style={{ fontSize: 11, color: "#7a9abf", fontWeight: 700, marginBottom: 6 }}>퇴실 시간</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: att?.checkout ? "#1565c0" : "#bdbdbd" }}>
                  {att?.checkout || "—"}
                </div>
              </div>
            </div>
            {status === "입실" && (
              <div style={{ marginTop: 12, background: "#fff9c4", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f57f17", textAlign: "center" }}>
                📚 현재 수업 중입니다
              </div>
            )}
            {status === "퇴실" && (
              <div style={{ marginTop: 12, background: "#e8f5e9", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#2e7d32", textAlign: "center" }}>
                ✅ 수업이 정상 종료되었습니다
              </div>
            )}
          </div>
        )}
        {/* Demo hint */}
        <div style={{ marginTop: 20, fontSize: 12, color: "#aac0d8", textAlign: "center" }}>
          데모: 010-1234-5678 또는 010-2345-6789 입력
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("admin"); // admin | parent
  const [students, setStudents] = useState(initialStudents);
  const [attendance, setAttendance] = useState({});
  const [showQR, setShowQR] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [filterClass, setFilterClass] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("students"); // students | attendance

  function notify(msg, type = "success") {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  function handleScan(student, type) {
    setAttendance(prev => {
      const att = prev[student.id] || {};
      if (type === "입실") return { ...prev, [student.id]: { ...att, checkin: now() } };
      if (type === "퇴실") return { ...prev, [student.id]: { ...att, checkout: now() } };
      return prev;
    });
    notify(`${student.name} 학생 ${type} 처리 완료 (${now()})`, "success");
  }

  function addStudent(data) {
    setStudents(prev => [...prev, data]);
    notify(`${data.name} 학생이 등록되었습니다.`, "success");
  }

  const allClasses = ["전체", ...CLASSES];
  const filtered = students.filter(s =>
    (filterClass === "전체" || s.class === filterClass) &&
    (s.name.includes(searchQuery) || s.id.includes(searchQuery) || s.grade.includes(searchQuery))
  );

  const stats = {
    total: students.length,
    checkin: Object.values(attendance).filter(a => a.checkin && !a.checkout).length,
    checkout: Object.values(attendance).filter(a => a.checkout).length,
    absent: students.length - Object.values(attendance).filter(a => a.checkin).length,
  };

  if (view === "parent") return <ParentView students={students} attendance={attendance} onBack={() => setView("admin")} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f5fb", fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1a3a5c 100%)", padding: "0 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "#4fc3f7", borderRadius: 10, padding: "6px 10px", fontSize: 18 }}>🏫</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>방과후학교 출결관리</div>
              <div style={{ color: "#7ab3d4", fontSize: 11 }}>{fmtDate()}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setView("parent")} style={{ background: "rgba(255,255,255,0.1)", color: "#a0c8e8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              👨‍👩‍👧 학부모 조회
            </button>
            <button onClick={() => setShowScanner(true)} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "8px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              📷 QR 스캔
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            { label: "전체 수강생", value: stats.total, icon: "👥", color: "#1a3a5c", bg: "#e8f0fa" },
            { label: "수업 중 (입실)", value: stats.checkin, icon: "✅", color: "#2e7d32", bg: "#e8f5e9" },
            { label: "하교 완료 (퇴실)", value: stats.checkout, icon: "🏠", color: "#1565c0", bg: "#e3f2fd" },
            { label: "미확인", value: stats.absent, icon: "❓", color: "#b71c1c", bg: "#fce4ec" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 16, padding: "18px 20px", border: `1.5px solid ${s.color}22` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#5a7a9a", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e0eaf5", borderRadius: 12, padding: 4 }}>
          {[["students", "📋 수강생 명단"], ["attendance", "📊 출결 현황"]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", background: activeTab === key ? "#fff" : "transparent", color: activeTab === key ? "#0d1f3c" : "#7a9abf", boxShadow: activeTab === key ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="이름, 학번, 학년반 검색..."
            style={{ flex: 1, minWidth: 200, border: "1.5px solid #d0dce8", borderRadius: 10, padding: "10px 16px", fontSize: 14, outline: "none", background: "#fff" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {allClasses.map(c => (
              <button key={c} onClick={() => setFilterClass(c)} style={{ padding: "10px 14px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: filterClass === c ? "#1a3a5c" : "#fff", color: filterClass === c ? "#fff" : "#5a7a9a" }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setShowRegForm(true)} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer", whiteSpace: "nowrap" }}>
            + 수강생 등록
          </button>
        </div>

        {/* Student List */}
        {activeTab === "students" && (
          <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px rgba(26,58,92,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f0f5fb" }}>
                  {["고유번호", "이름", "학년·반", "수강 과목", "연락처", "출결 현황", "QR 코드", "빠른 처리"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#5a7a9a", letterSpacing: 0.5, borderBottom: "1.5px solid #e8f0fa" }}>{h}</th>
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
                        <button onClick={() => setShowQR(s)} style={{ background: "#e8f0fa", color: "#1a3a5c", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          QR 보기
                        </button>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {!att?.checkin && (
                            <button onClick={() => { handleScan(s, "입실"); }} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>입실↓</button>
                          )}
                          {att?.checkin && !att?.checkout && (
                            <button onClick={() => { handleScan(s, "퇴실"); }} style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>퇴실↑</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#aabcd4" }}>검색 결과가 없습니다.</div>
            )}
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
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    {[["입실", checkins, "#e8f5e9", "#2e7d32"], ["퇴실", checkouts, "#e3f2fd", "#1565c0"], ["미확인", classStudents.length - checkins, "#f5f5f5", "#757575"]].map(([label, cnt, bg, color]) => (
                      <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color }}>{cnt}</div>
                        <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 6, background: "#f0f5fb", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${classStudents.length ? (checkins / classStudents.length) * 100 : 0}%`, background: "linear-gradient(90deg, #4fc3f7, #2e7d32)", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ marginTop: 12 }}>
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: notification.type === "success" ? "#1b5e20" : "#b71c1c", color: "#fff", borderRadius: 12, padding: "14px 20px", fontSize: 14, fontWeight: 600, boxShadow: "0 8px 30px rgba(0,0,0,0.3)", zIndex: 2000, animation: "slideUp 0.3s ease" }}>
          {notification.msg}
        </div>
      )}

      {/* Modals */}
      {showQR && <QRModal student={showQR} onClose={() => setShowQR(null)} />}
      {showScanner && <QRScanner students={students} attendance={attendance} onScan={handleScan} onClose={() => setShowScanner(false)} />}
      {showRegForm && <RegistrationForm onAdd={addStudent} onClose={() => setShowRegForm(false)} />}

      <style>{`
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
