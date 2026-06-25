import { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, setDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

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

const CLASSES = [
  "글로벌 문화탐험대 A반",
  "글로벌 문화탐험대 B반",
  "디지털 웹툰 스튜디오",
  "K-POP 댄스",
  "스토리한국사탐험대 A반",
  "스토리한국사탐험대 B반",
  "글로벌중국어",
  "영어뮤지컬",
  "잉글리시 톡톡 A반",
  "잉글리시 톡톡 B반",
  "사이언스 탐구랩 A반",
  "사이언스 탐구랩 B반",
  "잉글리시 스피치&디베이트 클럽 A반",
  "잉글리시 스피치&디베이트 클럽 B반",
  "글로벌일본어",
  "AI키성장바른자세",
  "잉글리시 플레이존 A반",
  "잉글리시 플레이존 B반",
  "스마트레고",
  "아카펠라합창"
];

function generateQRUrl(text, size) {
  return "https://api.qrserver.com/v1/create-qr-code/?size=" + size + "x" + size + "&data=" + encodeURIComponent(text) + "&color=1a3a5c&bgcolor=ffffff&qzone=2";
}

function generateId() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0");
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

function dateToWeekday(dateStr) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return days[d.getDay()];
}

function loadJsQR() {
  return new Promise(function(resolve, reject) {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js";
    script.onload = function() { resolve(window.jsQR); };
    script.onerror = function() { reject(new Error("jsQR 로드 실패")); };
    document.head.appendChild(script);
  });
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
    <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
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
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 16 }}>{student.school} {student.grade} - {student.classroom}</div>
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
  const [form, setForm] = useState({ name: "", school: "", gradeNum: "1", classroom: CLASSES[0], parentPhone: "", parentEmail: "" });
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
    if (!form.name || !form.school || !form.parentPhone) { alert("필수 항목을 입력해 주세요."); return; }
    setLoading(true);
    const id = generateId();
    const data = {
      name: form.name,
      school: form.school,
      grade: form.gradeNum + "학년",
      classroom: form.classroom,
      parentPhone: form.parentPhone,
      parentEmail: form.parentEmail,
      id: id
    };
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
          <label style={labelStyle}>학교명 *</label>
          <input style={inputStyle} value={form.school} onChange={setField("school")} placeholder="예: 예원초등학교" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>학년 *</label>
          <select style={inputStyle} value={form.gradeNum} onChange={setField("gradeNum")}>
            {["1","2","3","4","5","6"].map(function(g) { return <option key={g} value={g}>{g}학년</option>; })}
          </select>
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
          <label style={labelStyle}>프로그램명 *</label>
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

