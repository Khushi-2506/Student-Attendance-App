// ---------- DATA ----------
let students = JSON.parse(localStorage.getItem('att_students') || '[]');
let records  = JSON.parse(localStorage.getItem('att_records')  || '{}');
let current  = {};   // unsaved selections for the selected date

function persist() {
  localStorage.setItem('att_students', JSON.stringify(students));
  localStorage.setItem('att_records', JSON.stringify(records));
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

function showTab(name) {
  document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  if (name === 'report') { fillClassFilter(); renderReport(); }
}

// ---------- STUDENTS ----------
function addStudent(e) {
  e.preventDefault();
  const name = document.getElementById('stuName').value.trim();
  const roll = document.getElementById('stuRoll').value.trim();
  const cls  = document.getElementById('stuClass').value.trim();
  if (students.some(s => s.roll === roll && s.cls.toLowerCase() === cls.toLowerCase())) {
    toast('⚠️ Roll no. already exists in this class');
    return;
  }
  students.push({ id: Date.now(), name, roll, cls });
  students.sort((a, b) => a.cls.localeCompare(b.cls) || String(a.roll).localeCompare(String(b.roll), undefined, {numeric: true}));
  persist();
  e.target.reset();
  renderStudents(); renderAttendance(); renderStats();
  toast('✅ Student added');
}

function deleteStudent(id) {
  if (!confirm('Delete this student and their attendance records?')) return;
  students = students.filter(s => s.id !== id);
  for (const d in records) delete records[d][id];
  persist();
  renderStudents(); renderAttendance(); renderStats();
  toast('🗑 Student deleted');
}

function renderStudents() {
  const el = document.getElementById('stuList');
  document.getElementById('stuCount').textContent = '(' + students.length + ')';
  if (!students.length) { el.innerHTML = '<div class="empty">No students yet. Add your first student above.</div>'; return; }
  let html = '<table><tr><th>Roll</th><th>Name</th><th>Class</th><th></th></tr>';
  for (const s of students) {
    html += `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td>
      <td><button class="btn btn-red" onclick="deleteStudent(${s.id})">Delete</button></td></tr>`;
  }
  el.innerHTML = html + '</table>';
}

// ---------- TAKE ATTENDANCE ----------
function loadCurrent() {
  const d = document.getElementById('attDate').value;
  current = Object.assign({}, records[d] || {});
}

function renderAttendance() {
  loadCurrent();
  const el = document.getElementById('attList');
  const d = document.getElementById('attDate').value;
  if (!students.length) { el.innerHTML = '<div class="empty">Add students first (Students tab).</div>'; return; }
  let html = '';
  for (const s of students) {
    const v = current[s.id] || '';
    html += `<div class="att-row">
      <div class="att-info"><span class="roll">${esc(s.roll)}</span>
        <div><div>${esc(s.name)}</div><div class="muted">${esc(s.cls)}</div></div></div>
      <div class="att-btns">
        <button class="att-btn ${v==='P'?'sel-P':''}" onclick="mark(${s.id},'P')">P</button>
        <button class="att-btn ${v==='A'?'sel-A':''}" onclick="mark(${s.id},'A')">A</button>
        <button class="att-btn ${v==='L'?'sel-L':''}" onclick="mark(${s.id},'L')">L</button>
      </div></div>`;
  }
  el.innerHTML = html;
  const saved = records[d] ? `Last saved: ${new Date(d + 'T00:00').toDateString()}` : 'Not saved yet for this date';
  document.getElementById('savedInfo').textContent = saved;
}

function mark(id, v) { current[id] = (current[id] === v) ? '' : v; renderAttendance(); renderStats(); }
function setAll(v) { for (const s of students) current[s.id] = v; renderAttendance(); renderStats(); }

function saveAttendance() {
  const d = document.getElementById('attDate').value;
  if (!d) { toast('⚠️ Pick a date first'); return; }
  const entry = {};
  for (const s of students) if (current[s.id]) entry[s.id] = current[s.id];
  records[d] = entry;
  persist();
  renderAttendance();
  toast('💾 Attendance saved for ' + d);
}

function renderStats() {
  const d = document.getElementById('attDate').value;
  let p = 0, a = 0, l = 0;
  for (const s of students) {
    const v = current[s.id];
    if (v === 'P') p++; else if (v === 'A') a++; else if (v === 'L') l++;
  }
  const unmarked = students.length - p - a - l;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat blue"><div class="num">${students.length}</div><div class="lbl">Total Students</div></div>
    <div class="stat green"><div class="num">${p}</div><div class="lbl">Present</div></div>
    <div class="stat red"><div class="num">${a}</div><div class="lbl">Absent</div></div>
    <div class="stat purple"><div class="num">${l}</div><div class="lbl">Late</div></div>
    <div class="stat"><div class="num">${unmarked}</div><div class="lbl">Unmarked</div></div>`;
}

// ---------- REPORTS ----------
function fillClassFilter() {
  const sel = document.getElementById('repClass');
  const cur = sel.value;
  const classes = [...new Set(students.map(s => s.cls))].sort();
  sel.innerHTML = '<option value="">All classes</option>' + classes.map(c => `<option>${esc(c)}</option>`).join('');
  sel.value = cur;
}

function calcPct(s) {
  let p = 0, total = 0;
  for (const d in records) {
    const v = records[d][s.id];
    if (v) { total++; if (v === 'P' || v === 'L') p++; }
  }
  return total ? Math.round(p / total * 100) : null;
}

function renderReport() {
  const filter = document.getElementById('repClass').value;
  const list = students.filter(s => !filter || s.cls === filter);
  const el = document.getElementById('repTable');
  if (!list.length) { el.innerHTML = '<div class="empty">No students to report on.</div>'; return; }
  let html = '<table><tr><th>Roll</th><th>Name</th><th>Class</th><th>Attendance %</th></tr>';
  for (const s of list) {
    const pct = calcPct(s);
    const color = pct === null ? '#9ca3af' : pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626';
    const bar = pct === null ? '<span class="muted">No records</span>'
      : `<div style="display:flex;align-items:center;gap:8px;"><div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color};"></div></div><b>${pct}%</b></div>`;
    html += `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td>${esc(s.cls)}</td><td>${bar}</td></tr>`;
  }
  el.innerHTML = html + '</table>';
}

