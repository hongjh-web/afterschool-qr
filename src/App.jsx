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
                <div style={{ fontSize: 13, color: "#5a7a9a" }}>{found.grade} - {found.classroom}</div>
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

export default function App() {
  const [view, setView] = useState("admin");
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [showQR, setShowQR] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [filterClass, setFilterClass] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState("students");
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    const unsubStudents = onSnapshot(collection(db, "students"), function(snap) {
      const list = snap.docs.map(function(d) {
        return Object.assign({}, d.data(), { docId: d.id });
      });
      setStudents(list);
      setLoading(false);
    });

    const unsubAtt = onSnapshot(collection(db, "attendance_" + todayKey()), function(snap) {
      const att = {};
      snap.docs.forEach(function(d) { att[d.id] = d.data(); });
      setAttendance(att);
    });

    return function() {
      unsubStudents();
      unsubAtt();
    };
  }, []);

  function notify(msg) {
    setNotification({ msg: msg });
    setTimeout(function() { setNotification(null); }, 3000);
  }

  function handleScan(student, type) {
    const ref = doc(db, "attendance_" + todayKey(), student.id);
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

  const allClasses = ["전체"].concat(CLASSES);

  const filtered = students.filter(function(s) {
    const classMatch = filterClass === "전체" || s.classroom === filterClass;
    const q = searchQuery;
    const searchMatch = !q || (s.name && s.name.indexOf(q) >= 0) || (s.id && s.id.indexOf(q) >= 0) || (s.grade && s.grade.indexOf(q) >= 0);
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

  return (
    <div style={{ minHeight: "100vh", background: "#f0f5fb", fontFamily: "sans-serif" }}>
      <div style={{ background: "#0d1f3c", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>예원초 온동네 돌봄·교육센터 출결관리시스템</div>
            <div style={{ color: "#7ab3d4", fontSize: 11 }}>{fmtDate()}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={function() { setView("parent"); }} style={{ background: "rgba(255,255,255,0.1)", color: "#a0c8e8", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}>학부모 조회</button>
            <button onClick={function() { setShowScanner(true); }} style={{ background: "#4fc3f7", color: "#0d1f3c", border: "none", borderRadius: 10, padding: "8px 18px", fontWeight: 800, cursor: "pointer" }}>QR 스캔</button>
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

            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input
                value={searchQuery}
                onChange={function(e) { setSearchQuery(e.target.value); }}
                placeholder="이름, 학번, 학년반 검색..."
                style={{ flex: 1, minWidth: 200, border: "1.5px solid #d0dce8", borderRadius: 10, padding: 10 }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allClasses.map(function(c) {
                  return (
                    <button
                      key={c}
                      onClick={function() { setFilterClass(c); }}
                      style={{ padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: filterClass === c ? "#1a3a5c" : "#fff", color: filterClass === c ? "#fff" : "#5a7a9a" }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              <button onClick={function() { setShowRegForm(true); }} style={{ background: "#1a3a5c", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer" }}>+ 수강생 등록</button>
            </div>

            {activeTab === "students" ? (
              <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f0f5fb" }}>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>고유번호</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>이름</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>학년반</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>과목</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>연락처</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>출결</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>QR</th>
                      <th style={{ padding: 14, textAlign: "left", fontSize: 12 }}>처리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(function(s) {
                      const att = attendance[s.id];
                      let status = "미확인";
                      if (att && att.checkout) { status = "퇴실"; }
                      else if (att && att.checkin) { status = "입실"; }
                      return (
                        <tr key={s.id} style={{ borderBottom: "1px solid #f0f5fb" }}>
                          <td style={{ padding: 14, fontFamily: "monospace", fontSize: 12 }}>{s.id}</td>
                          <td style={{ padding: 14, fontWeight: 700 }}>{s.name}</td>
                          <td style={{ padding: 14, fontSize: 13 }}>{s.grade}</td>
                          <td style={{ padding: 14 }}>{s.classroom}</td>
                          <td style={{ padding: 14, fontSize: 12 }}>{s.parentPhone}</td>
                          <td style={{ padding: 14 }}><Badge type={status} /></td>
                          <td style={{ padding: 14 }}>
                            <button onClick={function() { setShowQR(s); }} style={{ background: "#e8f0fa", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer" }}>QR 보기</button>
                          </td>
                          <td style={{ padding: 14 }}>
                            {(!att || !att.checkin) ? (
                              <button onClick={function() { handleScan(s, "입실"); }} style={{ background: "#e8f5e9", color: "#2e7d32", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>입실</button>
                            ) : null}
                            {(att && att.checkin && !att.checkout) ? (
                              <button onClick={function() { handleScan(s, "퇴실"); }} style={{ background: "#e3f2fd", color: "#1565c0", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer" }}>퇴실</button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {CLASSES.map(function(cls) {
                  const classStudents = students.filter(function(s) { return s.classroom === cls; });
                  const checkins = classStudents.filter(function(s) { return attendance[s.id] && attendance[s.id].checkin; }).length;
                  return (
                    <div key={cls} style={{ background: "#fff", borderRadius: 16, padding: 20 }}>
                      <div style={{ fontWeight: 800, marginBottom: 12 }}>{cls} ({classStudents.length}명, 입실 {checkins}명)</div>
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
    </div>
  );
}
