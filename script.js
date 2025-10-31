// Hybrid Master 51 - Vanilla JS App Logic (French UI)

const PROGRAM = {
  weeks: 26,
  deloadWeeeks: [6,12,18,24,26],
  days: [
    {label: "Dimanche", id: "sunday"},
    {label: "Mardi", id: "tuesday"},
    {label: "Vendredi", id: "friday"}
  ],
  sessions: [
    // Each session block for each day; to be filled with real Hybrid Master 51 blocks/truncate for brevity
    {
      day: "Dimanche",
      exercises: [
        {name: "Trap Bar Deadlift", sets: 4, reps: 6, rest: 90, progressionWeeks: 1, progression: 2.5, baseWeight: 80, muscle: "Jambes"},
        {name: "Dumbbell Press", sets: 3, reps: 8, rest: 75, progressionWeeks: 2, progression: 1.5, baseWeight: 20, muscle: "Pecs"},
        {name: "Pull Ups", sets: 4, reps: 8, rest: 60, progressionWeeks: 3, progression: 1, baseWeight: 0, muscle: "Dos"},
      ]
    },
    {
      day: "Mardi",
      exercises: [
        {name: "Leg Press", sets: 4, reps: 10, rest: 100, progressionWeeks: 1, progression: 4, baseWeight: 90, muscle: "Jambes"},
        {name: "Rowing Barre", sets: 3, reps: 10, rest: 75, progressionWeeks: 2, progression: 2, baseWeight: 45, muscle: "Dos"},
        {name: "Curl Haltère", sets: 3, reps: 12, rest: 60, progressionWeeks: 2, progression: 1, baseWeight: 12, muscle: "Bras"},
      ]
    },
    {
      day: "Vendredi",
      exercises: [
        {name: "Front Squat", sets: 4, reps: 8, rest: 120, progressionWeeks: 1, progression: 2, baseWeight: 60, muscle: "Jambes"},
        {name: "Dips", sets: 3, reps: 10, rest: 60, progressionWeeks: 3, progression: 2, baseWeight: 0, muscle: "Pecs"},
        {name: "Lat Pull Down", sets: 3, reps: 12, rest: 90, progressionWeeks: 1, progression: 2, baseWeight: 35, muscle: "Dos"},
      ]
    }
  ]
};
const DELOAD_WS = [6,12,18,24,26];
const LIFTS_GRAPH = [
  {name: "Trap Bar Deadlift", color: "#66e7d7"},
  {name: "Dumbbell Press", color: "#e394eb"},
  {name: "Leg Press", color: "#e376a3"},
];

let state = {
  currentWeek: 1,
  completedSets: {}, // key: sessionId-exIdx-setIdx, value: {week, reps, weight, time}
  workoutData: [],
  lastSave: null
};

function saveState() {
  state.lastSave = new Date().toLocaleTimeString("fr-FR", {hour: "2-digit", minute: "2-digit"});
  localStorage.setItem('hm51app', JSON.stringify(state));
  updateSaveInfo();
}
function loadState() {
  const saved = localStorage.getItem('hm51app');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      Object.assign(state, data);
    } catch (e) {}
  }
  updateSaveInfo();
}
function updateSaveInfo() {
  const el = document.getElementById('saveInfo');
  if (el) el.textContent = state.lastSave ? ("Dernière sauvegarde : " + state.lastSave) : '';
}

// Weight calculation logic
function computeWeight(ex, week) {
  let pwStep = Math.floor((week-1)/ex.progressionWeeks);
  let w = ex.baseWeight + (pwStep * ex.progression);
  if (DELOAD_WS.includes(week)) w = Math.round(w*0.6*10)/10;
  return Math.round(w*10)/10;
}

function getSession(dateOrDay, week) {
  // Find the session matching the day string for the given week (always fixed order)
  const d = typeof dateOrDay==="string"? dateOrDay : PROGRAM.days[dateOrDay%3].label;
  return PROGRAM.sessions.find(sess=>sess.day===d);
}

// UI Rendering

