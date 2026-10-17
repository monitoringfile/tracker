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
            const d = parseInt(parts[1], 10);
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
            const officerAvgPortfolioSize = oStats.borrowerSet.size > 0 ? oStats.glp / oStats.borrowerSet.size : 0;
            const officerAvgDisbursedSize = oStats.disbursedBorrowerSet.size > 0 ? oStats.disbursedLoanAmount / oStats.disbursedBorrowerSet.size : 0;
            
            const card = document.createElement('div');
            card.className = 'bg-white border-2 border-emerald-900/30 border-l-4 border-l-bambooDark p-4 rounded-xl space-y-3 text-xs shadow-sm';
            card.innerHTML = `
                <div class="flex items-center justify-between pb-2 border-b-2 border-slate-200 font-bold text-slate-800">
                    <span class="text-sm font-black text-bambooDark"><i data-lucide="user-check" class="w-4 h-4 inline mr-1"></i> ${officerName}</span>
                    <div class="text-right">
                        <span class="text-slate-700 font-mono font-bold">${oStats.borrowerSet.size} Borrowers</span>
                        <span class="text-[10px] text-slate-500 font-mono block">₱ ${oStats.glp.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-300">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">Loan Portfolio</span>
                        <span class="text-slate-900 font-bold">${oStats.glp.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-300">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">PAR Amount</span>
                        <span class="text-rose-600 font-bold">${oStats.parAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-300">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">PAR Ratio</span>
                        <span class="text-amber-600 font-bold">${officerParRatio.toFixed(2)}%</span>
                    </div>
                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-300">
                        <span class="text-slate-400 text-[10px] block font-sans uppercase font-bold">Active Borrowers</span>
                        <span class="text-emerald-700 font-bold">${oStats.borrowerSet.size}</span>
                    </div>
                </div>
                <div class="bg-emerald-50/70 border-2 border-emerald-900/30 p-2.5 rounded-lg space-y-1.5 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-blue-700 font-bold">Disbursed (Month):</span>
                        <div class="font-mono text-right">
                            <span class="font-bold text-slate-900">${oStats.disbursedBorrowerSet.size} clients</span>
                            <span class="text-[10px] text-slate-500 block">₱ ${oStats.disbursedLoanAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} (Avg: ₱ ${officerAvgDisbursedSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})})</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] font-mono text-slate-600 pl-2 border-l-2 border-blue-500">
                        <span>W1: <strong class="text-slate-900">${oStats.disbursedWeeks[1].size}</strong></span>
                        <span>W2: <strong class="text-slate-900">${oStats.disbursedWeeks[2].size}</strong></span>
                        <span>W3: <strong class="text-slate-900">${oStats.disbursedWeeks[3].size}</strong></span>
                        <span>W4: <strong class="text-slate-900">${oStats.disbursedWeeks[4].size}</strong></span>
                        <span>W5: <strong class="text-slate-900">${oStats.disbursedWeeks[5].size}</strong></span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-200 pt-1">
                        <span class="text-emerald-700 font-bold">Avg Portfolio Loan Size:</span>
                        <span class="font-bold text-slate-900 font-mono">₱ ${officerAvgPortfolioSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-200 pt-1">
                        <span class="text-emerald-700 font-bold">New Loans (Month):</span>
                        <span class="font-bold text-slate-900 font-mono">${oStats.newLoanSet.size} clients</span>
                    </div>
                    <div class="flex items-center justify-between border-t border-emerald-200 pt-1">
                        <span class="text-bambooDark font-bold">New Inclusions:</span>
                        <div class="font-mono text-right">
                            <span class="font-bold text-bambooDark">${oStats.newInclusionsCount} clients</span>
                            <span class="text-[10px] text-slate-500 block">₱ ${oStats.newInclusionsOlb.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
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
                'Loan Amount': parseFloat(row['Loan Amount'] || row['Loan amount'] || 0) || 0,
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
    let bracket1_30 = 0, bracket31_60 = 0, bracket61_90 = 0, bracket91_180 = 0, bracket181_365 = 0, bracket365Plus = 0;
    let count1_30 = 0, count31_60 = 0, count61_90 = 0, count91_180 = 0, count181_365 = 0, count365Plus = 0;
    
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
    let globalNewInclusionsOlbTotal = 0;
    let globalDisbursedLoanAmountTotal = 0;
    let globalNewLoanAmountTotal = 0;

    data.forEach(item => {
        const olb = item['OLB principal'] || 0;
        const loanAmount = item['Loan Amount'] || 0;
        const days = item['Days in arrears'] || 0;
        const rawProd = item['Product ID'] || '';
        const categoryProd = getProductCategory(rawProd);
        const clientName = item['Client name'] || 'UNKNOWN';
        const branch = item.Branch;
        const officer = item['Credit officer'];
        const status = (item['Status'] || '').trim().toLowerCase();
        const disbDateStr = item['Disbursement date'];

        totalGLP += olb;

        if (days >= 1 && days <= 30) { bracket1_30 += olb; count1_30++; }
        else if (days >= 31 && days <= 60) { bracket31_60 += olb; count31_60++; }
        else if (days >= 61 && days <= 90) { bracket61_90 += olb; count61_90++; }
        else if (days >= 91 && days <= 180) { bracket91_180 += olb; count91_180++; }
        else if (days >= 181 && days <= 365) { bracket181_365 += olb; count181_365++; }
        else if (days > 365) { bracket365Plus += olb; count365Plus++; }

        productSummary[categoryProd] = (productSummary[categoryProd] || 0) + olb;

        if (!productBorrowerSets[categoryProd]) productBorrowerSets[categoryProd] = new Set();
        productBorrowerSets[categoryProd].add(clientName);

        const isNewInclusion = (days > 0 && days <= maxDaysForNewInclusion);
        if (isNewInclusion) {
            globalNewInclusionsSet.add(clientName);
            globalNewInclusionsOlbTotal += olb;
        }

        let isCurrentMonthDisbursement = false;
        let isMonthlyNewLoan = false;
        let disbWeek = 1;

        if (disbDateStr) {
            const dDate = parseLocalDateString(disbDateStr);
            if (dDate && dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth) {
                isCurrentMonthDisbursement = true;
                disbWeek = getCustomWeekOfMonth(dDate);
                globalDisbursedWeeks[disbWeek].add(clientName);
                globalDisbursedLoanAmountTotal += loanAmount;

                if (categoryProd === 'Newloan') {
                    isMonthlyNewLoan = true;
                    globalNewLoanWeeks[disbWeek].add(clientName);
                    globalNewLoanAmountTotal += loanAmount;
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
                newInclusionsOlb: 0,
                newLoanSet: new Set(), 
                borrowerSet: new Set(), 
                disbursedBorrowerSet: new Set(),
                disbursedLoanAmount: 0,
                disbursedWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                officers: {} 
            };
        }
        globalBranchMap[branch].totalGLP += olb;
        if (status === 'active' || status === 'in arrears') globalBranchMap[branch].borrowerSet.add(clientName);
        if (days > 0) globalBranchMap[branch].parAmount += olb;
        if (isNewInclusion) {
            globalBranchMap[branch].newInclusionsCount += 1;
            globalBranchMap[branch].newInclusionsOlb += olb;
        }
        if (isCurrentMonthDisbursement) {
            globalBranchMap[branch].disbursedBorrowerSet.add(clientName);
            globalBranchMap[branch].disbursedLoanAmount += loanAmount;
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
                newInclusionsOlb: 0,
                borrowerSet: new Set(),
                disbursedBorrowerSet: new Set(),
                disbursedLoanAmount: 0,
                disbursedWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanWeeks: { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() },
                newLoanSet: new Set()
            };
        }
        globalBranchMap[branch].officers[officer].glp += olb;
        if (status === 'active' || status === 'in arrears') globalBranchMap[branch].officers[officer].borrowerSet.add(clientName);
        if (days > 0) globalBranchMap[branch].officers[officer].parAmount += olb;
        if (isNewInclusion) {
            globalBranchMap[branch].officers[officer].newInclusionsCount += 1;
            globalBranchMap[branch].officers[officer].newInclusionsOlb += olb;
        }
        if (isCurrentMonthDisbursement) {
            globalBranchMap[branch].officers[officer].disbursedBorrowerSet.add(clientName);
            globalBranchMap[branch].officers[officer].disbursedLoanAmount += loanAmount;
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

    const totalPARAmount = bracket1_30 + bracket31_60 + bracket61_90 + bracket91_180 + bracket181_365 + bracket365Plus;
    const parRatio = totalGLP > 0 ? (totalPARAmount / totalGLP) * 100 : 0;

    document.getElementById('kpiLoanPortfolio').innerText = totalGLP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiLoanPortfolioSub').innerText = `${data.length.toLocaleString()} Line Items`;
    document.getElementById('kpiParAmount').innerText = totalPARAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiParAmountSub').innerText = `${parBorrowersCount.toLocaleString()} In Arrears`;
    document.getElementById('kpiParRatio').innerText = parRatio.toFixed(2) + '%';
    document.getElementById('kpiBorrowers').innerText = filteredEligibleClients.size.toLocaleString();
    document.getElementById('kpiBorrowersSub').innerText = `${activeBorrowersCount} Act / ${parBorrowersCount} PAR`;
    document.getElementById('kpiDisbursedCount').innerText = globalDisbursedSet.size.toLocaleString();
    document.getElementById('kpiDisbursedTotalLoanHover').innerText = '₱ ' + globalDisbursedLoanAmountTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiNewLoanCount').innerText = globalNewLoanSet.size.toLocaleString();
    document.getElementById('kpiNewLoanTotalLoanHover').innerText = '₱ ' + globalNewLoanAmountTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('kpiNewInclusionsCount').innerText = globalNewInclusionsSet.size.toLocaleString();
    document.getElementById('kpiNewInclusionsOlbHover').innerText = '₱ ' + globalNewInclusionsOlbTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    renderBorrowerDoughnutChart(activeBorrowersCount, parBorrowersCount, parRatio);
    renderParAgingBarChart(bracket1_30, bracket31_60, bracket61_90, bracket91_180, bracket181_365, bracket365Plus, count1_30, count31_60, count61_90, count91_180, count181_365, count365Plus);
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

function renderCbsPivotMatrix(data) {
    const table = document.getElementById('cbsMatrixTable');
    const startMonth = parseInt(document.getElementById('cbsStartMonthFilter').value) || 0;
    const endMonth = parseInt(document.getElementById('cbsEndMonthFilter').value) || 999999;

    const filtered = data.filter(d => {
        if (!d['Application date']) return false;
        const dt = parseLocalDateString(d['Application date']);
        if (!dt) return false;
        const sk = dt.getFullYear() * 12 + dt.getMonth();
        return sk >= startMonth && sk <= endMonth;
    });

    const branchesSet = new Set();
    const loanTypesSet = new Set();
    const statusesSet = new Set();
    const matrix = {};

    filtered.forEach(item => {
        const branch = item.Branch;
        const rawProd = item['Product ID'] || '';
        const loanType = getProductCategory(rawProd);
        const status = item['Status'] || 'Unspecified';
        const clientName = item['Client name'] || 'UNKNOWN';

        branchesSet.add(branch);
        loanTypesSet.add(loanType);
        statusesSet.add(status);

        if (!matrix[loanType]) matrix[loanType] = {};
        if (!matrix[loanType][branch]) matrix[loanType][branch] = {};
        if (!matrix[loanType][branch][status]) matrix[loanType][branch][status] = new Set();

        matrix[loanType][branch][status].add(clientName);
    });

    const sortedBranches = Array.from(branchesSet).sort();
    const sortedLoanTypes = Array.from(loanTypesSet).sort();
    const sortedStatuses = Array.from(statusesSet).sort();

    if (sortedBranches.length === 0 || sortedLoanTypes.length === 0) {
        table.innerHTML = `<tbody><tr><td class="p-6 text-center text-slate-400 italic">No CBS records found for the selected month range.</td></tr></tbody>`;
        return;
    }

    let html = `<thead><tr class="bg-slate-100 text-slate-700 border-b-2 border-emerald-950 font-extrabold text-[11px] uppercase"><th class="p-2.5 pl-3">Row Labels</th>`;
    sortedStatuses.forEach(st => html += `<th class="p-2.5 text-center">${st}</th>`);
    html += `<th class="p-2.5 text-center font-black">Grand Total</th></tr></thead><tbody>`;

    const grandTotalStatuses = {};
    sortedStatuses.forEach(st => grandTotalStatuses[st] = new Set());
    let areaGrandTotalClients = new Set();

    sortedLoanTypes.forEach(lt => {
        html += `<tr class="bg-emerald-50/70 border-b border-emerald-900/30 font-bold text-bambooDark"><td colspan="${sortedStatuses.length + 2}" class="p-2 pl-3 uppercase">${lt}</td></tr>`;
        
        const ltTotalStatuses = {};
        sortedStatuses.forEach(st => ltTotalStatuses[st] = new Set());
        let ltGrandTotalClients = new Set();

        sortedBranches.forEach(b => {
            html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="p-2 pl-6 font-semibold text-slate-700">${b}</td>`;
            
            let branchRowClients = new Set();
            sortedStatuses.forEach(st => {
                const clientSet = matrix[lt] && matrix[lt][b] && matrix[lt][b][st] ? matrix[lt][b][st] : new Set();
                clientSet.forEach(c => {
                    branchRowClients.add(c);
                    ltTotalStatuses[st].add(c);
                    grandTotalStatuses[st].add(c);
                    ltGrandTotalClients.add(c);
                    areaGrandTotalClients.add(c);
                });
                const count = clientSet.size;
                html += `<td class="p-2 text-center font-mono text-slate-600">${count > 0 ? count : ''}</td>`;
            });
            html += `<td class="p-2 text-center font-mono font-bold text-slate-900 bg-slate-50">${branchRowClients.size > 0 ? branchRowClients.size : ''}</td></tr>`;
        });

        html += `<tr class="bg-slate-100/80 border-b-2 border-emerald-950 font-black text-slate-900"><td class="p-2 pl-4 uppercase">TOTAL ${lt}</td>`;
        sortedStatuses.forEach(st => {
            html += `<td class="p-2 text-center font-mono">${ltTotalStatuses[st].size > 0 ? ltTotalStatuses[st].size : ''}</td>`;
        });
        html += `<td class="p-2 text-center font-mono text-bambooDark">${ltGrandTotalClients.size}</td></tr>`;
    });

    html += `<tr class="bg-emerald-950 text-white font-black"><td class="p-3 pl-3 uppercase text-yellow-400">GRAND TOTAL</td>`;
    sortedStatuses.forEach(st => {
        html += `<td class="p-3 text-center font-mono text-yellow-300">${grandTotalStatuses[st].size}</td>`;
    });
    html += `<td class="p-3 text-center font-mono text-yellow-400 bg-emerald-900">${areaGrandTotalClients.size}</td></tr></tbody>`;

    table.innerHTML = html;
}

