import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, setDoc, doc } from "firebase/firestore";

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

const CLASSES = ["수학반", "영어반", "과학반", "코딩반", "미술반"];

function generateQRUrl(text, size) {
  return "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(text) + "&color=1a3a5c&bgcolor=ffffff&qzone=2";
}

function generateId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return "AS-" + year + "-" + rand;
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

function Badge(props) {
  const type = props.type;
  const cfg = {
    입실: { bg: "#e8f5e9", color: "#2e7d32", label: "입실" },
    퇴실: { bg: "#e3f2fd", color: "#1565c0", label: "퇴실" },
    미확인: { bg: "#f5f5f5", color: "#757575", label: "미확인" }
  };
  const s = cfg[type] || cfg["미확인"];
  return (
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function QRModal(props) {
  const student = props.student;
  const onClose = props.onClose;
  const qrData = JSON.stringify({ id: student.id, name: student.name, classroom: student.classroom });
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 320, width: "90%", textAlign: "center" }} onClick={function(e) { e.stopPropagation(); }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#0d1f3c" }}>{student.name}</div>
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 16 }}>{student.grade} - {student.classroom}</div>
        <img src={generateQRUrl(qrData, 200)} alt="QR" width={200} height={200} />
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#3a5a7a", marginTop: 12, marginBottom: 16 }}>{student.id}</div>
        <button onClick={onClose} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 32px", cursor: "pointer" }}>닫기</button>
      </div>
    </div>
  );
}

function QRScanner(props) {
  const students = props.students;
  const attendance = props.attendance;
  const onScan = props.onScan;
  const onClose = props.onClose;
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState(null);

  function handleScan() {
    const id = inputId.trim().toUpperCase();
    const student = students.find(function(s) { return s.id === id; });
    if (!student) { setResult({ error: true, msg: "등록되지 않은 ID 입니다." }); return; }
    const att = attendance[student.id];
    if (att && att.checkout) { setResult({ error: true, msg: "이미 퇴실 처리되었습니다." }); return; }
    const type = (att && att.checkin) ? "퇴실" : "입실";
    onScan(student, type);
    setResult({ student: student, type: type });
    setInputId("");
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#0d1f3c", borderRadius: 24, padding: 36, maxWidth: 380, width: "92%" }}>
        <div style={{ textAlign: "center", marginBottom: 20, color: "#fff", fontWeight: 800, fontSize: 18 }}>QR 코드 스캔</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <input
            value={inputId}
            onChange={function(e) { setInputId(e.target.value.toUpperCase()); }}
            placeholder="학생 ID 입력"
            style={{ flex: 1, background: "#1a3a5c", border: "1px solid #2a5a8c", borderRadius: 10, padding: 12, color: "#fff" }}
          />
          <button onClick={handleScan} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "12px 18px", fontWeight: 800, cursor: "pointer" }}>확인</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#5a7a9a", marginBottom: 8 }}>빠른 선택</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {students.slice(0, 6).map(function(s) {
              return (
                <button
                  key={s.id}
                  onClick={function() { setInputId(s.id); }}
                  style={{ background: "#1a3a5c", color: "#a0c4e8", border: "1px solid #2a5a8c", borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer" }}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
        {result ? (
          <div style={{ background: result.error ? "#2d0f0f" : "#0f2d1a", borderRadius: 12, padding: 14, marginBottom: 16, color: result.error ? "#ef9a9a" : "#a5d6a7" }}>
            {result.error ? result.msg : (result.student.name + " " + result.type + " 완료")}
          </div>
        ) : null}
        <button onClick={onClose} style={{ width: "100%", background: "transparent", color: "#5a7a9a", border: "1px solid #2a5a8c", borderRadius: 10, padding: 11, cursor: "pointer" }}>닫기</button>
      </div>
    </div>
  );
}

function RegistrationForm(props) {
  const onAdd = props.onAdd;
  const onClose = props.onClose;
  const [form, setForm] = useState({ name: "", grade: "", classroom: CLASSES[0], parentPhone: "", parentEmail: "" });
  const [loading, setLoading] = useState(false);

  function setField(key) {
    return function(e) {
      const v = e.target.value;
      setForm(function(f) {
        const copy = Object.assign({}, f);
        copy[key] = v;
        return copy;
      });
    };
  }

  function handleSubmit() {
    if (!form.name || !form.grade || !form.parentPhone) { alert("필수 항목을 입력해 주세요."); return; }
    setLoading(true);
    const id = generateId();
    const data = Object.assign({}, form, { id: id });
    onAdd(data).then(function() {
      setLoading(false);
      onClose();
    });
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #d0dce8", borderRadius: 10, padding: "10px 14px", fontSize: 14 };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#5a7a9a", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 400, width: "92%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>수강생 등록</div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>이름 *</label>
          <input style={inputStyle} value={form.name} onChange={setField("name")} placeholder="예: 김민준" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>학년반 *</label>
          <input style={inputStyle} value={form.grade} onChange={setField("grade")} placeholder="예: 3학년 1반" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>보호자 연락처 *</label>
          <input style={inputStyle} value={form.parentPhone} onChange={setField("parentPhone")} placeholder="010-0000-0000" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>보호자 이메일</label>
          <input style={inputStyle} value={form.parentEmail} onChange={setField("parentEmail")} placeholder="parent@email.com" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>수강 과목 *</label>
          <select style={inputStyle} value={form.classroom} onChange={setField("classroom")}>
            {CLASSES.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#f0f5fb", color: "#5a7a9a", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>취소</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>
            {loading ? "저장 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ParentView(props) {
  const students = props.students;
  const attendance = props.attendance;
  const onBack = props.onBack;
  const [phone, setPhone] = useState("");
  const [found, setFound] = useState(null);
  const [searched, setSearched] = useState(false);

  function search() {
    const clean = phone.replace(/-/g, "");
    const s = students.find(function(st) { return st.parentPhone.replace(/-/g, "") === clean; });
    setFound(s || null);
    setSearched(t