function render() {
  document.getElementById('currentWeekLabel').textContent = 'Semaine ' + state.currentWeek;
  document.getElementById('weekSlider').value = state.currentWeek;
  renderSessions();
  renderStats();
}
function renderSessions() {
  const c = document.getElementById('sessionsContainer');
  c.innerHTML = "";
  PROGRAM.days.forEach((day, sIdx) => {
    const sess = getSession(day.label, state.currentWeek);
    const dRoot = document.createElement('div');
    dRoot.className = "session";
    dRoot.setAttribute("role", "region");
    dRoot.setAttribute("aria-label", "Séance " + day.label);

    dRoot.innerHTML = `<h2>${day.label}</h2>`;
    sess.exercises.forEach((ex, exIdx) => {
      const w = computeWeight(ex, state.currentWeek);
      const exDiv = document.createElement('div');
      exDiv.className = "exercise";
      exDiv.innerHTML = `
        <div class="exercise-header">
          <div class="exercise-title">${ex.name}</div>
          <div class="exercise-details">${ex.sets}x${ex.reps} • ${w} kg • Repos ${ex.rest}s</div>
        </div>
        <div class="sets-row" id="sets-${sIdx}-${exIdx}"></div>
        <div class="timer" id="timer-${sIdx}-${exIdx}" style="display:none;">Repos: <span>0</span>s</div>
      `;
      dRoot.appendChild(exDiv);

      // Render set buttons
      const setsRow = exDiv.querySelector('.sets-row');
      for (let setIdx = 0; setIdx < ex.sets; setIdx++) {
        const btn = document.createElement('button');
        btn.className = "set-btn";
        btn.setAttribute("aria-label", `Série ${setIdx+1} ${ex.name}`);
        btn.tabIndex = 0;
        const key = `${sIdx}-${exIdx}-${setIdx}`;
        if (state.completedSets[weekKey(key)]) btn.classList.add('checked');
        btn.innerHTML = setIdx+1;
        setsRow.appendChild(btn);

        // Validation logic
        btn.addEventListener('click', e => {
          if (!btn.classList.contains('checked')) {
            markSet(sIdx, exIdx, setIdx, w, ex.reps, ex.rest, btn);
          }
        });
        // Del (annuler) ❌
        const delBtn = document.createElement('button');
        delBtn.className = "del-btn";
        delBtn.textContent = "❌";
        delBtn.setAttribute('aria-label', `Annuler validation série ${setIdx+1}`);
        delBtn.tabIndex = 0;

        delBtn.addEventListener('click', e => {
          e.stopPropagation();
          // Remove set
          delete state.completedSets[weekKey(key)];
          btn.classList.remove('checked');
          // Stop possible timer
          stopTimerFor(sIdx, exIdx);
          saveState();
          render();
        });
        btn.appendChild(delBtn);

        // Timer show
        btn.addEventListener('keydown', e => {
          if ((e.key === "Enter" || e.key === " ") && !btn.classList.contains('checked')) {
            markSet(sIdx, exIdx, setIdx, w, ex.reps, ex.rest, btn);
          }
        });

        // If checked: visible del-btn
        if (btn.classList.contains('checked')) delBtn.style.display = "flex";
      }
    });
    c.appendChild(dRoot);
  });
}
function weekKey(key) {
  return `w${state.currentWeek}_${key}`;
}

// Timer logic
let currentTimer = null;
function markSet(sIdx, exIdx, setIdx, weight, reps, rest, btn) {
  const key = `${sIdx}-${exIdx}-${setIdx}`;
  state.completedSets[weekKey(key)] = {week: state.currentWeek, weight, reps, time: Date.now()};
  btn.classList.add('checked');
  saveState();
  // Start timer
  startTimerFor(sIdx, exIdx, rest);
}
function startTimerFor(sIdx, exIdx, seconds) {
  stopTimerFor(); // ensure only one at a time per ex
  const timerEl = document.getElementById(`timer-${sIdx}-${exIdx}`);
  if (!timerEl) return;
  let t = seconds;
  timerEl.style.display = "inline-block";
  timerEl.querySelector('span').textContent = t;
  currentTimer = setInterval(() => {
    t--;
    timerEl.querySelector('span').textContent = t;
    if (t<=0) {
      timerEl.style.background = "#44ce6f";
      timerEl.textContent = "Repos fini!";
      clearInterval(currentTimer);
      currentTimer = null;
    }
  }, 1000);
}
function stopTimerFor() {
  if (currentTimer) clearInterval(currentTimer);
  document.querySelectorAll('.timer').forEach(el => el.style.display='none');
  currentTimer = null;
}

