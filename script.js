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
    return isNaN(dt.getTime()) ? null : dt;
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
            const officerPortfolioLoanSize = oStats.borrowerSet.size > 0 ? (oStats.glp / oStats.borrowerSet.size) : 0;
            const officerDisbLoanSize = oStats.disbursedCount > 0 ? (oStats.disbursedLoanAmount / oStats.disbursedCount) : 0;
            
            const card = document.createElement('div');
            card.className = 'bg-white border border-slate-300 border-l-4 border-l-bambooPrimary p-4 rounded-xl space-y-3 text-xs shadow-sm';
            card.innerHTML = `
                <div class="flex items-center justify-between pb-2 border-b border-slate-200 font-bold text-slate-800">
                    <span class="text-sm font-black text-bambooPrimary"><i data-lucide="user-check" class="w-4 h-4 inline mr-1"></i> ${officerName}</span>
                    <div class="text-right">
                        <span class="text-slate-700 font-mono font-bold">${oStats.borrowerSet.size} Borrowers</span>
                        <span class="text-[10px] text-slate-500 font-mono block">₱ ${oStats.glp.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
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
                    <div class="flex items-center justify-between font-mono">
                        <span class="text-slate-700 font-bold font-sans text-[10px] uppercase">Portfolio Loan Size:</span>
                        <span class="font-bold text-slate-900">₱ ${officerPortfolioLoanSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="flex items-center justify-between pt-1 border-t border-emerald-100/60">
                        <span class="text-blue-700 font-bold">Disbursed (Month):</span>
                        <div class="font-mono text-right">
                            <span class="font-bold text-slate-900">${oStats.disbursedCount} loans</span>
                            <span class="text-[10px] text-slate-500 block">₱ ${oStats.disbursedLoanAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between font-mono pt-1 border-t border-emerald-100/60">
                        <span class="text-blue-800 font-bold font-sans text-[10px] uppercase">Disbursement Loan Size:</span>
                        <span class="font-bold text-blue-900">₱ ${officerDisbLoanSize.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] font-mono text-slate-600 pl-2 border-l-2 border-blue-400 pt-1">
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
const badgeEl = document.getElementById('newInclusionsBadge');
if (badgeEl) badgeEl.innerText = `New Inclusions: Arrears ≤ ${maxDaysForNewInclusion} days`;

const currentDateObj = new Date();
const currentDateStr = formatYYYYMMDD(currentDateObj);
const disbStartEl = document.getElementById('disbStartDate');
const disbEndEl = document.getElementById('disbEndDate');
if (disbStartEl) disbStartEl.value = currentDateStr;
if (disbEndEl) disbEndEl.value = currentDateStr;

const csvInput = document.getElementById('csvFileInput');
if (csvInput) {
    csvInput.addEventListener('change', (e) => {
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

                const welcomeBanner = document.getElementById('welcomeBanner');
                const dashboardContent = document.getElementById('dashboardContent');
                if (welcomeBanner) welcomeBanner.classList.add('hidden');
                if (dashboardContent) dashboardContent.classList.remove('hidden');

                populateFilters(rawData);
                
                const disbDates = rawData.map(d => parseLocalDateString(d['Disbursement date'])).filter(Boolean);
                if (disbDates.length > 0) {
                    disbDates.sort((a,b) => b - a);
                    const maxDateStr = formatYYYYMMDD(disbDates[0]);
                    if (disbStartEl) disbStartEl.value = maxDateStr;
                    if (disbEndEl) disbEndEl.value = maxDateStr;
                }

                renderDashboard(rawData);
                if (typeof executePresetPrompt === 'function') executePresetPrompt('PAR_HOTSPOTS');
            }
        });
    });
}

const branchFilterEl = document.getElementById('branchFilter');
const officerFilterEl = document.getElementById('officerFilter');
const cbsStartFilterEl = document.getElementById('cbsStartMonthFilter');
const cbsEndFilterEl = document.getElementById('cbsEndMonthFilter');
const resetFiltersEl = document.getElementById('resetFilters');

if (branchFilterEl) branchFilterEl.addEventListener('change', applyFilters);
if (officerFilterEl) officerFilterEl.addEventListener('change', applyFilters);
if (cbsStartFilterEl) cbsStartFilterEl.addEventListener('change', () => applyFilters());
if (cbsEndFilterEl) cbsEndFilterEl.addEventListener('change', () => applyFilters());
if (disbStartEl) disbStartEl.addEventListener('change', () => renderDailyDisbursementTable(rawData));
if (disbEndEl) disbEndEl.addEventListener('change', () => renderDailyDisbursementTable(rawData));

if (resetFiltersEl) {
    resetFiltersEl.addEventListener('click', () => {
        if (branchFilterEl) branchFilterEl.value = 'ALL';
        if (officerFilterEl) officerFilterEl.value = 'ALL';
        if (disbStartEl) disbStartEl.value = currentDateStr;
        if (disbEndEl) disbEndEl.value = currentDateStr;
        renderDashboard(rawData);
        if (typeof executePresetPrompt === 'function') executePresetPrompt('PAR_HOTSPOTS');
    });
}

function populateFilters(data) {
    const branches = [...new Set(data.map(d => d.Branch))].sort();
    const officers = [...new Set(data.map(d => d['Credit officer']))].sort();

    if (branchFilterEl) {
        branchFilterEl.innerHTML = '<option value="ALL">All Branches</option>';
        branches.forEach(b => branchFilterEl.innerHTML += `<option value="${b}">${b}</option>`);
    }

    if (officerFilterEl) {
        officerFilterEl.innerHTML = '<option value="ALL">All Credit Officers / TS</option>';
        officers.forEach(o => officerFilterEl.innerHTML += `<option value="${o}">${o}</option>`);
    }

    const promptScopeSelect = document.getElementById('promptTargetScope');
    if (promptScopeSelect) {
        promptScopeSelect.innerHTML = '<option value="OVERALL">Overall Area (All Branches)</option>';
        branches.forEach(b => promptScopeSelect.innerHTML += `<option value="${b}">${b}</option>`);
    }

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
    if (cbsStartFilterEl && cbsEndFilterEl) {
        cbsStartFilterEl.innerHTML = '';
        cbsEndFilterEl.innerHTML = '';

        sortedMonths.forEach(m => {
            cbsStartFilterEl.innerHTML += `<option value="${m.sortKey}">${m.label}</option>`;
            cbsEndFilterEl.innerHTML += `<option value="${m.sortKey}">${m.label}</option>`;
        });

        const currentDt = new Date();
        const currentSortKey = currentDt.getFullYear() * 12 + currentDt.getMonth();
        const hasCurrentMonth = sortedMonths.some(m => m.sortKey === currentSortKey);

        if (hasCurrentMonth) {
            cbsStartFilterEl.value = currentSortKey;
            cbsEndFilterEl.value = currentSortKey;
        } else if (sortedMonths.length > 0) {
            cbsStartFilterEl.value = sortedMonths[0].sortKey;
            cbsEndFilterEl.value = sortedMonths[sortedMonths.length - 1].sortKey;
        }
    }
}

function applyFilters() {
    const selectedBranch = branchFilterEl ? branchFilterEl.value : 'ALL';
    const selectedOfficer = officerFilterEl ? officerFilterEl.value : 'ALL';

    const filtered = rawData.filter(d => {
        const matchBranch = selectedBranch === 'ALL' || d.Branch === selectedBranch;
        const matchOfficer = selectedOfficer === 'ALL' || d['Credit officer'] === selectedOfficer;
        return matchBranch && matchOfficer;
    });

    renderDashboard(filtered);
    const promptScopeSelect = document.getElementById('promptTargetScope');
    if (promptScopeSelect) {
        promptScopeSelect.value = selectedBranch !== 'ALL' ? selectedBranch : 'OVERALL';
    }
    if (typeof executePresetPrompt === 'function') executePresetPrompt('PAR_HOTSPOTS');
}

function renderDashboard(data) {
    let totalGLP = 0;
    let bracket1_30 = 0, bracket31_60 = 0, bracket61_90 = 0, bracket91_180 = 0, bracket181_365 = 0, bracket365Plus = 0;
    let count1_30 = 0, count31_60 = 0, count61_90 = 0, count91_180 = 0, count181_365 = 0, count365Plus = 0;
    
    const productSummary = {};
    const productBorrowerSets = {};
    const clientMap = {};
    globalBranchMap = {};

    let referenceDate = new Date();
    const validDisbDates = data.map(d => parseLocalDateString(d['Disbursement date'])).filter(Boolean);
    if (validDisbDates.length > 0) {
        validDisbDates.sort((a,b) => b - a);
        referenceDate = validDisbDates[0];
    }
    const currentYear = referenceDate.getFullYear();
    const currentMonth = referenceDate.getMonth();

    const globalDisbursedWeeks = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    const globalNewLoanWeeks = { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set() };
    const globalNewInclusionsSet = new Set();
    
    let globalDisbursedCountTotal = 0;
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
                globalDisbursedCountTotal += 1;

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
                totalGLP: 0, parAmount: 0, newInclusionsCount: 0, newInclusionsOlb: 0,
                disbursedCount: 0, newLoanSet: new Set(), borrowerSet: new Set(), 
                disbursedBorrowerSet: new Set(), disbursedLoanAmount: 0, newLoanAmount: 0,
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
            globalBranchMap[branch].disbursedCount += 1;
            globalBranchMap[branch].disbursedBorrowerSet.add(clientName);
            globalBranchMap[branch].disbursedLoanAmount += loanAmount;
            globalBranchMap[branch].disbursedWeeks[disbWeek].add(clientName);
        }
        if (isMonthlyNewLoan) {
            globalBranchMap[branch].newLoanSet.add(clientName);
            globalBranchMap[branch].newLoanAmount += loanAmount;
            globalBranchMap[branch].newLoanWeeks[disbWeek].add(clientName);
        }

        if (!globalBranchMap[branch].officers[officer]) {
            globalBranchMap[branch].officers[officer] = { 
                glp: 0, parAmount: 0, newInclusionsCount: 0, newInclusionsOlb: 0,
                disbursedCount: 0, borrowerSet: new Set(), disbursedBorrowerSet: new Set(),
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
            globalBranchMap[branch].officers[officer].disbursedCount += 1;
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
    
    const globalPortfolioLoanSize = filteredEligibleClients.size > 0 ? (totalGLP / filteredEligibleClients.size) : 0;
    const globalDisbursedLoanSize = globalDisbursedCountTotal > 0 ? (globalDisbursedLoanAmountTotal / globalDisbursedCountTotal) : 0;

    const kpiLoanPortfolio = document.getElementById('kpiLoanPortfolio');
    if (kpiLoanPortfolio) kpiLoanPortfolio.innerText = totalGLP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    const portfolioParentTile = kpiLoanPortfolio ? kpiLoanPortfolio.parentElement : null;
    if (portfolioParentTile) {
        if (!portfolioParentTile.classList.contains('group')) {
            portfolioParentTile.classList.add('relative', 'group', 'cursor-pointer');
        }
        let portfolioHoverOverlay = document.getElementById('kpiLoanPortfolioHoverOverlay');
        if (!portfolioHoverOverlay) {
            portfolioHoverOverlay = document.createElement('div');
            portfolioHoverOverlay.id = 'kpiLoanPortfolioHoverOverlay';
            portfolioHoverOverlay.className = "absolute inset-0 bg-[#071a12]/95 text-white p-3 flex flex-col justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none z-10 text-center shadow-xl border-2 border-emerald-400";
            portfolioParentTile.appendChild(portfolioHoverOverlay);
        }
        portfolioHoverOverlay.innerHTML = `
            <span class="text-[10px] uppercase font-extrabold text-emerald-200">Portfolio Loan Size</span>
            <div class="text-sm font-black font-mono text-white mt-0.5">₱ ${globalPortfolioLoanSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <span class="text-[9px] text-emerald-300 mt-1">GLP / Active Borrowers</span>
        `;
    }

    const kpiParAmount = document.getElementById('kpiParAmount');
    const kpiParAmountSub = document.getElementById('kpiParAmountSub');
    const kpiParRatio = document.getElementById('kpiParRatio');
    const kpiBorrowers = document.getElementById('kpiBorrowers');
    const kpiBorrowersSub = document.getElementById('kpiBorrowersSub');
    const kpiDisbursedCount = document.getElementById('kpiDisbursedCount');
    const kpiDisbursedTotalLoanHover = document.getElementById('kpiDisbursedTotalLoanHover');
    const kpiNewLoanCount = document.getElementById('kpiNewLoanCount');
    const kpiNewLoanTotalLoanHover = document.getElementById('kpiNewLoanTotalLoanHover');
    const kpiNewInclusionsCount = document.getElementById('kpiNewInclusionsCount');
    const kpiNewInclusionsOlbHover = document.getElementById('kpiNewInclusionsOlbHover');

    if (kpiParAmount) kpiParAmount.innerText = totalPARAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (kpiParAmountSub) kpiParAmountSub.innerText = `${parBorrowersCount.toLocaleString()} In Arrears`;
    if (kpiParRatio) kpiParRatio.innerText = parRatio.toFixed(2) + '%';
    if (kpiBorrowers) kpiBorrowers.innerText = filteredEligibleClients.size.toLocaleString();
    if (kpiBorrowersSub) kpiBorrowersSub.innerText = `${activeBorrowersCount} Act / ${parBorrowersCount} PAR`;
    
    if (kpiDisbursedCount) kpiDisbursedCount.innerText = `${globalDisbursedCountTotal} loans`;
    if (kpiDisbursedTotalLoanHover) kpiDisbursedTotalLoanHover.innerText = '₱ ' + globalDisbursedLoanAmountTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    const disbursedHoverContainer = kpiDisbursedCount ? kpiDisbursedCount.parentElement.querySelector('.absolute') : null;
    if (disbursedHoverContainer) {
        disbursedHoverContainer.innerHTML = `
            <span class="text-[10px] uppercase font-extrabold text-blue-200">Disbursed Metrics</span>
            <div class="text-xs font-black font-mono text-white mt-0.5">Total Amt: ₱ ${globalDisbursedLoanAmountTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="text-xs font-black font-mono text-blue-200 mt-0.5">Loan Size: ₱ ${globalDisbursedLoanSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <span class="text-[9px] text-blue-300 mt-0.5">Current Month Disbursement</span>
        `;
    }

    if (kpiNewLoanCount) kpiNewLoanCount.innerText = globalNewLoanSet.size.toLocaleString();
    if (kpiNewLoanTotalLoanHover) kpiNewLoanTotalLoanHover.innerText = '₱ ' + globalNewLoanAmountTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (kpiNewInclusionsCount) kpiNewInclusionsCount.innerText = globalNewInclusionsSet.size.toLocaleString();
    if (kpiNewInclusionsOlbHover) kpiNewInclusionsOlbHover.innerText = '₱ ' + globalNewInclusionsOlbTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});

    const currentSelectedBranch = branchFilterEl ? branchFilterEl.value : 'ALL';
    renderNewInclusionsLineChart(rawData, currentSelectedBranch);
    renderParAgingBarChart(bracket1_30, bracket31_60, bracket61_90, bracket91_180, bracket181_365, bracket365Plus, count1_30, count31_60, count61_90, count91_180, count181_365, count365Plus);
    renderWeeklyPacingLineChart(globalDisbursedWeeks, globalNewLoanWeeks);
    renderProductBarChart(productSummary, productBorrowerSets);
    renderDailyDisbursementTable(data);
    renderCbsPivotMatrix(data);
    renderBranchCards(globalBranchMap);

    lucide.createIcons();
}

function renderDailyDisbursementTable(data) {
    const table = document.getElementById('dailyDisbursementTable');
    if (!table) return;
    const startDateStr = disbStartEl ? disbStartEl.value : '';
    const endDateStr = disbEndEl ? disbEndEl.value : '';

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

function renderNewInclusionsLineChart(data, branchFilterValue) {
    const canvas = document.getElementById('borrowerDoughnutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (borrowerChart) borrowerChart.destroy();

    const titleEl = document.getElementById('newInclusionsChartTitle');
    
    let labels = [];
    let counts = [];
    let olbTotals = [];

    const maxDays = maxDaysForNewInclusion || new Date().getDate();

    if (branchFilterValue && branchFilterValue !== 'ALL') {
        if (titleEl) titleEl.innerHTML = `<i data-lucide="trending-up" class="w-4 h-4 text-emerald-600"></i> New Inclusions: ${branchFilterValue} (By Officer)`;

        const officerMap = {};
        data.forEach(item => {
            if (item.Branch === branchFilterValue) {
                const officer = item['Credit officer'] || 'Unknown Officer';
                const days = item['Days in arrears'] || 0;
                const olb = item['OLB principal'] || 0;
                const clientName = item['Client name'] || 'UNKNOWN';

                if (days > 0 && days <= maxDays) {
                    if (!officerMap[officer]) officerMap[officer] = { clients: new Set(), olb: 0 };
                    officerMap[officer].clients.add(clientName);
                    officerMap[officer].olb += olb;
                }
            }
        });

        const sortedOfficers = Object.keys(officerMap).sort();
        labels = sortedOfficers;
        counts = sortedOfficers.map(o => officerMap[o].clients.size);
        olbTotals = sortedOfficers.map(o => officerMap[o].olb);

    } else {
        if (titleEl) titleEl.innerHTML = `<i data-lucide="trending-up" class="w-4 h-4 text-emerald-600"></i> New Inclusions by Branch`;

        const branchMap = {};
        data.forEach(item => {
            const branch = item.Branch || 'Unknown Branch';
            const days = item['Days in arrears'] || 0;
            const olb = item['OLB principal'] || 0;
            const clientName = item['Client name'] || 'UNKNOWN';

            if (days > 0 && days <= maxDays) {
                if (!branchMap[branch]) branchMap[branch] = { clients: new Set(), olb: 0 };
                branchMap[branch].clients.add(clientName);
                branchMap[branch].olb += olb;
            }
        });

        const sortedBranches = Object.keys(branchMap).sort();
        labels = sortedBranches;
        counts = sortedBranches.map(b => branchMap[b].clients.size);
        olbTotals = sortedBranches.map(b => branchMap[b].olb);
    }

    borrowerChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Inclusions Count',
                data: counts,
                borderColor: '#2d6a4f',
                backgroundColor: 'rgba(45, 106, 79, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 5,
                pointBackgroundColor: '#1b4332',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#071a12',
                    titleColor: '#52b788',
                    bodyColor: '#ffffff',
                    borderColor: '#52b788',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        title: function(context) {
                            return (branchFilterValue && branchFilterValue !== 'ALL' ? 'Officer: ' : 'Branch: ') + context[0].label;
                        },
                        label: function(context) {
                            const idx = context.dataIndex;
                            const count = context.raw;
                            const olbAmt = olbTotals[idx].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            return [
                                `New Inclusions: ${count} clients`,
                                `Total OLB: ₱ ${olbAmt}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#64748b', font: { size: 10, weight: 'bold' }, maxRotation: 25, minRotation: 25 },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#64748b', font: { size: 10 }, precision: 0 },
                    grid: { color: '#f1f5f9' }
                }
            }
        }
    });
    lucide.createIcons();
}

