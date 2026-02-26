// Dashboard State
let currentRange = '7d';
let currentAccount = 'all';
let spendChart = null;
let convChart = null;
let accounts = [];

// Date range mappings
const dateRanges = {
    'today': { preset: 'today', days: 1 },
    'yesterday': { preset: 'yesterday', days: 1 },
    '7d': { preset: 'last_7d', days: 7 },
    '14d': { preset: 'last_14d', days: 14 },
    '30d': { preset: 'last_30d', days: 30 }
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeFilters();
    loadAccounts();
});

// Initialize filter buttons
function initializeFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentRange = btn.dataset.range;
            loadData();
        });
    });

    document.getElementById('accountSelect').addEventListener('change', (e) => {
        currentAccount = e.target.value;
        loadData();
    });

    document.getElementById('refreshBtn').addEventListener('click', loadData);
}

// Load ad accounts
async function loadAccounts() {
    try {
        const response = await fetch('/api/accounts');
        const data = await response.json();
        
        if (data.error) {
            console.error('API Error:', data.error);
            showError('Unable to load accounts. Check API token permissions.');
            return;
        }
        
        if (data.data) {
            accounts = data.data;
            populateAccountSelect(data.data);
            loadData();
        }
    } catch (error) {
        console.error('Error loading accounts:', error);
        showError('Unable to connect to API.');
    }
}

function populateAccountSelect(accs) {
    const select = document.getElementById('accountSelect');
    select.innerHTML = '<option value="all">All Accounts</option>';
    accs.forEach(acc => {
        const option = document.createElement('option');
        option.value = acc.id;
        option.textContent = acc.name;
        select.appendChild(option);
    });
}

function showError(message) {
    document.getElementById('campaignBody').innerHTML = 
        `<tr><td colspan="10" class="loading">${message}</td></tr>`;
    document.getElementById('dailyBody').innerHTML = 
        `<tr><td colspan="8" class="loading">${message}</td></tr>`;
}

// Load all data
async function loadData() {
    const selectedAccounts = currentAccount === 'all' ? accounts.slice(0, 10) : 
        accounts.filter(a => a.id === currentAccount);
    
    if (selectedAccounts.length === 0) {
        showError('No accounts selected');
        return;
    }

    try {
        await Promise.all([
            loadKPIs(selectedAccounts),
            loadChartData(selectedAccounts),
            loadCampaignData(selectedAccounts),
            loadDailyData(selectedAccounts)
        ]);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load KPIs
async function loadKPIs(selectedAccounts) {
    let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalConversions = 0;

    for (const acc of selectedAccounts) {
        try {
            const response = await fetch(
                `/api/insights/${acc.id}?date_preset=${dateRanges[currentRange].preset}`
            );
            const data = await response.json();
            
            if (data.data && data.data[0]) {
                const d = data.data[0];
                totalSpend += parseFloat(d.spend || 0);
                totalImpressions += parseInt(d.impressions || 0);
                totalClicks += parseInt(d.clicks || 0);
                
                if (d.actions) {
                    const leads = d.actions.find(a => 
                        a.action_type === 'lead' || 
                        a.action_type === 'onsite_conversion.lead_grouped' ||
                        a.action_type === 'omni_complete_registration'
                    );
                    if (leads) totalConversions += parseInt(leads.value);
                }
            }
        } catch (e) {
            console.error('KPI error for', acc.id, e);
        }
    }

    document.getElementById('totalSpend').textContent = '$' + totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('totalConversions').textContent = totalConversions.toLocaleString();
    document.getElementById('costPerConv').textContent = totalConversions > 0 ? '$' + (totalSpend / totalConversions).toFixed(2) : '-';
    document.getElementById('cpc').textContent = totalClicks > 0 ? '$' + (totalSpend / totalClicks).toFixed(2) : '-';
    document.getElementById('ctr').textContent = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '-';
    document.getElementById('impressions').textContent = totalImpressions.toLocaleString();
}

// Load chart data
async function loadChartData(selectedAccounts) {
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);
    const dailySpend = new Array(range.days).fill(0);
    const dailyConv = new Array(range.days).fill(0);

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const response = await fetch(
                `/api/insights/${acc.id}?date_preset=${range.preset}&time_increment=1`
            );
            const data = await response.json();
            
            if (data.data) {
                data.data.forEach((day, i) => {
                    if (i < range.days) {
                        dailySpend[i] += parseFloat(day.spend || 0);
                        if (day.actions) {
                            const leads = day.actions.find(a => 
                                a.action_type === 'lead' || 
                                a.action_type === 'onsite_conversion.lead_grouped'
                            );
                            if (leads) dailyConv[i] += parseInt(leads.value);
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Chart data error:', e);
        }
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
            labels: labels,
            datasets: [{
                label: 'Daily Spend ($)',
                data: data,
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
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => '$' + value.toLocaleString() }
                }
            }
        }
    });
}

function renderConvChart(labels, data) {
    const ctx = document.getElementById('convChart').getContext('2d');
    if (convChart) convChart.destroy();
    
    convChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Conversions',
                data: data,
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

// Load campaign data
async function loadCampaignData(selectedAccounts) {
    const campaigns = [];
    const range = dateRanges[currentRange];

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const response = await fetch(
                `/api/campaigns/${acc.id}?date_preset=${range.preset}`
            );
            const data = await response.json();
            if (data.data) {
                campaigns.push(...data.data.map(c => ({ ...c, accountName: acc.name })));
            }
        } catch (e) {
            console.error('Campaign data error:', e);
        }
    }

    const tbody = document.getElementById('campaignBody');
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">No campaign data available</td></tr>';
        return;
    }

    // Sort by spend descending
    campaigns.sort((a, b) => {
        const spendA = parseFloat(a.insights?.data?.[0]?.spend || 0);
        const spendB = parseFloat(b.insights?.data?.[0]?.spend || 0);
        return spendB - spendA;
    });

    tbody.innerHTML = campaigns.slice(0, 20).map(c => {
        const ins = c.insights?.data?.[0] || {};
        const spend = parseFloat(ins.spend || 0);
        const impressions = parseInt(ins.impressions || 0);
        const clicks = parseInt(ins.clicks || 0);
        
        let conversions = 0;
        if (ins.actions) {
            const leads = ins.actions.find(a => 
                a.action_type === 'lead' || 
                a.action_type === 'onsite_conversion.lead_grouped' ||
                a.action_type === 'omni_complete_registration'
            );
            if (leads) conversions = parseInt(leads.value);
        }
        
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
        const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '-';
        const costPerLead = conversions > 0 ? (spend / conversions).toFixed(2) : '-';
        
        const statusClass = c.status === 'ACTIVE' ? 'status-active' : 
                           c.status === 'PAUSED' ? 'status-paused' : 'status-inactive';

        return `
            <tr>
                <td title="${c.accountName}">${c.name}</td>
                <td class="${statusClass}">${c.status}</td>
                <td>$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${impressions.toLocaleString()}</td>
                <td>${clicks.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td>${cpc !== '-' ? '$' + cpc : '-'}</td>
                <td>${conversions}</td>
                <td>${costPerLead !== '-' ? '$' + costPerLead : '-'}</td>
                <td>-</td>
            </tr>
        `;
    }).join('');
}

