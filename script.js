import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getDatabase, ref, onValue, update, remove, push, set, serverTimestamp, onDisconnect } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

const firebaseConfig = { 
    apiKey: "AIzaSyCmfUxwaeAyoTTlLvU6qHwT22MGtcLa2aU", 
    databaseURL: "https://mis-tracker-83357-default-rtdb.asia-southeast1.firebasedatabase.app", 
    projectId: "mis-tracker-83357" 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const dbRef = ref(db, 'client_records');
const capRef = ref(db, 'captured_folders');

let rawData = null; 
let capturedData = {};
let expandedBranches = {}; // Global state to track expanded branch summary cards
const branches = ["Balingasag - Main2", "Balingoan - Main2", "Camiguin - Main2", "Claveria - Main2", "Gingoog - Main2", "Salay - Main"];
const products = ["Mauswagon Reloan", "Supplemental Reloan", "New Supplemental", "Newloan", "Balik RMF", "Saver's"];

// Populate Branch Select
const branchSelect = document.getElementById('fBranch');
if (branchSelect) {
    branches.forEach(b => branchSelect.add(new Option(b, b)));
}

setInterval(() => { 
    const clock = document.getElementById('live-clock');
    if(clock) clock.innerText = new Date().toLocaleString(); 
}, 1000);

// --- AUTHENTICATION & PRESENCE LOGIC ---
let isFirstLoad = true;

onAuthStateChanged(auth, (user) => {
    if (user) {
        const userName = user.email.split('@')[0].toUpperCase();
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'flex';
        document.getElementById('current-user').innerText = userName;

        managePresence(user.uid, userName);
        listenForUsers();

        onValue(dbRef, (snap) => { rawData = snap.val(); renderDashboard(); });
        onValue(capRef, (snap) => { 
            capturedData = snap.val() || {}; 
            renderDashboard(); 
            if(document.getElementById('capturedModalOverlay').style.display === 'flex') renderCapturedGrid(); 
        });

        if(!isFirstLoad) showToast(`WELCOME BACK, ${userName}`);
        isFirstLoad = false;
    } else {
        document.getElementById('login-overlay').style.display = 'flex';
        document.getElementById('app-wrapper').style.display = 'none';
        isFirstLoad = false;
    }
});

document.getElementById('loginBtn').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('pass').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert("⚠️ ACCESS DENIED: Invalid Credentials"));
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

function managePresence(uid, name) {
    const userStatusRef = ref(db, `online_users/${uid}`);
    const connectedRef = ref(db, ".info/connected");
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            onDisconnect(userStatusRef).remove();
            set(userStatusRef, { name: name, lastActive: Date.now() });
        }
    });
}

function listenForUsers() {
    const listContainer = document.getElementById('active-users-list');
    onValue(ref(db, 'online_users'), (snapshot) => {
        listContainer.innerHTML = '';
        const users = snapshot.val() || {};
        Object.values(users).forEach(u => {
            if (u && u.name && u.name !== "UNDEFINED" && u.name.trim() !== "") {
                const item = document.createElement('div');
                item.className = 'user-pill';
                item.innerHTML = `<span class="status-dot"></span> ${u.name}`;
                listContainer.appendChild(item);
            }
        });
    });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 3000);
}

// --- DASHBOARD LOGIC ---
const fmt = (n) => n === 0 ? "" : n;
const getTooltipText = (o) => Object.entries(o).filter(([k,v]) => v > 0).map(([k,v]) => `${k}: ${v}`).join('\n') || "No data";

window.toggleBranchExpand = function(branchName) {
    expandedBranches[branchName] = !expandedBranches[branchName];
    renderDashboard();
};

