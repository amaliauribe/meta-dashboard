// Authentication
const VALID_USER = 'ama';
const VALID_PASS = 'ama123';

// Meta API Configuration
const ACCESS_TOKEN = 'EAAWzO6nYvm8BQ2HBleIOJDitEmwZBG7iE9hhiZBNF8tijy0kgimpg8CGKuPBOdhGwvzHtwZCs5jwqMaqSY8gQ3q1fNkFQ2Uk7CVLV4sAnsvp8VuH03l07CelnBRD6uIOE9Aa20FUQVvjX7D52jSrhaZAHaYNBBSN0g1S7ntZAYiSgU3iNyKwx0040ZBUCb';
const API_VERSION = 'v19.0';
const BASE_URL = 'https://graph.facebook.com';

// Fixed account: CA : Vein Treatment Clinic
const ACCOUNT_ID = 'act_1151591609552634';
const ACCOUNT_NAME = 'CA : Vein Treatment Clinic';

// Dashboard State
let currentRange = '7d';
let spendChart = null;
let resultsChart = null;

const dateRanges = {
    'today': { preset: 'today', days: 1 },
    'yesterday': { preset: 'yesterday', days: 1 },
    '7d': { preset: 'last_7d', days: 7 },
    '14d': { preset: 'last_14d', days: 14 },
    '30d': { preset: 'last_30d', days: 30 }
};

// Get results from actions array (leads)
function getResults(actions) {
    if (!actions) return 0;
    // Look for lead-related actions
    const resultTypes = ['lead', 'onsite_conversion.lead_grouped', 'onsite_conversion.lead'];
    for (const type of resultTypes) {
        const action = actions.find(a => a.action_type === type);
        if (action) return parseInt(action.value);
    }
    return 0;
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

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadData();
        });
    });

    document.getElementById('refreshBtn').addEventListener('click', loadData);
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
    document.getElementById('campaignBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
    document.getElementById('dailyBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
}

async function loadData() {
    document.getElementById('campaignBody').innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';
    document.getElementById('dailyBody').innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadKPIs(),
            loadChartData(),
            loadCampaignData(),
            loadDailyData()
        ]);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    } catch (error) {
        showError('Error loading data: ' + error.message);
    }
}

async function loadKPIs() {
    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&date_preset=${dateRanges[currentRange].preset}`
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
            `${ACCOUNT_ID}/insights?fields=spend,actions&date_preset=${range.preset}&time_increment=1`
        );
        
        const dailySpend = new Array(range.days).fill(0);
        const dailyResults = new Array(range.days).fill(0);

        if (data.data) {
            data.data.forEach((day, i) => {
                if (i < range.days) {
                    dailySpend[i] = parseFloat(day.spend || 0);
                    dailyResults[i] = getResults(day.actions);
                }
            });
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
    for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
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

    try {
        // Only fetch ACTIVE campaigns
        const data = await apiCall(
            `${ACCOUNT_ID}/campaigns?fields=name,status,insights.date_preset(${range.preset}){spend,impressions,clicks,actions}&limit=50&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]`
        );
        
        const campaigns = data.data?.filter(c => c.status === 'ACTIVE') || [];

        const tbody = document.getElementById('campaignBody');
        if (campaigns.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No active campaigns with data</td></tr>';
            return;
        }

        // Sort by spend
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
        }).join('');
    } catch (e) { 
        console.error('Campaign error:', e);
        document.getElementById('campaignBody').innerHTML = '<tr><td colspan="8" class="loading">Error loading campaigns</td></tr>';
    }
}

async function loadDailyData() {
    const range = dateRanges[currentRange];

    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&date_preset=${range.preset}&time_increment=1`
        );

        const tbody = document.getElementById('dailyBody');
        
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading">No daily data for this period</td></tr>';
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

            return `
                <tr>
                    <td>${new Date(day.date_start).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
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
        document.getElementById('dailyBody').innerHTML = '<tr><td colspan="8" class="loading">Error loading daily data</td></tr>';
    }
}