function renderBranchCards(bMap) {
    const grid = document.getElementById('branchCardsGrid');
    grid.innerHTML = '';

    Object.entries(bMap).forEach(([branchName, bData]) => {
        const parRatio = bData.totalGLP > 0 ? (bData.parAmount / bData.totalGLP) * 100 : 0;
        const totalOfficersCount = Object.keys(bData.officers).length;
        
        // Computed metrics:
        const avgPortfolioLoanSize = bData.borrowerSet.size > 0 ? bData.totalGLP / bData.borrowerSet.size : 0;
        const avgDisbursedLoanSize = bData.disbursedBorrowerSet.size > 0 ? bData.disbursedLoanAmount / bData.disbursedBorrowerSet.size : 0;

        const card = document.createElement('div');
        card.className = 'bg-bambooDark border-2 border-emerald-950 rounded-2xl p-4 space-y-4 text-white shadow-xl flex flex-col justify-between';
        card.innerHTML = `
            <div class="flex items-center justify-between pb-3 border-b border-emerald-700/50">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold">
                        <i data-lucide="map-pin" class="w-4 h-4"></i>
                    </div>
                    <h4 class="font-black text-sm uppercase tracking-wide text-white">${branchName}</h4>
                </div>
                <div class="text-right">
                    <span class="text-xs font-black text-white bg-emerald-900/80 px-3 py-1 rounded-lg border border-emerald-700/60 shadow-inner">
                        ${totalOfficersCount} Officers
                    </span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 font-mono">
                <div class="bg-emerald-950/70 p-3 rounded-xl border border-emerald-800/60 shadow-inner">
                    <span class="text-[10px] text-emerald-300 uppercase font-sans font-bold block">Loan Portfolio</span>
                    <span class="text-xs sm:text-sm font-black text-white">${bData.totalGLP.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div class="bg-emerald-950/70 p-3 rounded-xl border border-emerald-800/60 shadow-inner">
                    <span class="text-[10px] text-emerald-300 uppercase font-sans font-bold block">PAR Amount</span>
                    <span class="text-xs sm:text-sm font-black text-rose-400">${bData.parAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div class="bg-emerald-950/70 p-3 rounded-xl border border-emerald-800/60 shadow-inner">
                    <span class="text-[10px] text-emerald-300 uppercase font-sans font-bold block">PAR Ratio</span>
                    <span class="text-xs sm:text-sm font-black text-amber-400">${parRatio.toFixed(2)}%</span>
                </div>
                <div class="bg-emerald-950/70 p-3 rounded-xl border border-emerald-800/60 shadow-inner">
                    <span class="text-[10px] text-emerald-300 uppercase font-sans font-bold block">Borrowers</span>
                    <span class="text-xs sm:text-sm font-black text-emerald-300">${bData.borrowerSet.size.toLocaleString()}</span>
                </div>
            </div>

            <div class="bg-emerald-950/90 border border-emerald-800/70 p-3 rounded-xl space-y-2 text-xs">
                <div class="flex items-center justify-between">
                    <span class="text-emerald-200 font-bold">Disbursed (Month):</span>
                    <div class="font-mono text-right">
                        <span class="font-bold text-white">${bData.disbursedBorrowerSet.size} clients</span>
                        <span class="text-[10px] text-emerald-300 block">₱ ${bData.disbursedLoanAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                </div>
                <div class="flex items-center justify-between text-[11px] font-mono text-emerald-300 pl-2 border-l-2 border-emerald-500">
                    <span>W1: <strong class="text-white">${bData.disbursedWeeks[1].size}</strong></span>
                    <span>W2: <strong class="text-white">${bData.disbursedWeeks[2].size}</strong></span>
                    <span>W3: <strong class="text-white">${bData.disbursedWeeks[3].size}</strong></span>
                    <span>W4: <strong class="text-white">${bData.disbursedWeeks[4].size}</strong></span>
                    <span>W5: <strong class="text-white">${bData.disbursedWeeks[5].size}</strong></span>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-800/60 pt-1.5">
                    <span class="text-emerald-200 font-bold">Avg Disbursed Loan Size:</span>
                    <span class="font-bold text-white font-mono">₱ ${avgDisbursedLoanSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-800/60 pt-1.5">
                    <span class="text-emerald-200 font-bold">Avg Portfolio Loan Size:</span>
                    <span class="font-bold text-white font-mono">₱ ${avgPortfolioLoanSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-800/60 pt-1.5">
                    <span class="text-emerald-200 font-bold">New Loans (Month):</span>
                    <span class="font-bold text-white font-mono">${bData.newLoanSet.size} clients</span>
                </div>
                <div class="flex items-center justify-between border-t border-emerald-800/60 pt-1.5">
                    <span class="text-emerald-200 font-bold">New Inclusions:</span>
                    <div class="font-mono text-right">
                        <span class="font-bold text-yellow-300">${bData.newInclusionsCount} clients</span>
                        <span class="text-[10px] text-emerald-300 block">₱ ${bData.newInclusionsOlb.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                </div>
            </div>

            <button onclick="openBranchModal('${branchName}')" class="w-full py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold border border-emerald-700/60 transition-all flex items-center justify-center gap-2 shadow">
                <span>View TS Officer Breakdown</span>
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
        `;
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function renderBorrowerDoughnutChart(active, par, ratio) {
    const ctx = document.getElementById('borrowerDoughnutChart').getContext('2d');
    if (borrowerChart) borrowerChart.destroy();

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw(chart) {
            const { width, height, ctx } = chart;
            ctx.restore();
            const fontSize = (height / 115).toFixed(2);
            ctx.font = `bold ${fontSize}rem sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1b4332';

            const text = ratio.toFixed(2) + '%';
            const textX = Math.round((width - ctx.measureText(text).width) / 2);
            const textY = height / 2 - 8;

            ctx.fillText(text, textX, textY);

            ctx.font = `bold 9px sans-serif`;
            ctx.fillStyle = '#64748b';
            const subText = 'PAR RATIO';
            const subTextX = Math.round((width - ctx.measureText(subText).width) / 2);
            const subTextY = height / 2 + 12;
            ctx.fillText(subText, subTextX, subTextY);
            ctx.save();
        }
    };

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
        },
        plugins: [centerTextPlugin]
    });
}

function renderParAgingBarChart(b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6) {
    const ctx = document.getElementById('parAgingBarChart').getContext('2d');
    if (parAgingChart) parAgingChart.destroy();

    const counts = [c1, c2, c3, c4, c5, c6];

    parAgingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1-30', '31-60', '61-90', '91-180', '181-365', '>365'],
            datasets: [{
                label: 'OLB Principal',
                data: [b1, b2, b3, b4, b5, b6],
                backgroundColor: ['#52b788', '#d97706', '#c8102e', '#991b1b', '#7f1d1d', '#1b4332'],
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
            labels: ['Week 1 (1-3)', 'Week 2 (4-10)', 'Week 3 (11-17)', 'Week 4 (18-24)', 'Week 5 (25+)'],
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
    const counts = categories.map(c => productBorrowerSets[c].size);

    productChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'OLB Principal',
                data: totals,
                backgroundColor: '#1b4332',
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
                            const borrowers = counts[idx].toLocaleString();
                            return [`OLB Principal: ${amt}`, `Borrower Count: ${borrowers}`];
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

function executePresetPrompt(type) {
    const scope = document.getElementById('promptTargetScope').value;
    const container = document.getElementById('promptResultContainer');
    
    let filteredData = rawData;
    if (scope !== 'OVERALL') {
        filteredData = rawData.filter(d => d.Branch === scope);
    }

    if (filteredData.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic text-center py-2">No records found for scope: ${scope}</div>`;
        return;
    }

    let totalGLP = 0;
    let totalPAR = 0;
    const branchParMap = {};
    const officerParMap = {};

    filteredData.forEach(item => {
        const olb = item['OLB principal'] || 0;
        const days = item['Days in arrears'] || 0;
        const branch = item.Branch;
        const officer = item['Credit officer'];

        totalGLP += olb;
        if (days > 0) {
            totalPAR += olb;
            branchParMap[branch] = (branchParMap[branch] || 0) + olb;
            officerParMap[officer] = (officerParMap[officer] || 0) + olb;
        }
    });

    const parRatio = totalGLP > 0 ? (totalPAR / totalGLP) * 100 : 0;

    let html = '';
    if (type === 'PAR_HOTSPOTS') {
        const sortedBranches = Object.entries(branchParMap).sort((a,b) => b[1] - a[1]);
        html = `
            <div class="space-y-2 text-xs">
                <div class="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-red-600"></i> PAR Risk Hotspots Analysis (${scope})
                </div>
                <p class="text-slate-600 leading-relaxed">
                    Overall PAR Ratio stands at <strong class="text-red-600 font-mono">${parRatio.toFixed(2)}%</strong> (₱ ${totalPAR.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} in arrears out of ₱ ${totalGLP.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} GLP).
                </p>
                <div class="bg-white p-2.5 rounded-lg border border-slate-200">
                    <span class="font-bold text-slate-700 block mb-1">Top Arrears Concentration by Branch:</span>
                    <ul class="list-disc pl-4 space-y-0.5 text-slate-600 font-mono">
                        ${sortedBranches.slice(0, 3).map(([b, amt]) => `<li>${b}: <strong class="text-red-600">₱ ${amt.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</strong></li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    } else if (type === 'DISBURSEMENT_PACING') {
        html = `
            <div class="space-y-2 text-xs">
                <div class="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <i data-lucide="trending-up" class="w-4 h-4 text-blue-600"></i> Disbursement Pacing Insights (${scope})
                </div>
                <p class="text-slate-600 leading-relaxed">
                    Review weekly pacing charts above to ensure credit officers are meeting monthly targets consistently across weeks 1 through 5. Focus field coaching on lagging weekly disbursement cycles.
                </p>
            </div>
        `;
    } else if (type === 'CBS_BOTTLENECKS') {
        html = `
            <div class="space-y-2 text-xs">
                <div class="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <i data-lucide="hourglass" class="w-4 h-4 text-amber-600"></i> CBS Status Bottlenecks (${scope})
                </div>
                <p class="text-slate-600 leading-relaxed">
                    Examine the CBS Status Pivot Summary Matrix for pended loan folders under <em>Application Review</em>, <em>Draft</em>, or <em>Postponed</em> to enforce the 72-hour processing rule.
                </p>
            </div>
        `;
    } else if (type === 'GROWTH_ACTION_PLAN') {
        html = `
            <div class="space-y-2 text-xs">
                <div class="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <i data-lucide="rocket" class="w-4 h-4 text-emerald-700"></i> Executive Growth Action Plan (${scope})
                </div>
                <p class="text-slate-600 leading-relaxed">
                    1. Prioritize immediate collection follow-ups for accounts in 1-30 and 31-60 PAR brackets.<br>
                    2. Accelerate new loan client onboarding in top-performing credit officer portfolios.<br>
                    3. Conduct bi-weekly portfolio reviews to maintain area PAR ratio below threshold.
                </p>
            </div>
        `;
    }

    container.innerHTML = html;
    lucide.createIcons();
}

function handleCustomPromptSubmit(e) {
    e.preventDefault();
    const query = document.getElementById('customPromptInput').value.trim();
    if (!query) return;

    const container = document.getElementById('promptResultContainer');
    container.innerHTML = `
        <div class="space-y-2 text-xs">
            <div class="font-bold text-slate-900 uppercase flex items-center gap-1.5">
                <i data-lucide="sparkles" class="w-4 h-4 text-bambooDark"></i> Query: "${query}"
            </div>
            <p class="text-slate-600 leading-relaxed">
                Based on your current portfolio filter scope, review the active branch metrics, PAR risk aging brackets, and CBS status pivot matrix above to address this operational objective.
            </p>
        </div>
    `;
    lucide.createIcons();
}
