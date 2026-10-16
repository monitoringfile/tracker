let rawData = [];
let globalBranchMap = {};
let borrowerChart = null, parAgingChart = null, weeklyChart = null, productChart = null;

lucide.createIcons();

const modal = document.getElementById('branchModal');
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('closeModalFooterBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function closeModal() { modal.classList.add('hidden'); }

function getProductCategory(productId) {
    if (!productId) return 'Other';
    const clean = productId.toString().trim().replaceAll(' ', '').toUpperCase();
    if (clean.endsWith('-NL')) return 'Newloan';
    if (clean.startsWith('EL-')) return 'Educ';
    if (clean.startsWith('HIL-')) return 'HIL';
    if (clean.startsWith('MLD-')) return 'MLD';
    if (clean.startsWith('MLP')) return 'MPlus';
    if (clean.startsWith('M-') && clean.endsWith('-RL')) return 'Mauswagon';
    return 'Other';
}

function parseLocalDateString(rawStr) {
    if (!rawStr) return null;
    const str = rawStr.toString().trim();
    const parts = str.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d);
        } else if (parts[2].length === 4) {
            const m = parseInt(parts[0], 10) - 1;
            const d = parseInt(parts[2], 10);
            const y = parseInt(parts[2], 10);
            return new Date(y, m, d);
        }
    }
    const dt = new Date(str);
    return isNaN(dt) ? null : dt;
}

