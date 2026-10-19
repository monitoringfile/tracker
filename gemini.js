/* ==========================================================
   GEMINI LIVE AI INSIGHTS ENGINE MODULE (gemini.js)
   ========================================================== */

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
        if (typeof globalBranchMap !== 'undefined') {
            Object.values(globalBranchMap).forEach(b => { targetGLP += b.totalGLP; targetPAR += b.parAmount; });
        }
    } else if (typeof globalBranchMap !== 'undefined' && globalBranchMap[scope]) {
        targetGLP = globalBranchMap[scope].totalGLP;
        targetPAR = globalBranchMap[scope].parAmount;
    }
    const parRatio = targetGLP > 0 ? (targetPAR / targetGLP) * 100 : 0;

    let userQuery = customText;
    if (type === 'PAR_HOTSPOTS') userQuery = "Analyze PAR & Risk Hotspots and provide precise Executive Insights and a 3-Step Action Plan.";
    else if (type === 'DISBURSEMENT_PACING') userQuery = "Evaluate Weekly Disbursement Pacing and provide growth velocity insights and a 3-Step Action Plan.";
    else if (type === 'CBS_BOTTLENECKS') userQuery = "Review CBS Application Pipeline bottlenecks and status counts, and provide operational insights and a 3-Step Action Plan.";
    else if (type === 'GROWTH_ACTION_PLAN') userQuery = "Generate a comprehensive Branch Growth & New Loan Action Plan with key insights and clear milestones.";

    container.innerHTML = `<div class="text-center py-3 text-xs text-emerald-300 font-bold">Gemini AI generating executive insights & action plan...</div>`;

    const GEMINI_API_KEY = "AQ.Ab8RN6Iao91PBwo8i5Jg_eKi9Gjqjpt4eZaBHGIr7XUUnzWIMQ";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemDirective = "You are a Senior Microfinance Operations Director. For the given portfolio scope and metrics, structure your response professionally into two distinct sections: \n1. **Executive Insights** (Key observations, risk patterns, and performance takeaways).\n2. **Action Plan** (3 clear, tactical, time-bound steps for Credit Officers / Branch Managers). Keep your tone authoritative, clear, and actionable.";

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemDirective}\n\nScope: ${scope}, GLP: ₱${targetGLP.toFixed(2)}, PAR Amount: ₱${targetPAR.toFixed(2)}, PAR Ratio: ${parRatio.toFixed(2)}%. Query: ${userQuery}` }] }]
            })
        });
        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        container.innerHTML = `<div class="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">${aiText}</div>`;
    } catch (err) {
        container.innerHTML = `<div class="text-xs text-rose-600 font-bold">Error connecting to Gemini API. Please check your connection.</div>`;
    }
}