// Navigation
document.getElementById('prevWeekBtn').addEventListener('click', ()=>changeWeek(-1));
document.getElementById('nextWeekBtn').addEventListener('click', ()=>changeWeek(1));
document.getElementById('weekSlider').addEventListener('input', e=>{
  state.currentWeek = Number(e.target.value);
  render();
  saveState();
});
function changeWeek(delta) {
  state.currentWeek = Math.max(1, Math.min(PROGRAM.weeks, state.currentWeek+delta));
  render();
  saveState();
}

// Finish workout & auto progress week
document.getElementById('finishWorkoutBtn').addEventListener('click',()=>{
  if (state.currentWeek<PROGRAM.weeks) {
    state.currentWeek++;
    render();
    saveState();
  }
});

// Stats — Hevy-like
function renderStats() {
  // Stats page only if visible
  if (document.getElementById('statsSection').style.display==='none') return;
  // Volume total, séances complétées, estimate, split
  let volume = 0, sessionsDone = 0, minutes = 0, muscleCount={};
  for (const k in state.completedSets) {
    const m = state.completedSets[k];
    const {weight, reps} = m;
    let key = k.split("_")[1];
    // Find muscle for stat
    const ks = key.split("-");
    const sess = PROGRAM.sessions[parseInt(ks[0])];
    if (!sess) continue;
    const ex = sess.exercises[parseInt(ks[1])];
    if (!ex) continue;
    let mv = weight * reps;
    volume += mv;
    minutes += ex.rest/60;
    if (!muscleCount[ex.muscle]) muscleCount[ex.muscle]=0;
    muscleCount[ex.muscle] +=mv;
  }
  for (let i=0;i<PROGRAM.days.length*PROGRAM.weeks;i++) {
    const w = 1+ Math.floor(i/3);
    for (let s=0;s<PROGRAM.sessions.length;s++) {
      const sess = PROGRAM.sessions[s];
      for (let e=0;e<sess.exercises.length;e++) {
        const setn = sess.exercises[e].sets;
        for (let seti=0;seti<setn;seti++) {
          if (state.completedSets[weekKey(`${s}-${e}-${seti}`)]) {
            sessionsDone+=1/(sess.exercises.length*setn);
          }
        }
      }
    }
  }
  document.getElementById('totalVolume').textContent = volume?volume.toFixed(0):'0';
  document.getElementById('sessionsCompleted').textContent = Math.round(sessionsDone/3);
  document.getElementById('timeEstimated').textContent = Math.round(minutes)+' min';

  // Split summary
  let out = "";
  const totalMuscle = Object.values(muscleCount).reduce((a,v)=>a+v,0) || 1;
  Object.entries(muscleCount).forEach(([m,v])=>{
    const pct = Math.round(v/totalMuscle*100);
    out += `${m}: ${pct}% | `;
  });
  document.getElementById('splitSummary').textContent = out;

  // Graphs : volume (bar/line), lifts progression(line)
  drawVolumeChart();
  drawProgressionChart();
}
let volumeChart, progChart;
function drawVolumeChart() {
  const ctx = document.getElementById('volumeChart').getContext('2d');
  const vdata = new Array(PROGRAM.weeks).fill(0);
  for (let k in state.completedSets) {
    const match = k.match(/^w(\d+)_/);
    if (!match) continue;
    const wk = +match[1];
    const entry = state.completedSets[k];
    vdata[wk-1] += entry.weight * entry.reps;
  }
  if (volumeChart) volumeChart.destroy();
  volumeChart = new Chart(ctx, {
    type: 'bar',
     { labels: Array.from({length:PROGRAM.weeks},(_,j)=>`S${j+1}`), datasets: [
      {label:'Volume',vdata,backgroundColor:'#66e7d7'}
    ]},
    options: {plugins:{legend:{display:false}},
      scales:{ x:{ grid:{color:"#393b50"} }, y:{ grid:{color:"#393b50"} } }
    }
  });
}
function drawProgressionChart() {
  const ctx = document.getElementById('progressionChart').getContext('2d');
  let datasets=[];
  LIFTS_GRAPH.forEach(lift=>{
    let data=[];
    for (let i=1;i<=PROGRAM.weeks;i++) {
      // Find base weight for this lift
      for (let s=0;s<PROGRAM.sessions.length;s++) {
        for (let e=0;e<PROGRAM.sessions[s].exercises.length;e++) {
          if (PROGRAM.sessions[s].exercises[e].name===lift.name) {
            data.push(computeWeight(PROGRAM.sessions[s].exercises[e],i));
          }
        }
      }
    }
    datasets.push({label:lift.name, data, borderColor:lift.color, fill:false, spanGaps:true, tension:0.15});
  });
  if (progChart) progChart.destroy();
  progChart = new Chart(ctx,{type:"line",{
    labels:Array.from({length:PROGRAM.weeks},(_,j)=>`S${j+1}`),
    datasets
  }, options:{
    plugins:{legend:{labels:{color:"#eaeaea"}}},
    scales:{ x:{ grid:{color:"#393b50"}, ticks:{color:"#eaeaea"} },
             y:{ grid:{color:"#393b50"}, ticks:{color:"#eaeaea"} } },
    elements:{point:{radius: function (ctx) {
      // Deload week marker
      const idx = ctx.dataIndex+1;
      return DELOAD_WS.includes(idx)?8:3;
    }, backgroundColor: function(ctx){
      return DELOAD_WS.includes(ctx.dataIndex+1) ? "#ffd700" : "#666";
    }}}
  }});
}