function formatYYYYMMDD(dateObj) {
    if (!dateObj) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getCustomWeekOfMonth(date) {
    const day = date.getDate();
    if (day <= 3) return 1;
    if (day <= 10) return 2;
    if (day <= 17) return 3;
    if (day <= 24) return 4;
    return 5;
}

function openBranchModal(branchName) {
    const bData = globalBranchMap[branchName];
    if (!bData) return;

    document.getElementById('modalBranchTitle').innerText = `${branchName} - TS Officer Summary`;
    const container = document.getElementById('modalOfficerList');
    container.innerHTML = '';

    const officerEntries = Object.entries(bData.officers);
    if (officerEntries.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs italic">No officer records found.</div>`;
    } else {
        officerEntries.forEach(([officerName, oStats]) => {
            const officerParRatio = oStats.glp > 0 ? (oStats.parAmount / oStats.glp) * 100 : 0;
            
            const card = document.createElement('div');
            card.className = 'bg-white border border-slate-300 border-l-4 border-l-bambooPrimary p-4 rounded-xl space-y-3 text-xs shadow-sm';
            card.innerHTML = `
                <div class="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-800">
                    <span class="text-sm font-black text-bambooPrimary"><i data-lucide="user-check" class="w-4 h-4 inline mr-1"></i> ${officerName}</span>
                    <span class="text-slate-500 font-mono">${oStats.borrowerSet.size} Borrowers</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <div class="bg-slate-50 p-2 rounded border border-slate-200">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">Loan Portfolio</span>
                        <span class="text-slate-900 font-bold">${oStats.glp.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-200">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">PAR Amount</span>
                        <span class="text-rose-600 font-bold">${oStats.parAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-200">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">PAR Ratio</span>
                        <span class="text-amber-600 font-bold">${officerParRatio.toFixed(2)}%</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-200">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">Active Borrowers</span>
                        <span class="text-emerald-700 font-bold">${oStats.borrowerSet.size}</span>
                    </div>
                </div>
                <div class="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg space-y-1.5 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-blue-700 font-bold">Disbursed (Month):</span>
                        <span class="font-bold text-slate-900 font-mono">${oStats.disbursedBorrowerSet.size} clients</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] font-mono text-slate-600 pl-2 border-l-2 border-blue-400">
                        <span>W1: <strong class="text-slate-900">${oStats.disbursedWeeks[1].size}</strong></span>
                        <span>W2: <strong class="text-slate-900">${oStats.disbursedWeeks[2].size}</strong></span>
                        <span>W3: <strong class="text-slate-900">${oStats.disbursedWeeks[3].size}</strong></span>
                        <span>W4: <strong class="text-slate-900">${oStats.disbursedWeeks[4].size}</strong></span>
                        <span>W5: <strong class="text-slate-900">${oStats.disbursedWeeks[5].size}</strong></span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-100/60 pt-1">
                        <span class="text-emerald-700 font-bold">New Loans (Month):</span>
                        <span class="font-bold text-slate-900 font-mono">${oStats.newLoanSet.size} clients</span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-100/60 pt-1">
                        <span class="text-bambooDark font-bold">New Inclusions:</span>
                        <span class="font-bold text-bambooDark font-mono">${oStats.newInclusionsCount} clients</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }
    lucide.createIcons();
    modal.classList.remove('hidden');
}

const maxDaysForNewInclusion = new Date().getDate();
document.getElementById('newInclusionsBadge').innerText = `New Inclusions: Arrears ≤ ${maxDaysForNewInclusion} days`;

const currentDateObj = new Date();
const currentDateStr = formatYYYYMMDD(currentDateObj);
document.getElementById('disbStartDate').value = currentDateStr;
document.getElementById('disbEndDate').value = currentDateStr;

document.getElementById('csvFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            rawData = results.data.map(row => ({
                Branch: (row['Branch'] || 'Unknown Branch').toString().trim(),
                'Credit officer': (row['Credit officer'] || 'Unknown Officer').toString().trim(),
                Centre: (row['Centre'] || 'Unknown Centre').toString().trim(),
                'Product ID': (row['Product ID'] || 'Unknown Product').toString().trim(),
                'Client name': (row['Client name'] || 'Unknown Client').toString().trim().toUpperCase(),
                'Disbursement date': row['Disbursement date'] || '',
                'Days in arrears': parseFloat(row['Days in arrears']) || 0,
                Status: (row['Status'] || 'Unspecified').toString().trim(),
                'OLB principal': parseFloat(row['OLB principal']) || 0,
                'Application date': row['Application date'] || ''
            }));

            document.getElementById('welcomeBanner').classList.add('hidden');
            document.getElementById('dashboardContent').classList.remove('hidden');

            populateFilters(rawData);
            
            const disbDates = rawData.map(d => parseLocalDateString(d['Disbursement date'])).filter(Boolean);
            if (disbDates.length > 0) {
                disbDates.sort((a,b) => b - a);
                const maxDateStr = formatYYYYMMDD(disbDates[0]);
                document.getElementById('disbStartDate').value = maxDateStr;
                document.getElementById('disbEndDate').value = maxDateStr;
            }

            renderDashboard(rawData);
            executePresetPrompt('PAR_HOTSPOTS');
        }
    });
});

document.getElementById('branchFilter').addEventListener('change', applyFilters);
document.getElementById('officerFilter').addEventListener('change', applyFilters);
document.getElementById('cbsStartMonthFilter').addEventListener('change', () => renderDashboard(rawData));
document.getElementById('cbsEndMonthFilter').addEventListener('change', () => renderDashboard(rawData));
document.getElementById('disbStartDate').addEventListener('change', () => renderDailyDisbursementTable(rawData));
document.getElementById('disbEndDate').addEventListener('change', () => renderDailyDisbursementTable(rawData));

document.getElementById('resetFilters').addEventListener('click', () => {
    document.getElementById('branchFilter').value = 'ALL';
    document.getElementById('officerFilter').value = 'ALL';
    document.getElementById('disbStartDate').value = currentDateStr;
    document.getElementById('disbEndDate').value = currentDateStr;
    renderDashboard(rawData);
    executePresetPrompt('PAR_HOTSPOTS');
});

function populateFilters(data) {
    const branches = [...new Set(data.map(d => d.Branch))].sort();
    const officers = [...new Set(data.map(d => d['Credit officer']))].sort();

    const branchSelect = document.getElementById('branchFilter');
    branchSelect.innerHTML = '<option value="ALL">All Branches</option>';
    branches.forEach(b => branchSelect.innerHTML += `<option value="${b}">${b}</option>`);

    const officerSelect = document.getElementById('officerFilter');
    officerSelect.innerHTML = '<option value="ALL">All Credit Officers / TS</option>';
    officers.forEach(o => officerSelect.innerHTML += `<option value="${o}">${o}</option>`);

    const promptScopeSelect = document.getElementById('promptTargetScope');
    promptScopeSelect.innerHTML = '<option value="OVERALL">Overall Area (All Branches)</option>';
    branches.forEach(b => promptScopeSelect.innerHTML += `<option value="${b}">${b}</option>`);

    const monthMap = new Map();
    data.forEach(d => {
        if (d['Application date']) {
            const dt = parseLocalDateString(d['Application date']);
            if (dt) {
                const sortKey = dt.getFullYear() * 12 + dt.getMonth();
                const monthName = dt.toLocaleString('default', { month: 'short' });
                monthMap.set(sortKey, { label: `${monthName} ${dt.getFullYear()}`, sortKey });
            }
        }
    });

    const sortedMonths = Array.from(monthMap.values()).sort((a, b) => a.sortKey - b.sortKey);
    const startSelect = document.getElementById('cbsStartMonthFilter');
    const endSelect = document.getElementById('cbsEndMonthFilter');
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    sortedMonths.forEach(m => {
        startSelect.innerHTML += `<option value="${m.sortKey}">${m.label}</option>`;
        endSelect.innerHTML += `<option value="${m.sortKey}">${m.label}</option>`;
    });

    const currentDt = new Date();
    const currentSortKey = currentDt.getFullYear() * 12 + currentDt.getMonth();
    const hasCurrentMonth = sortedMonths.some(m => m.sortKey === currentSortKey);

    if (hasCurrentMonth) {
        startSelect.value = currentSortKey;
        endSelect.value = currentSortKey;
    } else if (sortedMonths.length > 0) {
        startSelect.value = sortedMonths[0].sortKey;
        endSelect.value = sortedMonths[sortedMonths.length - 1].sortKey;
    }
}

function applyFilters() {
    const selectedBranch = document.getElementById('branchFilter').value;
    const selectedOfficer = document.getElementById('officerFilter').value;

    const filtered = rawData.filter(d => {
        const matchBranch = selectedBranch === 'ALL' || d.Branch === selectedBranch;
        const matchOfficer = selectedOfficer === 'ALL' || d['Credit officer'] === selectedOfficer;
        return matchBranch && matchOfficer;
    });

    renderDashboard(filtered);
    document.getElementById('promptTargetScope').value = selectedBranch !== 'ALL' ? selectedBranch : 'OVERALL';
    executePresetPrompt('PAR_HOTSPOTS');
}

function renderDashboard(data) {
    let totalGLP = 0;
    let par1_30 = 0, par31_60 = 0, par61_90 = 0, par90Plus = 0;
    let count1_30 = 0, count31_60 = 0, count61_90 = 0, count90Plus = 0;
    
    const productSummary = {};
    const productBorrowerSets = {};
    const clientMap = {};
    globalBranchMap = {};

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const globalDisbursedWeeks = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    const globalNewLoanWeeks = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    const globalNewInclusionsSet = new Set();

    data.forEach(item => {
        const olb = item['OLB principal'] || 0;
        const days = item['Days in arrears'] || 0;
        const rawProd = item['Product ID'] || '';
        const categoryProd = getProductCategory(rawProd);
        const clientName = item['Client name'] || 'UNKNOWN';
        const branch = item.Branch;
        const officer = item['Credit officer'];
        const status = (item['Status'] || '').trim().toLowerCase();
        const disbDateStr = item['Disbursement date'];

        totalGLP += olb;

        if (days >= 1 && days <= 30) { par1_30 += olb; count1_30++; }
        else if (days >= 31 && days <= 60) { par31_60 += olb; count31_60++; }
        else if (days >= 61 && days <= 90) { par61_90 += olb; count61_90++; }
        else if (days > 90) { par90Plus += olb; count90Plus++; }

        productSummary[categoryProd] = (productSummary[categoryProd] || 0) + olb;

        if (!productBorrowerSets[categoryProd]) productBorrowerSets[categoryProd] = new Set();
        productBorrowerSets[categoryProd].add(clientName);

        const isNewInclusion = (days > 0 && days <= maxDaysForNewInclusion);
        if (isNewInclusion) globalNewInclusionsSet.add(clientName);

        let isCurrentMonthDisbursement = false;
        let isMonthlyNewLoan = false;
        let disbWeek = 1;

        if (disbDateStr) {
            const dDate = parseLocalDateString(disbDateStr);
            if (dDate && dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth) {
                isCurrentMonthDisbursement = true;
                disbWeek = getCustomWeekOfMonth(dDate);
                globalDisbursedWeeks[disbWeek].add(clientName);

                if (categoryProd === 'Newloan') {
                    isMonthlyNewLoan = true;
                    globalNewLoanWeeks[disbWeek].add(clientName);
                }
            }
        }

        if (!clientMap[clientName]) {
            clientMap[clientName] = { maxArrears: days, totalOlb: olb, status, isCurrentMonthDisbursement, isMonthlyNewLoan };
        } else {
            clientMap[clientName].totalOlb += olb;
            if (days > clientMap[clientName].maxArrears) clientMap[clientName].maxArrears = days;
            if (status === 'active' || status === 'in arrears') clientMap[clientName].status = status;
        }

        if (!globalBranchMap[branch]) {
            globalBranchMap[branch] = { 
                totalGLP: 0, 
                parAmount: 0, 
                newInclusionsCount: 0, 
                newLoanSet: new Set(), 
                borrowerSet: new Set(), 
                disbursedBorrowerSet: new Set(),
                disbursedWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                officers: {} 
            };
        }
        globalBranchMap[branch].totalGLP += olb;
        if (status === 'active' || status === 'in arrears') globalBranchMap[branch].borrowerSet.add(clientName);
        if (days > 0) globalBranchMap[branch].parAmount += olb;
        if (isNewInclusion) globalBranchMap[branch].newInclusionsCount += 1;
        if (isCurrentMonthDisbursement) {
            globalBranchMap[branch].disbursedBorrowerSet.add(clientName);
            globalBranchMap[branch].disbursedWeeks[disbWeek].add(clientName);
        }
        if (isMonthlyNewLoan) {
            globalBranchMap[branch].newLoanSet.add(clientName);
            globalBranchMap[branch].newLoanWeeks[disbWeek].add(clientName);
        }

        if (!globalBranchMap[branch].officers[officer]) {
            globalBranchMap[branch].officers[officer] = { 
                glp: 0, 
                parAmount: 0, 
                newInclusionsCount: 0,
                borrowerSet: new Set(),
                disbursedBorrowerSet: new Set(),
                disbursedWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanSet: new Set()
            };
        }
        globalBranchMap[branch].officers[officer].glp += olb;
        if (status === 'active' || status === 'in arrears') globalBranchMap[branch].officers[officer].borrowerSet.add(clientName);
        if (days > 0) globalBranchMap[branch].officers[officer].parAmount += olb;
        if (isNewInclusion) globalBranchMap[branch].officers[officer].newInclusionsCount += 1;
        if (isCurrentMonthDisbursement) {
            globalBranchMap[branch].officers[officer].disbursedBorrowerSet.add(clientName);
            globalBranchMap[branch].officers[officer].disbursedWeeks[disbWeek].add(clientName);
        }
        if (isMonthlyNewLoan) {
            globalBranchMap[branch].officers[officer].newLoanSet.add(clientName);
            globalBranchMap[branch].officers[officer].newLoanWeeks[disbWeek].add(clientName);
        }
    });

    const filteredEligibleClients = new Set();
    data.forEach(item => {
        const cName = item['Client name'] || 'UNKNOWN';
        const st = (item['Status'] || '').trim().toLowerCase();
        if (st === 'active' || st === 'in arrears') filteredEligibleClients.add(cName);
    });

    let activeBorrowersCount = 0, parBorrowersCount = 0;
    const globalDisbursedSet = new Set(), globalNewLoanSet = new Set();

    filteredEligibleClients.forEach(cName => {
        const client = clientMap[cName];
        if (client) {
            if (client.maxArrears === 0) activeBorrowersCount++;
            else parBorrowersCount++;
            if (client.isCurrentMonthDisbursement) globalDisbursedSet.add(cName);
            if (client.isMonthlyNewLoan) globalNewLoanSet.add(cName);
        }
    });

    const totalPARAmount = par1_30 + par31_60 + par61_90 + par90Plus;
    const parRatio = totalGLP > 0 ? (totalPARAmount / totalGLP) * 100 : 0;

    document.getElementById('kpiLoanPortfolio').innerText = totalGLP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiLoanPortfolioSub').innerText = `${data.length.toLocaleString()} Line Items`;
    document.getElementById('kpiParAmount').innerText = totalPARAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiParAmountSub').innerText = `${parBorrowersCount.toLocaleString()} In Arrears`;
    document.getElementById('kpiParRatio').innerText = parRatio.toFixed(2) + '%';
    document.getElementById('kpiBorrowers').innerText = filteredEligibleClients.size.toLocaleString();
    document.getElementById('kpiBorrowersSub').innerText = `${activeBorrowersCount} Act / ${parBorrowersCount} PAR`;
    document.getElementById('kpiDisbursedCount').innerText = globalDisbursedSet.size.toLocaleString();
    document.getElementById('kpiNewLoanCount').innerText = globalNewLoanSet.size.toLocaleString();
    document.getElementById('kpiNewInclusionsCount').innerText = globalNewInclusionsSet.size.toLocaleString();

    renderBorrowerDoughnutChart(activeBorrowersCount, parBorrowersCount);
    renderParAgingBarChart(par1_30, par31_60, par61_90, par90Plus, count1_30, count31_60, count61_90, count90Plus);
    renderWeeklyPacingBarChart(globalDisbursedWeeks, globalNewLoanWeeks);
    renderProductBarChart(productSummary, productBorrowerSets);
    renderDailyDisbursementTable(data);
    renderCbsPivotMatrix(data);
    renderBranchCards(globalBranchMap);

    lucide.createIcons();
}

function renderDailyDisbursementTable(data) {
    const table = document.getElementById('dailyDisbursementTable');
    const startDateStr = document.getElementById('disbStartDate').value;
    const endDateStr = document.getElementById('disbEndDate').value;

    const dailyMap = {};
    const datesSet = new Set();
    const branchesSet = new Set();

    data.forEach(item => {
        const disbDate = item['Disbursement date'];
        if (!disbDate) return;
        const dt = parseLocalDateString(disbDate);
        if (!dt) return;

        const dateKey = formatYYYYMMDD(dt);
        
        if (startDateStr && dateKey < startDateStr) return;
        if (endDateStr && dateKey > endDateStr) return;

        const branch = item.Branch;
        const clientName = item['Client name'] || 'UNKNOWN';

        datesSet.add(dateKey);
        branchesSet.add(branch);

        if (!dailyMap[dateKey]) dailyMap[dateKey] = {};
        if (!dailyMap[dateKey][branch]) dailyMap[dateKey][branch] = new Set();

        dailyMap[dateKey][branch].add(clientName);
    });

    const sortedDates = Array.from(datesSet).sort();
    const sortedBranches = Array.from(branchesSet).sort();

    if (sortedDates.length === 0) {
        table.innerHTML = `<tbody><tr><td class="p-6 text-center text-amber-100/60 italic">No disbursement records match the selected date range.</td></tr></tbody>`;
        return;
    }

    let html = `<thead><tr class="bg-emerald-950/90 text-yellow-300 border-b border-amber-500/50"><th class="p-2.5 pl-3 font-bold">Disbursement Date</th>`;
    sortedBranches.forEach(b => html += `<th class="p-2.5 text-center font-bold">${b} (Borrowers)</th>`);
    html += `<th class="p-2.5 text-center font-bold text-yellow-400">Daily Unique Total</th></tr></thead><tbody>`;

    sortedDates.forEach(dateStr => {
        html += `<tr class="border-b border-emerald-900/60 hover:bg-emerald-900/30 transition-colors"><td class="p-2 pl-3 font-bold text-white">${dateStr}</td>`;
        const dayUniqueClients = new Set();

        sortedBranches.forEach(b => {
            const clientSet = dailyMap[dateStr] && dailyMap[dateStr][b] ? dailyMap[dateStr][b] : new Set();
            clientSet.forEach(c => dayUniqueClients.add(c));
            const count = clientSet.size;

            html += `<td class="p-2 text-center font-mono text-emerald-100 font-bold">${count > 0 ? count : '-'}</td>`;
        });

        html += `<td class="p-2 text-center font-mono font-black text-yellow-400 bg-amber-500/10">${dayUniqueClients.size}</td></tr>`;
    });

    html += `</tbody>`;
    table.innerHTML = html;
}

function renderBorrowerDoughnutChart(active, par) {
    const ctx = document.getElementById('borrowerDoughnutChart').getContext('2d');
    if (borrowerChart) borrowerChart.destroy();

    borrowerChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Active Borrowers', 'In Arrears'],
            datasets: [{
                data: [active, par],
                backgroundColor: ['#2d6a4f', '#c8102e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#475569', font: { size: 10, weight: 'bold' } } } },
            cutout: '65%'
        }
    });
}

function renderParAgingBarChart(p1, p2, p3, p4, c1, c2, c3, c4) {
    const ctx = document.getElementById('parAgingBarChart').getContext('2d');
    if (parAgingChart) parAgingChart.destroy();

    const counts = [c1, c2, c3, c4];

    parAgingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1-30d', '31-60d', '61-90d', '>90d'],
            datasets: [{
                label: 'OLB Principal',
                data: [p1, p2, p3, p4],
                backgroundColor: ['#52b788', '#d97706', '#c8102e', '#1b4332'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const amt = context.raw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            const accCount = counts[idx].toLocaleString();
                            return [`OLB Principal: ${amt}`, `Account Count: ${accCount}`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderWeeklyPacingBarChart(disbWeeks, newWeeks) {
    const ctx = document.getElementById('weeklyPacingBarChart').getContext('2d');
    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
            datasets: [
                { label: 'Disbursed', data: [disbWeeks[1].size, disbWeeks[2].size, disbWeeks[3].size, disbWeeks[4].size, disbWeeks[5].size], backgroundColor: '#2d6a4f', borderRadius: 4 },
                { label: 'New Loans', data: [newWeeks[1].size, newWeeks[2].size, newWeeks[3].size, newWeeks[4].size, newWeeks[5].size], backgroundColor: '#52b788', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, color: '#475569', font: { size: 10, weight: 'bold' } } } },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function renderProductBarChart(productSummary, productBorrowerSets) {
    const ctx = document.getElementById('productBarChart').getContext('2d');
    if (productChart) productChart.destroy();

    const categories = Object.keys(productSummary);
    const totals = categories.map(c => productSummary[c]);
    const borrowerCounts = categories.map(c => productBorrowerSets[c] ? productBorrowerSets[c].size : 0);

    productChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'OLB Principal',
                data: totals,
                backgroundColor: '#2d6a4f',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const idx = context.dataIndex;
                            const amt = context.raw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            const borrowers = borrowerCounts[idx];
                            return [`OLB Principal: ${amt}`, `Borrowers: ${borrowers}`];
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false } },
                y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#f1f5f9' } }
            }
        }
    });
}

function handleCustomPromptSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('customPromptInput').value.trim();
    if (!input) return;
    generateGeminiAnalyticsResponse('CUSTOM', input);
}

function executePresetPrompt(promptType) {
    document.getElementById('customPromptInput').value = '';
    generateGeminiAnalyticsResponse(promptType, '');
}

async function generateGeminiAnalyticsResponse(type, customText) {
    const scope = document.getElementById('promptTargetScope').value;
    const container = document.getElementById('promptResultContainer');

    let targetGLP = 0, targetPAR = 0;
    if (scope === 'OVERALL') {
        Object.values(globalBranchMap).forEach(b => { targetGLP += b.totalGLP; targetPAR += b.parAmount; });
    } else if (globalBranchMap[scope]) {
        targetGLP = globalBranchMap[scope].totalGLP;
        targetPAR = globalBranchMap[scope].parAmount;
    }
    const parRatio = targetGLP > 0 ? (targetPAR / targetGLP) * 100 : 0;

    let userQuery = customText;
    if (type === 'PAR_HOTSPOTS') userQuery = "Analyze PAR & Risk Hotspots and give recommendations.";
    else if (type === 'DISBURSEMENT_PACING') userQuery = "Evaluate Weekly Disbursement Pacing and growth velocity.";
    else if (type === 'CBS_BOTTLENECKS') userQuery = "Review CBS Application Pipeline bottlenecks and status counts.";
    else if (type === 'GROWTH_ACTION_PLAN') userQuery = "Generate a Branch Growth & New Loan Action Plan.";

    container.innerHTML = `<div class="text-center py-3 text-xs text-bambooPrimary font-bold">Gemini AI generating executive insights...</div>`;

    const GEMINI_API_KEY = "AQ.Ab8RN6J18lP_l9HlAEaVJQemNAwrQjdsKLTK7rJNrW9t_Zq3vQ";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Scope: ${scope}, GLP: ${targetGLP.toFixed(2)}, PAR: ${targetPAR.toFixed(2)}, Ratio: ${parRatio.toFixed(2)}%. Executive Query: ${userQuery}` }] }]
            })
        });
        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        container.innerHTML = `<div class="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">${aiText}</div>`;
    } catch (err) {
        container.innerHTML = `<div class="text-xs text-rose-600 font-bold">Error connecting to Gemini API. Please check your connection.</div>`;
    }
}

