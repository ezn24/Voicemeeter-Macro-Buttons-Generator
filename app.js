// Single-view, tri-state dropdowns, real-time preview, i18n, gain reset buttons

const VERSIONS = {
  standard: { name: "Voicemeeter (Standard)", strips: 3, buses: 2, supports: { A4:false, A5:false, B2:false, B3:false, EQBus:false } },
  banana:   { name: "Voicemeeter Banana",     strips: 5, buses: 5, supports: { A4:true,  A5:true,  B2:true,  B3:true,  EQBus:true  } },
  potato:   { name: "Voicemeeter Potato",     strips: 8, buses: 8, supports: { A4:true,  A5:true,  B2:true,  B3:true,  EQBus:true  } },
};

// i18n
const LANG = {
  en: {
    title: "Voicemeeter Macro Buttons Command Generator",
    subtitle: "Single-view, tri-state menus, real-time command preview/exports with language switch",
    versionLabel: "Version:",
    langLabel: "Language:",
    copy: "Copy",
    resetAll: "Reset All",
    help: "Help",
    panelTitle: "Visual Panel (set on the left, see diff on the right)",
    tabStrips: "Strips (Inputs)",
    tabBuses: "Buses (Outputs)",
    tabQuick: "Quick Commands / Snippets",
    tabSystem:"System / VBAN / Recorder / Patch",
    selectStrip: "Select Strip:",
    selectBus: "Select Bus:",
    gain: "Gain (dB)",
    reset: "Reset",
    panx: "Pan X",
    pany: "Pan Y",
    mono: "Mono",
    mute: "Mute",
    solo: "Solo",
    mc: "Mute Center",
    on: "ON (=1)",
    off: "OFF (=0)",
    toggle: "TOGGLE (+=1)",
    none: "—",
    add: "Add",
    copied: "Copied!",
    helpTitle: "Help / How to Use",
    close: "Close",
    helpSteps: [
      "Choose Voicemeeter version. The left panel adapts to strip/bus counts and allowed options.",
      "In Strips/Buses tabs, use the index dropdown (0..n-1) to show exactly ONE channel at a time. Edit values.",
      "The right-hand preview outputs only changed items (no defaults).",
      "Use Quick / System to append extra lines (Wait, Command.*, VBAN, Recorder...). They are merged into Final Output."
    ],
    "footer-note": "This tool generates Remote/MacroButtons commands only; it does not directly control Voicemeeter.",
  },
  zh: {
    title: "Voicemeeter Macro Buttons 指令生成器",
    subtitle: "單頁視圖、三態選單、即時預覽與匯出，支援語言切換",
    versionLabel: "版本：",
    langLabel: "語言：",
    copy: "複製",
    resetAll: "全部重置",
    help: "說明",
    panelTitle: "可視化面板（左邊設定，右邊立即顯示差異）",
    tabStrips: "Strips (輸入)",
    tabBuses: "Buses (輸出)",
    tabQuick: "快速命令 / 片段",
    tabSystem:"系統 / VBAN / 錄音機 / 補丁",
    selectStrip: "選擇 Strip：",
    selectBus: "選擇 Bus：",
    gain: "增益 (dB)",
    reset: "重置",
    panx: "Pan X",
    pany: "Pan Y",
    mono: "Mono",
    mute: "Mute",
    solo: "Solo",
    mc: "Mute Center",
    on: "ON (=1)",
    off: "OFF (=0)",
    toggle: "切換 (+=1)",
    none: "—",
    add: "加入",
    copied: "已複製！",
    helpTitle: "說明 / 使用方式",
    close: "關閉",
    helpSteps: [
      "右上角選擇 Voicemeeter 版本。左側面板會依版本調整條數與可用項。",
      "在 Strips/Buses 分頁用索引下拉（0..n-1）只顯示一個目標，然後編輯。",
      "右側即時預覽只會輸出你有設定的項目（不會出現未變更值）。",
      "需要 Wait、Command.*、VBAN、Recorder 等，請在相應分頁按加入，會合併到最終輸出。"
    ],
    "footer-note": "此工具只會產生 Remote/MacroButtons 指令，不會直接控制 Voicemeeter。",
  }
};

let uiLang = "en";

// Tri-state helpers: null = don't output, 1 = ON (=1), 0 = OFF (=0), 2 = TOGGLE (+=1)
const parseTri = (v) => (v === "" ? null : v === "toggle" ? 2 : Number(v));

