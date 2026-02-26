// Authentication
const VALID_USER = 'ama';
const VALID_PASS = 'ama123';

// Meta API Configuration
const ACCESS_TOKEN = 'EAAWzO6nYvm8BQ2HBleIOJDitEmwZBG7iE9hhiZBNF8tijy0kgimpg8CGKuPBOdhGwvzHtwZCs5jwqMaqSY8gQ3q1fNkFQ2Uk7CVLV4sAnsvp8VuH03l07CelnBRD6uIOE9Aa20FUQVvjX7D52jSrhaZAHaYNBBSN0g1S7ntZAYiSgU3iNyKwx0040ZBUCb';
const API_VERSION = 'v19.0';
const BASE_URL = 'https://graph.facebook.com';

// Fixed account: CA : Vein Treatment Clinic
const ACCOUNT_ID = 'act_1151591609552634';

// Dashboard State
let currentRange = '7d';
let currentView = 'campaigns';
let spendChart = null;
let resultsChart = null;
let adsDataLoaded = false;
let adsRawData = []; // Store ads data for sorting
let adsSortColumn = 'results';
let adsSortDirection = 'desc';

// Bing Ads State
let bingDataLoaded = false;
let bingSpendChart = null;
let bingConversionsChart = null;

// Bing API is handled by the backend server
const BING_API_ENABLED = true;

// Ads Filters
let filterCampaign = '';
let filterAdset = '';
let filterAd = '';

const dateRanges = {
    'today': { preset: 'today', days: 1 },
    'yesterday': { preset: 'yesterday', days: 1 },
    '7d': { days: 7 },
    '14d': { days: 14 },
    '30d': { days: 30 }
};

// Format date as YYYY-MM-DD using EST timezone
function formatDateEST(d) {
    const estDate = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get current date in EST
function getESTDate() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

// Get date range string for API (includes today for 7d, 14d, 30d) - using EST
function getDateRange(range) {
    if (range.preset) {
        return `date_preset=${range.preset}`;
    }
    
    const today = getESTDate();
    const since = new Date(today);
    since.setDate(today.getDate() - range.days + 1);
    
    return `time_range={"since":"${formatDateEST(since)}","until":"${formatDateEST(today)}"}`;
}

// Get results from actions array - Custom Pixel Conversions + Lead Forms
function getResults(actions) {
    if (!actions) return 0;
    
    let total = 0;
    
    // Custom pixel conversions (use aggregate total, not individual custom.XXX to avoid double-counting)
    const pixelCustom = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_custom');
    if (pixelCustom) {
        total += parseInt(pixelCustom.value);
    }
    
    // Lead form submissions
    const lead = actions.find(a => a.action_type === 'lead');
    if (lead) {
        total += parseInt(lead.value);
    }
    
    return total;
}

// Get budget status color based on remaining percentage (for Today - pacing)
function getBudgetStatus(budgetRemaining, dailyBudget) {
    if (!dailyBudget || dailyBudget === 0) return { color: 'gray', label: '-', percent: 0 };
    
    const percentRemaining = (budgetRemaining / dailyBudget) * 100;
    
    if (percentRemaining >= 50) {
        return { color: '#31a24c', label: '🟢', percent: percentRemaining };
    } else if (percentRemaining >= 20) {
        return { color: '#f7b928', label: '🟡', percent: percentRemaining };
    } else {
        return { color: '#e74c3c', label: '🔴', percent: percentRemaining };
    }
}

// Get utilization status color based on spend percentage (for Yesterday)
function getUtilizationStatus(spend, dailyBudget) {
    if (!dailyBudget || dailyBudget === 0) return { color: 'gray', label: '-', percent: 0 };
    
    const percentSpent = (spend / dailyBudget) * 100;
    
    if (percentSpent >= 85) {
        return { color: '#31a24c', label: '🟢', percent: percentSpent };
    } else if (percentSpent >= 50) {
        return { color: '#f7b928', label: '🟡', percent: percentSpent };
    } else {
        return { color: '#e74c3c', label: '🔴', percent: percentSpent };
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('loggedIn')) {
        showDashboard();
    }
    initializeLogin();
});

function initializeLogin() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('error');
        
        if (username === VALID_USER && password === VALID_PASS) {
            sessionStorage.setItem('loggedIn', 'true');
            showDashboard();
        } else {
            errorEl.textContent = 'Invalid username or password';
            document.getElementById('password').value = '';
        }
    });
}

function showDashboard() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('hidden');
    initializeDashboard();
}