function renderCbsPivotMatrix(data) {
    const startVal = parseInt(document.getElementById('cbsStartMonthFilter').value) || 0;
    const endVal = parseInt(document.getElementById('cbsEndMonthFilter').value) || 999999;

    const filteredData = data.filter(d => {
        if (!d['Application date']) return false;
        const dt = parseLocalDateString(d['Application date']);
        if (!dt) return false;
        const itemSortKey = dt.getFullYear() * 12 + dt.getMonth();
        return itemSortKey >= startVal && itemSortKey <= endVal;
    });

    const statusSet = new Set();
    filteredData.forEach(d => { if (d.Status) statusSet.add(d.Status); });
    const allStatuses = Array.from(statusSet).sort();

    const matrix = { Newloan: {}, Reloan: {} };
    const branchesSet = new Set();

    filteredData.forEach(d => {
        const category = getProductCategory(d['Product ID']) === 'Newloan' ? 'Newloan' : 'Reloan';
        const branch = d.Branch;
        const status = d.Status;
        branchesSet.add(branch);

        if (!matrix[category][branch]) matrix[category][branch] = {};
        if (!matrix[category][branch][status]) matrix[category][branch][status] = new Set();
        matrix[category][branch][status].add(d['Client name']);
    });

    const sortedBranches = Array.from(branchesSet).sort();
    const table = document.getElementById('cbsMatrixTable');
    table.innerHTML = '';

    if (allStatuses.length === 0) {
        table.innerHTML = `<tbody><tr><td class="p-6 text-center text-slate-400 italic">No CBS records found for selected date range.</td></tr></tbody>`;
        return;
    }

    let html = `<thead><tr class="bg-slate-50 text-slate-700 border-b border-slate-200"><th class="p-2.5 pl-3 font-bold">Row Labels</th>`;
    allStatuses.forEach(st => html += `<th class="p-2.5 text-center font-bold">${st}</th>`);
    html += `<th class="p-2.5 text-center font-bold">Grand Total</th></tr></thead><tbody>`;

    const grandTotalColCounts = {};
    allStatuses.forEach(st => grandTotalColCounts[st] = new Set());
    let grandTotalOverall = new Set();

    ['Newloan', 'Reloan'].forEach(cat => {
        html += `<tr class="bg-emerald-50/60 text-bambooDark font-extrabold"><td class="p-2 pl-3" colspan="${allStatuses.length + 2}">${cat}</td></tr>`;
        
        const catColCounts = {};
        allStatuses.forEach(st => catColCounts[st] = new Set());

        sortedBranches.forEach(b => {
            if (matrix[cat][b]) {
                let rowTot = 0;
                html += `<tr class="border-b border-slate-100"><td class="p-2 pl-6 text-slate-700 font-semibold">${b}</td>`;
                allStatuses.forEach(st => {
                    const clientSet = matrix[cat][b][st] || new Set();
                    const count = clientSet.size;
                    rowTot += count;

                    clientSet.forEach(c => {
                        catColCounts[st].add(c);
                        grandTotalColCounts[st].add(c);
                        grandTotalOverall.add(c);
                    });

                    html += `<td class="p-2 text-center text-slate-800 font-mono">${count || ''}</td>`;
                });
                html += `<td class="p-2 text-center text-slate-900 font-mono font-bold">${rowTot}</td></tr>`;
            }
        });

        html += `<tr class="bg-slate-100/80 font-bold border-b border-slate-200"><td class="p-2 pl-6 text-slate-900 uppercase">Total ${cat}</td>`;
        allStatuses.forEach(st => {
            const cCount = catColCounts[st].size;
            html += `<td class="p-2 text-center text-slate-950 font-mono">${cCount || ''}</td>`;
        });
        let catUniqueTotal = 0;
        allStatuses.forEach(st => {
            catColCounts[st].forEach(c => catUniqueTotal++);
        });
        html += `<td class="p-2 text-center text-slate-950 font-mono font-bold">${catUniqueTotal}</td></tr>`;
    });

    html += `<tr class="bg-emerald-100/80 text-slate-950 font-black"><td class="p-3 pl-3 uppercase">Grand Total</td>`;
    allStatuses.forEach(st => {
        html += `<td class="p-3 text-center font-mono text-slate-950">${grandTotalColCounts[st].size || ''}</td>`;
    });
    html += `<td class="p-3 text-center font-mono text-slate-950">${grandTotalOverall.size}</td></tr>`;

    html += `</tbody>`;
    table.innerHTML = html;
}