window.renderDashboard = function() {
    const mBody = document.getElementById('masterBody'); 
    const sBody = document.getElementById('summaryBody');
    const sFoot = document.getElementById('summaryFooter'); 
    const query = document.getElementById('searchBar').value.toLowerCase();
    const selBranch = document.getElementById('filterBranch').value;
    const selDay = document.getElementById('filterDay').value;
    const selStatus = document.getElementById('filterStatus').value;
    
    const filterSetEl = document.getElementById('filterSet');
    const selSet = filterSetEl ? filterSetEl.value.trim().toUpperCase() : "";
    
    mBody.innerHTML = ""; sBody.innerHTML = ""; sFoot.innerHTML = "";
    
    let stats = {};
    let area = { 
        prospects: 0, approached: 0, captured: 0, applied: 0, manualApplied: 0, claimed: 0, clmdP: 0,
        capR: 0, capN: 0,
        prosDetail: {}, appliedDetail: {}, manualAppliedDetail: {}, claimedDetail: {},
        appStatus: { applied: 0, claimed: 0 },
        apprCounts: { a1: 0, a2: 0, a3: 0, a4: 0 },
        convDetail: { appClmd: 0, appNotClmd: 0, directClmd: 0 },
        capConvDetail: { rClmd: 0, nClmd: 0, rNotClmd: 0, nNotClmd: 0 }
    };

    let dynamicImportedOfficers = new Set();

    branches.forEach(b => {
        let bCapR = 0, bCapN = 0;
        for(let d=1; d<=31; d++) { 
            bCapR += parseInt(capturedData[`${b}_Reloan_${d}`] || 0); 
            bCapN += parseInt(capturedData[`${b}_Newloan_${d}`] || 0); 
        }
        stats[b] = { 
            prospects: 0, approached: 0, captured: (bCapR + bCapN), applied: 0, manualApplied: 0, claimed: 0, clmdP: 0,
            capR: bCapR, capN: bCapN,
            prosDetail: {}, appliedDetail: {}, manualAppliedDetail: {}, claimedDetail: {},
            appStatus: { applied: 0, claimed: 0 },
            apprCounts: { a1: 0, a2: 0, a3: 0, a4: 0 },
            convDetail: { appClmd: 0, appNotClmd: 0, directClmd: 0 },
            capConvDetail: { rClmd: 0, nClmd: 0, rNotClmd: 0, nNotClmd: 0 },
            officers: {}, 
            sets: {} 
        };
        area.captured += (bCapR + bCapN); area.capR += bCapR; area.capN += bCapN;
    });

    if (rawData) {
        Object.entries(rawData).reverse().forEach(([id, rec]) => {
            const status = rec.status || "Select"; 
            const pId = rec.productId;
            const isReloan = pId?.includes("Reloan");
            const recordSet = rec.setNum ? String(rec.setNum).trim().toUpperCase() : "";
            
            const matchBranch = (selBranch === "" || rec.branch === selBranch);
            const matchDay = (selDay === "" || rec.meetingDay === selDay);
            const matchStatus = (selStatus === "" || status === selStatus);
            const matchSet = (selSet === "" || recordSet === selSet || recordSet.includes(selSet));

            if (stats[rec.branch]) {
                const s = stats[rec.branch];
                
                // Track details on Officer Level
                const offKey = rec.officer ? rec.officer.trim().toUpperCase() : "UNASSIGNED";
                if (!s.officers[offKey]) {
                    s.officers[offKey] = { prospects: 0, approached: 0, applied: 0, manualApplied: 0, claimed: 0, clmdP: 0 };
                }
                const o = s.officers[offKey];

                // Track details on Set Level
                const setKey = recordSet ? `SET ${recordSet}` : "NO SET";
                if (!s.sets[setKey]) {
                    s.sets[setKey] = { prospects: 0, approached: 0, applied: 0, manualApplied: 0, claimed: 0, clmdP: 0 };
                }
                const st = s.sets[setKey];

                const isAppr = (rec.approaches?.a1 || rec.approaches?.a2 || rec.approaches?.a3 || rec.approaches?.a4);
                const map = { 'Applied':'applied','Claimed':'claimed' };
                const key = map[status];

                if (rec.source === 'import') {
                    s.prospects++; area.prospects++;
                    o.prospects++; st.prospects++;
                    s.prosDetail[pId] = (s.prosDetail[pId] || 0) + 1;
                    area.prosDetail[pId] = (area.prosDetail[pId] || 0) + 1;
                    
                    if (rec.officer && offKey !== "UNASSIGNED" && offKey !== "N/A") {
                        dynamicImportedOfficers.add(rec.officer.trim().toUpperCase());
                    }

                    if (isAppr) {
                        s.approached++; area.approached++;
                        o.approached++; st.approached++;
                        
                        if (rec.approaches?.a1) { s.apprCounts.a1++; area.apprCounts.a1++; }
                        if (rec.approaches?.a2) { s.apprCounts.a2++; area.apprCounts.a2++; }
                        if (rec.approaches?.a3) { s.apprCounts.a3++; area.apprCounts.a3++; }
                        if (rec.approaches?.a4) { s.apprCounts.a4++; area.apprCounts.a4++; }

                        if (key) { s.appStatus[key]++; area.appStatus[key]++; }
                        if (status === 'Claimed') { 
                            s.clmdP++; area.clmdP++; 
                            o.clmdP++; st.clmdP++;
                            s.convDetail.appClmd++; area.convDetail.appClmd++;
                        } else {
                            s.convDetail.appNotClmd++; area.convDetail.appNotClmd++;
                        }
                    } else if (status === 'Claimed') {
                        s.convDetail.directClmd++; area.convDetail.directClmd++;
                    }

                    if (status === 'Applied') {
                        s.applied++; area.applied++;
                        o.applied++; st.applied++;
                        s.appliedDetail[pId] = (s.appliedDetail[pId] || 0) + 1;
                        area.appliedDetail[pId] = (area.appliedDetail[pId] || 0) + 1;
                    }
                } 
                else if (rec.source === 'manual' || !rec.source) {
                    if (status === 'Applied') {
                        s.manualApplied++; area.manualApplied++;
                        o.manualApplied++; st.manualApplied++;
                        s.manualAppliedDetail[pId] = (s.manualAppliedDetail[pId] || 0) + 1;
                        area.manualAppliedDetail[pId] = (area.manualAppliedDetail[pId] || 0) + 1;
                    }
                }

                if (status === 'Claimed') {
                    s.claimed++; area.claimed++;
                    o.claimed++; st.claimed++;
                    s.claimedDetail[pId] = (s.claimedDetail[pId] || 0) + 1;
                    area.claimedDetail[pId] = (area.claimedDetail[pId] || 0) + 1;

                    if (isReloan) { s.capConvDetail.rClmd++; area.capConvDetail.rClmd++; }
                    else { s.capConvDetail.nClmd++; area.capConvDetail.nClmd++; }
                }
            }

            const matchSearch = (rec.clientName?.toLowerCase().includes(query) || rec.officer?.toLowerCase().includes(query) || rec.branch?.toLowerCase().includes(query) || rec.centre?.toLowerCase().includes(query) || rec.setNum?.toLowerCase().includes(query) || rec.contactNum?.toLowerCase().includes(query));
            
            if (matchSearch && matchBranch && matchDay && matchStatus && matchSet) {
                let rCls = ""; 
                if (rec.isDefault === "1" || rec.isDefault?.toLowerCase() === "df" || rec.isDefault?.toLowerCase() === "yes") rCls = 'row-default';
                else if (status === 'Claimed') rCls = 'row-claimed'; 
                else if (status === 'Applied') rCls = 'row-process';

                let apprDisp = (rec.source === 'import') ? 
                    `<input type="checkbox" ${rec.approaches?.a1?'checked':''} onchange="upAppr('${id}',1,this.checked)">
                     <input type="checkbox" ${rec.approaches?.a2?'checked':''} onchange="upAppr('${id}',2,this.checked)">
                     <input type="checkbox" ${rec.approaches?.a3?'checked':''} onchange="upAppr('${id}',3,this.checked)">
                     <input type="checkbox" ${rec.approaches?.a4?'checked':''} onchange="upAppr('${id}',4,this.checked)">` : `<small>From Manual Entry</small>`;
                
                let setDisplay = rec.setNum ? ` / Set: ${rec.setNum}` : '';
                let contactDisplay = rec.contactNum ? `<br><small style="color: #94a3b8;">📞 ${rec.contactNum}</small>` : '';

                mBody.insertAdjacentHTML('beforeend', `<tr class="${rCls}"><td>${rec.branch}<br>${rec.meetingDay || ''} / ${rec.centre || ''}${setDisplay}</td><td><strong>${rec.clientName}</strong> <span onclick="navigator.clipboard.writeText('${rec.clientName}')" style="cursor:pointer">📋</span><br><small>${rec.officer}</small>${contactDisplay}</td><td>${rec.productId}</td><td>${apprDisp}</td><td>${rec.isDefault||''}</td><td><select onchange="updateStatus('${id}', this.value)" class="input-styled"><option value="Select">...</option><option value="Applied" ${status==='Applied'?'selected':''}>Applied</option><option value="Claimed" ${status==='Claimed'?'selected':''}>Claimed</option></select></td><td><input type="text" value="${rec.remarks||''}" onblur="updateRemarks('${id}', this.value)" style="width:100%; border:none; background:transparent; color:inherit;"></td><td><button onclick="delRec('${id}')" style="background:none; border:none; cursor:pointer;">🗑️</button></td></tr>`);
            }
        });
    }

    const officerSelectEl = document.getElementById('fOfficer');
    if (officerSelectEl) {
        const primarySelectedValue = officerSelectEl.value; 
        officerSelectEl.innerHTML = '<option value="" disabled selected>Select Trust Staff Officer...</option>';
        Array.from(dynamicImportedOfficers).sort().forEach(officerName => {
            officerSelectEl.add(new Option(officerName, officerName));
        });
        if (primarySelectedValue && dynamicImportedOfficers.has(primarySelectedValue)) {
            officerSelectEl.value = primarySelectedValue;
        }
    }

    branches.forEach(b => {
        const s = stats[b];
        const conv = s.approached > 0 ? Math.round((s.clmdP / s.approached) * 100) : 0;
        
        const totalApplied = s.applied + s.manualApplied;
        const appliedToClaimedConv = totalApplied > 0 ? Math.round((s.claimed / totalApplied) * 100) : 0;

        const p1 = s.prospects > 0 ? Math.round((s.apprCounts.a1 / s.prospects) * 100) : 0;
        const p2 = s.apprCounts.a1 > 0 ? Math.round((s.apprCounts.a2 / s.apprCounts.a1) * 100) : 0;
        const p3 = s.apprCounts.a2 > 0 ? Math.round((s.apprCounts.a3 / s.apprCounts.a2) * 100) : 0;
        const p4 = s.apprCounts.a3 > 0 ? Math.round((s.apprCounts.a4 / s.apprCounts.a3) * 100) : 0;

        const appTooltip = `[APPROACHED ANALYSIS]\n1st Apps : ${s.apprCounts.a1} (${p1}%)\n2nd Apps : ${s.apprCounts.a2} (${p2}%)\n3rd Apps : ${s.apprCounts.a3} (${p3}%)\n4th Apps : ${s.apprCounts.a4} (${p4}%)\n\n[STATUS BREAKDOWN]\nApplied: ${s.appStatus.applied}\nClaimed: ${s.appStatus.claimed}`;

        const rowClass = (b === "Balingasag - Main2" || b === "Balingoan - Main2") ? "tooltip-top" : "";
        const isExpanded = !!expandedBranches[b];
        const toggleIndicator = isExpanded ? "▼ " : "▶ ";

        sBody.insertAdjacentHTML('beforeend', `
            <tr style="background: ${isExpanded ? 'rgba(56, 189, 248, 0.05)' : 'transparent'}">
                <td style="text-align:left; font-weight:600;" class="clickable-branch" onclick="toggleBranchExpand('${b}')">
                    ${toggleIndicator}${b}
                </td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.prosDetail)}">${fmt(s.prospects)}</td>
                <td class="${rowClass}" data-tooltip="${appTooltip}">${fmt(s.approached)}</td>
                <td class="${rowClass}" data-tooltip="App. Converted: ${s.convDetail.appClmd}\nApp. Not Converted: ${s.convDetail.appNotClmd}\nConv. But Not Appr: ${s.convDetail.directClmd}" style="color:var(--brand-accent); font-weight:700;">${conv ? conv+'%' : ''}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.appliedDetail)}">${fmt(s.applied)}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.manualAppliedDetail)}" style="color:#60a5fa;">${fmt(s.manualApplied)}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.claimedDetail)}">${fmt(s.claimed)}</td>
                <td class="${rowClass} tooltip-edge" style="color:#10b981; font-weight:700;">${appliedToClaimedConv ? appliedToClaimedConv + '%' : ''}</td>
            </tr>`);

        if (isExpanded) {
            // 1. Render Officers Summary first
            const sortedOfficers = Object.entries(s.officers).sort((x, y) => x[0].localeCompare(y[0]));
            if (sortedOfficers.length === 0) {
                sBody.insertAdjacentHTML('beforeend', `
                    <tr class="officer-row"><td colspan="8" style="text-align:left; padding-left:30px; color:var(--text-dim);">No operational tracking records found for officers.</td></tr>
                `);
            } else {
                sortedOfficers.forEach(([name, o]) => {
                    const oConv = o.approached > 0 ? Math.round((o.clmdP / o.approached) * 100) : 0;
                    const oTotalApplied = o.applied + o.manualApplied;
                    const oAppliedToClaimed = oTotalApplied > 0 ? Math.round((o.claimed / oTotalApplied) * 100) : 0;

                    sBody.insertAdjacentHTML('beforeend', `
                        <tr class="officer-row">
                            <td style="text-align:left; padding-left:25px; font-weight:500; color:#94a3b8;">👤 ${name}</td>
                            <td>${fmt(o.prospects)}</td>
                            <td>${fmt(o.approached)}</td>
                            <td style="color:var(--brand-accent); opacity:0.85;">${oConv ? oConv + '%' : ''}</td>
                            <td>${fmt(o.applied)}</td>
                            <td style="color:#60a5fa; opacity:0.85;">${fmt(o.manualApplied)}</td>
                            <td>${fmt(o.claimed)}</td>
                            <td style="color:#10b981; opacity:0.85;">${oAppliedToClaimed ? oAppliedToClaimed + '%' : ''}</td>
                        </tr>`);
                });
            }

            // 2. Render Sets Summary below the officers
            const sortedSets = Object.entries(s.sets).sort((x, y) => x[0].localeCompare(y[0]));
            if (sortedSets.length > 0) {
                sortedSets.forEach(([setName, st]) => {
                    const stConv = st.approached > 0 ? Math.round((st.clmdP / st.approached) * 100) : 0;
                    const stTotalApplied = st.applied + st.manualApplied;
                    const stAppliedToClaimed = stTotalApplied > 0 ? Math.round((st.claimed / stTotalApplied) * 100) : 0;

                    sBody.insertAdjacentHTML('beforeend', `
                        <tr class="set-row" style="background: rgba(255, 255, 255, 0.015);">
                            <td style="text-align:left; padding-left:35px; font-style:italic; font-weight:600; color:#38bdf8;">📂 ${setName}</td>
                            <td>${fmt(st.prospects)}</td>
                            <td>${fmt(st.approached)}</td>
                            <td style="color:var(--brand-accent); opacity:0.75;">${stConv ? stConv + '%' : ''}</td>
                            <td>${fmt(st.applied)}</td>
                            <td style="color:#60a5fa; opacity:0.75;">${fmt(st.manualApplied)}</td>
                            <td>${fmt(st.claimed)}</td>
                            <td style="color:#10b981; opacity:0.75;">${stAppliedToClaimed ? stAppliedToClaimed + '%' : ''}</td>
                        </tr>`);
                });
            }
        }
    });

    const areaConv = area.approached > 0 ? Math.round((area.clmdP / area.approached) * 100) : 0;
    const totalAreaApplied = area.applied + area.manualApplied;
    const areaAppliedToClaimedConv = totalAreaApplied > 0 ? Math.round((area.claimed / totalAreaApplied) * 100) : 0;

    const ap1 = area.prospects > 0 ? Math.round((area.apprCounts.a1 / area.prospects) * 100) : 0;
    const ap2 = area.apprCounts.a1 > 0 ? Math.round((area.apprCounts.a2 / area.apprCounts.a1) * 100) : 0;
    const ap3 = area.apprCounts.a2 > 0 ? Math.round((area.apprCounts.a3 / area.apprCounts.a2) * 100) : 0;
    const ap4 = area.apprCounts.a3 > 0 ? Math.round((area.apprCounts.a4 / area.apprCounts.a3) * 100) : 0;

    const areaAppTooltip = `[Area Approached]\n1st Apps: ${area.apprCounts.a1} (${ap1}%)\n2nd Apps : ${area.apprCounts.a2} (${ap2}%)\n3rd Apps : ${area.apprCounts.a3} (${ap3}%)\n4th Apps : ${area.apprCounts.a4} (${ap4}%)\n\n[STATUS BREAKDOWN]\nApplied: ${area.appStatus.applied}\nClaimed: ${area.appStatus.claimed}`;

    sFoot.innerHTML = `
        <tr style="background:#020617; color:var(--brand-accent); font-weight:800;">
            <td style="text-align:left;">AREA TOTAL</td>
            <td data-tooltip="${getTooltipText(area.prosDetail)}">${area.prospects}</td>
            <td data-tooltip="${areaAppTooltip}">${area.approached}</td>
            <td data-tooltip="App. Converted: ${area.convDetail.appClmd}\nApp. Not Converted: ${area.convDetail.appNotClmd}\nConv. But Not Appr: ${area.convDetail.directClmd}">${areaConv ? areaConv+'%' : ''}</td>
            <td data-tooltip="${getTooltipText(area.appliedDetail)}">${area.applied}</td>
            <td data-tooltip="${getTooltipText(area.manualAppliedDetail)}" style="color:#60a5fa;">${area.manualApplied}</td>
            <td data-tooltip="${getTooltipText(area.claimedDetail)}">${area.claimed}</td>
            <td class="tooltip-edge" style="color:#10b981;">${areaAppliedToClaimedConv ? areaAppliedToClaimedConv + '%' : ''}</td>
        </tr>`;
    
    const sidebarBody = document.getElementById('sidebarProductBody');
    if (sidebarBody) {
        sidebarBody.innerHTML = Object.entries(area.manualAppliedDetail).map(([prod, count]) => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05)">
                <td style="padding: 6px 0; font-weight:500;">${prod}</td>
                <td style="text-align: right; color:var(--brand-accent); font-weight:700;">${count}</td>
            </tr>`).join('') || `<tr><td style="color:var(--text-dim); text-align:center; padding:10px;">No entries</td></tr>`;
    }
};

window.processFile = function(file) {
    if (!file) return; const reader = new FileReader(); 
    reader.onload = async function(e) {
        const workbook = XLSX.read(e.target.result, { type: 'binary' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); const headers = rows[0].map(h => String(h).toLowerCase().trim()); const dataRows = rows.slice(1);
        const findIdx = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));
        
        const idx = { 
            branch: findIdx(['br','office']), 
            client: findIdx(['clie','name']), 
            officer: findIdx(['ts','officer']), 
            product: findIdx(['prod','loan']), 
            centre: findIdx(['cent','group']), 
            day: findIdx(['day','sch']), 
            def: findIdx(['def','df']),
            setNum: findIdx(['set']), 
            contactNum: findIdx(['contact','phone','number','cell']) 
        };
        
        for (let i = 0; i < dataRows.length; i++) {
            const r = dataRows[i]; if (!r) continue;
            await push(dbRef, { 
                branch: idx.branch!==-1?r[idx.branch]:"Unspecified", 
                clientName: idx.client!==-1?r[idx.client]:"N/A", 
                officer: idx.officer!==-1?r[idx.officer]:"N/A", 
                productId: idx.product!==-1?r[idx.product]:"Newloan", 
                centre: idx.centre!==-1?r[idx.centre]:"", 
                meetingDay: idx.day!==-1?r[idx.day]:"Monday", 
                isDefault: (idx.def!==-1 && r[idx.def]!=null)?String(r[idx.def]):"", 
                setNum: (idx.setNum!==-1 && r[idx.setNum]!=null)?String(r[idx.setNum]):"",
                contactNum: (idx.contactNum!==-1 && r[idx.contactNum]!=null)?String(r[idx.contactNum]):"",
                status: "Select", 
                source: "import", 
                lastUpdated: serverTimestamp() 
            });
        }
    };
    reader.readAsBinaryString(file);
};

window.openCapturedModal = () => { document.getElementById('capturedModalOverlay').style.display = 'flex'; renderCapturedGrid(); };
window.closeCapturedModal = () => { document.getElementById('capturedModalOverlay').style.display = 'none'; };

window.renderCapturedGrid = function() {
    const head = document.getElementById('capturedHead'); const body = document.getElementById('capturedBody'); const foot = document.getElementById('capturedSummary'); const cats = ["Reloan", "Newloan", "C/P Leaders Approached", "Oriented Centers"];
    head.innerHTML = `<tr><th class="frozen-intersection">BRANCH PERFORMANCE</th>${Array.from({length:31}, (_,i)=>`<th>${i+1}</th>`).join('')}</tr>`;
    body.innerHTML = ""; let areaCatTotals = { "Reloan": Array(32).fill(0), "Newloan": Array(32).fill(0), "C/P Leaders Approached": Array(32).fill(0), "Oriented Centers": Array(32).fill(0) };
    branches.forEach(b => {
        cats.forEach((cat, idx) => {
            let row = `<tr class="${idx === 3 ? 'branch-divider' : ''}"><td class="captured-row-title">${idx === 0 ? `<span style="color:var(--brand-accent)">${b}</span>` : ''}<br><small>${cat}</small></td>`;
            for(let d=1; d<=31; d++) {
                const val = capturedData[`${b}_${cat.replace('/', '_')}_${d}`] || 0; areaCatTotals[cat][d] += parseInt(val);
                row += `<td><input type="number" value="${val > 0 ? val : ''}" class="captured-input" onblur="updateCaptured('${b}','${cat}',${d},this.value)"></td>`;
            }
            body.insertAdjacentHTML('beforeend', row + "</tr>");
        });
    });
    foot.innerHTML = cats.map(cat => {
        let sRow = `<tr style="background:#020617; color:var(--brand-accent)"><td class="captured-row-title">AREA TOTAL: ${cat}</td>`;
        for(let d=1; d<=31; d++) { sRow += `<td><strong>${areaCatTotals[cat][d] || 0}</strong></td>`; }
        return sRow + "</tr>";
    }).join('');
};

window.updateCaptured = (b, cat, d, val) => { const path = `${b}_${cat.replace('/', '_')}_${d}`; if(!val) remove(ref(db, `captured_folders/${path}`)); else set(ref(db, `captured_folders/${path}`), parseInt(val)); };
window.updateStatus = (id, v) => update(ref(db, `client_records/${id}`), { status: v, lastUpdated: serverTimestamp() });
window.updateRemarks = (id, v) => update(ref(db, `client_records/${id}`), { remarks: v });
window.upAppr = (id, n, v) => set(ref(db, `client_records/${id}/approaches/a${n}`), v);
window.delRec = (id) => confirm("Delete?") && remove(ref(db, `client_records/${id}`));
window.toggleModal = (s) => document.getElementById('modalOverlay').style.display = s ? 'flex' : 'none';
window.secureAction = (type) => { if (prompt("PIN:") === "1234") { if (type === 'wipe') remove(dbRef); else if (type === 'wipeCaptured') remove(capRef); else document.getElementById('csvFileInput').click(); } };

window.validateCentre = function(input) { 
    let v = input.value.toUpperCase(); 
    input.value = v; 
    const d = document.getElementById('fDay'); 
    if (v.startsWith("MA") || v.startsWith("MB")) d.value = "Monday"; 
    else if (v.startsWith("TA") || v.startsWith("TB")) d.value = "Tuesday"; 
    else if (v.startsWith("WA") || v.startsWith("WB")) d.value = "Wednesday"; 
    else if (v.startsWith("TH")) d.value = "Thursday"; 
    else d.value = "Incorrect Format - Center Name"; 
};

const clientForm = document.getElementById('clientForm');
if (clientForm) {
    clientForm.onsubmit = (e) => { 
        e.preventDefault(); 
        const selectedOfficer = document.getElementById('fOfficer').value;
        if(!selectedOfficer) {
            alert("⚠️ Please select a valid Trust Staff Officer from the list.");
            return;
        }
        push(dbRef, { 
            branch: document.getElementById('fBranch').value, 
            clientName: document.getElementById('fClient').value, 
            officer: selectedOfficer, 
            centre: document.getElementById('fCentre').value, 
            productId: document.getElementById('fProduct').value, 
            meetingDay: document.getElementById('fDay').value, 
            setNum: "",
            contactNum: "",
            status: "Applied", 
            source: "manual" 
        }).then(() => { 
            toggleModal(false); 
            e.target.reset(); 
        }); 
    };
}