function initializeDashboard() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('loggedIn');
        location.reload();
    });

    // Date range filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            adsDataLoaded = false; // Reset ads data when date changes
            bingDataLoaded = false; // Reset bing data when date changes
            if (currentView === 'campaigns') {
                loadData();
            } else if (currentView === 'ads') {
                loadAdsData();
            } else if (currentView === 'bing') {
                loadBingData();
            }
        });
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            
            // Show/hide views
            document.getElementById('campaignsView').classList.toggle('hidden', currentView !== 'campaigns');
            document.getElementById('adsView').classList.toggle('hidden', currentView !== 'ads');
            document.getElementById('bingView').classList.toggle('hidden', currentView !== 'bing');
            
            // Load data for the selected view
            if (currentView === 'ads' && !adsDataLoaded) {
                loadAdsData();
            }
            if (currentView === 'bing' && !bingDataLoaded) {
                loadBingData();
            }
        });
    });
    
    // Section toggle (Meta dropdown)
    document.querySelectorAll('.nav-section-title').forEach(title => {
        title.addEventListener('click', () => {
            title.classList.toggle('collapsed');
            const items = title.nextElementSibling;
            if (items) {
                items.classList.toggle('collapsed');
            }
        });
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        adsDataLoaded = false;
        bingDataLoaded = false;
        if (currentView === 'campaigns') {
            loadData();
        } else if (currentView === 'ads') {
            loadAdsData();
        } else if (currentView === 'bing') {
            loadBingData();
        }
    });

    // Sortable column headers for Ads table
    document.querySelectorAll('#adsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            
            // Toggle direction if same column, otherwise default to desc
            if (adsSortColumn === sortKey) {
                adsSortDirection = adsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                adsSortColumn = sortKey;
                adsSortDirection = 'desc';
            }
            
            // Update header styles
            document.querySelectorAll('#adsTable th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            th.classList.add(adsSortDirection);
            
            // Re-render with new sort
            renderAdsTable();
        });
    });

    // Ads filter dropdowns
    document.getElementById('filterCampaign').addEventListener('change', (e) => {
        filterCampaign = e.target.value;
        updateAdsetDropdown();
        updateAdDropdown();
        renderAdsTable();
    });
    
    document.getElementById('filterAdset').addEventListener('change', (e) => {
        filterAdset = e.target.value;
        updateAdDropdown();
        renderAdsTable();
    });
    
    document.getElementById('filterAd').addEventListener('change', (e) => {
        filterAd = e.target.value;
        renderAdsTable();
    });
    
    document.getElementById('clearFilters').addEventListener('click', () => {
        filterCampaign = '';
        filterAdset = '';
        filterAd = '';
        document.getElementById('filterCampaign').value = '';
        document.getElementById('filterAdset').value = '';
        document.getElementById('filterAd').value = '';
        updateAdsetDropdown();
        updateAdDropdown();
        renderAdsTable();
    });
    
    loadData();
}

async function apiCall(endpoint) {
    const url = `${BASE_URL}/${API_VERSION}/${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${ACCESS_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
        console.error('API Error:', data.error);
        throw new Error(data.error.message);
    }
    return data;
}

function showError(message) {
    const campaignCols = (currentRange === 'today' || currentRange === 'yesterday') ? 10 : 8;
    document.getElementById('campaignBody').innerHTML = 
        `<tr><td colspan="${campaignCols}" class="loading">${message}</td></tr>`;
    document.getElementById('dailyBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
}

async function loadData() {
    const campaignCols = (currentRange === 'today' || currentRange === 'yesterday') ? 10 : 8;
    document.getElementById('campaignBody').innerHTML = `<tr><td colspan="${campaignCols}" class="loading">Loading...</td></tr>`;
    document.getElementById('dailyBody').innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadKPIs(),
            loadChartData(),
            loadCampaignData(),
            loadDailyData()
        ]);
        updateLastUpdated();
    } catch (error) {
        showError('Error loading data: ' + error.message);
    }
}

function updateLastUpdated() {
    const now = new Date().toLocaleString();
    document.getElementById('lastUpdate').textContent = now;
    document.getElementById('lastUpdateTop').textContent = now;
}

async function loadKPIs() {
    const range = dateRanges[currentRange];
    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&${getDateRange(range)}`
        );
        
        if (data.data?.[0]) {
            const d = data.data[0];
            const spend = parseFloat(d.spend || 0);
            const impressions = parseInt(d.impressions || 0);
            const clicks = parseInt(d.clicks || 0);
            const results = getResults(d.actions);

            document.getElementById('totalSpend').textContent = '$' + spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('totalResults').textContent = results.toLocaleString();
            document.getElementById('costPerResult').textContent = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            document.getElementById('cpc').textContent = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            document.getElementById('ctr').textContent = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '-';
            document.getElementById('impressions').textContent = impressions.toLocaleString();
        }
    } catch (e) { 
        console.error('KPI error:', e); 
    }
}