let state = {
  version: "standard",
  selectedStrip: 0,
  selectedBus: 0,
  panel: { strips: [], buses: [] },
  customLines: [],
};

function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

function t(key){ return LANG[uiLang][key]; }

function i18nStaticTexts() {
  const set = (sel, key) => { const el = $(sel); if (el) el.textContent = t(key); };
  const setPlain = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };

  [
    ["#t-title", "title"],
    ["#t-subtitle", "subtitle"],
    ["#t-version-label", "versionLabel"],
    ["#t-lang-label", "langLabel"],
    ["#copyBtn", "copy"],
    ["#resetBtn", "resetAll"],
    ["#helpBtn", "help"],
    ["#t-panel-title", "panelTitle"],
    ["#t-tab-strips", "tabStrips"],
    ["#t-tab-buses", "tabBuses"],
    ["#t-tab-quick", "tabQuick"],
    ["#t-tab-system", "tabSystem"],
    ["#t-select-strip", "selectStrip"],
    ["#t-select-bus", "selectBus"],
    ["#t-footer-note", "footer-note"],
    ["#t-help-title", "helpTitle"],
    ["#t-close", "close"],
  ].forEach(([sel, key]) => set(sel, key));

  const stepsEl = $("#t-help-steps");
  if (stepsEl) {
    const steps = LANG[uiLang].helpSteps.map(s => `<li>${s}</li>`).join("");
    stepsEl.innerHTML = steps;
  }

  // Quick panel labels
  setPlain("#t-q-mute-title", uiLang==="en"?"Mute / Unmute / Toggle":"靜音 / 解除靜音 / 切換");
  setPlain("#t-q-strip-index", uiLang==="en"?"Strip Index":"Strip 索引");
  setPlain("#t-q-action", uiLang==="en"?"Action":"操作");
  set("#qcMuteAdd", "add");
  setPlain("#t-q-gain-title", uiLang==="en"?"Strip Gain / Fade":"Strip 增益 / 漸變");
  setPlain("#t-q-strip-index-2", uiLang==="en"?"Strip Index":"Strip 索引");
  setPlain("#t-q-gain-db", uiLang==="en"?"Target Gain (dB)":"目標增益 (dB)");
  setPlain("#t-q-gain-ms", uiLang==="en"?"Fade Time (ms)":"漸變時間 (ms)");
  set("#qcGainAdd", "add");
  setPlain("#t-q-assign-title", uiLang==="en"?"Assign to Bus (A1..A5 / B1..B3)":"指派到 Bus（A1..A5 / B1..B3）");
  setPlain("#t-q-strip-index-3", uiLang==="en"?"Strip Index":"Strip 索引");
  setPlain("#t-q-target", uiLang==="en"?"Target":"目標");
  setPlain("#t-q-value", uiLang==="en"?"Value":"值");
  set("#qcAssignAdd", "add");
  setPlain("#t-q-cmd-title", uiLang==="en"?"Special Commands (Command.*)":"特殊命令（Command.*）");
  setPlain("#t-q-cmd", "Command");
  setPlain("#t-q-valpath", uiLang==="en"?"Value / Path":"值 / 路徑");
  set("#qcCmdAdd", "add");
  setPlain("#t-q-wait-title", uiLang==="en"?"Wait Sequence (ms)":"Wait 序列（毫秒）");
  setPlain("#t-q-wait", uiLang==="en"?"Wait Time":"等待時間");
  set("#qcWaitAdd", "add");
}

function setPanelSubtitle() {
  const v = VERSIONS[state.version];
  $("#panelSubtitle").textContent = `${v.name} · Strips: ${v.strips} · Buses: ${v.buses}`;
}

function buildTabs() {
  $all(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $all(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const id = tab.dataset.tab;
      $all(".tabpane").forEach(p => p.classList.remove("active"));
      $("#tab-" + id).classList.add("active");
    });
  });
}

function defaultsForStrip() {
  return {
    mono: null, mute: null, solo: null, mc: null,
    gain: 0.0, panx: 0.0, pany: 0.5,
    assigns: { A1:null, A2:null, A3:null, A4:null, A5:null, B1:null, B2:null, B3:null }
  };
}
function defaultsForBus() {
  return {
    mono: null, mute: null, eqon: null, eqab: null,
    gain: 0.0,
    modes: { normal:null, Amix:null, Bmix:null, Repeat:null, Composite:null, TVMix:null, UpMix21:null, UpMix41:null, UpMix61:null, CenterOnly:null, LFEOnly:null, RearOnly:null }
  };
}