function renderBranchCards(branchMap) {
    const container = document.getElementById('branchCardsGrid');
    container.innerHTML = '';

    Object.keys(branchMap).sort().forEach(branch => {
        const b = branchMap[branch];
        const ratio = b.totalGLP > 0 ? (b.parAmount / b.totalGLP) * 100 : 0;
        const officerCount = Object.keys(b.officers).length;
        const branchBorrowers = b.borrowerSet.size;
        const branchDisbursedCount = b.disbursedBorrowerSet.size;
        const branchNewLoanCount = b.newLoanSet.size;

        const card = document.createElement('div');
        card.className = 'kpi-card p-4 hover:border-bambooPrimary transition-all cursor-pointer flex flex-col justify-between group';
        card.onclick = () => openBranchModal(branch);

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <h4 class="font-black text-slate-900 text-sm uppercase flex items-center gap-1.5">
                        <i data-lucide="map-pin" class="w-4 h-4 text-bambooPrimary"></i> ${branch}
                    </h4>
                    <span class="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">${officerCount} Officers</span>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-3 font-mono">
                    <div class="bg-slate-50 p-2 rounded border border-slate-100">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">Loan Portfolio</span>
                        <span class="text-xs font-bold text-slate-900">${b.totalGLP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-100">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">PAR Amount</span>
                        <span class="text-xs font-bold text-rose-600">${b.parAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-100">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">PAR Ratio</span>
                        <span class="text-xs font-bold text-amber-600">${ratio.toFixed(2)}%</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded border border-slate-100">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">Borrowers</span>
                        <span class="text-xs font-bold text-emerald-700">${branchBorrowers.toLocaleString()}</span>
                    </div>
                </div>

                <div class="bg-emerald-50/40 border border-emerald-100 p-2.5 rounded-lg space-y-1.5 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-blue-700 font-bold">Disbursed (Month):</span>
                        <span class="font-bold text-slate-900 font-mono">${branchDisbursedCount} clients</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] font-mono text-slate-600 pl-2 border-l-2 border-blue-400">
                        <span>W1: <strong class="text-slate-900">${b.disbursedWeeks[1].size}</strong></span>
                        <span>W2: <strong class="text-slate-900">${b.disbursedWeeks[2].size}</strong></span>
                        <span>W3: <strong class="text-slate-900">${b.disbursedWeeks[3].size}</strong></span>
                        <span>W4: <strong class="text-slate-900">${b.disbursedWeeks[4].size}</strong></span>
                        <span>W5: <strong class="text-slate-900">${b.disbursedWeeks[5].size}</strong></span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-100/60 pt-1">
                        <span class="text-emerald-700 font-bold">New Loans (Month):</span>
                        <span class="font-bold text-slate-900 font-mono">${branchNewLoanCount} clients</span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-100/60 pt-1">
                        <span class="text-bambooDark font-bold">New Inclusions:</span>
                        <span class="font-bold text-bambooDark font-mono">${b.newInclusionsCount} clients</span>
                    </div>
                </div>
            </div>

            <div class="text-[11px] text-bambooPrimary font-bold flex items-center justify-between pt-2 border-t border-slate-100 mt-2 group-hover:text-bambooDark">
                <span>View TS Officer Breakdown</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </div>
        `;
        container.appendChild(card);
    });
}