async function loadChartData() {
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);

    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,actions&${getDateRange(range)}&time_increment=1`
        );
        
        const dailySpend = new Array(range.days).fill(0);
        const dailyResults = new Array(range.days).fill(0);

        if (data.data) {
            const dataByDate = {};
            data.data.forEach(day => {
                dataByDate[day.date_start] = day;
            });
            
            const today = getESTDate();
            for (let i = 0; i < range.days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - (range.days - 1 - i));
                const dateStr = formatDateEST(date);
                
                if (dataByDate[dateStr]) {
                    dailySpend[i] = parseFloat(dataByDate[dateStr].spend || 0);
                    dailyResults[i] = getResults(dataByDate[dateStr].actions);
                }
            }
        }

        renderSpendChart(days, dailySpend);
        renderResultsChart(days, dailyResults);
    } catch (e) { 
        console.error('Chart error:', e);
        renderSpendChart(days, new Array(range.days).fill(0));
        renderResultsChart(days, new Array(range.days).fill(0));
    }
}

function getDaysArray(numDays) {
    const days = [];
    const today = getESTDate();
    for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' }));
    }
    return days;
}

function renderSpendChart(labels, data) {
    const ctx = document.getElementById('spendChart').getContext('2d');
    if (spendChart) spendChart.destroy();
    
    spendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Spend ($)',
                data,
                borderColor: '#1877f2',
                backgroundColor: 'rgba(24, 119, 242, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#1877f2',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
        }
    });
}

function renderResultsChart(labels, data) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    if (resultsChart) resultsChart.destroy();
    
    resultsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Results',
                data,
                backgroundColor: 'rgba(49, 162, 76, 0.8)',
                borderColor: '#31a24c',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function loadCampaignData() {
    const range = dateRanges[currentRange];
    const showBudget = currentRange === 'today' || currentRange === 'yesterday';
    const isToday = currentRange === 'today';
    const colCount = showBudget ? 10 : 8;
    
    // Update table header based on whether we're showing budget columns
    const thead = document.getElementById('campaignHead');
    if (showBudget) {
        const statusHeader = isToday 
            ? 'Pacing <span class="info-icon" title="🟢 50%+ remaining&#10;🟡 20-50% remaining&#10;🔴 &lt;20% remaining">ⓘ</span>'
            : 'Utilization <span class="info-icon" title="🟢 85%+ spent&#10;🟡 50-85% spent&#10;🔴 &lt;50% spent">ⓘ</span>';
        thead.innerHTML = `
            <tr>
                <th>Campaign</th>
                <th>Spend</th>
                <th>Daily Budget</th>
                <th>${statusHeader}</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Results</th>
                <th>Cost/Result</th>
            </tr>
        `;
    } else {
        thead.innerHTML = `
            <tr>
                <th>Campaign</th>
                <th>Spend</th>
                <th>Impressions</th>
                <th>Clicks</th>
                <th>CTR</th>
                <th>CPC</th>
                <th>Results</th>
                <th>Cost/Result</th>
            </tr>
        `;
    }
    
    // Build the insights query based on date range (using EST)
    let insightsQuery;
    if (range.preset) {
        insightsQuery = `insights.date_preset(${range.preset})`;
    } else {
        const today = getESTDate();
        const since = new Date(today);
        since.setDate(today.getDate() - range.days + 1);
        insightsQuery = `insights.time_range({"since":"${formatDateEST(since)}","until":"${formatDateEST(today)}"})`;
    }

    try {
        // Fetch campaigns with insights
        const campaignData = await apiCall(
            `${ACCOUNT_ID}/campaigns?fields=name,status,${insightsQuery}{spend,impressions,clicks,actions}&limit=50&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]`
        );
        
        let budgetByCampaign = {};
        
        // Only fetch budget data if showing Today
        if (showBudget) {
            // Fetch ALL ad sets with budget info (not just filtered - filter may miss some)
            const adsetData = await apiCall(
                `${ACCOUNT_ID}/adsets?fields=campaign_id,daily_budget,budget_remaining,status,effective_status&limit=200`
            );
            
            // Aggregate budget by campaign (ACTIVE ad sets only)
            if (adsetData.data) {
                adsetData.data.forEach(adset => {
                    // Only count ACTIVE ad sets
                    if (adset.status !== 'ACTIVE' && adset.effective_status !== 'ACTIVE') return;
                    if (!budgetByCampaign[adset.campaign_id]) {
                        budgetByCampaign[adset.campaign_id] = { daily_budget: 0, budget_remaining: 0 };
                    }
                    budgetByCampaign[adset.campaign_id].daily_budget += parseInt(adset.daily_budget || 0);
                    budgetByCampaign[adset.campaign_id].budget_remaining += parseInt(adset.budget_remaining || 0);
                });
            }
        }
        
        const campaigns = campaignData.data?.filter(c => c.status === 'ACTIVE') || [];

        const tbody = document.getElementById('campaignBody');
        if (campaigns.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${colCount}" class="loading">No active campaigns with data</td></tr>`;
            return;
        }

        campaigns.sort((a, b) => parseFloat(b.insights?.data?.[0]?.spend || 0) - parseFloat(a.insights?.data?.[0]?.spend || 0));

        tbody.innerHTML = campaigns.map(c => {
            const ins = c.insights?.data?.[0] || {};
            const spend = parseFloat(ins.spend || 0);
            const impressions = parseInt(ins.impressions || 0);
            const clicks = parseInt(ins.clicks || 0);
            const results = getResults(ins.actions);
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            
            if (showBudget) {
                // Budget info (convert from cents to dollars) - ACTIVE ad sets only
                const budget = budgetByCampaign[c.id] || { daily_budget: 0, budget_remaining: 0 };
                const dailyBudget = budget.daily_budget / 100;
                const budgetRemaining = budget.budget_remaining / 100;
                
                // Today: show pacing (% remaining), Yesterday: show utilization (% spent)
                let statusInfo;
                let statusTitle;
                if (isToday) {
                    statusInfo = getBudgetStatus(budgetRemaining, dailyBudget);
                    statusTitle = `${statusInfo.percent?.toFixed(1) || 0}% remaining`;
                } else {
                    statusInfo = getUtilizationStatus(spend, dailyBudget);
                    statusTitle = `${statusInfo.percent?.toFixed(1) || 0}% of budget spent`;
                }

                return `
                    <tr>
                        <td>${c.name}</td>
                        <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td>$${dailyBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td title="${statusTitle}">${statusInfo.label}</td>
                        <td>${impressions.toLocaleString()}</td>
                        <td>${clicks.toLocaleString()}</td>
                        <td>${ctr}%</td>
                        <td>${cpc}</td>
                        <td>${results}</td>
                        <td>${costPerResult}</td>
                    </tr>
                `;
            } else {
                return `
                    <tr>
                        <td>${c.name}</td>
                        <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td>${impressions.toLocaleString()}</td>
                        <td>${clicks.toLocaleString()}</td>
                        <td>${ctr}%</td>
                        <td>${cpc}</td>
                        <td>${results}</td>
                        <td>${costPerResult}</td>
                    </tr>
                `;
            }
        }).join('');
    } catch (e) { 
        console.error('Campaign error:', e);
        document.getElementById('campaignBody').innerHTML = `<tr><td colspan="${colCount}" class="loading">Error loading campaigns</td></tr>`;
    }
}