function initPanelValues() {
  const v = VERSIONS[state.version];
  state.panel.strips = Array.from({length:v.strips}, () => defaultsForStrip());
  state.panel.buses  = Array.from({length:v.buses},  () => defaultsForBus());
  state.selectedStrip = 0;
  state.selectedBus = 0;
}

function triOptions(includeToggle=false) {
  return `<option value="">${t("none")}</option>
          <option value="1">${t("on")}</option>
          <option value="0">${t("off")}</option>
          ${includeToggle ? `<option value="toggle">${t("toggle")}</option>` : ""}`;
}

function createTriSelect({key, includeToggle=false}) {
  return `<select class="tri" data-key="${key}">${triOptions(includeToggle)}</select>`;
}

function createAssignSelect(assign) {
  return `<select class="tri-assign" data-assign="${assign}">${triOptions(false)}</select>`;
}

function createStripCard(i) {
  const v = VERSIONS[state.version];
  const d = defaultsForStrip();
  const el = document.createElement("div");
  el.className = "strip";
  el.innerHTML = `
    <div class="hdr">
      <div>Strip ${i}</div>
      <span class="badge">INPUT</span>
    </div>

    <div class="section tri-rows">
      <div class="row"><label>${t("mono")}</label>${createTriSelect({key:"mono", includeToggle:true})}</div>
      <div class="row"><label>${t("mute")}</label>${createTriSelect({key:"mute", includeToggle:true})}</div>
      <div class="row"><label>${t("solo")}</label>${createTriSelect({key:"solo", includeToggle:true})}</div>
      <div class="row"><label>${t("mc")}</label>${createTriSelect({key:"mc", includeToggle:true})}</div>
    </div>

    <div class="section">
      <div class="range-col">
        <input type="range" class="vert-range" min="-60" max="12" step="0.1" value="${d.gain}" data-key="gain">
        <div>
          <div class="small">${t("gain")} <button type="button" class="mini ghost reset-gain">${t("reset")}</button></div>
          <div><input type="number" class="gain-val" value="${d.gain}" step="0.1" min="-60" max="12"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="kv">
        <label>${t("panx")}</label><input type="number" class="panx" min="-0.5" max="0.5" step="0.01" value="${d.panx}">
        <label>${t("pany")}</label><input type="number" class="pany" min="0" max="1" step="0.01" value="${d.pany}">
      </div>
    </div>

    <div class="section">
      <div class="kv">
        <label>A1</label>${createAssignSelect("A1")}
        <label>A2</label>${createAssignSelect("A2")}
        <label>A3</label>${createAssignSelect("A3")}
        ${v.supports.A4 ? `<label>A4</label>${createAssignSelect("A4")}` : ""}
        ${v.supports.A5 ? `<label>A5</label>${createAssignSelect("A5")}` : ""}
        <label>B1</label>${createAssignSelect("B1")}
        ${v.supports.B2 ? `<label>B2</label>${createAssignSelect("B2")}` : ""}
        ${v.supports.B3 ? `<label>B3</label>${createAssignSelect("B3")}` : ""}
      </div>
    </div>
  `;

  const st = state.panel.strips[i];
  // Gain
  const gainRange = el.querySelector(".vert-range");
  const gainVal = el.querySelector(".gain-val");
  const syncGain = () => { gainVal.value = gainRange.value; st.gain = parseFloat(gainRange.value); updatePreviews(); };
  const syncGainBack = () => { gainRange.value = gainVal.value; st.gain = parseFloat(gainVal.value); updatePreviews(); };
  gainRange.addEventListener("input", syncGain);
  gainVal.addEventListener("input", syncGainBack);
  // Gain reset
  const resetBtn = el.querySelector(".reset-gain");
  resetBtn.addEventListener("click", () => {
    st.gain = 0.0; gainRange.value = "0.0"; gainVal.value = "0.0"; updatePreviews();
  });

  // Pan
  el.querySelector(".panx").addEventListener("input", e => { st.panx = parseFloat(e.target.value); updatePreviews(); });
  el.querySelector(".pany").addEventListener("input", e => { st.pany = parseFloat(e.target.value); updatePreviews(); });

  // Tri selects
  $all("select.tri", el).forEach(sel => {
    sel.addEventListener("change", () => { st[sel.dataset.key] = parseTri(sel.value); updatePreviews(); });
  });
  $all("select.tri-assign", el).forEach(sel => {
    sel.addEventListener("change", () => { st.assigns[sel.dataset.assign] = parseTri(sel.value); updatePreviews(); });
  });

  return el;
}

