// Authentication
const VALID_USER = 'ama';
const VALID_PASS = 'ama123';

// Meta API Configuration (embedded token)
const ACCESS_TOKEN = 'EAAWzO6nYvm8BQ2HBleIOJDitEmwZBG7iE9hhiZBNF8tijy0kgimpg8CGKuPBOdhGwvzHtwZCs5jwqMaqSY8gQ3q1fNkFQ2Uk7CVLV4sAnsvp8VuH03l07CelnBRD6uIOE9Aa20FUQVvjX7D52jSrhaZAHaYNBBSN0g1S7ntZAYiSgU3iNyKwx0040ZBUCb';
const API_VERSION = 'v19.0';
const BASE_URL = 'https://graph.facebook.com';

// Dashboard State
let currentRange = '7d';
let currentAccount = 'all';
let spendChart = null;
let convChart = null;
let accounts = [];

const dateRanges = {
    'today': { preset: 'today', days: 1 },
    'yesterday': { preset: 'yesterday', days: 1 },
    '7d': { preset: 'last_7d', days: 7 },
    '14d': { preset: 'last_14d', days: 14 },
    '30d': { preset: 'last_30d', days: 30 }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
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
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('loggedIn');
        location.reload();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadData();
        });
    });

    // Account selector
    document.getElementById('accountSelect').addEventListener('change', (e) => {
        currentAccount = e.target.value;
        loadData();
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadData);

    // Load accounts
    loadAccounts();
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

async function loadAccounts() {
    try {
        const data = await apiCall('me/adaccounts?fields=name,account_id,currency&limit=50');
        accounts = data.data || [];
        
        const select = document.getElementById('accountSelect');
        select.innerHTML = '<option value="all">All Accounts</option>';
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = acc.name;
            select.appendChild(option);
        });
        
        loadData();
    } catch (error) {
        showError('Failed to load accounts: ' + error.message);
    }
}

function showError(message) {
    document.getElementById('campaignBody').innerHTML = 
        `<tr><td colspan="9" class="loading">${message}</td></tr>`;
    document.getElementById('dailyBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
}

async function loadData() {
    const selectedAccounts = currentAccount === 'all' ? accounts.slice(0, 10) : 
        accounts.filter(a => a.id === currentAccount);
    
    if (selectedAccounts.length === 0) return;

    document.getElementById('campaignBody').innerHTML = '<tr><td colspan="9" class="loading">Loading...</td></tr>';
    document.getElementById('dailyBody').innerHTML = '<tr><td colspan="8" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadKPIs(selectedAccounts),
            loadChartData(selectedAccounts),
            loadCampaignData(selectedAccounts),
            loadDailyData(selectedAccounts)
        ]);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    } catch (error) {
        showError('Error loading data: ' + error.message);
    }
}

async function loadKPIs(selectedAccounts) {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;

    for (const acc of selectedAccounts) {
        try {
            const data = await apiCall(
                `${acc.id}/insights?fields=spend,impressions,clicks,actions&date_preset=${dateRanges[currentRange].preset}`
            );
            
            if (data.data?.[0]) {
                const d = data.data[0];
                totalSpend += parseFloat(d.spend || 0);
                totalImpressions += parseInt(d.impressions || 0);
                totalClicks += parseInt(d.clicks || 0);
                
                if (d.actions) {
                    const conv = d.actions.find(a => 
                        ['lead', 'onsite_conversion.lead_grouped', 'onsite_conversion.lead', 'omni_complete_registration', 'complete_registration'].includes(a.action_type)
                    );
                    if (conv) totalConversions += parseInt(conv.value);
                }
            }
        } catch (e) { console.error('KPI error:', e); }
    }

    document.getElementById('totalSpend').textContent = '$' + totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('totalConversions').textContent = totalConversions.toLocaleString();
    document.getElementById('costPerConv').textContent = totalConversions > 0 ? '$' + (totalSpend / totalConversions).toFixed(2) : '-';
    document.getElementById('cpc').textContent = totalClicks > 0 ? '$' + (totalSpend / totalClicks).toFixed(2) : '-';
    document.getElementById('ctr').textContent = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '-';
    document.getElementById('impressions').textContent = totalImpressions.toLocaleString();
}