async function loadDailyData() {
    const range = dateRanges[currentRange];

    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&${getDateRange(range)}&time_increment=1`
        );

        const tbody = document.getElementById('dailyBody');
        
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No daily data for this period</td></tr>';
            return;
        }

        // Sort by date descending
        const sortedData = data.data.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

        tbody.innerHTML = sortedData.map(day => {
            const spend = parseFloat(day.spend || 0);
            const impressions = parseInt(day.impressions || 0);
            const clicks = parseInt(day.clicks || 0);
            const results = getResults(day.actions);
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            
            // Parse date - create from parts to avoid timezone issues
            const dateParts = day.date_start.split('-');
            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

            return `
                <tr>
                    <td>${dateFormatted}</td>
                    <td>${dayOfWeek}</td>
                    <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td>${impressions.toLocaleString()}</td>
                    <td>${clicks.toLocaleString()}</td>
                    <td>${ctr}%</td>
                    <td>${cpc}</td>
                    <td>${results}</td>
                    <td>${costPerResult}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Daily error:', e);
        document.getElementById('dailyBody').innerHTML = '<tr><td colspan="9" class="loading">Error loading daily data</td></tr>';
    }
}

// Load Ads Data with Creative Thumbnails
async function loadAdsData() {
    const range = dateRanges[currentRange];
    const tbody = document.getElementById('adsBody');
    tbody.innerHTML = '<tr><td colspan="11" class="loading">Loading ads...</td></tr>';

    try {
        // Get ad-level insights for current period
        const insightsData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,actions&${getDateRange(range)}&limit=100`
        );

        if (!insightsData.data || insightsData.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading">No ad data for this period</td></tr>';
            return;
        }
        
        // Get last 7 days baseline for trend comparison
        const baselineData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,spend,actions&date_preset=last_7d&limit=100`
        );
        
        // Build baseline CPR map
        const baselineCPR = {};
        if (baselineData.data) {
            baselineData.data.forEach(ad => {
                const spend = parseFloat(ad.spend || 0);
                const results = getResults(ad.actions);
                baselineCPR[ad.ad_id] = results > 0 ? spend / results : null;
            });
        }

        // Get creative info for each ad (batch requests in chunks of 50)
        const adIds = insightsData.data.map(ad => ad.ad_id);
        const creativeData = {};
        
        // Fetch creative IDs in batches of 50
        for (let i = 0; i < adIds.length; i += 50) {
            const batchIds = adIds.slice(i, i + 50);
            const adsWithCreatives = await apiCall(
                `?ids=${batchIds.join(',')}&fields=creative`
            );
            
            // Collect creative IDs from this batch
            Object.values(adsWithCreatives).forEach(ad => {
                if (ad.creative?.id) {
                    creativeData[ad.id] = { creativeId: ad.creative.id };
                }
            });
        }

        // Collect unique creative IDs
        const creativeIds = [...new Set(Object.values(creativeData).map(c => c.creativeId))];

        // Fetch thumbnail URLs in batches of 50
        for (let i = 0; i < creativeIds.length; i += 50) {
            const batchIds = creativeIds.slice(i, i + 50);
            const creativesInfo = await apiCall(
                `?ids=${batchIds.join(',')}&fields=thumbnail_url,video_id`
            );
            
            // Map creative info back to ads
            Object.keys(creativeData).forEach(adId => {
                const creativeId = creativeData[adId].creativeId;
                if (creativesInfo[creativeId]) {
                    creativeData[adId].thumbnail = creativesInfo[creativeId].thumbnail_url;
                    creativeData[adId].videoId = creativesInfo[creativeId].video_id;
                }
            });
        }

        // Process and store ads data for sorting
        adsRawData = insightsData.data.map(ad => {
            const spend = parseFloat(ad.spend || 0);
            const impressions = parseInt(ad.impressions || 0);
            const clicks = parseInt(ad.clicks || 0);
            const ctr = ad.ctr ? parseFloat(ad.ctr) : 0;
            const results = getResults(ad.actions);
            const costPerResult = results > 0 ? spend / results : Infinity;
            
            // Calculate CPR trend vs 7-day baseline
            const baseline = baselineCPR[ad.ad_id];
            let cprTrend = null; // percentage change
            if (baseline && costPerResult !== Infinity && baseline > 0) {
                cprTrend = ((costPerResult - baseline) / baseline) * 100;
            }
            
            const creative = creativeData[ad.ad_id] || {};
            
            return {
                ad_id: ad.ad_id,
                ad_name: ad.ad_name,
                adset_name: ad.adset_name || '-',
                campaign_name: ad.campaign_name,
                spend,
                impressions,
                clicks,
                ctr,
                results,
                cost_per_result: costPerResult,
                cpr_trend: cprTrend,
                thumbnail: creative.thumbnail,
                videoId: creative.videoId
            };
        });
        
        adsDataLoaded = true;
        
        // Reset filters and populate dropdowns
        filterCampaign = '';
        filterAdset = '';
        filterAd = '';
        populateAdsFilterDropdowns();
        
        renderAdsTable();
        updateLastUpdated();
    } catch (e) {
        console.error('Ads error:', e);
        tbody.innerHTML = `<tr><td colspan="11" class="loading">Error loading ads: ${e.message}</td></tr>`;
    }
}