function createBusCard(i) {
  const v = VERSIONS[state.version];
  const d = defaultsForBus();
  const el = document.createElement("div");
  el.className = "bus";
  el.innerHTML = `
    <div class="hdr">
      <div>Bus ${i}</div>
      <span class="badge">OUTPUT</span>
    </div>

    <div class="section tri-rows">
      <div class="row"><label>${t("mono")}</label>
        <select class="tri-bus" data-key="mono">
          ${triOptions(false)}
        </select>
      </div>
      <div class="row"><label>${t("mute")}</label>
        <select class="tri-bus" data-key="mute">
          ${triOptions(false)}
        </select>
      </div>
      <div class="row ${v.supports.EQBus ? "" : "hidden"}"><label>EQ on</label>
        <select class="tri-bus" data-key="eqon">
          ${triOptions(false)}
        </select>
      </div>
      <div class="row ${v.supports.EQBus ? "" : "hidden"}"><label>EQ A/B</label>
        <select class="tri-bus" data-key="eqab">
          <option value="">${t("none")}</option>
          <option value="1">A</option>
          <option value="0">B</option>
        </select>
      </div>
    </div>

    <div class="section">
      <div class="range-col">
        <input type="range" class="vert-range" min="-60" max="12" step="0.1" value="${d.gain}" data-key="gain">
        <div>
          <div class="small">${t("gain")} <button type="button" class="mini ghost reset-bus-gain">${t("reset")}</button></div>
          <div><input type="number" class="gain-val" value="${d.gain}" step="0.1" min="-60" max="12"></div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="kv">
        ${["normal","Amix","Bmix","Repeat","Composite","TVMix","UpMix21","UpMix41","UpMix61","CenterOnly","LFEOnly","RearOnly"]
          .map(m => (v.supports.EQBus || ["normal","Amix","Repeat","Composite"].includes(m)) ? `
            <label>${m}</label>
            <select class="tri-bus-mode" data-mode="${m}">
              ${triOptions(false)}
            </select>` : ``).join("")}
      </div>
    </div>
  `;

  const st = state.panel.buses[i];
  const gainRange = el.querySelector(".vert-range");
  const gainVal = el.querySelector(".gain-val");
  const syncGain = () => { gainVal.value = gainRange.value; st.gain = parseFloat(gainRange.value); updatePreviews(); };
  const syncGainBack = () => { gainRange.value = gainVal.value; st.gain = parseFloat(gainVal.value); updatePreviews(); };
  gainRange.addEventListener("input", syncGain);
  gainVal.addEventListener("input", syncGainBack);
  // Bus gain reset
  const resetBtn = el.querySelector(".reset-bus-gain");
  resetBtn.addEventListener("click", () => {
    st.gain = 0.0; gainRange.value = "0.0"; gainVal.value = "0.0"; updatePreviews();
  });

  $all("select.tri-bus", el).forEach(sel => {
    sel.addEventListener("change", () => { st[sel.dataset.key] = parseTri(sel.value); updatePreviews(); });
  });
  $all("select.tri-bus-mode", el).forEach(sel => {
    sel.addEventListener("change", () => { st.modes[sel.dataset.mode] = parseTri(sel.value); updatePreviews(); });
  });

  return el;
}