async function loadChartData(selectedAccounts) {
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);
    const dailySpend = new Array(range.days).fill(0);
    const dailyConv = new Array(range.days).fill(0);

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const data = await apiCall(
                `${acc.id}/insights?fields=spend,actions&date_preset=${range.preset}&time_increment=1`
            );
            
            if (data.data) {
                data.data.forEach((day, i) => {
                    if (i < range.days) {
                        dailySpend[i] += parseFloat(day.spend || 0);
                        if (day.actions) {
                            const conv = day.actions.find(a => 
                                ['lead', 'onsite_conversion.lead_grouped', 'onsite_conversion.lead'].includes(a.action_type)
                            );
                            if (conv) dailyConv[i] += parseInt(conv.value);
                        }
                    }
                });
            }
        } catch (e) { console.error('Chart error:', e); }
    }

    renderSpendChart(days, dailySpend);
    renderConvChart(days, dailyConv);
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

function renderConvChart(labels, data) {
    const ctx = document.getElementById('convChart').getContext('2d');
    if (convChart) convChart.destroy();
    
    convChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Conversions',
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

async function loadCampaignData(selectedAccounts) {
    const campaigns = [];
    const range = dateRanges[currentRange];

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const data = await apiCall(
                `${acc.id}/campaigns?fields=name,status,insights.date_preset(${range.preset}){spend,impressions,clicks,actions}&limit=30`
            );
            if (data.data) {
                campaigns.push(...data.data.map(c => ({ ...c, accountName: acc.name })));
            }
        } catch (e) { console.error('Campaign error:', e); }
    }

    const tbody = document.getElementById('campaignBody');
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">No campaign data for this period</td></tr>';
        return;
    }

    campaigns.sort((a, b) => parseFloat(b.insights?.data?.[0]?.spend || 0) - parseFloat(a.insights?.data?.[0]?.spend || 0));

    tbody.innerHTML = campaigns.slice(0, 25).map(c => {
        const ins = c.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || 0);
        const impressions = parseInt(ins.impressions || 0);
        const clicks = parseInt(ins.clicks || 0);
        
        let conversions = 0;
        if (ins.actions) {
            const conv = ins.actions.find(a => 
                ['lead', 'onsite_conversion.lead_grouped', 'onsite_conversion.lead', 'omni_complete_registration'].includes(a.action_type)
            );
            if (conv) conversions = parseInt(conv.value);
        }
        
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
        const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
        const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
        const statusClass = c.status === 'ACTIVE' ? 'status-active' : c.status === 'PAUSED' ? 'status-paused' : 'status-inactive';

        return `
            <tr>
                <td title="${c.accountName}">${c.name}</td>
                <td class="${statusClass}">${c.status}</td>
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
}

async function loadDailyData(selectedAccounts) {
    const range = dateRanges[currentRange];
    const dailyData = {};

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const data = await apiCall(
                `${acc.id}/insights?fields=spend,impressions,clicks,actions&date_preset=${range.preset}&time_increment=1`
            );
            
            if (data.data) {
                data.data.forEach(day => {
                    const date = day.date_start;
                    if (!dailyData[date]) dailyData[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
                    dailyData[date].spend += parseFloat(day.spend || 0);
                    dailyData[date].impressions += parseInt(day.impressions || 0);
                    dailyData[date].clicks += parseInt(day.clicks || 0);
                    if (day.actions) {
                        const conv = day.actions.find(a => ['lead', 'onsite_conversion.lead_grouped', 'onsite_conversion.lead'].includes(a.action_type));
                        if (conv) dailyData[date].conversions += parseInt(conv.value);
                    }
                });
            }
        } catch (e) { console.error('Daily error:', e); }
    }

    const tbody = document.getElementById('dailyBody');
    const sortedDates = Object.keys(dailyData).sort().reverse();
    
    if (sortedDates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No daily data for this period</td></tr>';
        return;
    }

    tbody.innerHTML = sortedDates.map(date => {
        const d = dailyData[date];
        const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '-';
        const cpc = d.clicks > 0 ? '$' + (d.spend / d.clicks).toFixed(2) : '-';
        const costPerConv = d.conversions > 0 ? '$' + (d.spend / d.conversions).toFixed(2) : '-';

        return `
            <tr>
                <td>${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td>$${d.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${d.impressions.toLocaleString()}</td>
                <td>${d.clicks.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td>${cpc}</td>
                <td>${d.conversions}</td>
                <td>${costPerConv}</td>
            </tr>
        `;
    }).join('');
}