// Populate filter dropdowns
function populateAdsFilterDropdowns() {
    const campaigns = [...new Set(adsRawData.map(ad => ad.campaign_name))].sort();
    const campaignSelect = document.getElementById('filterCampaign');
    campaignSelect.innerHTML = '<option value="">All Campaigns</option>' + 
        campaigns.map(c => `<option value="${c}">${c}</option>`).join('');
    
    updateAdsetDropdown();
    updateAdDropdown();
}

function updateAdsetDropdown() {
    let filteredData = adsRawData;
    if (filterCampaign) {
        filteredData = filteredData.filter(ad => ad.campaign_name === filterCampaign);
    }
    
    const adsets = [...new Set(filteredData.map(ad => ad.adset_name))].sort();
    const adsetSelect = document.getElementById('filterAdset');
    adsetSelect.innerHTML = '<option value="">All Ad Sets</option>' + 
        adsets.map(a => `<option value="${a}">${a}</option>`).join('');
    
    // Reset adset filter if current selection is not in filtered list
    if (filterAdset && !adsets.includes(filterAdset)) {
        filterAdset = '';
        adsetSelect.value = '';
    }
}

function updateAdDropdown() {
    let filteredData = adsRawData;
    if (filterCampaign) {
        filteredData = filteredData.filter(ad => ad.campaign_name === filterCampaign);
    }
    if (filterAdset) {
        filteredData = filteredData.filter(ad => ad.adset_name === filterAdset);
    }
    
    const ads = [...new Set(filteredData.map(ad => ad.ad_name))].sort();
    const adSelect = document.getElementById('filterAd');
    adSelect.innerHTML = '<option value="">All Ads</option>' + 
        ads.map(a => `<option value="${a}">${a}</option>`).join('');
    
    // Reset ad filter if current selection is not in filtered list
    if (filterAd && !ads.includes(filterAd)) {
        filterAd = '';
        adSelect.value = '';
    }
}