function renderParAgingBarChart(b1, b2, b3, b4, b5, b6, c1, c2, c3, c4, c5, c6) {
    const canvas = document.getElementById('parAgingBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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

function renderWeeklyPacingLineChart(disbWeeks, newWeeks) {
    const canvas = document.getElementById('weeklyPacingBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (weeklyChart) weeklyChart.destroy();

    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1 (1-3)', 'Week 2 (4-10)', 'Week 3 (11-17)', 'Week 4 (18-24)', 'Week 5 (25+)'],
            datasets: [
                { 
                    label: 'Disbursed', 
                    data: [disbWeeks[1].size, disbWeeks[2].size, disbWeeks[3].size, disbWeeks[4].size, disbWeeks[5].size], 
                    borderColor: '#2d6a4f', 
                    backgroundColor: 'rgba(45, 106, 79, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2d6a4f'
                },
                { 
                    label: 'New Loans', 
                    data: [newWeeks[1].size, newWeeks[2].size, newWeeks[3].size, newWeeks[4].size, newWeeks[5].size], 
                    borderColor: '#52b788', 
                    backgroundColor: 'rgba(82, 183, 136, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#52b788'
                }
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
    const canvas = document.getElementById('productBarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (productChart) productChart.destroy();

    const categories = Object.keys(productSummary);
    const totals = categories.map(c => productSummary[c]);
    const borrowerCounts = categories.map(c => productBorrowerSets[c] ? productBorrowerSets[c].size : 0);

    const totalPortfolio = totals.reduce((acc, val) => acc + val, 0);

    const vibrantColors = [
        '#2d6a4f', 
        '#3b82f6', 
        '#f59e0b', 
        '#ec4899', 
        '#8b5cf6', 
        '#06b6d4', 
        '#10b981', 
        '#f97316'  
    ];

    productChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: totals,
                backgroundColor: vibrantColors.slice(0, categories.length),
                borderWidth: 2,
                borderColor: '#071a12',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        boxWidth: 12, 
                        color: '#475569', 
                        font: { size: 10, weight: 'bold' },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = totalPortfolio > 0 ? ((value / totalPortfolio) * 100).toFixed(1) + '%' : '0%';
                                    return {
                                        text: `${label} (${percentage})`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    } 
                },
                tooltip: {
                    backgroundColor: '#071a12',
                    titleColor: '#52b788',
                    bodyColor: '#ffffff',
                    borderColor: '#52b788',
                    borderWidth: 1,
                    padding: 10,
                    boxPadding: 4,
                    callbacks: {
                        title: function(context) {
                            return `Product: ${context[0].label}`;
                        },
                        label: function(context) {
                            const idx = context.dataIndex;
                            const amt = context.raw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                            const percentage = totalPortfolio > 0 ? ((context.raw / totalPortfolio) * 100).toFixed(2) + '%' : '0%';
                            const borrowers = borrowerCounts[idx].toLocaleString();
                            return [
                                `OLB Principal: ₱ ${amt}`,
                                `Portfolio Share: ${percentage}`,
                                `Active Borrowers: ${borrowers} clients`
                            ];
                        }
                    }
                }
            },
            cutout: '55%'
        }
    });
}