// Navigation pages
document.getElementById('workoutViewBtn').addEventListener('click', ()=>{
  document.getElementById('workoutSection').style.display = '';
  document.getElementById('statsSection').style.display = 'none';
  renderSessions();
});
document.getElementById('statsViewBtn').addEventListener('click', ()=>{
  document.getElementById('workoutSection').style.display = 'none';
  document.getElementById('statsSection').style.display = '';
  renderStats();
});

// Onboarding location.protocol
window.addEventListener('DOMContentLoaded', ()=>{
  if(location.protocol === 'file:') {
    document.getElementById('onboardingHint').textContent = 
      'Ouvrez ce fichier dans Safari ou hébergez-le sur GitHub Pages pour profiter des sauvegardes.';
    document.getElementById('onboardingHint').classList.add('active');
  }
});

// Accessibility: focus
document.addEventListener('keydown', function(e) {
  if (e.key === "Tab")
    document.body.classList.add('user-is-tabbing');
});

// Self Test Overlay
function selfTest() {
  let failList = [];
  // a) présence des boutons série
  const bcount = document.querySelectorAll('.set-btn').length;
  if (bcount===0) failList.push("boutons séries manquants");

  // b) timer démarrable
  const firstBtn = document.querySelector('.set-btn:not(.checked)');
  if (!firstBtn) failList.push("aucun bouton série cliquable trouvé");
  else {
    firstBtn.click();
    const anyTimer = document.querySelector('.timer[style*="inline-block"]');
    if (!anyTimer) failList.push("timer manquant/non déclenchable");
    stopTimerFor();
  }

  // c) bouton ❌ présent
  const checked = document.querySelector('.set-btn.checked');
  if (!checked || checked.querySelector('.del-btn')?.style.display!=="flex")
    failList.push("❌ manquant quand série validée");

  // d) graphique Chart.js rendu
  if (!document.querySelector('canvas')) failList.push("canvas Chart.js manquant");
  else {
    // Try to initialize
    try {drawVolumeChart();drawProgressionChart();}catch(e){failList.push("graphiques Chart.js init ERROR");}
    if (!document.querySelector('#volumeChart').offsetHeight) failList.push("graphique volume invisible");
  }

  // e) sauvegarde/restauration OK
  const prev = JSON.stringify(state);
  saveState();
  loadState();
  if (JSON.stringify(state)!==prev) failList.push("sauvegarde/restauration défectueuse");

  // Overlay display
  const el = document.getElementById('selftest-overlay');
  const content = document.getElementById('selftest-content');
  if (failList.length) {
    el.style.display = 'flex';
    content.textContent = "FAIL: \n" + failList.join(', ');
    console.warn("SelfTest FAIL:",failList);
    return "FAIL";
  } else {
    el.style.display = 'flex';
    content.textContent = "PASS ✔️";
    setTimeout(()=>{el.style.display='none';},2200);
    console.info("SelfTest PASS");
    return "PASS";
  }
}
// Run at load & log
window.addEventListener("DOMContentLoaded", ()=>{
  loadState();
  render();
  setTimeout(selfTest,420);
});