// ── 엑셀 일괄 업로드 모달 ───────────────────────────────────────────────────
function UnlockModal(props) {
  const date = props.date;
  const lockInfo = props.lockInfo;
  const onUnlock = props.onUnlock;
  const onClose = props.onClose;
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit() {
    setLoading(true);
    setError("");
    onUnlock(pw).then(function() {
      setLoading(false);
      onClose();
    }).catch(function(e) {
      setLoading(false);
      setError(e.message || "잠금해제에 실패했습니다.");
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 360, width: "92%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🔐</div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{date} 출결 확정됨</div>
        <div style={{ fontSize: 12, color: "#8aaac8", marginBottom: 20 }}>
          {lockInfo ? ("확정 시각: " + lockInfo.lockedAt) : ""}
        </div>
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 16 }}>
          이 날짜의 출결을 다시 수정하려면<br />최종관리자 비밀번호가 필요합니다.
        </div>
        <input
          type="password"
          value={pw}
          onChange={function(e) { setPw(e.target.value); setError(""); }}
          onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(); }}
          placeholder="최종관리자 비밀번호"
          style={{ width: "100%", boxSizing: "border-box", border: error ? "1.5px solid #e53935" : "1px solid #d0dce8", borderRadius: 10, padding: 12, fontSize: 14, textAlign: "center", marginBottom: 10, outline: "none" }}
          autoFocus
        />
        {error ? <div style={{ color: "#e53935", fontSize: 12, marginBottom: 12 }}>{error}</div> : null}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#f0f5fb", color: "#5a7a9a", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>닫기</button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 2, background: "#c62828", color: "#fff", border: "none", borderRadius: 10, padding: 12, cursor: "pointer", fontWeight: 700 }}>
            {loading ? "확인 중..." : "잠금 해제"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditStudentModal(props) {
  const student = props.student;
  const onSave = props.onSave;
  const onClose = props.onClose;
  const [form, setForm] = useState({
    name: student.name || "",
    school: student.school || "",
    gradeNum: (student.grade || "1학년").replace("학년", "") || "1",
    classroom: student.classroom || CLASSES[0],
    parentPhone: student.parentPhone || "",
    parentEmail: student.parentEmail || ""
  });
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

  function handleSave() {
    if (!form.name || !form.school || !form.parentPhone) { alert("필수 항목을 입력해 주세요."); return; }
    setLoading(true);
    const data = {
      name: form.name,
      school: form.school,
      grade: form.gradeNum + "학년",
      classroom: form.classroom,
      parentPhone: form.parentPhone,
      parentEmail: form.parentEmail
    };
    onSave(student.docId, data).then(function() {
      setLoading(false);
      onClose();
    });
  }

  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #d0dce8", borderRadius: 10, padding: "10px 14px", fontSize: 14 };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#5a7a9a", display: "block", marginBottom: 5 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 400, width: "92%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>수강생 정보 수정</div>
        <div style={{ fontSize: 12, color: "#aabcd4", fontFamily: "monospace", marginBottom: 20 }}>{student.id}</div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>이름 *</label>
          <input style={inputStyle} value={form.name} onChange={setField("name")} placeholder="예: 김민준" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>학교명 *</label>
          <input style={inputStyle} value={form.school} onChange={setField("school")} placeholder="예: 예원초등학교" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>학년 *</label>
          <select style={inputStyle} value={form.gradeNum} onChange={setField("gradeNum")}>
            {["1","2","3","4","5","6"].map(function(g) { return <option key={g} value={g}>{g}학년</option>; })}
          </select>
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
          <label style={labelStyle}>프로그램명 *</label>
          <select style={inputStyle} value={form.classroom} onChange={setField("classroom")}>
            {CLASSES.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#f0f5fb", color: "#5a7a9a", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>취소</button>
          <button onClick={handleSave} disabled={loading} style={{ flex: 2, background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>
            {loading ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExcelUploadModal(props) {
  const onAddMany = props.onAddMany;
  const onClose = props.onClose;
  const fileRef = useRef();
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  function downloadTemplate() {
    const sample = [
      { 이름: "김민준", 학교명: "예원초등학교", 학년: "3", 프로그램명: CLASSES[0], 보호자연락처: "010-1234-5678", 보호자이메일: "parent@email.com" },
      { 이름: "이서연", 학교명: "예원초등학교", 학년: "3", 프로그램명: CLASSES[1], 보호자연락처: "010-2345-6789", 보호자이메일: "" }
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws["!cols"] = [{ wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 30 }, { wch: 16 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "수강생목록");
    XLSX.writeFile(wb, "수강생_등록_양식.xlsx");
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);
    const reader = new FileReader();
    reader.onload = function(evt) {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const parsed = [];
      const errs = [];
      json.forEach(function(row, idx) {
        const name = String(row["이름"] || "").trim();
        const school = String(row["학교명"] || "").trim();
        const gradeRaw = String(row["학년"] || "").trim();
        const grade = gradeRaw ? (gradeRaw.replace("학년", "") + "학년") : "";
        const classroom = String(row["프로그램명"] || "").trim();
        const parentPhone = String(row["보호자연락처"] || "").trim();
        const parentEmail = String(row["보호자이메일"] || "").trim();
        const lineNum = idx + 2;

        if (!name || !school || !parentPhone) {
          errs.push("줄 " + lineNum + ": 이름/학교명/보호자연락처는 필수입니다.");
          return;
        }
        if (classroom && CLASSES.indexOf(classroom) === -1) {
          errs.push("줄 " + lineNum + ": '" + classroom + "' 은 등록된 프로그램명이 아닙니다.");
          return;
        }
        parsed.push({
          name: name,
          school: school,
          grade: grade || "1학년",
          classroom: classroom || CLASSES[0],
          parentPhone: parentPhone,
          parentEmail: parentEmail,
          id: generateId()
        });
      });
      setRows(parsed);
      setErrors(errs);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleUpload() {
    if (rows.length === 0) return;
    setUploading(true);
    onAddMany(rows).then(function() {
      setUploading(false);
      setDone(true);
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,20,40,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 36, maxWidth: 520, width: "92%", maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>엑셀로 수강생 일괄 등록</div>
        <div style={{ fontSize: 13, color: "#5a7a9a", marginBottom: 20 }}>
          이름, 학교명, 학년, 프로그램명, 보호자연락처, 보호자이메일 열을 가진 엑셀 파일을 업로드하세요.
        </div>

        <button onClick={downloadTemplate} style={{ background: "#e8f0fa", color: "#1a3a5c", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
          📥 등록 양식 다운로드
        </button>

        <div
          onClick={function() { fileRef.current.click(); }}
          style={{ border: "2px dashed #c5dff7", borderRadius: 14, padding: "28px 16px", textAlign: "center", cursor: "pointer", marginBottom: 16, background: "#f8fafd" }}
        >
          <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
          <div style={{ fontSize: 13, color: "#5a7a9a", fontWeight: 600 }}>{fileName || "클릭해서 엑셀 파일 선택 (.xlsx, .csv)"}</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </div>

        {errors.length > 0 ? (
          <div style={{ background: "#fce4ec", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#c62828", marginBottom: 6, fontSize: 13 }}>⚠ 오류 {errors.length}건 (해당 행은 제외됩니다)</div>
            {errors.map(function(e, i) {
              return <div key={i} style={{ fontSize: 12, color: "#c62828" }}>{e}</div>;
            })}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div style={{ background: "#e8f5e9", borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: "#2e7d32", marginBottom: 8, fontSize: 13 }}>✓ 등록 가능한 학생 {rows.length}명</div>
            <div style={{ maxHeight: 160, overflowY: "auto" }}>
              {rows.map(function(r, i) {
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#2e7d32", padding: "3px 0" }}>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                    <span>{r.school} {r.grade} · {r.classroom}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {done ? (
          <div style={{ background: "#e3f2fd", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center", color: "#1565c0", fontWeight: 700 }}>
            🎉 {rows.length}명 등록 완료!
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#f0f5fb", color: "#5a7a9a", border: "none", borderRadius: 10, padding: 12, cursor: "pointer" }}>
            {done ? "닫기" : "취소"}
          </button>
          {!done ? (
            <button onClick={handleUpload} disabled={rows.length === 0 || uploading} style={{ flex: 2, background: rows.length === 0 ? "#c5d3e0" : "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: 12, cursor: rows.length === 0 ? "default" : "pointer" }}>
              {uploading ? "등록 중..." : "전체 등록하기 (" + rows.length + "명)"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const ADMIN_PASSWORD = "yodkc123!";
const SUPER_PASSWORD = "ywodc123!";

function AdminLogin(props) {
  const onLogin = props.onLogin;
  const onGoParent = props.onGoParent;
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem("isAdmin", "true");
      onLogin();
    } else {
      setError(true);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0d1f3c, #1a3a5c)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: 40, maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0d1f3c", marginBottom: 4 }}>관리자 로그인</div>
        <div style={{ fontSize: 13, color: "#7a9abf", marginBottom: 24 }}>예원초 온동네 돌봄•교육센터</div>
        <input
          type="password"
          value={pw}
          onChange={function(e) { setPw(e.target.value); setError(false); }}
          onKeyDown={function(e) { if (e.key === "Enter") handleSubmit(); }}
          placeholder="비밀번호 입력"
          style={{ width: "100%", boxSizing: "border-box", border: error ? "1.5px solid #e53935" : "1.5px solid #d0dce8", borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 12, textAlign: "center", outline: "none" }}
          autoFocus
        />
        {error ? <div style={{ color: "#e53935", fontSize: 13, marginBottom: 12 }}>비밀번호가 올바르지 않습니다.</div> : null}
        <button onClick={handleSubmit} style={{ width: "100%", background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
          로그인
        </button>
        <button onClick={onGoParent} style={{ background: "none", border: "none", color: "#7a9abf", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
          학부모이신가요? 출결 조회로 이동
        </button>
      </div>
    </div>
  );
}

function KioskScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const lastScanRef = useRef({ id: "", time: 0 });
  const rafRef = useRef(null);

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [isLocked, setIsLocked] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [result, setResult] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(function() {
    const unsubStudents = onSnapshot(collection(db, "students"), function(snap) {
      const list = snap.docs.map(function(d) {
        return Object.assign({}, d.data(), { docId: d.id });
      });
      setStudents(list);
    });
    const unsubAtt = onSnapshot(collection(db, "attendance_" + todayKey()), function(snap) {
      const att = {};
      snap.docs.forEach(function(d) { att[d.id] = d.data(); });
      setAttendance(att);
    });
    const unsubLock = onSnapshot(doc(db, "daylocks", todayKey()), function(snap) {
      setIsLocked(snap.exists());
    });
    return function() {
      unsubStudents();
      unsubAtt();
      unsubLock();
    };
  }, []);

  useEffect(function() {
    let active = true;
    loadJsQR().then(function() {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    }).then(function(stream) {
      if (!active) { stream.getTracks().forEach(function(t) { t.stop(); }); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setReady(true);
      tick();
    }).catch(function(err) {
      setCameraError("카메라를 시작할 수 없습니다: " + err.message);
    });

    function tick() {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR ? window.jsQR(imageData.data, imageData.width, imageData.height) : null;
        if (code && code.data) {
          handleDetected(code.data);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    return function() {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(function(t) { t.stop(); });
    };
  }, []);

  function handleDetected(raw) {
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    const id = parsed && parsed.id ? parsed.id : raw;

    const now = Date.now();
    if (lastScanRef.current.id === id && (now - lastScanRef.current.time) < 4000) {
      return;
    }
    lastScanRef.current = { id: id, time: now };

    processCheckIn(id);
  }

  function processCheckIn(id) {
    const student = students.find(function(s) { return s.id === id; });
    if (!student) {
      setResult({ error: true, msg: "등록되지 않은 QR입니다.", time: Date.now() });
      return;
    }
    if (isLocked) {
      setResult({ error: true, msg: "오늘 출결은 이미 확정되어 처리할 수 없습니다.", time: Date.now() });
      return;
    }
    const att = attendance[student.id] || {};
    if (att.checkin && att.checkout) {
      setResult({ error: true, msg: student.name + " 학생은 이미 퇴실 처리되었습니다.", time: Date.now() });
      return;
    }
    const type = att.checkin ? "퇴실" : "입실";
    const ref = doc(db, "attendance_" + todayKey(), student.id);
    const payload = type === "입실"
      ? Object.assign({}, att, { checkin: nowTime(), studentName: student.name, classroom: student.classroom })
      : Object.assign({}, att, { checkout: nowTime() });
    setDoc(ref, payload, { merge: true });
    setResult({ error: false, student: student, type: type, time: Date.now() });
  }

  useEffect(function() {
    if (!result) return;
    const t = setTimeout(function() { setResult(null); }, 2500);
    return function() { clearTimeout(t); };
  }, [result]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1f3c", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ color: "#7ab3d4", fontSize: 14, marginBottom: 6 }}>{fmtDate()}</div>
      <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>출결 QR 스캔</div>

      <div style={{ position: "relative", width: "100%", maxWidth: 480, aspectRatio: "1 / 1", background: "#000", borderRadius: 24, overflow: "hidden" }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div style={{ position: "absolute", inset: 24, border: "3px solid rgba(79,195,247,0.6)", borderRadius: 20, pointerEvents: "none" }} />

        {!ready && !cameraError ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#7ab3d4", fontSize: 14 }}>
            카메라 준비 중...
          </div>
        ) : null}

        {cameraError ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef9a9a", fontSize: 13, textAlign: "center", padding: 20 }}>
            {cameraError}
          </div>
        ) : null}

        {result ? (
          <div style={{ position: "absolute", inset: 0, background: result.error ? "rgba(80,10,10,0.92)" : "rgba(10,60,20,0.92)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{result.error ? "⚠️" : "✅"}</div>
            {result.error ? (
              <div style={{ color: "#ef9a9a", fontSize: 16, fontWeight: 700 }}>{result.msg}</div>
            ) : (
              <div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 800 }}>{result.student.name}</div>
                <div style={{ color: "#a5d6a7", fontSize: 15, marginTop: 6 }}>{result.type} 처리 완료 ({nowTime()})</div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {isLocked ? (
        <div style={{ marginTop: 20, background: "#fce4ec", color: "#c62828", borderRadius: 12, padding: "10px 20px", fontSize: 13, fontWeight: 700 }}>
          🔒 오늘 출결이 확정되어 더 이상 스캔할 수 없습니다.
        </div>
      ) : (
        <div style={{ marginTop: 20, color: "#5a7a9a", fontSize: 13 }}>
          QR 코드를 카메라에 비춰주세요.
        </div>
      )}
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
    setSearched(true);
  }

  const att = found ? attendance[found.id] : null;
  let status = "미확인";
  if (att && att.checkout) { status = "퇴실"; }
  else if (att && att.checkin) { status = "입실"; }

  return (
    <div style={{ minHeight: "100vh", background: "#e8f4fd", padding: 40 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: "#1a3a5c", cursor: "pointer", marginBottom: 20, fontWeight: 700 }}>← 돌아가기</button>
      <div style={{ background: "#fff", borderRadius: 24, padding: 36, maxWidth: 420, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24, fontSize: 20, fontWeight: 800 }}>학부모 출결 조회</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input
            value={phone}
            onChange={function(e) { setPhone(e.target.value); }}
            placeholder="보호자 연락처"
            style={{ flex: 1, border: "1.5px solid #d0dce8", borderRadius: 10, padding: 12 }}
          />
          <button onClick={search} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer" }}>조회</button>
        </div>
        {searched && !found ? (
          <div style={{ textAlign: "center", color: "#c62828", padding: 20, background: "#fce4ec", borderRadius: 12 }}>등록된 연락처를 찾을 수 없습니다.</div>
        ) : null}
        {found ? (
          <div style={{ background: "#f0f7ff", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{found.name}</div>
                <div style={{ fontSize: 13, color: "#5a7a9a" }}>{found.school} {found.grade} - {found.classroom}</div>
              </div>
              <Badge type={status} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, textAlign: "center", background: "#fff", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#7a9abf" }}>입실 시간</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{(att && att.checkin) ? att.checkin : "-"}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center", background: "#fff", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#7a9abf" }}>퇴실 시간</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{(att && att.checkout) ? att.checkout : "-"}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AdminApp() {
  const [view, setView] = useState("admin");
  const [isAuthed, setIsAuthed] = useState(function() {
    return sessionStorage.getItem("isAdmin") === "true";
  });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showQR, setShowQR] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [filterClass, setFilterClass] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("students");
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    const unsubStudents = onSnapshot(collection(db, "students"), function(snap) {
      const list = snap.docs.map(function(d) {
        return Object.assign({}, d.data(), { docId: d.id });
      });
      setStudents(list);
      setLoading(false);
    });

    return function() {
      unsubStudents();
    };
  }, []);

  useEffect(function() {
    const unsubAtt = onSnapshot(collection(db, "attendance_" + selectedDate), function(snap) {
      const att = {};
      snap.docs.forEach(function(d) { att[d.id] = d.data(); });
      setAttendance(att);
    });

    const unsubLock = onSnapshot(doc(db, "daylocks", selectedDate), function(snap) {
      if (snap.exists()) {
        setIsLocked(true);
        setLockInfo(snap.data());
      } else {
        setIsLocked(false);
        setLockInfo(null);
      }
    });

    return function() {
      unsubAtt();
      unsubLock();
    };
  }, [selectedDate]);

  function notify(msg) {
    setNotification({ msg: msg });
    setTimeout(function() { setNotification(null); }, 3000);
  }

  function handleScan(student, type) {
    if (isLocked) { notify(selectedDate + " 출결은 확정되어 잠겨있습니다."); return; }
    const ref = doc(db, "attendance_" + selectedDate, student.id);
    const att = attendance[student.id] || {};
    if (type === "입실") {
      setDoc(ref, Object.assign({}, att, { checkin: nowTime(), studentName: student.name, classroom: student.classroom }), { merge: true });
    }
    if (type === "퇴실") {
      setDoc(ref, Object.assign({}, att, { checkout: nowTime() }), { merge: true });
    }
    notify(student.name + " 학생 " + type + " 처리 완료 (" + nowTime() + ")");
  }

  function addStudent(data) {
    return addDoc(collection(db, "students"), data).then(function() {
      notify(data.name + " 학생이 등록되었습니다.");
    });
  }

  function addManyStudents(list) {
    const promises = list.map(function(data) {
      return addDoc(collection(db, "students"), data);
    });
    return Promise.all(promises).then(function() {
      notify(list.length + "명의 학생이 일괄 등록되었습니다.");
    });
  }

  function updateStudent(docId, data) {
    return updateDoc(doc(db, "students", docId), data).then(function() {
      notify(data.name + " 학생 정보가 수정되었습니다.");
    });
  }

  function deleteStudent(student) {
    const deleteAtt = deleteDoc(doc(db, "attendance_" + selectedDate, student.id)).catch(function() {});
    return Promise.all([deleteDoc(doc(db, "students", student.docId)), deleteAtt]).then(function() {
      notify(student.name + " 학생이 삭제되었습니다.");
    });
  }

  function undoCheckout(student) {
    if (isLocked) { notify(selectedDate + " 출결은 확정되어 잠겨있습니다."); return; }
    const ref = doc(db, "attendance_" + selectedDate, student.id);
    const att = attendance[student.id] || {};
    const updated = Object.assign({}, att);
    delete updated.checkout;
    return setDoc(ref, updated).then(function() {
      notify(student.name + " 학생 퇴실이 취소되었습니다.");
    });
  }

  function undoCheckin(student) {
    if (isLocked) { notify(selectedDate + " 출결은 확정되어 잠겨있습니다."); return; }
    return deleteDoc(doc(db, "attendance_" + selectedDate, student.id)).then(function() {
      notify(student.name + " 학생 입실이 취소되었습니다.");
    });
  }

  function lockDay() {
    return setDoc(doc(db, "daylocks", selectedDate), { lockedAt: nowTime(), date: selectedDate }).then(function() {
      notify(selectedDate + " 출결이 확정되었습니다.");
    });
  }

  function unlockDay(pw) {
    if (pw !== SUPER_PASSWORD) { return Promise.reject(new Error("비밀번호가 올바르지 않습니다.")); }
    return deleteDoc(doc(db, "daylocks", selectedDate)).then(function() {
      notify(selectedDate + " 잠금이 해제되었습니다.");
    });
  }

  const allClasses = ["전체"].concat(CLASSES);

  const filtered = students.filter(function(s) {
    const classMatch = filterClass === "전체" || s.classroom === filterClass;
    const q = searchQuery;
    const searchMatch = !q || (s.name && s.name.indexOf(q) >= 0) || (s.id && s.id.indexOf(q) >= 0) || (s.grade && s.grade.indexOf(q) >= 0) || (s.school && s.school.indexOf(q) >= 0);
    return classMatch && searchMatch;
  });

  const attValues = Object.values(attendance);
  const stats = {
    total: students.length,
    checkin: attValues.filter(function(a) { return a.checkin && !a.checkout; }).length,
    checkout: attValues.filter(function(a) { return a.checkout; }).length,
    absent: students.length - attValues.filter(function(a) { return a.checkin; }).length
  };

  if (view === "parent") {
    return <ParentView students={students} attendance={attendance} onBack={function() { setView("admin"); }} />;
  }

  if (!isAuthed) {
    return (
      <AdminLogin
        onLogin={function() { setIsAuthed(true); }}
        onGoParent={function() { setView("parent"); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f5fb", fontFamily: "sans-serif" }}>
      <div style={{ background: "#0d1f3c", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>예원초 온동네 돌봄•교육센터 출결관리시스템</div>
            <div style={{ color: "#7ab3d4", fontSize: 11 }}>{fmtDate()}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function() { setView("parent"); }} style={{ background: "rgba(255,255,255,0.1)", color: "#a0c8e8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}>학부모 조회</button>
            <button onClick={function() { setShowScanner(true); }} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 800, cursor: "pointer" }}>QR 스캔(수동)</button>
            <button onClick={function() { window.open(window.location.origin + "?kiosk=1", "_blank"); }} style={{ background: "#0d1f3c", color: "#4fc3f7", border: "1px solid #4fc3f7", borderRadius: 10, padding: "8px 18px", fontWeight: 800, cursor: "pointer" }}>📷 출입구 화면 열기</button>
            <button onClick={function() { sessionStorage.removeItem("isAdmin"); setIsAuthed(false); }} style={{ background: "rgba(255,255,255,0.1)", color: "#f5a0a0", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}>로그아웃</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "#7a9abf" }}>Firebase 데이터 불러오는 중...</div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              <div style={{ background: "#e8f0fa", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#1a3a5c" }}>{stats.total}</div>
                <div style={{ fontSize: 12, color: "#5a7a9a" }}>전체 수강생</div>
              </div>
              <div style={{ background: "#e8f5e9", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#2e7d32" }}>{stats.checkin}</div>
                <div style={{ fontSize: 12, color: "#5a7a9a" }}>수업 중</div>
              </div>
              <div style={{ background: "#e3f2fd", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#1565c0" }}>{stats.checkout}</div>
                <div style={{ fontSize: 12, color: "#5a7a9a" }}>하교 완료</div>
              </div>
              <div style={{ background: "#fce4ec", borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#b71c1c" }}>{stats.absent}</div>
                <div style={{ fontSize: 12, color: "#5a7a9a" }}>미확인</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#e0eaf5", borderRadius: 12, padding: 4 }}>
              <button onClick={function() { setActiveTab("students"); }} style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", fontWeight: 700, cursor: "pointer", background: activeTab === "students" ? "#fff" : "transparent" }}>수강생 명단</button>
              <button onClick={function() { setActiveTab("attendance"); }} style={{ flex: 1, padding: 10, borderRadius: 9, border: "none", fontWeight: 700, cursor: "pointer", background: activeTab === "attendance" ? "#fff" : "transparent" }}>출결 현황</button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, background: "#fff", borderRadius: 14, padding: "14px 18px", flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5a7a9a" }}>📅 조회 날짜</div>
              <input
                type="date"
                value={selectedDate}
                onChange={function(e) { setSelectedDate(e.target.value); }}
                style={{ border: "1.5px solid #d0dce8", borderRadius: 10, padding: "8px 12px", fontSize: 14 }}
              />
              <button onClick={function() { setSelectedDate(todayKey()); }} style={{ background: "#e8f0fa", color: "#1a3a5c", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>오늘</button>

              <div style={{ flex: 1 }} />

              {isLocked ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ background: "#fce4ec", color: "#c62828", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>🔒 확정됨 (잠김)</span>
                  <button onClick={function() { setShowUnlockModal(true); }} style={{ background: "#f5f5f5", color: "#757575", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>잠금해제</button>
                </div>
              ) : (
                <button onClick={function() { if (window.confirm(selectedDate + " 출결을 확정하시겠습니까?\n확정 후에는 최종관리자 비밀번호 없이 수정할 수 없습니다.")) { lockDay(); } }} style={{ background: "#2e7d32", color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✓ 이 날짜 출결 확정하기</button>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                placeholder="이름, 학번, 학년반 검색..."
                style={{ flex: 1, minWidth: 200, border: "1.5px solid #d0dce8", borderRadius: 10, padding: 10 }}
              />
              <select
                value={filterClass}
                onChange={function(e) { setFilterClass(e.target.value); }}
                style={{ border: "1.5px solid #d0dce8", borderRadius: 10, padding: 10, fontSize: 13, background: "#fff", maxWidth: 220 }}
              >
                {allClasses.map(function(c) {
                  return <option key={c} value={c}>{c}</option>;
                })}
              </select>
              <button onClick={function() { setShowExcelUpload(true); }} style={{ background: "#2e7d32", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>📊 엑셀 일괄 등록</button>
              <button onClick={function() { setShowRegForm(true); }} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}>+ 수강생 등록</button>
            </div>

            {activeTab === "students" ? (
              <div>
                {CLASSES.map(function(cls) {
                  const classFiltered = filtered.filter(function(s) { return s.classroom === cls; });
                  if (classFiltered.length === 0) return null;
                  return (
                    <div key={cls} style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0d1f3c" }}>{cls}</div>
                        <span style={{ background: "#e8f0fa", color: "#1a3a5c", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{classFiltered.length}명</span>
                      </div>
                      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f0f5fb" }}>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>고유번호</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>이름</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>학교명</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>학년</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>연락처</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>출결</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>QR</th>
                              <th style={{ padding: 14, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}>처리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classFiltered.map(function(s) {
                              const att = attendance[s.id];
                              let status = "미확인";
                              if (att && att.checkout) { status = "퇴실"; }
                              else if (att && att.checkin) { status = "입실"; }
                              return (
                                <tr key={s.id} style={{ borderBottom: "1px solid #f0f5fb" }}>
                                  <td style={{ padding: 14, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" }}>{s.id}</td>
                                  <td style={{ padding: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{s.name}</td>
                                  <td style={{ padding: 14, fontSize: 13, whiteSpace: "nowrap" }}>{s.school}</td>
                                  <td style={{ padding: 14, fontSize: 13, whiteSpace: "nowrap" }}>{s.grade}</td>
                                  <td style={{ padding: 14, fontSize: 12, whiteSpace: "nowrap" }}>{s.parentPhone}</td>
                                  <td style={{ padding: 14 }}><Badge type={status} /></td>
                                  <td style={{ padding: 14 }}>
                                    <button onClick={function() { setShowQR(s); }} style={{ background: "#e8f0fa", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>QR 보기</button>
                                  </td>
                                  <td style={{ padding: 14, whiteSpace: "nowrap" }}>
                                    <button onClick={function() { setEditingStudent(s); }} style={{ background: "#fff3e0", color: "#e65100", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginRight: 5, marginBottom: 4 }}>수정</button>
                                    <button onClick={function() { if (window.confirm(s.name + " 학생을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) { deleteStudent(s); } }} style={{ background: "#fce4ec", color: "#c62828", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginRight: 5, marginBottom: 4 }}>삭제</button>
                                    {isLocked ? (
                                      <span style={{ fontSize: 11, color: "#aabcd4" }}>🔒 잠김</span>
                                    ) : (
                                      <span>
                                        {(!att || !att.checkin) ? (
                                          <button onClick={function() { handleScan(s, "입실"); }} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginBottom: 4 }}>입실</button>
                                        ) : null}
                                        {(att && att.checkin && !att.checkout) ? (
                                          <span>
                                            <button onClick={function() { handleScan(s, "퇴실"); }} style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginRight: 5, marginBottom: 4 }}>퇴실</button>
                                            <button onClick={function() { undoCheckin(s); }} style={{ background: "#f5f5f5", color: "#757575", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginBottom: 4 }}>입실취소</button>
                                          </span>
                                        ) : null}
                                        {(att && att.checkout) ? (
                                          <button onClick={function() { undoCheckout(s); }} style={{ background: "#f5f5f5", color: "#757575", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", marginBottom: 4 }}>퇴실취소</button>
                                        ) : null}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#aabcd4", background: "#fff", borderRadius: 16 }}>등록된 수강생이 없습니다.</div>
                ) : null}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {CLASSES.map(function(cls) {
                  const classStudents = students.filter(function(s) { return s.classroom === cls; });
                  if (classStudents.length === 0) return null;
                  const checkins = classStudents.filter(function(s) { return attendance[s.id] && attendance[s.id].checkin; }).length;
                  return (
                    <div key={cls} style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
                      <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 14 }}>{cls} ({classStudents.length}명, 입실 {checkins}명)</div>
                      {classStudents.map(function(s) {
                        const att = attendance[s.id];
                        let status = "미확인";
                        if (att && att.checkout) { status = "퇴실"; }
                        else if (att && att.checkin) { status = "입실"; }
                        return (
                          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f0f5fb" }}>
                            <span style={{ fontSize: 13 }}>{s.name}</span>
                            <Badge type={status} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {notification ? (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1b5e20", color: "#fff", borderRadius: 12, padding: "14px 20px", zIndex: 2000 }}>{notification.msg}</div>
      ) : null}

      {showQR ? <QRModal student={showQR} onClose={function() { setShowQR(null); }} /> : null}
      {showScanner ? <QRScanner students={students} attendance={attendance} onScan={handleScan} onClose={function() { setShowScanner(false); }} /> : null}
      {showRegForm ? <RegistrationForm onAdd={addStudent} onClose={function() { setShowRegForm(false); }} /> : null}
      {showExcelUpload ? <ExcelUploadModal onAddMany={addManyStudents} onClose={function() { setShowExcelUpload(false); }} /> : null}
      {editingStudent ? <EditStudentModal student={editingStudent} onSave={updateStudent} onClose={function() { setEditingStudent(null); }} /> : null}
      {showUnlockModal ? <UnlockModal date={selectedDate} lockInfo={lockInfo} onUnlock={unlockDay} onClose={function() { setShowUnlockModal(false); }} /> : null}
    </div>
  );
}

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isKioskMode = urlParams.get("kiosk") === "1";

  if (isKioskMode) {
    return <KioskScanner />;
  }
  return <AdminApp />;
}