function renderHistory() {
  const d = document.getElementById('histDate').value;
  const el = document.getElementById('histTable');
  const rec = records[d];
  if (!d) { el.innerHTML = '<div class="empty">Pick a date to view history.</div>'; return; }
  if (!rec || !Object.keys(rec).length) { el.innerHTML = '<div class="empty">No attendance recorded on this date.</div>'; return; }
  let html = `<table><tr><th>Roll</th><th>Name</th><th>Status</th></tr>`;
  for (const s of students) {
    const v = rec[s.id];
    if (!v) continue;
    const label = v === 'P' ? 'Present' : v === 'A' ? 'Absent' : 'Late';
    html += `<tr><td>${esc(s.roll)}</td><td>${esc(s.name)}</td><td><span class="badge badge-${v}">${label}</span></td></tr>`;
  }
  el.innerHTML = html + '</table>';
}

function exportCSV() {
  let csv = 'Roll,Name,Class,Days Marked,Days Present/Late,Attendance %\n';
  for (const s of students) {
    let p = 0, total = 0;
    for (const d in records) { const v = records[d][s.id]; if (v) { total++; if (v !== 'A') p++; } }
    const pct = total ? Math.round(p / total * 100) : '';
    csv += `"${s.roll}","${s.name}","${s.cls}",${total},${p},${pct}\n`;
  }
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'attendance_report.csv';
  a.click();
  toast('⬇ CSV downloaded');
}

// ---------- MISC ----------
function clearAll() {
  if (!confirm('Delete ALL students and attendance records? This cannot be undone!')) return;
  if (!confirm('Are you absolutely sure?')) return;
  students = []; records = {}; current = {};
  persist();
  renderStudents(); renderAttendance(); renderStats();
  toast('🗑 All data cleared');
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------- INIT ----------
(function init() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('attDate').value = today;
  document.getElementById('histDate').value = today;
  document.getElementById('todayLabel').textContent = new Date().toDateString();
  document.getElementById('attDate').addEventListener('change', () => { renderAttendance(); renderStats(); });
  renderStudents(); renderAttendance(); renderStats();
})();