// Render ads table with current sort and filters
function renderAdsTable() {
    const tbody = document.getElementById('adsBody');
    
    // Filter the data
    let filteredAds = adsRawData;
    if (filterCampaign) {
        filteredAds = filteredAds.filter(ad => ad.campaign_name === filterCampaign);
    }
    if (filterAdset) {
        filteredAds = filteredAds.filter(ad => ad.adset_name === filterAdset);
    }
    if (filterAd) {
        filteredAds = filteredAds.filter(ad => ad.ad_name === filterAd);
    }
    
    // Sort the data
    const sortedAds = [...filteredAds].sort((a, b) => {
        let valA = a[adsSortColumn];
        let valB = b[adsSortColumn];
        
        // Handle string sorting
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            if (adsSortDirection === 'asc') {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        }
        
        // Handle numeric sorting
        if (adsSortDirection === 'asc') {
            return valA - valB;
        } else {
            return valB - valA;
        }
    });

    tbody.innerHTML = sortedAds.map(ad => {
        let thumbnailHtml;
        if (ad.thumbnail && ad.videoId) {
            thumbnailHtml = `
                <a href="https://www.facebook.com/watch/?v=${ad.videoId}" target="_blank" class="ad-thumbnail-link" title="Watch video">
                    <img src="${ad.thumbnail}" alt="Ad creative" class="ad-thumbnail" loading="lazy">
                </a>
            `;
        } else if (ad.thumbnail) {
            thumbnailHtml = `<img src="${ad.thumbnail}" alt="Ad creative" class="ad-thumbnail" loading="lazy">`;
        } else {
            thumbnailHtml = `<div class="no-thumbnail">🖼️</div>`;
        }

        const costPerResultDisplay = ad.cost_per_result !== Infinity ? '$' + ad.cost_per_result.toFixed(2) : '-';
        
        // Format trend
        let trendHtml;
        if (ad.cpr_trend === null || ad.results === 0) {
            trendHtml = '<span class="trend-neutral">-</span>';
        } else if (ad.cpr_trend > 0) {
            trendHtml = `<span class="trend-up">↑ ${ad.cpr_trend.toFixed(1)}%</span>`;
        } else if (ad.cpr_trend < 0) {
            trendHtml = `<span class="trend-down">↓ ${Math.abs(ad.cpr_trend).toFixed(1)}%</span>`;
        } else {
            trendHtml = '<span class="trend-neutral">→ 0%</span>';
        }

        return `
            <tr>
                <td>${thumbnailHtml}</td>
                <td>${ad.ad_name}</td>
                <td>${ad.adset_name}</td>
                <td>${ad.campaign_name}</td>
                <td>$${ad.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${ad.impressions.toLocaleString()}</td>
                <td>${ad.clicks.toLocaleString()}</td>
                <td>${ad.ctr.toFixed(2)}%</td>
                <td>${ad.results}</td>
                <td>${costPerResultDisplay}</td>
                <td>${trendHtml}</td>
            </tr>
        `;
    }).join('');
}