function renderCbsPivotMatrix(data) {
    const startVal = cbsStartFilterEl ? parseInt(cbsStartFilterEl.value) || 0 : 0;
    const endVal = cbsEndFilterEl ? parseInt(cbsEndFilterEl.value) || 999999 : 999999;

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
    if (!table) return;
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
    if (!container) return;
    container.innerHTML = '';

    Object.keys(branchMap).sort().forEach(branch => {
        const b = branchMap[branch];
        const ratio = b.totalGLP > 0 ? (b.parAmount / b.totalGLP) * 100 : 0;
        const branchBorrowers = b.borrowerSet.size;
        const branchDisbursedCount = b.disbursedCount;
        const branchNewLoanCount = b.newLoanSet.size;
        const totalOfficersCount = Object.keys(b.officers).length;

        const portfolioLoanSize = branchBorrowers > 0 ? (b.totalGLP / branchBorrowers) : 0;
        const disbursementLoanSize = branchDisbursedCount > 0 ? (b.disbursedLoanAmount / branchDisbursedCount) : 0;
        const newLoanSize = branchNewLoanCount > 0 ? (b.newLoanAmount / branchNewLoanCount) : 0;

        const card = document.createElement('div');
        card.className = 'kpi-card p-4 hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between group';
        card.onclick = () => openBranchModal(branch);

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between pb-2 border-b border-[#16422d] mb-2">
                    <h4 class="font-black text-white text-sm uppercase flex items-center gap-1.5">
                        <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i> ${branch}
                    </h4>
                    <div class="text-right">
                        <span class="text-xs text-emerald-200 font-mono font-bold">${totalOfficersCount} Officers / TS</span>
                        <span class="text-[10px] text-slate-400 font-mono block">Active Roster</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mb-2.5 font-mono">
                    <div class="bg-[#113626]/70 p-2 rounded border border-[#16422d]">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">Loan Portfolio</span>
                        <span class="text-xs font-bold text-white">${b.totalGLP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="bg-[#113626]/70 p-2 rounded border border-[#16422d]">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">PAR Amount</span>
                        <span class="text-xs font-bold text-rose-400">${b.parAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="bg-[#113626]/70 p-2 rounded border border-[#16422d]">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">PAR Ratio</span>
                        <span class="text-xs font-bold text-amber-400">${ratio.toFixed(2)}%</span>
                    </div>
                    <div class="bg-[#113626]/70 p-2 rounded border border-[#16422d]">
                        <span class="text-[10px] font-sans font-bold uppercase text-slate-400 block">Borrowers</span>
                        <span class="text-xs font-bold text-emerald-300">${branchBorrowers.toLocaleString()}</span>
                    </div>
                </div>

                <div class="bg-[#113626]/50 border border-[#16422d] p-2.5 rounded-lg space-y-1.5 text-xs text-slate-200">
                    <div class="flex items-center justify-between font-mono">
                        <span class="text-slate-300 font-bold font-sans text-[10px] uppercase">Portfolio Loan Size:</span>
                        <span class="font-bold text-white">₱ ${portfolioLoanSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="flex items-center justify-between pt-1 border-t border-[#16422d]">
                        <span class="text-blue-300 font-bold">Disbursed (Month):</span>
                        <div class="font-mono text-right">
                            <span class="font-bold text-white">${branchDisbursedCount} loans</span>
                            <span class="text-[10px] text-slate-400 block">₱ ${b.disbursedLoanAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between font-mono pt-1 border-t border-[#16422d]">
                        <span class="text-blue-300 font-bold font-sans text-[10px] uppercase">Disbursement Loan Size:</span>
                        <span class="font-bold text-blue-200">₱ ${disbursementLoanSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                    <div class="flex items-center justify-between text-[11px] font-mono text-slate-300 pl-2 border-l-2 border-blue-400 pt-1">
                        <span>W1: <strong class="text-white">${b.disbursedWeeks[1].size}</strong></span>
                        <span>W2: <strong class="text-white">${b.disbursedWeeks[2].size}</strong></span>
                        <span>W3: <strong class="text-white">${b.disbursedWeeks[3].size}</strong></span>
                        <span>W4: <strong class="text-white">${b.disbursedWeeks[4].size}</strong></span>
                        <span>W5: <strong class="text-white">${b.disbursedWeeks[5].size}</strong></span>
                    </div>
                    
                    <!-- New Loans (Month) with Hover Tooltip -->
                    <div class="flex items-center justify-between border-t border-[#16422d] pt-1 relative group-new-loan cursor-pointer py-0.5">
                        <span class="text-teal-300 font-bold">New Loans (Month):</span>
                        <span class="font-bold text-white font-mono">${branchNewLoanCount} clients</span>

                        <div class="new-loan-hover-card absolute inset-0 bg-[#071a12] text-white px-3 flex flex-col justify-center items-center opacity-0 pointer-events-none transition-opacity duration-200 rounded border border-teal-400 z-20 shadow-xl">
                            <span class="text-[9px] uppercase font-extrabold text-teal-200">New Loan Amt: ₱ ${b.newLoanAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            <span class="text-[10px] font-black font-mono text-white mt-0.5">New Loan Size: ₱ ${newLoanSize.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between border-t border-[#16422d] pt-1">
                        <span class="text-emerald-400 font-bold">New Inclusions:</span>
                        <div class="font-mono text-right">
                            <span class="font-bold text-emerald-300">${b.newInclusionsCount} clients</span>
                            <span class="text-[10px] text-slate-400 block">₱ ${b.newInclusionsOlb.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-[11px] text-emerald-300 font-bold flex items-center justify-between pt-2 border-t border-[#16422d] mt-2 group-hover:text-emerald-200">
                <span>View TS Officer Breakdown</span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
            </div>
        `;
        container.appendChild(card);
    });
}
