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

    // Initialize stats & officer structures for each branch
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
            officers: {} // Sub-metrics per trust staff member
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
                const offName = rec.officer ? rec.officer.trim().toUpperCase() : "UNASSIGNED";
                
                // Initialize individual officer tracking inside the branch if not built yet
                if (!s.officers[offName]) {
                    s.officers[offName] = { prospects: 0, approached: 0, applied: 0, manualApplied: 0, claimed: 0, clmdP: 0 };
                }
                const o = s.officers[offName];

                const isAppr = (rec.approaches?.a1 || rec.approaches?.a2 || rec.approaches?.a3 || rec.approaches?.a4);
                const map = { 'Applied':'applied','Claimed':'claimed' };
                const key = map[status];

                if (rec.source === 'import') {
                    s.prospects++; area.prospects++;
                    o.prospects++;
                    s.prosDetail[pId] = (s.prosDetail[pId] || 0) + 1;
                    area.prosDetail[pId] = (area.prosDetail[pId] || 0) + 1;
                    
                    if (isAppr) {
                        s.approached++; area.approached++;
                        o.approached++;
                        
                        if (rec.approaches?.a1) { s.apprCounts.a1++; area.apprCounts.a1++; }
                        if (rec.approaches?.a2) { s.apprCounts.a2++; area.apprCounts.a2++; }
                        if (rec.approaches?.a3) { s.apprCounts.a3++; area.apprCounts.a3++; }
                        if (rec.approaches?.a4) { s.apprCounts.a4++; area.apprCounts.a4++; }

                        if (key) { s.appStatus[key]++; area.appStatus[key]++; }
                        if (status === 'Claimed') { 
                            s.clmdP++; area.clmdP++; 
                            o.clmdP++;
                            s.convDetail.appClmd++; area.convDetail.appClmd++;
                        } else {
                            s.convDetail.appNotClmd++; area.convDetail.appNotClmd++;
                        }
                    } else if (status === 'Claimed') {
                        s.convDetail.directClmd++; area.convDetail.directClmd++;
                    }

                    if (status === 'Applied') {
                        s.applied++; area.applied++;
                        o.applied++;
                        s.appliedDetail[pId] = (s.appliedDetail[pId] || 0) + 1;
                        area.appliedDetail[pId] = (area.appliedDetail[pId] || 0) + 1;
                    }
                } 
                else if (rec.source === 'manual' || !rec.source) {
                    if (status === 'Applied') {
                        s.manualApplied++; area.manualApplied++;
                        o.manualApplied++;
                        s.manualAppliedDetail[pId] = (s.manualAppliedDetail[pId] || 0) + 1;
                        area.manualAppliedDetail[pId] = (area.manualAppliedDetail[pId] || 0) + 1;
                    }
                }

                if (status === 'Claimed') {
                    s.claimed++; area.claimed++;
                    o.claimed++;
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
        const indicator = isExpanded ? "▼ " : "▶ ";

        // Branch Row (Now Clickable via `toggleBranchExpand`)
        sBody.insertAdjacentHTML('beforeend', `
            <tr style="background: ${isExpanded ? 'rgba(250,204,21,0.05)' : 'transparent'}; border-bottom: ${isExpanded ? 'none' : '1px solid rgba(255,255,255,0.05)'};">
                <td style="text-align:left; font-weight:600;" class="clickable-branch" onclick="toggleBranchExpand('${b}')">
                    ${indicator}${b}
                </td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.prosDetail)}">${fmt(s.prospects)}</td>
                <td class="${rowClass}" data-tooltip="${appTooltip}">${fmt(s.approached)}</td>
                <td class="${rowClass}" data-tooltip="App. Converted: ${s.convDetail.appClmd}\nApp. Not Converted: ${s.convDetail.appNotClmd}\nConv. But Not Appr: ${s.convDetail.directClmd}" style="color:var(--brand-accent); font-weight:700;">${conv ? conv+'%' : ''}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.appliedDetail)}">${fmt(s.applied)}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.manualAppliedDetail)}" style="color:#60a5fa;">${fmt(s.manualApplied)}</td>
                <td class="${rowClass}" data-tooltip="${getTooltipText(s.claimedDetail)}">${fmt(s.claimed)}</td>
                <td class="${rowClass} tooltip-edge" style="color:#10b981; font-weight:700;">${appliedToClaimedConv ? appliedToClaimedConv + '%' : ''}</td>
            </tr>`);

        // If the branch is clicked/expanded, inject rows right under it for each officer
        if (isExpanded) {
            Object.entries(s.officers).sort((x,y) => x[0].localeCompare(y[0])).forEach(([offName, o]) => {
                const oConv = o.approached > 0 ? Math.round((o.clmdP / o.approached) * 100) : 0;
                const oTotalApp = o.applied + o.manualApplied;
                const oAppToClm = oTotalApp > 0 ? Math.round((o.claimed / oTotalApp) * 100) : 0;

                sBody.insertAdjacentHTML('beforeend', `
                    <tr class="officer-row">
                        <td style="text-align:left; padding-left: 25px; color:#94a3b8; font-style: italic;">👤 ${offName}</td>
                        <td>${fmt(o.prospects)}</td>
                        <td>${fmt(o.approached)}</td>
                        <td style="color:var(--brand-accent); opacity:0.8;">${oConv ? oConv+'%' : ''}</td>
                        <td>${fmt(o.applied)}</td>
                        <td style="color:#60a5fa; opacity:0.8;">${fmt(o.manualApplied)}</td>
                        <td>${fmt(o.claimed)}</td>
                        <td style="color:#10b981; opacity:0.8;">${oAppToClm ? oAppToClm + '%' : ''}</td>
                    </tr>
                `);
            });
        }
    });

    // ... [Leave remainder of area calculations and sidebar totals rendering as-is] ...
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

// Add the Toggle Handler to window scope so onclick calls can find it
window.toggleBranchExpand = function(branchName) {
    expandedBranches[branchName] = !expandedBranches[branchName];
    renderDashboard(); // Re-render table with expanded view
};