// =====================================================
// MICROSOFT BING ADS INTEGRATION
// =====================================================

// Get date range for Bing API (YYYY-MM-DD format)
function getBingDateRange(range) {
    const today = getESTDate();
    let since, until;
    
    if (range.preset === 'today') {
        since = formatDateEST(today);
        until = formatDateEST(today);
    } else if (range.preset === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        since = formatDateEST(yesterday);
        until = formatDateEST(yesterday);
    } else {
        const sinceDate = new Date(today);
        sinceDate.setDate(today.getDate() - range.days + 1);
        since = formatDateEST(sinceDate);
        until = formatDateEST(today);
    }
    
    return { since, until };
}

// Main Bing data loading function
async function loadBingData() {
    document.getElementById('bingCampaignBody').innerHTML = '<tr><td colspan="8" class="loading">Loading Bing data...</td></tr>';
    document.getElementById('bingDailyBody').innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadBingKPIs(),
            loadBingChartData(),
            loadBingCampaignData(),
            loadBingDailyData()
        ]);
        bingDataLoaded = true;
        updateLastUpdated();
    } catch (error) {
        console.error('Bing data error:', error);
        showBingLoadingError('Error loading Bing data: ' + error.message);
    }
}

// Show error message for Bing
function showBingLoadingError(errorMsg) {
    const message = `
        <tr>
            <td colspan="8" class="loading">
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 10px;">⚠️ Error Loading Bing Data</h3>
                    <p style="color: #65676b;">${errorMsg}</p>
                </div>
            </td>
        </tr>
    `;
    document.getElementById('bingCampaignBody').innerHTML = message;
    document.getElementById('bingDailyBody').innerHTML = `<tr><td colspan="9" class="loading">${errorMsg}</td></tr>`;
    
    // Reset KPIs
    document.getElementById('bingTotalSpend').textContent = '$0.00';
    document.getElementById('bingTotalConversions').textContent = '0';
    document.getElementById('bingCostPerConversion').textContent = '$0.00';
    document.getElementById('bingCpc').textContent = '$0.00';
    document.getElementById('bingCtr').textContent = '0.00%';
    document.getElementById('bingImpressions').textContent = '0';
    
    // Show empty charts
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);
    renderBingSpendChart(days, new Array(range.days).fill(0));
    renderBingConversionsChart(days, new Array(range.days).fill(0));
}