// Single-view rendering
function populateIndexSelect(selectEl, count, selectedIndex) {
  selectEl.innerHTML = "";
  for (let i=0; i<count; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = i;
    if (i === selectedIndex) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function renderStripSingle() {
  const v = VERSIONS[state.version];
  const idx = Math.min(state.selectedStrip, v.strips-1);
  state.selectedStrip = idx;
  $("#stripSingle").innerHTML = "";
  $("#stripSingle").appendChild(createStripCard(idx));
}

function renderBusSingle() {
  const v = VERSIONS[state.version];
  const idx = Math.min(state.selectedBus, v.buses-1);
  state.selectedBus = idx;
  $("#busSingle").innerHTML = "";
  $("#busSingle").appendChild(createBusCard(idx));
}

function buildStrips() {
  const v = VERSIONS[state.version];
  const sel = $("#stripIndexSelect");
  populateIndexSelect(sel, v.strips, state.selectedStrip);
  sel.onchange = () => { state.selectedStrip = parseInt(sel.value); renderStripSingle(); };
  renderStripSingle();
}

function buildBuses() {
  const v = VERSIONS[state.version];
  const sel = $("#busIndexSelect");
  populateIndexSelect(sel, v.buses, state.selectedBus);
  sel.onchange = () => { state.selectedBus = parseInt(sel.value); renderBusSingle(); };
  renderBusSingle();
}

// diff to lines
function stripDiffToLines(i, st) {
  const lines = [];
  for (const k of ["Mono","Mute","Solo","MC"]) {
    const key = k.toLowerCase();
    const v = st[key];
    if (v !== null) {
      if (v === 2) lines.push(`Strip(${i}).${k} += 1;`);
      else lines.push(`Strip(${i}).${k} = ${v};`);
    }
  }
  if (typeof st.gain === "number" && st.gain !== 0.0) lines.push(`Strip(${i}).Gain = ${st.gain.toFixed(1)};`);
  if (typeof st.panx === "number" && st.panx !== 0.0) lines.push(`Strip(${i}).Pan_x = ${st.panx.toFixed(2)};`);
  if (typeof st.pany === "number" && st.pany !== 0.5) lines.push(`Strip(${i}).Pan_y = ${st.pany.toFixed(2)};`);
  for (const k of Object.keys(st.assigns)) {
    const v = st.assigns[k];
    if (v === 1 || v === 0) lines.push(`Strip(${i}).${k} = ${v};`);
  }
  return lines;
}

function busDiffToLines(i, st) {
  const lines = [];
  for (const [LHS, key] of [["Mono","mono"],["Mute","mute"]]) {
    const v = st[key];
    if (v === 1 || v === 0) lines.push(`Bus(${i}).${LHS} = ${v};`);
  }
  const eqOn = st.eqon;
  if (eqOn === 1 || eqOn === 0) lines.push(`Bus(${i}).EQ.on = ${eqOn};`);
  if (st.eqab === 1 || st.eqab === 0) lines.push(`Bus(${i}).EQ.AB = ${st.eqab};`);
  if (typeof st.gain === "number" && st.gain !== 0.0) lines.push(`Bus(${i}).Gain = ${st.gain.toFixed(1)};`);
  for (const m of Object.keys(st.modes)) {
    const v = st.modes[m];
    if (v === 1 || v === 0) lines.push(`Bus(${i}).mode.${m} = ${v};`);
  }
  return lines;
}

function updatePreviews() {
  const v = VERSIONS[state.version];
  const panelLines = [];
  for (let i=0;i<v.strips;i++) panelLines.push(...stripDiffToLines(i, state.panel.strips[i]));
  for (let j=0;j<v.buses;j++)  panelLines.push(...busDiffToLines(j, state.panel.buses[j]));
  const final = [...panelLines, ...(state.customLines.length?[""]:[]), ...state.customLines];
  $("#finalPreview").textContent = final.join("\n");
}

// Quick & System
function setupQuick() {
  const prevMute = () => {
    const i = parseInt($("#qcMuteStripIndex").value);
    const action = $("#qcMuteAction").value;
    let line = "";
    if (action === "on") line = `Strip(${i}).mute = 1;`;
    else if (action === "off") line = `Strip(${i}).mute = 0;`;
    else line = `Strip(${i}).mute += 1;`;
    $("#qcMutePreview").textContent = line; return [line];
  };
  $("#qcMuteStripIndex, #qcMuteAction").addEventListener("input", prevMute);
  $("#qcMuteAdd").addEventListener("click", () => { state.customLines.push(...prevMute()); updatePreviews(); });

  const prevGain = () => {
    const i = parseInt($("#qcGainStripIndex").value);
    const db = parseFloat($("#qcGainDb").value);
    const ms = parseInt($("#qcGainMs").value);
    const line = `Strip(${i}).FadeTo = (${db.toFixed(1)}, ${ms});`;
    $("#qcGainPreview").textContent = line; return [line];
  };
  ["#qcGainStripIndex","#qcGainDb","#qcGainMs"].forEach(sel => $(sel).addEventListener("input", prevGain));
  $("#qcGainAdd").addEventListener("click", () => { state.customLines.push(...prevGain()); updatePreviews(); });

  const prevAssign = () => {
    const i = parseInt($("#qcAssignStripIndex").value);
    const t = $("#qcAssignTarget").value;
    const val = $("#qcAssignValue").value;
    const line = `Strip(${i}).${t} = ${val};`;
    $("#qcAssignPreview").textContent = line; return [line];
  };
  ["#qcAssignStripIndex","#qcAssignTarget","#qcAssignValue"].forEach(sel => $(sel).addEventListener("input", prevAssign));
  $("#qcAssignAdd").addEventListener("click", () => { state.customLines.push(...prevAssign()); updatePreviews(); });

  const prevCmd = () => {
    const name = $("#qcCmdName").value;
    let val = $("#qcCmdValue").value.trim();
    if (!val) val = "1";
    let line = "";
    if (/^\".*\"$/.test(val) || /^[\d\.\-]+$/.test(val)) line = `Command.${name} = ${val};`;
    else line = `Command.${name} = "${val.replace(/\\/g,"\\\\").replace(/"/g,'\\"')}";`;
    $("#qcCmdPreview").textContent = line; return [line];
  };
  $("#qcCmdName, #qcCmdValue").addEventListener("input", prevCmd);
  $("#qcCmdAdd").addEventListener("click", () => { state.customLines.push(...prevCmd()); updatePreviews(); });

  const prevWait = () => {
    const ms = parseInt($("#qcWaitMs").value);
    const line = `Wait(${ms});`;
    $("#qcWaitPreview").textContent = line; return [line];
  };
  $("#qcWaitMs").addEventListener("input", prevWait);
  $("#qcWaitAdd").addEventListener("click", () => { state.customLines.push(...prevWait()); updatePreviews(); });
}

function setupSystemInsertButtons() {
  $all("#tab-system .mini.ghost").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const tmpl = btn.dataset.insert;
      const row = btn.closest(".row");
      let valInput = row.querySelector("input, select");
      let val = valInput ? (valInput.value ?? "") : "";
      let payload = tmpl.replace("{{VAL}}", val);
      if (/Option.sr /.test(payload)) {
        const n = parseFloat(val);
        payload = `Option.sr = ${n}; // kHz`;
      }
      if (!payload.endsWith(";")) payload += ";";
      state.customLines.push(payload);
      updatePreviews();
    });
  });
}