// Load daily data
async function loadDailyData(selectedAccounts) {
    const range = dateRanges[currentRange];
    const dailyData = {};

    for (const acc of selectedAccounts.slice(0, 5)) {
        try {
            const response = await fetch(
                `/api/insights/${acc.id}?date_preset=${range.preset}&time_increment=1`
            );
            const data = await response.json();
            
            if (data.data) {
                data.data.forEach(day => {
                    const date = day.date_start;
                    if (!dailyData[date]) {
                        dailyData[date] = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
                    }
                    dailyData[date].spend += parseFloat(day.spend || 0);
                    dailyData[date].impressions += parseInt(day.impressions || 0);
                    dailyData[date].clicks += parseInt(day.clicks || 0);
                    if (day.actions) {
                        const leads = day.actions.find(a => 
                            a.action_type === 'lead' || 
                            a.action_type === 'onsite_conversion.lead_grouped'
                        );
                        if (leads) dailyData[date].conversions += parseInt(leads.value);
                    }
                });
            }
        } catch (e) {
            console.error('Daily data error:', e);
        }
    }

    const tbody = document.getElementById('dailyBody');
    const sortedDates = Object.keys(dailyData).sort().reverse();
    
    if (sortedDates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No daily data available</td></tr>';
        return;
    }

    tbody.innerHTML = sortedDates.map(date => {
        const d = dailyData[date];
        const ctr = d.impressions > 0 ? ((d.clicks / d.impressions) * 100).toFixed(2) : '-';
        const cpc = d.clicks > 0 ? (d.spend / d.clicks).toFixed(2) : '-';
        const costPerConv = d.conversions > 0 ? (d.spend / d.conversions).toFixed(2) : '-';

        return `
            <tr>
                <td>${new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                <td>$${d.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${d.impressions.toLocaleString()}</td>
                <td>${d.clicks.toLocaleString()}</td>
                <td>${ctr}%</td>
                <td>${cpc !== '-' ? '$' + cpc : '-'}</td>
                <td>${d.conversions}</td>
                <td>${costPerConv !== '-' ? '$' + costPerConv : '-'}</td>
            </tr>
        `;
    }).join('');
}