function showBingError(message) {
    document.getElementById('bingCampaignBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
    document.getElementById('bingDailyBody').innerHTML = 
        `<tr><td colspan="9" class="loading">${message}</td></tr>`;
}

// Bing API call helper - calls the backend proxy
async function bingApiCall(endpoint, params = {}) {
    const response = await fetch(`/api/bing/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    return data;
}

// Load Bing KPIs
async function loadBingKPIs() {
    const range = dateRanges[currentRange];
    const dateRange = getBingDateRange(range);
    
    try {
        const data = await bingApiCall('account-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        if (data) {
            const spend = parseFloat(data.spend || 0);
            const impressions = parseInt(data.impressions || 0);
            const clicks = parseInt(data.clicks || 0);
            const conversions = parseFloat(data.conversions || 0);

            document.getElementById('bingTotalSpend').textContent = '$' + spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('bingTotalConversions').textContent = Math.round(conversions).toLocaleString();
            document.getElementById('bingCostPerConversion').textContent = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            document.getElementById('bingCpc').textContent = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            document.getElementById('bingCtr').textContent = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '-';
            document.getElementById('bingImpressions').textContent = impressions.toLocaleString();
        }
    } catch (e) { 
        console.error('Bing KPI error:', e);
        throw e;
    }
}

// Load Bing Chart Data
async function loadBingChartData() {
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);

    try {
        const dateRange = getBingDateRange(range);
        const data = await bingApiCall('daily-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        const dailySpend = new Array(range.days).fill(0);
        const dailyConversions = new Array(range.days).fill(0);

        if (data && data.rows) {
            const dataByDate = {};
            data.rows.forEach(row => {
                // Handle different date formats (MM/DD/YYYY or YYYY-MM-DD)
                let dateKey = row.date;
                if (dateKey && dateKey.includes('/')) {
                    const parts = dateKey.split('/');
                    dateKey = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                }
                dataByDate[dateKey] = row;
            });
            
            const today = getESTDate();
            for (let i = 0; i < range.days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() - (range.days - 1 - i));
                const dateStr = formatDateEST(date);
                
                if (dataByDate[dateStr]) {
                    dailySpend[i] = parseFloat(dataByDate[dateStr].spend || 0);
                    dailyConversions[i] = Math.round(parseFloat(dataByDate[dateStr].conversions || 0));
                }
            }
        }

        renderBingSpendChart(days, dailySpend);
        renderBingConversionsChart(days, dailyConversions);
    } catch (e) { 
        console.error('Bing Chart error:', e);
        renderBingSpendChart(days, new Array(range.days).fill(0));
        renderBingConversionsChart(days, new Array(range.days).fill(0));
    }
}

// Render Bing Spend Chart
function renderBingSpendChart(labels, data) {
    const ctx = document.getElementById('bingSpendChart').getContext('2d');
    if (bingSpendChart) bingSpendChart.destroy();
    
    bingSpendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Spend ($)',
                data,
                borderColor: '#00a4ef',  // Bing/Microsoft blue
                backgroundColor: 'rgba(0, 164, 239, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00a4ef',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
        }
    });
}

// Render Bing Conversions Chart
function renderBingConversionsChart(labels, data) {
    const ctx = document.getElementById('bingConversionsChart').getContext('2d');
    if (bingConversionsChart) bingConversionsChart.destroy();
    
    bingConversionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Conversions',
                data,
                backgroundColor: 'rgba(0, 164, 239, 0.8)',  // Bing/Microsoft blue
                borderColor: '#00a4ef',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Load Bing Campaign Data
async function loadBingCampaignData() {
    const range = dateRanges[currentRange];
    const dateRange = getBingDateRange(range);

    try {
        const data = await bingApiCall('campaign-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });

        // Filter for active campaigns or show all if status not available
        const campaigns = data?.campaigns || [];
        const tbody = document.getElementById('bingCampaignBody');
        
        if (campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No campaigns with data for this period</td></tr>';
            return;
        }

        // Sort by spend descending
        campaigns.sort((a, b) => parseFloat(b.spend || 0) - parseFloat(a.spend || 0));

        tbody.innerHTML = campaigns.map(c => {
            const spend = parseFloat(c.spend || 0);
            const impressions = parseInt(c.impressions || 0);
            const clicks = parseInt(c.clicks || 0);
            const conversions = Math.round(parseFloat(c.conversions || 0));
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';

            return `
                <tr>
                    <td>${c.name}</td>
                    <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td>${impressions.toLocaleString()}</td>
                    <td>${clicks.toLocaleString()}</td>
                    <td>${ctr}%</td>
                    <td>${cpc}</td>
                    <td>${conversions}</td>
                    <td>${costPerConv}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Bing Campaign error:', e);
        document.getElementById('bingCampaignBody').innerHTML = `<tr><td colspan="8" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Load Bing Daily Data
async function loadBingDailyData() {
    const range = dateRanges[currentRange];
    const dateRange = getBingDateRange(range);

    try {
        const data = await bingApiCall('daily-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });

        const tbody = document.getElementById('bingDailyBody');
        
        if (!data?.rows || data.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No daily data for this period</td></tr>';
            return;
        }

        // Normalize dates and sort descending
        const normalizedData = data.rows.map(day => {
            let dateStr = day.date;
            // Handle MM/DD/YYYY format
            if (dateStr && dateStr.includes('/')) {
                const parts = dateStr.split('/');
                dateStr = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
            }
            return { ...day, normalizedDate: dateStr };
        });
        
        const sortedData = normalizedData.sort((a, b) => new Date(b.normalizedDate) - new Date(a.normalizedDate));

        tbody.innerHTML = sortedData.map(day => {
            const spend = parseFloat(day.spend || 0);
            const impressions = parseInt(day.impressions || 0);
            const clicks = parseInt(day.clicks || 0);
            const conversions = Math.round(parseFloat(day.conversions || 0));
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            
            // Parse date from normalized format
            const dateParts = day.normalizedDate.split('-');
            const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
            const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' });
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });

            return `
                <tr>
                    <td>${dateFormatted}</td>
                    <td>${dayOfWeek}</td>
                    <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td>${impressions.toLocaleString()}</td>
                    <td>${clicks.toLocaleString()}</td>
                    <td>${ctr}%</td>
                    <td>${cpc}</td>
                    <td>${conversions}</td>
                    <td>${costPerConv}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Bing Daily error:', e);
        document.getElementById('bingDailyBody').innerHTML = `<tr><td colspan="9" class="loading">Error: ${e.message}</td></tr>`;
    }
}