function copyPreview() {
  const text = $("#finalPreview").textContent;
  navigator.clipboard.writeText(text).then(() => alert(LANG[uiLang].copied));
}

function resetAll() {
  if (!confirm(uiLang==="en"?"Reset all states and custom snippets?":"確定要重置所有狀態與自訂片段？")) return;
  initPanelValues();
  buildStrips(); buildBuses();
  state.customLines = [];
  setPanelSubtitle();
  updatePreviews();
}

function onVersionChanged() {
  state.version = $("#versionSelect").value;
  initPanelValues();
  buildStrips(); buildBuses();
  setPanelSubtitle();
  updatePreviews();
}

function onLangChanged() {
  uiLang = $("#langSelect").value;
  i18nStaticTexts();
  // Re-render dynamic cards so labels/buttons adopt new language
  buildStrips();
  buildBuses();
  setPanelSubtitle();
  updatePreviews();
}

function setupHelp() {
  $("#helpBtn").addEventListener("click", () => $("#helpDialog").showModal());
}

function buildTabs() {
  $all(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $all(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const id = tab.dataset.tab;
      $all(".tabpane").forEach(p => p.classList.remove("active"));
      $("#tab-" + id).classList.add("active");
    });
  });
}

function init() {
  buildTabs();
  setupQuick();
  setupSystemInsertButtons();
  setupHelp();

  $("#versionSelect").addEventListener("change", onVersionChanged);
  $("#langSelect").addEventListener("change", onLangChanged);
  $("#copyBtn").addEventListener("click", copyPreview);
  $("#resetBtn").addEventListener("click", resetAll);

  initPanelValues();
  buildStrips();
  buildBuses();
  i18nStaticTexts();
  setPanelSubtitle();
  updatePreviews();
}

document.addEventListener("DOMContentLoaded", init);
