// Disable datalabels plugin globally (enable per-chart)
if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
    Chart.defaults.plugins.datalabels = { display: false };
}

// Authentication
const VALID_USER = 'ranchi';
const VALID_PASS = 'ranchera2026';

// Meta API Configuration
const ACCESS_TOKEN = 'EAAWzO6nYvm8BQ2HBleIOJDitEmwZBG7iE9hhiZBNF8tijy0kgimpg8CGKuPBOdhGwvzHtwZCs5jwqMaqSY8gQ3q1fNkFQ2Uk7CVLV4sAnsvp8VuH03l07CelnBRD6uIOE9Aa20FUQVvjX7D52jSrhaZAHaYNBBSN0g1S7ntZAYiSgU3iNyKwx0040ZBUCb';
const API_VERSION = 'v19.0';
const BASE_URL = 'https://graph.facebook.com';

// Fixed account: CA : Vein Treatment Clinic
const ACCOUNT_ID = 'act_1151591609552634';

// Dashboard State
let currentRange = '7d';
let currentView = 'summary';
let spendChart = null;
let resultsChart = null;
let adsDataLoaded = false;
let adsRawData = []; // Store ads data for sorting
let placementRawData = []; // Store placement data for filtering
let adsSortColumn = 'results';
let adsSortDirection = 'desc';

// Bing Ads State
let bingDataLoaded = false;
let bingSpendChart = null;
let bingConversionsChart = null;

// Bing Keywords state
let bingKeywordsDataLoaded = false;

// Bing QS History state
let bingQsHistoryDataLoaded = false;
let bingQsHistoryRawData = [];
let bingQsHistorySearchText = '';
let bingQsHistoryStatusFilter = 'all';
let bingQsHistoryChart = null;
let bingKeywordsRawData = [];
let bingKeywordsSortColumn = 'clicks';
let bingKeywordsSortDirection = 'desc';
let bingKeywordsSearchText = '';
let bingKeywordsCampaignFilter = '';
let bingKeywordsAdGroupFilter = '';

// Bing Geographic state
let bingGeoDataLoaded = false;
let bingGeoRawData = [];
let bingGeoSortColumn = 'clicks';
let bingGeoSortDirection = 'desc';
let bingGeoSearchText = '';

// Meta Geographic state
let metaGeoDataLoaded = false;
let metaGeoRawData = [];
let metaGeoSortColumn = 'clicks';
let metaGeoSortDirection = 'desc';
let metaGeoSearchText = '';
let metaGeoMap = null;
let metaGeoHeatmapLayer = null;

// Bing Search Terms state
let bingSearchTermsDataLoaded = false;
let bingSearchTermsRawData = [];
let bingSearchTermsSortColumn = 'clicks';
let bingSearchTermsSortDirection = 'desc';
let bingSearchTermsFilter = 'all';
let bingSearchTermsSearchText = '';
let bingSearchTermsCampaignFilter = 'all';

// Google Ads State
let googleDataLoaded = false;
let googleSpendChart = null;
let googleConversionsChart = null;
let googleKeywordsDataLoaded = false;
let googleQsHistoryDataLoaded = false;
let googleGeoDataLoaded = false;
let qsHistoryChart = null;

// Bing Ads Creative State
let bingAdsDataLoaded = false;
let bingAdsRawData = [];
let bingAdsSortColumn = 'conversions';
let bingAdsSortDirection = 'desc';

// Google Ads Creative State
let googleAdsDataLoaded = false;
let googleAdsRawData = [];
let googleAdsSortColumn = 'conversions';
let googleAdsSortDirection = 'desc';

// TikTok State
let tiktokDataLoaded = false;
let tiktokRawData = [];
let tiktokSortColumn = 'spend';
let tiktokSortDirection = 'desc';

// Keywords sorting state
let keywordsRawData = [];
let keywordsSortColumn = 'clicks';
let keywordsSortDirection = 'desc';
let keywordsSearchText = '';
let googleKeywordsCampaignFilter = '';
let googleKeywordsAdGroupFilter = []; // Array for multi-select

// QS History search
let qsHistorySearchText = '';
let qsHistoryStatusFilter = 'all';
let qsHistoryRawData = [];

// Geographic state
let geoDataLoaded = false;
let geoRawData = [];
let geoSortColumn = 'clicks';
let geoSortDirection = 'desc';
let geoTypeFilter = 'all';

// Search Terms state
let searchTermsDataLoaded = false;
let searchTermsRawData = [];
let searchTermsSortColumn = 'clicks';
let searchTermsSortDirection = 'desc';
let searchTermsFilter = 'all';
let searchTermsSearchText = '';
let searchTermsCampaignFilter = 'all';

// Summary State
let summaryDataLoaded = false;

// Insurance Funnel State
let insuranceDataLoaded = false;

// Bing API is handled by the backend server
const BING_API_ENABLED = true;

// Ads Filters
let filterCampaign = '';
let filterAdset = '';
let filterAds = []; // Array for multi-select
let filterPlatform = ''; // For platform → placement filtering
let filterPlacement = ''; // For placement → creative filtering
let filterPlacementPlatform = ''; // Store the platform of selected placement

const dateRanges = {
    'today': { preset: 'today', days: 1 },
    'yesterday': { preset: 'yesterday', days: 1 },
    '7d': { days: 7 },
    '14d': { days: 14 },
    '30d': { days: 30 },
    'custom': { custom: true }
};

// Custom date range storage
let customStartDate = null;
let customEndDate = null;

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
    if (range.custom && customStartDate && customEndDate) {
        return `time_range={"since":"${customStartDate}","until":"${customEndDate}"}`;
    }
    
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
        total += parseInt(pixelCustom.value) || 0;
    }
    
    // Lead form submissions
    const lead = actions.find(a => a.action_type === 'lead');
    if (lead) {
        total += parseInt(lead.value) || 0;
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

// Update date inputs to reflect the currently selected preset range
function updateDateInputsForRange(range) {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (!startInput || !endInput) return;
    
    const today = getESTDate();
    let since, until;
    
    switch(range) {
        case 'today':
            since = until = formatDateEST(today);
            break;
        case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            since = until = formatDateEST(yesterday);
            break;
        case '7d':
            until = formatDateEST(today);
            const d7 = new Date(today);
            d7.setDate(today.getDate() - 6);
            since = formatDateEST(d7);
            break;
        case '14d':
            until = formatDateEST(today);
            const d14 = new Date(today);
            d14.setDate(today.getDate() - 13);
            since = formatDateEST(d14);
            break;
        case '30d':
            until = formatDateEST(today);
            const d30 = new Date(today);
            d30.setDate(today.getDate() - 29);
            since = formatDateEST(d30);
            break;
        default:
            return; // custom or unknown — don't touch inputs
    }
    
    startInput.value = since;
    endInput.value = until;
}
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
            // Update calendar inputs to reflect selected range
            updateDateInputsForRange(currentRange);
            adsDataLoaded = false; // Reset ads data when date changes
            metaGeoDataLoaded = false; // Reset meta geo data when date changes
            bingDataLoaded = false; // Reset bing data when date changes
            bingKeywordsDataLoaded = false;
            bingQsHistoryDataLoaded = false;
            bingGeoDataLoaded = false;
            bingSearchTermsDataLoaded = false;
            bingAdsDataLoaded = false;
            googleDataLoaded = false; // Reset google data when date changes
            googleKeywordsDataLoaded = false; // Reset google keywords data when date changes
            googleQsHistoryDataLoaded = false; // Reset google QS history data when date changes
            googleGeoDataLoaded = false; // Reset google geo data when date changes
            googleAdsDataLoaded = false;
            tiktokDataLoaded = false;
        tiktokAdsDataLoaded = false; // Reset TikTok data when date changes
            searchTermsDataLoaded = false; // Reset search terms data when date changes
            summaryDataLoaded = false; // Reset summary data when date changes
            heatmapDataLoaded = false; // Reset heatmap data when date changes
            clinicPerfDataLoaded = false; // Reset clinic performance data when date changes
            insuranceDataLoaded = false; // Reset insurance data when date changes
            medworkFunnelDataLoaded = false; // Reset medwork funnel data when date changes
            if (currentView === 'summary') {
                loadSummaryData();
            } else if (currentView === 'funnels') {
                loadFunnelsData();
            } else if (currentView === 'insuranceFunnel') {
                loadInsuranceAnalytics();
            } else if (currentView === 'campaigns') {
                loadData();
            } else if (currentView === 'ads') {
                loadAdsData();
            } else if (currentView === 'bing') {
                loadBingData();
            } else if (currentView === 'google') {
                loadGoogleData();
            } else if (currentView === 'googleKeywords') {
                loadGoogleKeywordsData();
            } else if (currentView === 'googleQsHistory') {
                loadGoogleQsHistoryData();
            } else if (currentView === 'googleGeo') {
                loadGoogleGeoData();
            } else if (currentView === 'googleSearchTerms') {
                loadGoogleSearchTermsData();
            } else if (currentView === 'bingAds') {
                loadBingAdsData();
            } else if (currentView === 'oursPrivacy') {
                loadOursPrivacyData();
            } else if (currentView === 'googleAdsCreative') {
                loadGoogleAdsData();
            } else if (currentView === 'clinicPerformance') {
                loadClinicPerformanceData();
            }
        });
    });

    // Custom date range picker
    document.getElementById('applyCustomDate').addEventListener('click', () => {
        const startInput = document.getElementById('startDate').value;
        const endInput = document.getElementById('endDate').value;
        
        if (!startInput || !endInput) {
            alert('Please select both start and end dates');
            return;
        }
        
        if (startInput > endInput) {
            alert('Start date must be before end date');
            return;
        }
        
        // Store custom dates
        customStartDate = startInput;
        customEndDate = endInput;
        currentRange = 'custom';
        
        // Update button states
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('applyCustomDate').classList.add('active');
        
        // Reset all data flags
        adsDataLoaded = false;
        metaGeoDataLoaded = false;
        bingDataLoaded = false;
        bingKeywordsDataLoaded = false;
        bingQsHistoryDataLoaded = false;
        bingGeoDataLoaded = false;
        bingSearchTermsDataLoaded = false;
        bingAdsDataLoaded = false;
        googleDataLoaded = false;
        googleKeywordsDataLoaded = false;
        googleQsHistoryDataLoaded = false;
        googleGeoDataLoaded = false;
        googleAdsDataLoaded = false;
        tiktokDataLoaded = false;
        searchTermsDataLoaded = false;
        summaryDataLoaded = false;
        heatmapDataLoaded = false;
        clinicPerfDataLoaded = false;
        
        // Load data for current view
        if (currentView === 'summary') {
            loadSummaryData();
        } else if (currentView === 'funnels') {
            loadFunnelsData();
        } else if (currentView === 'campaigns') {
            loadData();
        } else if (currentView === 'ads') {
            loadAdsData();
        } else if (currentView === 'bing') {
            loadBingData();
        } else if (currentView === 'bingKeywords') {
            loadBingKeywordsData();
        } else if (currentView === 'bingGeo') {
            loadBingGeoData();
        } else if (currentView === 'bingSearchTerms') {
            loadBingSearchTermsData();
        } else if (currentView === 'bingAds') {
            loadBingAdsData();
        } else if (currentView === 'google') {
            loadGoogleData();
        } else if (currentView === 'googleKeywords') {
            loadGoogleKeywordsData();
        } else if (currentView === 'googleGeo') {
            loadGoogleGeoData();
        } else if (currentView === 'googleSearchTerms') {
            loadGoogleSearchTermsData();
        } else if (currentView === 'oursPrivacy') {
            loadOursPrivacyData();
        } else if (currentView === 'googleAdsCreative') {
            loadGoogleAdsData();
        } else if (currentView === 'heatmap') {
            loadHeatmapData();
        } else if (currentView === 'clinicPerformance') {
            loadClinicPerformanceData();
        }
    });
    
    // Set default dates in the date picker (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = sevenDaysAgo.toISOString().split('T')[0];

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentView = item.dataset.view;
            
            // Show/hide views
            document.getElementById('summaryView').classList.toggle('hidden', currentView !== 'summary');
            document.getElementById('funnelsView').classList.toggle('hidden', currentView !== 'funnels');
            document.getElementById('insuranceFunnelView').classList.toggle('hidden', currentView !== 'insuranceFunnel');
            document.getElementById('heatmapView').classList.toggle('hidden', currentView !== 'heatmap');
            document.getElementById('campaignsView').classList.toggle('hidden', currentView !== 'campaigns');
            document.getElementById('adsView').classList.toggle('hidden', currentView !== 'ads');
            document.getElementById('metaGeoView').classList.toggle('hidden', currentView !== 'metaGeo');
            document.getElementById('bingView').classList.toggle('hidden', currentView !== 'bing');
            document.getElementById('bingKeywordsView').classList.toggle('hidden', currentView !== 'bingKeywords');
            document.getElementById('bingQsHistoryView').classList.toggle('hidden', currentView !== 'bingQsHistory');
            document.getElementById('bingGeoView').classList.toggle('hidden', currentView !== 'bingGeo');
            document.getElementById('bingSearchTermsView').classList.toggle('hidden', currentView !== 'bingSearchTerms');
            document.getElementById('bingAdsView').classList.toggle('hidden', currentView !== 'bingAds');
            document.getElementById('googleView').classList.toggle('hidden', currentView !== 'google');
            document.getElementById('googleKeywordsView').classList.toggle('hidden', currentView !== 'googleKeywords');
            document.getElementById('googleQsHistoryView').classList.toggle('hidden', currentView !== 'googleQsHistory');
            document.getElementById('googleGeoView').classList.toggle('hidden', currentView !== 'googleGeo');
            document.getElementById('googleSearchTermsView').classList.toggle('hidden', currentView !== 'googleSearchTerms');
            document.getElementById('googleAdsCreativeView').classList.toggle('hidden', currentView !== 'googleAdsCreative');
            document.getElementById('tiktokView').classList.toggle('hidden', currentView !== 'tiktok');
            document.getElementById('tiktokAdsView').classList.toggle('hidden', currentView !== 'tiktokAds');
            document.getElementById('oursPrivacyView').classList.toggle('hidden', currentView !== 'oursPrivacy');
            document.getElementById('clinicPerformanceView').classList.toggle('hidden', currentView !== 'clinicPerformance');
            document.getElementById('medworkFunnelView').classList.toggle('hidden', currentView !== 'medworkFunnel');
            
            // Load data for the selected view
            if (currentView === 'heatmap' && !heatmapDataLoaded) {
                loadHeatmapData();
            }
            if (currentView === 'summary' && !summaryDataLoaded) {
                loadSummaryData();
            }
            if (currentView === 'funnels') {
                loadFunnelsData();
            }
            if (currentView === 'insuranceFunnel' && !insuranceDataLoaded) {
                loadInsuranceAnalytics();
            }
            if (currentView === 'ads' && !adsDataLoaded) {
                loadAdsData();
            }
            if (currentView === 'metaGeo' && !metaGeoDataLoaded) {
                loadMetaGeoData();
            }
            if (currentView === 'bing' && !bingDataLoaded) {
                loadBingData();
            }
            if (currentView === 'bingKeywords' && !bingKeywordsDataLoaded) {
                loadBingKeywordsData();
            }
            if (currentView === 'bingQsHistory' && !bingQsHistoryDataLoaded) {
                loadBingQsHistoryData();
            }
            if (currentView === 'bingGeo' && !bingGeoDataLoaded) {
                loadBingGeoData();
            }
            if (currentView === 'bingSearchTerms' && !bingSearchTermsDataLoaded) {
                loadBingSearchTermsData();
            }
            if (currentView === 'google' && !googleDataLoaded) {
                loadGoogleData();
            }
            if (currentView === 'googleKeywords' && !googleKeywordsDataLoaded) {
                loadGoogleKeywordsData();
            }
            if (currentView === 'googleQsHistory' && !googleQsHistoryDataLoaded) {
                loadGoogleQsHistoryData();
            }
            if (currentView === 'googleGeo' && !googleGeoDataLoaded) {
                loadGoogleGeoData();
            }
            if (currentView === 'googleSearchTerms' && !searchTermsDataLoaded) {
                loadGoogleSearchTermsData();
            }
            if (currentView === 'tiktok' && !tiktokDataLoaded) {
                loadTikTokData();
            }
            if (currentView === 'tiktokAds' && !tiktokAdsDataLoaded) {
                loadTikTokAdsData();
            }
            if (currentView === 'oursPrivacy') {
                loadOursPrivacyData();
            }
            if (currentView === 'bingAds' && !bingAdsDataLoaded) {
                loadBingAdsData();
            }
            if (currentView === 'googleAdsCreative' && !googleAdsDataLoaded) {
                loadGoogleAdsData();
            }
            if (currentView === 'clinicPerformance' && !clinicPerfDataLoaded) {
                loadClinicPerformanceData();
            }
            if (currentView === 'medworkFunnel' && !medworkFunnelDataLoaded) {
                loadMedworkFunnelData();
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
        metaGeoDataLoaded = false;
        bingDataLoaded = false;
        bingKeywordsDataLoaded = false;
        bingQsHistoryDataLoaded = false;
        bingGeoDataLoaded = false;
        bingSearchTermsDataLoaded = false;
        bingAdsDataLoaded = false;
        googleDataLoaded = false;
        googleKeywordsDataLoaded = false;
        googleQsHistoryDataLoaded = false;
        googleGeoDataLoaded = false;
        googleAdsDataLoaded = false;
        tiktokDataLoaded = false;
        searchTermsDataLoaded = false;
        summaryDataLoaded = false;
        if (currentView === 'summary') {
            loadSummaryData();
        } else if (currentView === 'funnels') {
            loadFunnelsData();
        } else if (currentView === 'campaigns') {
            loadData();
        } else if (currentView === 'ads') {
            loadAdsData();
        } else if (currentView === 'metaGeo') {
            loadMetaGeoData();
        } else if (currentView === 'bing') {
            loadBingData();
        } else if (currentView === 'bingKeywords') {
            loadBingKeywordsData();
        } else if (currentView === 'bingQsHistory') {
            loadBingQsHistoryData();
        } else if (currentView === 'bingGeo') {
            loadBingGeoData();
        } else if (currentView === 'bingSearchTerms') {
            loadBingSearchTermsData();
        } else if (currentView === 'google') {
            loadGoogleData();
        } else if (currentView === 'googleKeywords') {
            loadGoogleKeywordsData();
        } else if (currentView === 'googleQsHistory') {
            loadGoogleQsHistoryData();
        } else if (currentView === 'googleGeo') {
            loadGoogleGeoData();
        } else if (currentView === 'googleSearchTerms') {
            loadGoogleSearchTermsData();
        } else if (currentView === 'bingAds') {
            loadBingAdsData();
        } else if (currentView === 'oursPrivacy') {
                loadOursPrivacyData();
            } else if (currentView === 'googleAdsCreative') {
            loadGoogleAdsData();
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
    
    // Sortable column headers for Keywords table
    document.querySelectorAll('#keywordsFullTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            
            // Toggle direction if same column, otherwise default to desc
            if (keywordsSortColumn === sortKey) {
                keywordsSortDirection = keywordsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                keywordsSortColumn = sortKey;
                keywordsSortDirection = 'desc';
            }
            
            // Update header styles
            document.querySelectorAll('#keywordsFullTable th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            th.classList.add(keywordsSortDirection);
            
            // Re-render with new sort
            renderKeywordsTable();
        });
    });
    
    // Keywords search
    document.getElementById('keywordsSearch').addEventListener('input', (e) => {
        keywordsSearchText = e.target.value.toLowerCase();
        renderKeywordsTable();
    });
    
    // Google Keywords campaign filter
    document.getElementById('googleKeywordsCampaignFilter').addEventListener('change', (e) => {
        googleKeywordsCampaignFilter = e.target.value;
        googleKeywordsAdGroupFilter = []; // Reset ad group when campaign changes
        populateGoogleKeywordsAdGroupDropdown();
        renderKeywordsTable();
    });
    
    // Google Keywords ad group multi-select dropdown
    const adGroupDropdown = document.getElementById('googleKeywordsAdGroupDropdown');
    const adGroupBtn = document.getElementById('googleKeywordsAdGroupBtn');
    
    adGroupBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        adGroupDropdown.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!adGroupDropdown.contains(e.target)) {
            adGroupDropdown.classList.remove('open');
        }
    });
    
    // Google Keywords clear filters
    document.getElementById('googleKeywordsClearFilters').addEventListener('click', () => {
        googleKeywordsCampaignFilter = '';
        googleKeywordsAdGroupFilter = [];
        keywordsSearchText = '';
        document.getElementById('googleKeywordsCampaignFilter').value = '';
        document.getElementById('keywordsSearch').value = '';
        populateGoogleKeywordsAdGroupDropdown();
        renderKeywordsTable();
    });
    
    // QS History search
    document.getElementById('qsHistorySearch').addEventListener('input', (e) => {
        qsHistorySearchText = e.target.value.toLowerCase();
        renderQsHistoryTable();
    });
    
    document.getElementById('qsHistoryStatusFilter').addEventListener('change', (e) => {
        qsHistoryStatusFilter = e.target.value;
        renderQsHistoryTable();
    });
    
    // Sortable column headers for Geographic table
    document.querySelectorAll('#geoTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            
            if (geoSortColumn === sortKey) {
                geoSortDirection = geoSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                geoSortColumn = sortKey;
                geoSortDirection = 'desc';
            }
            
            document.querySelectorAll('#geoTable th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            th.classList.add(geoSortDirection);
            
            renderGeoTable();
        });
    });
    
    // Geographic type filter
    document.getElementById('geoTypeFilter').addEventListener('change', (e) => {
        geoTypeFilter = e.target.value;
        renderGeoTable();
    });
    
    // Sortable column headers for Search Terms table
    document.querySelectorAll('#searchTermsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            
            if (searchTermsSortColumn === sortKey) {
                searchTermsSortDirection = searchTermsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                searchTermsSortColumn = sortKey;
                searchTermsSortDirection = 'desc';
            }
            
            document.querySelectorAll('#searchTermsTable th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            th.classList.add(searchTermsSortDirection);
            
            renderSearchTermsTable();
        });
    });
    
    // Search Terms filter
    document.getElementById('searchTermsFilter').addEventListener('change', (e) => {
        searchTermsFilter = e.target.value;
        renderSearchTermsTable();
    });
    
    // Search Terms text search
    document.getElementById('searchTermsSearch').addEventListener('input', (e) => {
        searchTermsSearchText = e.target.value.toLowerCase();
        renderSearchTermsTable();
    });
    
    // Search Terms campaign filter dropdown
    document.getElementById('searchTermsCampaignFilter').addEventListener('change', (e) => {
        searchTermsCampaignFilter = e.target.value;
        renderSearchTermsTable();
    });

    // ==================== Bing Event Listeners ====================
    
    // Bing Keywords search
    document.getElementById('bingKeywordsSearch').addEventListener('input', (e) => {
        bingKeywordsSearchText = e.target.value.toLowerCase();
        renderBingKeywordsTable();
    });
    
    // Bing Keywords campaign filter
    document.getElementById('bingKeywordsCampaignFilter').addEventListener('change', (e) => {
        bingKeywordsCampaignFilter = e.target.value;
        bingKeywordsAdGroupFilter = ''; // Reset ad group when campaign changes
        populateBingKeywordsAdGroupDropdown();
        renderBingKeywordsTable();
    });
    
    // Bing Keywords ad group filter
    document.getElementById('bingKeywordsAdGroupFilter').addEventListener('change', (e) => {
        bingKeywordsAdGroupFilter = e.target.value;
        renderBingKeywordsTable();
    });
    
    // Bing Keywords clear filters
    document.getElementById('bingKeywordsClearFilters').addEventListener('click', () => {
        bingKeywordsCampaignFilter = '';
        bingKeywordsAdGroupFilter = '';
        bingKeywordsSearchText = '';
        document.getElementById('bingKeywordsCampaignFilter').value = '';
        document.getElementById('bingKeywordsAdGroupFilter').value = '';
        document.getElementById('bingKeywordsSearch').value = '';
        populateBingKeywordsAdGroupDropdown();
        renderBingKeywordsTable();
    });
    
    // Bing Keywords table sorting
    document.querySelectorAll('#bingKeywordsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (bingKeywordsSortColumn === sortKey) {
                bingKeywordsSortDirection = bingKeywordsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                bingKeywordsSortColumn = sortKey;
                bingKeywordsSortDirection = 'desc';
            }
            document.querySelectorAll('#bingKeywordsTable th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            th.classList.add(bingKeywordsSortDirection);
            renderBingKeywordsTable();
        });
    });
    
    // Bing QS History search
    document.getElementById('bingQsHistorySearch').addEventListener('input', (e) => {
        bingQsHistorySearchText = e.target.value.toLowerCase();
        renderBingQsHistoryTable();
    });
    
    document.getElementById('bingQsHistoryStatusFilter').addEventListener('change', (e) => {
        bingQsHistoryStatusFilter = e.target.value;
        renderBingQsHistoryTable();
    });
    
    // Meta Geographic search
    document.getElementById('metaGeoSearch').addEventListener('input', (e) => {
        metaGeoSearchText = e.target.value.toLowerCase();
        renderMetaGeoTable();
    });
    
    // Meta Geographic heatmap metric selector
    document.getElementById('metaGeoHeatmapMetric').addEventListener('change', () => {
        if (metaGeoRawData.length > 0) {
            renderMetaGeoHeatmap();
        }
    });
    
    // Meta Geographic table sorting
    document.querySelectorAll('#metaGeoTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (metaGeoSortColumn === sortKey) {
                metaGeoSortDirection = metaGeoSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                metaGeoSortColumn = sortKey;
                metaGeoSortDirection = 'desc';
            }
            document.querySelectorAll('#metaGeoTable th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            th.classList.add(metaGeoSortDirection);
            renderMetaGeoTable();
        });
    });
    
    // Bing Geographic search
    document.getElementById('bingGeoSearch').addEventListener('input', (e) => {
        bingGeoSearchText = e.target.value.toLowerCase();
        renderBingGeoTable();
    });
    
    // Bing Geographic table sorting
    document.querySelectorAll('#bingGeoTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (bingGeoSortColumn === sortKey) {
                bingGeoSortDirection = bingGeoSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                bingGeoSortColumn = sortKey;
                bingGeoSortDirection = 'desc';
            }
            document.querySelectorAll('#bingGeoTable th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            th.classList.add(bingGeoSortDirection);
            renderBingGeoTable();
        });
    });
    
    // Bing Ads Creative table sorting
    document.querySelectorAll('#bingAdsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (bingAdsSortColumn === sortKey) {
                bingAdsSortDirection = bingAdsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                bingAdsSortColumn = sortKey;
                bingAdsSortDirection = 'desc';
            }
            renderBingAdsTable(bingAdsRawData);
        });
    });
    
    // Google Ads Creative table sorting
    document.querySelectorAll('#googleAdsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (googleAdsSortColumn === sortKey) {
                googleAdsSortDirection = googleAdsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                googleAdsSortColumn = sortKey;
                googleAdsSortDirection = 'desc';
            }
            renderGoogleAdsTable(googleAdsRawData);
        });
    });
    
    // Bing Search Terms filter
    document.getElementById('bingSearchTermsFilter').addEventListener('change', (e) => {
        bingSearchTermsFilter = e.target.value;
        renderBingSearchTermsTable();
    });
    
    // Bing Search Terms campaign filter
    document.getElementById('bingSearchTermsCampaignFilter').addEventListener('change', (e) => {
        bingSearchTermsCampaignFilter = e.target.value;
        renderBingSearchTermsTable();
    });
    
    // Bing Search Terms search
    document.getElementById('bingSearchTermsSearch').addEventListener('input', (e) => {
        bingSearchTermsSearchText = e.target.value.toLowerCase();
        renderBingSearchTermsTable();
    });
    
    // Bing Search Terms table sorting
    document.querySelectorAll('#bingSearchTermsTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;
            if (bingSearchTermsSortColumn === sortKey) {
                bingSearchTermsSortDirection = bingSearchTermsSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                bingSearchTermsSortColumn = sortKey;
                bingSearchTermsSortDirection = 'desc';
            }
            document.querySelectorAll('#bingSearchTermsTable th.sortable').forEach(h => h.classList.remove('asc', 'desc'));
            th.classList.add(bingSearchTermsSortDirection);
            renderBingSearchTermsTable();
        });
    });

    // Ads filter dropdowns
    document.getElementById('filterCampaign').addEventListener('change', (e) => {
        filterCampaign = e.target.value;
        updateAdsetDropdown();
        updateAdDropdown();
        renderAdsTable();
        refreshPlatformPlacementData();
    });
    
    document.getElementById('filterAdset').addEventListener('change', (e) => {
        filterAdset = e.target.value;
        updateAdDropdown();
        renderAdsTable();
        refreshPlatformPlacementData();
    });
    
    // Multi-select Ads dropdown
    const filterAdBtn = document.getElementById('filterAdBtn');
    const filterAdDropdown = document.getElementById('filterAdDropdown');
    const filterAdSelectAll = document.getElementById('filterAdSelectAll');
    
    filterAdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterAdDropdown.style.display = filterAdDropdown.style.display === 'none' ? 'block' : 'none';
        if (filterAdDropdown.style.display === 'block') {
            const searchInput = document.getElementById('filterAdSearch');
            if (searchInput) { searchInput.value = ''; filterAdSearchHandler(''); searchInput.focus(); }
        }
    });
    
    // Ad search bar filtering
    const filterAdSearchInput = document.getElementById('filterAdSearch');
    if (filterAdSearchInput) {
        filterAdSearchInput.addEventListener('input', (e) => {
            filterAdSearchHandler(e.target.value);
        });
        filterAdSearchInput.addEventListener('click', (e) => e.stopPropagation());
    }
    
    document.addEventListener('click', (e) => {
        if (!filterAdDropdown.contains(e.target) && e.target !== filterAdBtn) {
            filterAdDropdown.style.display = 'none';
        }
    });
    
    filterAdSelectAll.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('#filterAdOptions input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = filterAdSelectAll.checked);
        updateFilterAdsFromCheckboxes();
    });
    
    document.getElementById('clearFilters').addEventListener('click', () => {
        filterCampaign = '';
        filterAdset = '';
        filterAds = [];
        document.getElementById('filterCampaign').value = '';
        document.getElementById('filterAdset').value = '';
        document.getElementById('filterAdLabel').textContent = 'All Ads';
        filterAdSelectAll.checked = false;
        document.querySelectorAll('#filterAdOptions input[type="checkbox"]').forEach(cb => cb.checked = false);
        updateAdsetDropdown();
        updateAdDropdown();
        renderAdsTable();
        refreshPlatformPlacementData();
    });
    
    // Set date inputs to reflect default range (7d) on load
    updateDateInputsForRange(currentRange);
    // Load summary by default
    loadSummaryData();
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
    document.getElementById('dailyBody').innerHTML = '<tr><td colspan="12" class="loading">Loading...</td></tr>';

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
            
            // Update funnel with Meta data
            updateMetaFunnel(impressions, clicks, results);
        }
    } catch (e) { 
        console.error('KPI error:', e); 
    }
}

async function updateMetaFunnel(impressions, clicks, conversions) {
    // Update Meta metrics in funnel
    document.getElementById('funnelImpressions').textContent = impressions.toLocaleString();
    document.getElementById('funnelClicks').textContent = clicks.toLocaleString();
    document.getElementById('funnelConversions').textContent = conversions.toLocaleString();
    
    // Calculate rates
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;
    document.getElementById('funnelCtr').textContent = ctr + '% CTR';
    document.getElementById('funnelConvRate').textContent = convRate + '% conv rate';
    
    // Fetch l_f_s data for Meta sources
    try {
        // Build date range from current selection
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            
            // Handle presets
            if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            // 'today' preset or days=1 uses today's date (no change needed)
            
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        const params = new URLSearchParams({ startDate, endDate });
        const [lookerResponse, oursResponse] = await Promise.all([
            fetch('/api/ours-privacy/lfs-by-platform?platform=meta&' + params).then(r => r.json()),
            fetch('/api/ours-privacy/lfs-raw-by-platform?platform=meta&' + params).then(r => r.json())
        ]);
        
        const lfsCount = lookerResponse.total || 0;
        document.getElementById('funnelLfs').textContent = lfsCount.toLocaleString();
        const lfsRate = conversions > 0 ? ((lfsCount / conversions) * 100).toFixed(1) : 0;
        document.getElementById('funnelLfsRate').textContent = lfsRate + '% of conv';
        
        const lfsOursCount = oursResponse.total || 0;
        document.getElementById('funnelLfsOurs').textContent = lfsOursCount.toLocaleString();
        const lfsOursRate = conversions > 0 ? ((lfsOursCount / conversions) * 100).toFixed(1) : 0;
        document.getElementById('funnelLfsOursRate').textContent = lfsOursRate + '% of conv';
        
        // Update funnel bar widths based on actual ratios
        updateFunnelBars(impressions, clicks, conversions, lfsCount, lfsOursCount);
    } catch (e) {
        console.error('Error fetching l_f_s for funnel:', e);
        document.getElementById('funnelLfs').textContent = '-';
        document.getElementById('funnelLfsRate').textContent = '';
        document.getElementById('funnelLfsOurs').textContent = '-';
        document.getElementById('funnelLfsOursRate').textContent = '';
        updateFunnelBars(impressions, clicks, conversions, 0, 0);
    }
}

function updateFunnelBars(impressions, clicks, conversions, lfs, lfsOurs) {
    const steps = document.querySelectorAll('#campaignsView .funnel-step');
    if (steps.length < 5) return;
    
    // Scale bars proportionally - impressions is 100%, others relative to clicks
    steps[0].style.setProperty('--step-width', '100%');
    steps[1].style.setProperty('--step-width', clicks > 0 ? '70%' : '10%');
    
    // Results, l_f_s Looker, l_f_s Ours scaled relative to each other
    const maxLower = Math.max(conversions, lfs, lfsOurs || 0, 1);
    const resultsWidth = conversions > 0 ? Math.max((conversions / maxLower) * 45, 15) : 10;
    const lfsWidth = lfs > 0 ? Math.max((lfs / maxLower) * 45, 15) : 10;
    const lfsOursWidth = (lfsOurs || 0) > 0 ? Math.max(((lfsOurs || 0) / maxLower) * 45, 15) : 10;
    
    steps[2].style.setProperty('--step-width', resultsWidth + '%');
    steps[3].style.setProperty('--step-width', lfsWidth + '%');
    steps[4].style.setProperty('--step-width', lfsOursWidth + '%');
}

async function loadChartData() {
    const range = dateRanges[currentRange];
    
    // Calculate number of days for custom range
    let numDays = range.days || 7;
    let startDate, endDate;
    
    if (range.custom && customStartDate && customEndDate) {
        startDate = new Date(customStartDate + 'T12:00:00');
        endDate = new Date(customEndDate + 'T12:00:00');
        numDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    const days = range.custom ? getDaysArrayCustom(customStartDate, customEndDate) : getDaysArray(numDays);

    try {
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,actions&${getDateRange(range)}&time_increment=1`
        );
        
        const dailySpend = new Array(numDays).fill(0);
        const dailyResults = new Array(numDays).fill(0);

        if (data.data) {
            const dataByDate = {};
            data.data.forEach(day => {
                dataByDate[day.date_start] = day;
            });
            
            if (range.custom && customStartDate && customEndDate) {
                // Custom date range
                const start = new Date(customStartDate + 'T12:00:00');
                for (let i = 0; i < numDays; i++) {
                    const date = new Date(start);
                    date.setDate(start.getDate() + i);
                    const dateStr = formatDateEST(date);
                    
                    if (dataByDate[dateStr]) {
                        dailySpend[i] = parseFloat(dataByDate[dateStr].spend || 0);
                        dailyResults[i] = getResults(dataByDate[dateStr].actions);
                    }
                }
            } else {
                // Standard date range
                const today = getESTDate();
                for (let i = 0; i < numDays; i++) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (numDays - 1 - i));
                    const dateStr = formatDateEST(date);
                    
                    if (dataByDate[dateStr]) {
                        dailySpend[i] = parseFloat(dataByDate[dateStr].spend || 0);
                        dailyResults[i] = getResults(dataByDate[dateStr].actions);
                    }
                }
            }
        }

        renderSpendChart(days, dailySpend);
        renderResultsChart(days, dailyResults);
    } catch (e) { 
        console.error('Chart error:', e);
        renderSpendChart(days, new Array(numDays).fill(0));
        renderResultsChart(days, new Array(numDays).fill(0));
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

function getDaysArrayCustom(startDateStr, endDateStr) {
    const days = [];
    const start = new Date(startDateStr + 'T12:00:00');
    const end = new Date(endDateStr + 'T12:00:00');
    const numDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    for (let i = 0; i < numDays; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
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
    
    // Show/hide pacing legend and update text based on Today vs Yesterday
    const pacingLegend = document.getElementById('pacingLegend');
    if (pacingLegend) {
        if (showBudget) {
            pacingLegend.style.display = 'flex';
            if (isToday) {
                pacingLegend.innerHTML = `
                    <span class="legend-title">Pacing:</span>
                    <span class="legend-item"><span class="dot green"></span> 50%+ budget remaining</span>
                    <span class="legend-item"><span class="dot yellow"></span> 20-50% remaining</span>
                    <span class="legend-item"><span class="dot red"></span> &lt;20% remaining</span>
                `;
            } else {
                pacingLegend.innerHTML = `
                    <span class="legend-title">Utilization:</span>
                    <span class="legend-item"><span class="dot green"></span> 85%+ budget spent</span>
                    <span class="legend-item"><span class="dot yellow"></span> 50-85% spent</span>
                    <span class="legend-item"><span class="dot red"></span> &lt;50% spent</span>
                `;
            }
        } else {
            pacingLegend.style.display = 'none';
        }
    }
    
    // Build the insights query based on date range (using EST)
    let insightsQuery;
    if (range.custom && customStartDate && customEndDate) {
        insightsQuery = `insights.time_range({"since":"${customStartDate}","until":"${customEndDate}"})`;
    } else if (range.preset) {
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
                    <tr data-cid="${c.id}" style="cursor:pointer;" onclick="toggleAdSetBreakdown('${c.id}', this)">
                        <td>${c.name} <span style="color:#667eea;font-size:11px;">▶</span></td>
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
                    <tr data-cid="${c.id}" style="cursor:pointer;" onclick="toggleAdSetBreakdown('${c.id}', this)">
                        <td>${c.name} <span style="color:#667eea;font-size:11px;">▶</span></td>
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
        // Build date range for l_f_s API
        let startDate, endDate;
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        // Fetch Meta data, Looker l_f_s, and Ours Privacy l_f_s in parallel
        const [data, lfsResponse, oursLfsResponse] = await Promise.all([
            apiCall(`${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&${getDateRange(range)}&time_increment=1`),
            fetch(`/api/ours-privacy/lfs-by-date?platform=meta&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
            fetch(`/api/ours-privacy/lfs-daily-breakdown?startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};
        const oursLfsByDate = oursLfsResponse.byDate || {};

        const tbody = document.getElementById('dailyBody');
        
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" class="loading">No daily data for this period</td></tr>';
            return;
        }

        // Sort by date descending
        const sortedData = data.data.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));

        tbody.innerHTML = sortedData.map(day => {
            const spend = parseFloat(day.spend || 0);
            const impressions = parseInt(day.impressions || 0);
            const clicks = parseInt(day.clicks || 0);
            const results = getResults(day.actions);
            const lfs = lfsByDate[day.date_start] || 0;
            const oursLfsDay = oursLfsByDate[day.date_start];
            const oursLfs = oursLfsDay ? (oursLfsDay.meta || 0) : 0;
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            const costPerOursLfs = oursLfs > 0 ? '$' + (spend / oursLfs).toFixed(2) : '-';
            
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
                    <td>${lfs}</td>
                    <td>${costPerLfs}</td>
                    <td>${oursLfs}</td>
                    <td>${costPerOursLfs}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Daily error:', e);
        document.getElementById('dailyBody').innerHTML = '<tr><td colspan="13" class="loading">Error loading daily data</td></tr>';
    }
}

// Load Ads Data with Creative Thumbnails
async function loadAdsData() {
    const range = dateRanges[currentRange];
    const tbody = document.getElementById('adsBody');
    tbody.innerHTML = '<tr><td colspan="15" class="loading">Loading ads...</td></tr>';

    try {
        // Get ad-level insights for current period
        const insightsData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,reach,frequency,actions,video_avg_time_watched_actions&${getDateRange(range)}&limit=100`
        );

        if (!insightsData.data || insightsData.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="15" class="loading">No ad data for this period</td></tr>';
            return;
        }
        
        // Get platform breakdown (Facebook vs Instagram)
        const platformData = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,ctr,reach,actions&breakdowns=publisher_platform&${getDateRange(range)}&limit=10`
        );
        renderPlatformComparison(platformData.data || []);
        
        // Get placement breakdown (Feed, Stories, Reels, etc.)
        const placementData = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,ctr,reach,actions&breakdowns=publisher_platform,platform_position&${getDateRange(range)}&limit=50`
        );
        renderPlacementBreakdown(placementData.data || []);
        
        // Get previous period baseline for trend comparison
        // Calculate previous period (same duration, immediately before current period)
        let prevPeriodQuery;
        if (range.custom && customStartDate && customEndDate) {
            const start = new Date(customStartDate + 'T12:00:00');
            const end = new Date(customEndDate + 'T12:00:00');
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevStart.getDate() - days + 1);
            prevPeriodQuery = `time_range={"since":"${formatDateEST(prevStart)}","until":"${formatDateEST(prevEnd)}"}`;
        } else if (range.preset === 'today') {
            prevPeriodQuery = 'date_preset=yesterday';
        } else if (range.preset === 'yesterday') {
            // Day before yesterday
            const today = getESTDate();
            const dayBeforeYesterday = new Date(today);
            dayBeforeYesterday.setDate(today.getDate() - 2);
            prevPeriodQuery = `time_range={"since":"${formatDateEST(dayBeforeYesterday)}","until":"${formatDateEST(dayBeforeYesterday)}"}`;
        } else {
            // For 7d, 14d, 30d - get the previous equivalent period
            const today = getESTDate();
            const days = range.days;
            const prevEnd = new Date(today);
            prevEnd.setDate(today.getDate() - days);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - days + 1);
            prevPeriodQuery = `time_range={"since":"${formatDateEST(prevStart)}","until":"${formatDateEST(prevEnd)}"}`;
        }
        
        const baselineData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,spend,actions&${prevPeriodQuery}&limit=100`
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

        // Get creative info, status, and created_time for each ad (batch requests in chunks of 50)
        const adIds = insightsData.data.map(ad => ad.ad_id);
        const creativeData = {};
        const adStatusData = {};
        
        // Fetch creative IDs, status, and created_time in batches of 50
        for (let i = 0; i < adIds.length; i += 50) {
            const batchIds = adIds.slice(i, i + 50);
            const adsWithCreatives = await apiCall(
                `?ids=${batchIds.join(',')}&fields=creative,effective_status,created_time`
            );
            
            // Collect creative IDs, status, and created_time from this batch
            Object.values(adsWithCreatives).forEach(ad => {
                creativeData[ad.id] = { 
                    creativeId: ad.creative?.id,
                    created_time: ad.created_time
                };
                if (ad.effective_status) {
                    adStatusData[ad.id] = ad.effective_status;
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
            const reach = parseInt(ad.reach || 0);
            const frequency = ad.frequency ? parseFloat(ad.frequency) : 0;
            const results = getResults(ad.actions);
            const costPerResult = results > 0 ? spend / results : Infinity;
            
            // Calculate CPR trend vs previous period baseline
            const baseline = baselineCPR[ad.ad_id];
            let cprTrend = null; // percentage change
            if (baseline && costPerResult !== Infinity && baseline > 0) {
                cprTrend = ((costPerResult - baseline) / baseline) * 100;
            }
            
            const creative = creativeData[ad.ad_id] || {};
            
            // Extract video average watch time (in seconds)
            let avgWatchTime = null;
            if (ad.video_avg_time_watched_actions && ad.video_avg_time_watched_actions.length > 0) {
                avgWatchTime = parseInt(ad.video_avg_time_watched_actions[0].value) || null;
            }
            
            return {
                ad_id: ad.ad_id,
                ad_name: ad.ad_name,
                adset_id: ad.adset_id,
                adset_name: ad.adset_name || '-',
                campaign_id: ad.campaign_id,
                campaign_name: ad.campaign_name,
                spend,
                impressions,
                clicks,
                ctr,
                reach,
                frequency,
                results,
                cost_per_result: costPerResult,
                cpr_trend: cprTrend,
                avg_watch_time: avgWatchTime,
                thumbnail: creative.thumbnail,
                videoId: creative.videoId,
                created_time: creative.created_time,
                status: adStatusData[ad.ad_id] || 'UNKNOWN'
            };
        });
        
        adsDataLoaded = true;
        
        // Reset filters and populate dropdowns
        filterCampaign = '';
        filterAdset = '';
        filterAds = [];
        populateAdsFilterDropdowns();
        
        renderAdsTable();
        updateLastUpdated();
    } catch (e) {
        console.error('Ads error:', e);
        tbody.innerHTML = `<tr><td colspan="15" class="loading">Error loading ads: ${e.message}</td></tr>`;
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
    const optionsContainer = document.getElementById('filterAdOptions');
    
    optionsContainer.innerHTML = ads.map(ad => {
        const checked = filterAds.includes(ad) ? 'checked' : '';
        const shortName = ad.length > 35 ? ad.substring(0, 35) + '...' : ad;
        return `
            <label style="display: flex; align-items: center; padding: 6px 4px; cursor: pointer; border-radius: 4px;" 
                   onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">
                <input type="checkbox" value="${ad}" ${checked} style="margin-right: 8px;" onchange="updateFilterAdsFromCheckboxes()">
                <span title="${ad}" style="font-size: 13px;">${shortName}</span>
            </label>
        `;
    }).join('');
    
    // Reset ad filter if current selections are not in filtered list
    if (filterAds.length > 0) {
        filterAds = filterAds.filter(ad => ads.includes(ad));
        updateFilterAdLabel();
    }
}

function filterAdSearchHandler(query) {
    const labels = document.querySelectorAll('#filterAdOptions label');
    const q = query.toLowerCase();
    labels.forEach(label => {
        const text = label.textContent.toLowerCase();
        label.style.display = text.includes(q) ? 'flex' : 'none';
    });
}

function updateFilterAdsFromCheckboxes() {
    const checkboxes = document.querySelectorAll('#filterAdOptions input[type="checkbox"]');
    filterAds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
    updateFilterAdLabel();
    
    // Update select all checkbox
    const selectAll = document.getElementById('filterAdSelectAll');
    selectAll.checked = filterAds.length === checkboxes.length && checkboxes.length > 0;
    
    renderAdsTable();
}

function updateFilterAdLabel() {
    const label = document.getElementById('filterAdLabel');
    if (filterAds.length === 0) {
        label.textContent = 'All Ads';
    } else if (filterAds.length === 1) {
        const name = filterAds[0];
        label.textContent = name.length > 20 ? name.substring(0, 20) + '...' : name;
    } else {
        label.textContent = `${filterAds.length} ads selected`;
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
    if (filterAds.length > 0) {
        filteredAds = filteredAds.filter(ad => filterAds.includes(ad.ad_name));
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

        // Format watch time
        const watchTimeDisplay = ad.avg_watch_time !== null ? `${ad.avg_watch_time}s` : '-';

        // Format frequency with color coding
        let frequencyHtml;
        if (ad.frequency >= 7) {
            frequencyHtml = `<span class="freq-critical">${ad.frequency.toFixed(1)}</span>`;
        } else if (ad.frequency >= 4) {
            frequencyHtml = `<span class="freq-warning">${ad.frequency.toFixed(1)}</span>`;
        } else if (ad.frequency > 0) {
            frequencyHtml = `<span class="freq-ok">${ad.frequency.toFixed(1)}</span>`;
        } else {
            frequencyHtml = '-';
        }

        // Format published date
        let publishedDisplay = '-';
        if (ad.created_time) {
            const pubDate = new Date(ad.created_time);
            publishedDisplay = pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        // Format status with badge
        let statusHtml;
        const status = ad.status || 'UNKNOWN';
        if (status === 'ACTIVE') {
            statusHtml = '<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Active</span>';
        } else if (status === 'PAUSED') {
            statusHtml = '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">Paused</span>';
        } else if (status === 'DELETED' || status === 'ARCHIVED') {
            statusHtml = '<span style="background: #6b7280; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">' + status.charAt(0) + status.slice(1).toLowerCase() + '</span>';
        } else if (status === 'PENDING_REVIEW' || status === 'DISAPPROVED') {
            statusHtml = '<span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">' + status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) + '</span>';
        } else {
            statusHtml = '<span style="background: #9ca3af; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">' + status.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) + '</span>';
        }

        return `
            <tr>
                <td>${thumbnailHtml}</td>
                <td>${ad.ad_name}</td>
                <td>${statusHtml}</td>
                <td>${ad.adset_name}</td>
                <td>${ad.campaign_name}</td>
                <td>${publishedDisplay}</td>
                <td>$${ad.spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>${ad.impressions.toLocaleString()}</td>
                <td>${ad.clicks.toLocaleString()}</td>
                <td>${ad.ctr.toFixed(2)}%</td>
                <td>${ad.results}</td>
                <td>${costPerResultDisplay}</td>
                <td>${frequencyHtml}</td>
                <td>${watchTimeDisplay}</td>
                <td>${trendHtml}</td>
            </tr>
        `;
    }).join('');
    
    // Analyze winners after rendering
    analyzeWinner();
    
    // Check for creative fatigue
    analyzeFatigue();
}

// Display top 3 performing ads by results
function analyzeWinner() {
    const section = document.getElementById('winnerAnalysis');
    if (!adsRawData || adsRawData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Apply current filters to get filtered data
    let filteredData = adsRawData;
    if (filterCampaign) {
        filteredData = filteredData.filter(ad => ad.campaign_name === filterCampaign);
    }
    if (filterAdset) {
        filteredData = filteredData.filter(ad => ad.adset_name === filterAdset);
    }
    if (filterAds.length > 0) {
        filteredData = filteredData.filter(ad => filterAds.includes(ad.ad_name));
    }
    
    // Find ads with results, sorted by most results
    const adsWithResults = filteredData.filter(ad => ad.results > 0).sort((a, b) => b.results - a.results);
    
    if (adsWithResults.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    // Calculate averages for comparison (using filtered data)
    const avgCtr = filteredData.length > 0 ? filteredData.reduce((sum, ad) => sum + ad.ctr, 0) / filteredData.length : 0;
    const adsWithWatch = filteredData.filter(ad => ad.avg_watch_time !== null && ad.avg_watch_time > 0);
    const avgWatch = adsWithWatch.length > 0 
        ? adsWithWatch.reduce((sum, ad) => sum + ad.avg_watch_time, 0) / adsWithWatch.length 
        : 0;
    const adsWithCpr = filteredData.filter(ad => ad.results > 0 && ad.cost_per_result !== Infinity);
    const avgCpr = adsWithCpr.length > 0
        ? adsWithCpr.reduce((sum, ad) => sum + ad.cost_per_result, 0) / adsWithCpr.length
        : 0;
    
    // Populate top 3 winners
    for (let i = 0; i < 3; i++) {
        const winner = adsWithResults[i];
        const num = i + 1;
        
        if (!winner) {
            // Hide this winner slot if not enough ads
            const container = document.querySelector(`.winner-container:nth-child(${num})`);
            if (container) container.style.display = 'none';
            continue;
        }
        
        // Set creative thumbnail with video link
        const creativeEl = document.getElementById(`winner${num}Creative`);
        if (winner.thumbnail && winner.videoId) {
            creativeEl.innerHTML = `
                <a href="https://www.facebook.com/watch/?v=${winner.videoId}" target="_blank" title="Watch video">
                    <img src="${winner.thumbnail}" alt="${winner.ad_name}">
                </a>
            `;
        } else if (winner.thumbnail) {
            creativeEl.innerHTML = `<img src="${winner.thumbnail}" alt="${winner.ad_name}">`;
        } else {
            creativeEl.innerHTML = `<div class="no-thumbnail">🖼️</div>`;
        }
        
        // Set winner info
        document.getElementById(`winner${num}Name`).textContent = winner.ad_name;
        document.getElementById(`winner${num}Results`).textContent = winner.results.toLocaleString();
        document.getElementById(`winner${num}CPR`).textContent = winner.cost_per_result !== Infinity 
            ? '$' + winner.cost_per_result.toFixed(2) 
            : '-';
        document.getElementById(`winner${num}Spend`).textContent = '$' + winner.spend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        // Generate insight
        const insight = generateWinnerInsight(winner, avgCtr, avgWatch, avgCpr);
        document.getElementById(`winner${num}Insight`).innerHTML = insight;
    }
}

// Generate creative insights for designers
function generateWinnerInsight(ad, avgCtr, avgWatch, avgCpr) {
    const insights = [];
    const name = ad.ad_name.toLowerCase();
    
    // Content format patterns
    if (name.includes(' vs ') || name.includes(' vs.') || name.includes('versus')) {
        insights.push('🎯 <strong>Side-by-side comparison</strong> — use split screen or alternating visuals to contrast two conditions');
    }
    if (name.includes('tour') || name.includes('clinic') || name.includes('office') || name.includes('facility')) {
        insights.push('🏥 <strong>Clinic walkthrough</strong> — show clean, modern facility with welcoming atmosphere and real staff');
    }
    if (name.includes('dr.') || name.includes('dr ') || name.includes('doctor')) {
        insights.push('👨‍⚕️ <strong>Doctor on camera</strong> — physician speaking directly to viewer in professional setting with white coat');
    }
    if (name.includes('before') && name.includes('after')) {
        insights.push('📸 <strong>Transformation visuals</strong> — clear before/after shots with consistent lighting and angles');
    }
    if (name.includes('testimonial') || name.includes('patient') || name.includes('review') || name.includes('story')) {
        insights.push('🗣️ <strong>Real patient story</strong> — authentic testimonial with patient speaking naturally, show their journey');
    }
    if (name.includes('symptom') || name.includes('sign') || name.includes('pain') || name.includes('leg') || name.includes('vein')) {
        insights.push('🔍 <strong>Symptom close-ups</strong> — zoom in on affected areas, use arrows/circles to highlight issues');
    }
    if (name.includes('treatment') || name.includes('procedure') || name.includes('how')) {
        insights.push('⚕️ <strong>Procedure demo</strong> — show treatment in action (non-graphic), emphasize quick & minimally invasive');
    }
    if (name.includes('free') || name.includes('consultation') || name.includes('insurance')) {
        insights.push('💬 <strong>Clear CTA overlay</strong> — bold text overlay with offer, use contrasting colors for visibility');
    }
    
    // Video style insights based on watch time
    if (ad.avg_watch_time && ad.avg_watch_time >= 7) {
        insights.push('⏱️ <strong>Strong hook</strong> — first 3 seconds grab attention; use movement, question, or surprising visual');
    }
    if (ad.avg_watch_time && ad.avg_watch_time >= 5) {
        insights.push('📝 <strong>Text captions</strong> — add subtitles/captions since most watch without sound');
    }
    
    // Video format
    if (ad.videoId) {
        if (name.includes('short') || name.includes('reel') || name.includes('tiktok')) {
            insights.push('📱 <strong>Vertical short-form</strong> — 9:16 ratio, fast cuts, trending audio style');
        } else {
            insights.push('🎬 <strong>Video content</strong> — keep 15-30 sec, front-load key message, end with clear CTA');
        }
    }
    
    // If no patterns found
    if (insights.length === 0) {
        insights.push('✨ <strong>Clean, professional look</strong> — consistent branding, high quality imagery, trustworthy medical aesthetic');
    }
    
    // Limit to 3 insights max
    return insights.slice(0, 3).join('<br>');
}

// Refresh platform and placement data based on current filters
async function refreshPlatformPlacementData() {
    const range = dateRanges[currentRange];
    
    // Build filter parameter based on current campaign/adset selection
    let filterParam = '';
    if (filterCampaign) {
        // Find campaign_id from selected campaign name
        const campaignAd = adsRawData.find(ad => ad.campaign_name === filterCampaign);
        if (campaignAd?.campaign_id) {
            filterParam = `&filtering=[{"field":"campaign.id","operator":"IN","value":["${campaignAd.campaign_id}"]}]`;
        }
    }
    
    try {
        // Get platform breakdown
        const platformData = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,ctr,reach,actions&breakdowns=publisher_platform&${getDateRange(range)}${filterParam}&limit=10`
        );
        renderPlatformComparison(platformData.data || []);
        
        // Get placement breakdown
        const placementData = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,ctr,reach,actions&breakdowns=publisher_platform,platform_position&${getDateRange(range)}${filterParam}&limit=50`
        );
        renderPlacementBreakdown(placementData.data || []);
    } catch (e) {
        console.error('Error refreshing platform/placement data:', e);
    }
}

// Select platform to filter placements
function selectPlatform(platform) {
    if (filterPlatform === platform) {
        filterPlatform = ''; // Toggle off if already selected
    } else {
        filterPlatform = platform;
    }
    // Re-render both sections
    renderPlatformCards();
    renderPlacementCards();
}

// Store current platform data for re-rendering
let platformRawData = [];

// Render platform comparison (Facebook vs Instagram)
function renderPlatformComparison(platformData) {
    platformRawData = platformData; // Store for re-rendering
    renderPlatformCards();
}

function renderPlatformCards() {
    const platformData = platformRawData;
    const section = document.getElementById('platformComparison');
    const container = document.getElementById('platformCards');
    
    if (!platformData || platformData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    // Platform icons and names
    const platformConfig = {
        'facebook': { icon: '📘', name: 'Facebook', class: 'facebook' },
        'instagram': { icon: '📸', name: 'Instagram', class: 'instagram' },
        'audience_network': { icon: '🌐', name: 'Audience Network', class: 'audience_network' },
        'messenger': { icon: '💬', name: 'Messenger', class: 'messenger' }
    };
    
    // Process platform data
    const platforms = platformData.map(p => {
        const spend = parseFloat(p.spend || 0);
        const impressions = parseInt(p.impressions || 0);
        const clicks = parseInt(p.clicks || 0);
        const reach = parseInt(p.reach || 0);
        const ctr = p.ctr ? parseFloat(p.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);
        const results = getResults(p.actions);
        const costPerResult = results > 0 ? spend / results : null;
        
        return {
            platform: p.publisher_platform,
            spend,
            impressions,
            clicks,
            reach,
            ctr,
            results,
            costPerResult
        };
    }).filter(p => p.spend >= 1); // Only show platforms with at least $1 spend
    
    if (platforms.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Sort by cost per result (best first), platforms without results go last
    platforms.sort((a, b) => {
        if (a.costPerResult === null && b.costPerResult === null) return b.spend - a.spend;
        if (a.costPerResult === null) return 1;
        if (b.costPerResult === null) return -1;
        return a.costPerResult - b.costPerResult;
    });
    
    // Best performer is now first
    const bestPlatform = platforms[0]?.costPerResult !== null ? platforms[0].platform : null;
    
    container.innerHTML = platforms.map(p => {
        const config = platformConfig[p.platform] || { icon: '📱', name: p.platform, class: '' };
        const isWinner = p.platform === bestPlatform;
        const isSelected = p.platform === filterPlatform;
        const cprDisplay = p.costPerResult !== null ? '$' + p.costPerResult.toFixed(2) : '-';
        
        return `
            <div class="platform-card ${config.class} ${isSelected ? 'selected' : ''}" onclick="selectPlatform('${p.platform}')" style="cursor: pointer;">
                <div class="platform-header">
                    <span class="platform-icon">${config.icon}</span>
                    <span class="platform-name">${config.name}</span>
                    ${isSelected ? '<span class="platform-badge selected-badge">✓ Filtered</span>' : ''}
                    ${isWinner && !isSelected ? '<span class="platform-badge winner">🏆 Best CPR</span>' : ''}
                </div>
                <div class="platform-metrics">
                    <div class="platform-metric">
                        <div class="metric-value">$${p.spend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <div class="metric-label">Spend</div>
                    </div>
                    <div class="platform-metric">
                        <div class="metric-value">${p.results.toLocaleString()}</div>
                        <div class="metric-label">Results</div>
                    </div>
                    <div class="platform-metric">
                        <div class="metric-value">${cprDisplay}</div>
                        <div class="metric-label">Cost/Result</div>
                    </div>
                    <div class="platform-metric">
                        <div class="metric-value">${p.ctr.toFixed(2)}%</div>
                        <div class="metric-label">CTR</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Render placement breakdown (Feed, Stories, Reels, etc.)
function renderPlacementBreakdown(placementData) {
    placementRawData = placementData; // Store for filtering
    renderPlacementCards();
}

function renderPlacementCards() {
    const section = document.getElementById('placementBreakdown');
    const container = document.getElementById('placementCards');
    
    let placementData = placementRawData;
    
    if (!placementData || placementData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Filter by selected platform
    if (filterPlatform) {
        placementData = placementData.filter(p => p.publisher_platform === filterPlatform);
    }
    
    if (placementData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Placement icons and display names
    const placementConfig = {
        'feed': { icon: '📰', name: 'Feed' },
        'story': { icon: '📱', name: 'Stories' },
        'reels': { icon: '🎬', name: 'Reels' },
        'right_hand_column': { icon: '📌', name: 'Right Column' },
        'instant_article': { icon: '📄', name: 'Instant Articles' },
        'marketplace': { icon: '🛒', name: 'Marketplace' },
        'video_feeds': { icon: '🎥', name: 'Video Feeds' },
        'search': { icon: '🔍', name: 'Search' },
        'instream_video': { icon: '▶️', name: 'In-Stream Video' },
        'explore': { icon: '🧭', name: 'Explore' },
        'explore_home': { icon: '🏠', name: 'Explore Home' },
        'profile_feed': { icon: '👤', name: 'Profile Feed' },
        'an_classic': { icon: '🌐', name: 'Audience Network' },
        'rewarded_video': { icon: '🎁', name: 'Rewarded Video' },
        'messenger_inbox': { icon: '💬', name: 'Messenger Inbox' },
        'messenger_stories': { icon: '💭', name: 'Messenger Stories' }
    };
    
    // Process placement data
    const placements = placementData.map(p => {
        const spend = parseFloat(p.spend || 0);
        const impressions = parseInt(p.impressions || 0);
        const clicks = parseInt(p.clicks || 0);
        const ctr = p.ctr ? parseFloat(p.ctr) : (impressions > 0 ? (clicks / impressions) * 100 : 0);
        const results = getResults(p.actions);
        const costPerResult = results > 0 ? spend / results : null;
        
        // Create readable placement name
        const platform = p.publisher_platform || '';
        const position = p.platform_position || '';
        const key = position.toLowerCase();
        
        return {
            platform,
            position,
            key,
            spend,
            impressions,
            clicks,
            ctr,
            results,
            costPerResult
        };
    }).filter(p => p.spend >= 1); // Only show placements with at least $1 spend
    
    if (placements.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Sort by cost per result (best first)
    placements.sort((a, b) => {
        if (a.costPerResult === null && b.costPerResult === null) return b.spend - a.spend;
        if (a.costPerResult === null) return 1;
        if (b.costPerResult === null) return -1;
        return a.costPerResult - b.costPerResult;
    });
    
    // Best performer is first
    const bestPlacement = placements[0]?.costPerResult !== null ? 0 : -1;
    
    section.classList.remove('hidden');
    
    container.innerHTML = placements.map((p, index) => {
        const config = placementConfig[p.key] || { icon: '📍', name: p.position || 'Unknown' };
        const platformLabel = p.platform ? `${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}` : '';
        const displayName = `${platformLabel} ${config.name}`.trim();
        const isBest = index === bestPlacement;
        const isSelected = filterPlacement === p.position && filterPlacementPlatform === p.platform;
        const cprDisplay = p.costPerResult !== null ? '$' + p.costPerResult.toFixed(2) : '-';
        
        return `
            <div class="placement-card ${isBest ? 'best' : ''} ${isSelected ? 'selected' : ''}" onclick="selectPlacement('${p.platform}', '${p.position}')" style="cursor: pointer;">
                <div class="placement-header">
                    <span class="placement-icon">${config.icon}</span>
                    <span class="placement-name">${displayName}</span>
                    ${isSelected ? '<span class="placement-badge selected-badge">✓ Filtered</span>' : ''}
                    ${isBest && !isSelected ? '<span class="placement-badge">🏆 Best</span>' : ''}
                </div>
                <div class="placement-metrics">
                    <div class="placement-metric">
                        <div class="metric-value">$${p.spend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                        <div class="metric-label">Spend</div>
                    </div>
                    <div class="placement-metric">
                        <div class="metric-value">${p.results}</div>
                        <div class="metric-label">Results</div>
                    </div>
                    <div class="placement-metric">
                        <div class="metric-value">${cprDisplay}</div>
                        <div class="metric-label">CPR</div>
                    </div>
                    <div class="placement-metric">
                        <div class="metric-value">${p.ctr.toFixed(2)}%</div>
                        <div class="metric-label">CTR</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Select placement to filter ads table
async function selectPlacement(platform, position) {
    if (filterPlacement === position && filterPlacementPlatform === platform) {
        // Toggle off
        filterPlacement = '';
        filterPlacementPlatform = '';
        renderPlacementCards();
        renderAdsTable();
        return;
    }
    
    filterPlacement = position;
    filterPlacementPlatform = platform;
    renderPlacementCards();
    
    // Fetch ad-level data for this specific placement
    const tbody = document.getElementById('adsBody');
    tbody.innerHTML = '<tr><td colspan="15" class="loading">Loading ads for this placement...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const placementAdsData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,reach,frequency,actions&breakdowns=publisher_platform,platform_position&${getDateRange(range)}&limit=200`
        );
        
        if (!placementAdsData.data) {
            tbody.innerHTML = '<tr><td colspan="15" class="loading">No data for this placement</td></tr>';
            return;
        }
        
        // Filter and aggregate by ad for the selected placement
        const filteredData = placementAdsData.data.filter(row => 
            row.publisher_platform === platform && row.platform_position === position
        );
        
        // Create temporary filtered ads data
        const placementAds = filteredData.map(ad => {
            const spend = parseFloat(ad.spend || 0);
            const impressions = parseInt(ad.impressions || 0);
            const clicks = parseInt(ad.clicks || 0);
            const ctr = ad.ctr ? parseFloat(ad.ctr) : 0;
            const reach = parseInt(ad.reach || 0);
            const frequency = ad.frequency ? parseFloat(ad.frequency) : 0;
            const results = getResults(ad.actions);
            const costPerResult = results > 0 ? spend / results : Infinity;
            
            // Find thumbnail from original data
            const originalAd = adsRawData.find(a => a.ad_id === ad.ad_id);
            
            return {
                ad_id: ad.ad_id,
                ad_name: ad.ad_name,
                adset_name: ad.adset_name || '-',
                campaign_name: ad.campaign_name,
                spend,
                impressions,
                clicks,
                ctr,
                reach,
                frequency,
                results,
                cost_per_result: costPerResult,
                cpr_trend: null,
                avg_watch_time: null,
                thumbnail: originalAd?.thumbnail,
                videoId: originalAd?.videoId
            };
        });
        
        // Render filtered table
        renderFilteredAdsTable(placementAds);
    } catch (e) {
        console.error('Error fetching placement ads:', e);
        tbody.innerHTML = `<tr><td colspan="15" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Render filtered ads table (for placement filter)
function renderFilteredAdsTable(ads) {
    const tbody = document.getElementById('adsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="loading">No ads for this placement</td></tr>';
        return;
    }
    
    // Sort by results desc
    ads.sort((a, b) => b.results - a.results);
    
    tbody.innerHTML = ads.map(ad => {
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
        
        let frequencyHtml = ad.frequency > 0 ? ad.frequency.toFixed(1) : '-';
        if (ad.frequency >= 7) {
            frequencyHtml = `<span class="freq-critical">${ad.frequency.toFixed(1)}</span>`;
        } else if (ad.frequency >= 4) {
            frequencyHtml = `<span class="freq-warning">${ad.frequency.toFixed(1)}</span>`;
        } else if (ad.frequency > 0) {
            frequencyHtml = `<span class="freq-ok">${ad.frequency.toFixed(1)}</span>`;
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
                <td>${frequencyHtml}</td>
                <td>-</td>
                <td>-</td>
            </tr>
        `;
    }).join('');
}

// Analyze and display fatigued creatives
function analyzeFatigue() {
    const section = document.getElementById('fatigueAlert');
    const list = document.getElementById('fatigueList');
    
    if (!adsRawData || adsRawData.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    // Apply current filters
    let filteredData = adsRawData;
    if (filterCampaign) {
        filteredData = filteredData.filter(ad => ad.campaign_name === filterCampaign);
    }
    if (filterAdset) {
        filteredData = filteredData.filter(ad => ad.adset_name === filterAdset);
    }
    if (filterAds.length > 0) {
        filteredData = filteredData.filter(ad => filterAds.includes(ad.ad_name));
    }
    
    // Find ads with frequency >= 4
    const fatiguedAds = filteredData
        .filter(ad => ad.frequency >= 4)
        .sort((a, b) => b.frequency - a.frequency);
    
    if (fatiguedAds.length === 0) {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    
    list.innerHTML = fatiguedAds.map(ad => {
        // Determine severity and recommendation
        let severity, recommendation;
        if (ad.frequency >= 7) {
            severity = 'critical';
            recommendation = '🚨 <strong>Critical:</strong> Pause immediately. Audience has seen this ad too many times.';
        } else if (ad.frequency >= 5) {
            severity = 'high';
            recommendation = '⚠️ <strong>High fatigue:</strong> Consider pausing soon. Create fresh creative with similar messaging.';
        } else {
            severity = 'moderate';
            recommendation = '💡 <strong>Monitor closely:</strong> Approaching fatigue threshold. Prepare replacement creative.';
        }
        
        // Build thumbnail
        let thumbnailHtml = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">🖼️</div>';
        if (ad.thumbnail && ad.videoId) {
            thumbnailHtml = `<a href="https://www.facebook.com/watch/?v=${ad.videoId}" target="_blank"><img src="${ad.thumbnail}" alt="${ad.ad_name}"></a>`;
        } else if (ad.thumbnail) {
            thumbnailHtml = `<img src="${ad.thumbnail}" alt="${ad.ad_name}">`;
        }
        
        return `
            <div class="fatigue-item">
                <div class="fatigue-creative">${thumbnailHtml}</div>
                <div class="fatigue-info">
                    <div class="fatigue-name">${ad.ad_name}</div>
                    <div class="fatigue-stats">
                        <span class="frequency-badge">${ad.frequency.toFixed(1)}x frequency</span>
                        ${ad.reach.toLocaleString()} reach • ${ad.impressions.toLocaleString()} impressions
                    </div>
                </div>
                <div class="fatigue-recommendation">${recommendation}</div>
            </div>
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
    
    if (range.custom && customStartDate && customEndDate) {
        since = customStartDate;
        until = customEndDate;
    } else if (range.preset === 'today') {
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

// ==================== Summary Functions ====================

async function loadSummaryFunnels(metaSpend, googleSpend, bingSpend) {
    try {
        // Get date range
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        // Fetch l_f_s data for all platforms
        const [metaLfs, googleLfs, bingLfs, metaData, bingData, googleData] = await Promise.all([
            fetch(`/api/ours-privacy/lfs-by-platform?platform=meta&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=google&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=bing&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()),
            apiCall(`${ACCOUNT_ID}/insights?fields=impressions,clicks,actions&date_preset=${range.preset || 'last_7d'}`).catch(() => null),
            bingApiCall('account-performance', { startDate, endDate }).catch(() => null),
            googleApiCall('account-performance', { startDate, endDate }).catch(() => null)
        ]);
        
        // Meta funnel
        const metaImpressions = metaData?.data?.[0]?.impressions || 0;
        const metaClicks = metaData?.data?.[0]?.clicks || 0;
        const metaResults = getResults(metaData?.data?.[0]?.actions) || 0;
        const metaLfsCount = metaLfs.total || 0;
        
        document.getElementById('summaryMetaCost').textContent = '$' + metaSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryMetaImpressions').textContent = parseInt(metaImpressions).toLocaleString();
        document.getElementById('summaryMetaClicks').textContent = parseInt(metaClicks).toLocaleString();
        document.getElementById('summaryMetaResults').textContent = metaResults.toLocaleString();
        document.getElementById('summaryMetaLfs').textContent = metaLfsCount.toLocaleString();
        document.getElementById('summaryMetaCostLfs').textContent = metaLfsCount > 0 ? '$' + (metaSpend / metaLfsCount).toFixed(2) : '-';
        
        // Google funnel
        const googleImpressions = googleData?.impressions || 0;
        const googleClicks = googleData?.clicks || 0;
        const googleResults = googleData?.conversions || 0;
        const googleLfsCount = googleLfs.total || 0;
        
        document.getElementById('summaryGoogleCost').textContent = '$' + googleSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryGoogleImpressions').textContent = parseInt(googleImpressions).toLocaleString();
        document.getElementById('summaryGoogleClicks').textContent = parseInt(googleClicks).toLocaleString();
        document.getElementById('summaryGoogleResults').textContent = Math.round(googleResults).toLocaleString();
        document.getElementById('summaryGoogleLfs').textContent = googleLfsCount.toLocaleString();
        document.getElementById('summaryGoogleCostLfs').textContent = googleLfsCount > 0 ? '$' + (googleSpend / googleLfsCount).toFixed(2) : '-';
        
        // Bing funnel
        const bingImpressions = bingData?.impressions || 0;
        const bingClicks = bingData?.clicks || 0;
        const bingResults = bingData?.conversions || 0;
        const bingLfsCount = bingLfs.total || 0;
        
        document.getElementById('summaryBingCost').textContent = '$' + bingSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryBingImpressions').textContent = parseInt(bingImpressions).toLocaleString();
        document.getElementById('summaryBingClicks').textContent = parseInt(bingClicks).toLocaleString();
        document.getElementById('summaryBingResults').textContent = Math.round(bingResults).toLocaleString();
        document.getElementById('summaryBingLfs').textContent = bingLfsCount.toLocaleString();
        document.getElementById('summaryBingCostLfs').textContent = bingLfsCount > 0 ? '$' + (bingSpend / bingLfsCount).toFixed(2) : '-';
        
    } catch (e) {
        console.error('Error loading summary funnels:', e);
    }
}

// Load Medwork Leads Funnel from Looker
async function loadMedworkFunnel() {
    const container = document.getElementById('medworkFunnelContainer');
    const totalsContainer = document.getElementById('medworkTotalFunnel');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Loading Medwork funnel data...</div>';
    
    try {
        // Get date range
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else if (range.preset === 'today' || range.preset === 'yesterday') {
            const today = getESTDate();
            const d = new Date(today);
            if (range.preset === 'yesterday') d.setDate(d.getDate() - 1);
            startDate = endDate = formatDateEST(d);
        } else if (range.days) {
            const today = getESTDate();
            const start = new Date(today);
            start.setDate(today.getDate() - range.days + 1);
            startDate = formatDateEST(start);
            endDate = formatDateEST(today);
        }
        
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const response = await fetch(`/api/looker/leads-funnel?${params}`);
        const result = await response.json();
        
        if (!result.success) {
            container.innerHTML = '<div class="loading">Error loading funnel data</div>';
            return;
        }
        
        const data = result.data;
        const totals = result.totals;
        
        // Tracking type labels
        const typeLabels = {
            'mutm': { name: 'Meta', color: '#4267B2', emoji: '<img src="images/meta-icon.png" style="width: 18px; height: 18px; vertical-align: middle;">' },
            'outm': { name: 'Organic', color: '#34A853', emoji: '🌿' },
            'tutm': { name: 'TikTok', color: '#00f2ea', emoji: '🎵' },
            'g1utm': { name: 'Google', color: '#EA4335', emoji: '🔴' },
            'butm': { name: 'Bing', color: '#00A4EF', emoji: '🔷' },
            'gbputm': { name: 'GBP', color: '#F4B400', emoji: '📍' },
            'gbutm': { name: 'GBP', color: '#F4B400', emoji: '📍' }
        };
        
        // Build funnel cards for each tracking type
        let html = '';
        Object.keys(data).forEach(type => {
            const info = typeLabels[type] || { name: type, color: '#666', emoji: '📊' };
            const d = data[type];
            html += `
                <div class="funnel-card" style="flex: 1; min-width: 200px; max-width: 250px; background: #f8f9fa; border-radius: 12px; padding: 15px; border-top: 4px solid ${info.color};">
                    <h3 style="margin: 0 0 15px 0; color: ${info.color};">${info.emoji} ${info.name}</h3>
                    <div class="mini-funnel">
                        <div class="mini-funnel-row highlight"><span>l_f_s (LookerML)</span><span>${d.l_f_s.toLocaleString()}</span></div>
                        <div class="mini-funnel-row"><span>Is Booked</span><span>${d.is_booked.toLocaleString()}</span></div>
                        <div class="mini-funnel-row"><span>Sent to Verif.</span><span>${d.sent_to_verification.toLocaleString()}</span></div>
                        <div class="mini-funnel-row"><span>Booked Covered</span><span>${d.is_booked_covered.toLocaleString()}</span></div>
                        <div class="mini-funnel-row" style="background: #d4edda;"><span>Fulfilled</span><span>${d.initial_fulfilled.toLocaleString()}</span></div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="loading">No funnel data available</div>';
        
        // Build total funnel visualization
        const stages = [
            { label: 'l_f_s (LookerML)', value: totals.l_f_s, color: '#6366f1' },
            { label: 'Is Booked', value: totals.is_booked, color: '#8b5cf6' },
            { label: 'Sent to Verif.', value: totals.sent_to_verification, color: '#a855f7' },
            { label: 'Booked Covered', value: totals.is_booked_covered, color: '#d946ef' },
            { label: 'Fulfilled', value: totals.initial_fulfilled, color: '#22c55e' }
        ];
        
        const maxValue = Math.max(...stages.map(s => s.value), 1);
        
        totalsContainer.innerHTML = stages.map(stage => {
            const height = Math.max((stage.value / maxValue) * 150, 20);
            const rate = totals.l_f_s > 0 ? ((stage.value / totals.l_f_s) * 100).toFixed(1) : 0;
            return `
                <div style="flex: 1; text-align: center;">
                    <div style="height: ${height}px; background: ${stage.color}; border-radius: 8px 8px 0 0; min-width: 60px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${stage.value}
                    </div>
                    <div style="font-size: 11px; margin-top: 5px; color: #666;">${stage.label}</div>
                    <div style="font-size: 10px; color: #999;">${rate}%</div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error('Error loading Medwork funnel:', e);
        container.innerHTML = '<div class="loading">Error: ' + e.message + '</div>';
    }
}

// Funnels comparison chart instance
let funnelsComparisonChart = null;

// Load Funnels View Data
async function loadFunnelsData() {
    try {
        // Get date range
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else if (range.preset === 'today' || range.preset === 'yesterday') {
            const today = getESTDate();
            const d = new Date(today);
            if (range.preset === 'yesterday') d.setDate(d.getDate() - 1);
            startDate = endDate = formatDateEST(d);
        } else if (range.days) {
            const today = getESTDate();
            const start = new Date(today);
            start.setDate(today.getDate() - range.days + 1);
            startDate = formatDateEST(start);
            endDate = formatDateEST(today);
        }
        
        const params = new URLSearchParams({ startDate, endDate });
        
        // Load all platform data in parallel
        const [metaData, googleData, bingData, tiktokFunnelData, metaLfs, googleLfs, bingLfs] = await Promise.all([
            apiCall(`${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${startDate}","until":"${endDate}"}`),
            googleApiCall('account-performance', { startDate, endDate }).catch(() => ({})),
            bingApiCall('account-performance', { startDate, endDate }).catch(() => ({})),
            fetch('/api/tiktok/account-performance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate, endDate }) }).then(r => r.json()).catch(() => ({})),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=meta&${params}`).then(r => r.json()).catch(() => ({ total: 0 })),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=google&${params}`).then(r => r.json()).catch(() => ({ total: 0 })),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=bing&${params}`).then(r => r.json()).catch(() => ({ total: 0 }))
        ]);
        
        // Process TikTok data for funnels
        const tiktokSpend = parseFloat(tiktokFunnelData.spend || 0);
        
        // Process Meta data
        const meta = metaData.data?.[0] || {};
        const metaSpend = parseFloat(meta.spend || 0);
        const metaImpressions = parseInt(meta.impressions || 0);
        const metaClicks = parseInt(meta.clicks || 0);
        const metaResults = getResults(meta.actions);
        const metaLfsCount = metaLfs.total || 0;
        
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaCost').textContent = '$' + metaSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaImpressions').textContent = metaImpressions.toLocaleString();
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaClicks').textContent = metaClicks.toLocaleString();
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaResults').textContent = metaResults.toLocaleString();
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaLfs').textContent = metaLfsCount.toLocaleString();
        // document.getElementById('funnelMeta')?.textContent; // OLD: // document.getElementById('funnelMetaCostLfs').textContent = metaLfsCount > 0 ? '$' + (metaSpend / metaLfsCount).toFixed(2) : '-';
        
        // Process Google data
        const googleSpend = parseFloat(googleData.spend || 0);
        const googleImpressions = parseInt(googleData.impressions || 0);
        const googleClicks = parseInt(googleData.clicks || 0);
        const googleResults = parseFloat(googleData.conversions || 0);
        const googleLfsCount = googleLfs.total || 0;
        
        // document.getElementById('funnelGoogleCost').textContent = '$' + googleSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        // document.getElementById('funnelGoogleImpressions').textContent = googleImpressions.toLocaleString();
        // document.getElementById('funnelGoogleClicks').textContent = googleClicks.toLocaleString();
        // document.getElementById('funnelGoogleResults').textContent = Math.round(googleResults).toLocaleString();
        // document.getElementById('funnelGoogleLfs').textContent = googleLfsCount.toLocaleString();
        // document.getElementById('funnelGoogleCostLfs').textContent = googleLfsCount > 0 ? '$' + (googleSpend / googleLfsCount).toFixed(2) : '-';
        
        // Process Bing data (bingApiCall returns data directly, not nested)
        const bingSpend = parseFloat(bingData.spend || 0);
        const bingImpressions = parseInt(bingData.impressions || 0);
        const bingClicks = parseInt(bingData.clicks || 0);
        const bingResults = parseFloat(bingData.conversions || 0);
        const bingLfsCount = bingLfs.total || 0;
        
        // document.getElementById('funnelBingCost').textContent = '$' + bingSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        // document.getElementById('funnelBingImpressions').textContent = bingImpressions.toLocaleString();
        // document.getElementById('funnelBingClicks').textContent = bingClicks.toLocaleString();
        // document.getElementById('funnelBingResults').textContent = Math.round(bingResults).toLocaleString();
        // document.getElementById('funnelBingLfs').textContent = bingLfsCount.toLocaleString();
        // document.getElementById('funnelBingCostLfs').textContent = bingLfsCount > 0 ? '$' + (bingSpend / bingLfsCount).toFixed(2) : '-';
        
        // Load Medwork funnel for Funnels view with spend data for cost per stage
        const spendByPlatform = {
            mutm: metaSpend,      // Meta
            g1utm: googleSpend,   // Google
            butm: bingSpend,      // Bing
            outm: 0,              // Organic (no spend)
            tutm: tiktokSpend,    // TikTok
            gbputm: 0,            // GBP (no spend)
            gbutm: 0              // GBP (no spend)
        };
        await loadFunnelsMedworkData(startDate, endDate, spendByPlatform);
        // Load Unified Platform Funnels
        await loadUnifiedFunnels(startDate, endDate);
        
        // Render comparison chart
        renderFunnelsComparisonChart({
            meta: { spend: metaSpend, results: metaResults, lfs: metaLfsCount },
            google: { spend: googleSpend, results: googleResults, lfs: googleLfsCount },
            bing: { spend: bingSpend, results: bingResults, lfs: bingLfsCount }
        });
        
        // Load Overall Patient Journey Funnel
        try {
            const [sourceRes, funnelRes] = await Promise.all([
                fetch("/api/ours-privacy/by-source?" + params),
                fetch("/api/looker/leads-funnel?" + params)
            ]);
            
            const sourceData = await sourceRes.json();
            const funnelData = await funnelRes.json();
            
            const funnelContainer = document.getElementById("overallJourneyFunnel");
            const platformSelect = document.getElementById("journeyPlatformFilter");
            
            const platformMap = {
                'mutm': { name: 'Meta', color: '#4267B2', funnelKey: 'mutm' },
                'tutm': { name: 'TikTok', color: '#00f2ea', funnelKey: 'tutm' },
                'outm': { name: 'Organic', color: '#34A853', funnelKey: 'outm' },
                'g1utm': { name: 'Google', color: '#EA4335', funnelKey: 'g1utm' },
                'butm': { name: 'Bing', color: '#00A4EF', funnelKey: 'butm' }
            };
            
            function renderOverallJourney(platform) {
                let config, platformData, medworkData;
                
                if (platform === 'all') {
                    // Combine all sources
                    config = { name: 'All Sources', color: '#6366f1' };
                    
                    // Sum up all platform events
                    const eventTotals = {};
                    sourceData.sources?.forEach(src => {
                        src.events?.forEach(evt => {
                            eventTotals[evt.event] = (eventTotals[evt.event] || 0) + evt.count;
                        });
                    });
                    platformData = { events: Object.entries(eventTotals).map(([event, count]) => ({ event, count })) };
                    
                    // Sum up all medwork data
                    medworkData = { l_f_s: 0, is_booked: 0, sent_to_verification: 0, is_booked_covered: 0, initial_fulfilled: 0 };
                    Object.values(funnelData.data || {}).forEach(d => {
                        medworkData.l_f_s += d.l_f_s || 0;
                        medworkData.is_booked += d.is_booked || 0;
                        medworkData.sent_to_verification += d.sent_to_verification || 0;
                        medworkData.is_booked_covered += d.is_booked_covered || 0;
                        medworkData.initial_fulfilled += d.initial_fulfilled || 0;
                    });
                } else {
                    config = platformMap[platform];
                    platformData = sourceData.sources?.find(s => s.prefix === platform);
                    medworkData = funnelData.data?.[config.funnelKey] || {};
                }
                
                if (!platformData) {
                    funnelContainer.innerHTML = '<div style="color: #666;">No data for this platform</div>';
                    return;
                }
                
                const stages = [];
                // Engagement events from Ours Privacy (excluding l_f_s - we'll get that from Looker)
                const eventOrder = ['e1s', 'e5s', 'e15s', 'e30s', 'e45s', 'e60s'];
                eventOrder.forEach(evt => {
                    const eventData = platformData.events?.find(e => e.event === evt);
                    if (eventData) {
                        const label = evt === 'e1s' ? '👁️ 1s view' :
                                     evt === 'e5s' ? '⏱️ 5s engaged' :
                                     evt === 'e15s' ? '⏱️ 15s engaged' :
                                     evt === 'e30s' ? '⏱️ 30s engaged' :
                                     evt === 'e45s' ? '⏱️ 45s engaged' :
                                     '⏱️ 60s engaged';
                        stages.push({ label, count: eventData.count, type: 'ours' });
                    }
                });
                
                // l_f_s and downstream from Looker (consistent with Medwork Funnel)
                if (medworkData.l_f_s > 0) {
                    stages.push({ label: '🎯 l_f_s (LookerML)', count: medworkData.l_f_s, type: 'medwork', key: 'l_f_s' });
                    stages.push({ label: '📅 Is Booked', count: medworkData.is_booked || 0, type: 'medwork', key: 'is_booked' });
                    stages.push({ label: '✅ Sent to Verif.', count: medworkData.sent_to_verification || 0, type: 'medwork', key: 'sent_to_verification' });
                    stages.push({ label: '💳 Booked Covered', count: medworkData.is_booked_covered || 0, type: 'medwork', key: 'is_booked_covered' });
                    stages.push({ label: '🏆 Fulfilled', count: medworkData.initial_fulfilled || 0, type: 'medwork', key: 'initial_fulfilled' });
                }
                
                // Get insurance data for breakdown - use platform-specific if selected
                const insuranceBreakdown = platform === 'all' 
                    ? (funnelData.insurance?.all || {})
                    : (funnelData.insurance?.byPlatform?.[platform] || {});
                
                const maxCount = Math.max(...stages.map(s => s.count), 1);
                
                funnelContainer.innerHTML = `
                    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; border-top: 4px solid ${config.color};">
                        <h3 style="margin: 0 0 20px 0; color: ${config.color};">${config.name} Patient Journey</h3>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${stages.map((stage, i) => {
                                const width = Math.max((stage.count / maxCount) * 100, 5);
                                const prevCount = i > 0 ? stages[i-1].count : stage.count;
                                const dropoff = prevCount > 0 ? ((1 - stage.count / prevCount) * 100).toFixed(1) : 0;
                                const bgColor = stage.type === 'medwork' ? '#e8f5e9' : '#e3f2fd';
                                const barColor = stage.type === 'medwork' ? '#4CAF50' : config.color;
                                
                                return `
                                    <div style="display: flex; align-items: center; gap: 15px;">
                                        <div style="width: 140px; font-size: 13px; text-align: right;">${stage.label}</div>
                                        <div style="flex: 1; background: ${bgColor}; border-radius: 4px; height: 32px; position: relative;">
                                            <div style="width: ${width}%; background: ${barColor}; height: 100%; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px; min-width: 50px;">
                                                ${stage.count.toLocaleString()}
                                            </div>
                                        </div>
                                        <div style="width: 60px; font-size: 11px; color: ${dropoff > 50 ? '#dc3545' : '#666'};">
                                            ${i > 0 ? (dropoff > 0 ? `-${dropoff}%` : '0%') : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div style="margin-top: 15px; font-size: 11px; color: #666; display: flex; gap: 20px;">
                            <span>🔵 Website engagement (Ours Privacy)</span>
                            <span>🟢 Lead funnel (Medwork)</span>
                        </div>
                        
                        ${Object.keys(insuranceBreakdown).length > 0 ? `
                        <div style="margin-top: 25px; padding-top: 20px; border-top: 2px dashed #e0e0e0;">
                            <h4 style="margin: 0 0 15px 0; color: #666;">🏥 Insurance Breakdown (Medwork Stages)</h4>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                                ${['is_booked', 'sent_to_verification', 'is_booked_covered', 'initial_fulfilled'].map(stageKey => {
                                    const stageLabel = stageKey === 'is_booked' ? 'Is Booked' :
                                                       stageKey === 'sent_to_verification' ? 'Sent to Verif.' :
                                                       stageKey === 'is_booked_covered' ? 'Booked Covered' : 'Fulfilled';
                                    const ppo = insuranceBreakdown.PPO?.[stageKey] || 0;
                                    const hmo = insuranceBreakdown.HMO?.[stageKey] || 0;
                                    const medicare = insuranceBreakdown.Medicare?.[stageKey] || 0;
                                    const total = ppo + hmo + medicare;
                                    const unknown = (medworkData[stageKey] || 0) - total;
                                    
                                    return `
                                        <div style="background: white; border-radius: 8px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                                            <div style="font-size: 11px; color: #888; margin-bottom: 8px;">${stageLabel}</div>
                                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #22c55e;"></span>
                                                    <span style="font-size: 12px; flex: 1;">PPO</span>
                                                    <span style="font-weight: bold; color: #22c55e;">${ppo}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>
                                                    <span style="font-size: 12px; flex: 1;">HMO</span>
                                                    <span style="font-weight: bold; color: #f59e0b;">${hmo}</span>
                                                </div>
                                                <div style="display: flex; align-items: center; gap: 8px;">
                                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
                                                    <span style="font-size: 12px; flex: 1;">Medicare</span>
                                                    <span style="font-weight: bold; color: #3b82f6;">${medicare}</span>
                                                </div>
                                                ${unknown > 0 ? `
                                                <div style="display: flex; align-items: center; gap: 8px; opacity: 0.5;">
                                                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #9ca3af;"></span>
                                                    <span style="font-size: 12px; flex: 1;">Unknown</span>
                                                    <span style="font-weight: bold; color: #9ca3af;">${unknown}</span>
                                                </div>
                                                ` : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
            }
            
            renderOverallJourney(platformSelect?.value || 'all');
            
            if (platformSelect) {
                platformSelect.onchange = () => renderOverallJourney(platformSelect.value);
            }
        } catch (journeyErr) {
            console.error("Overall journey load error:", journeyErr);
        }
        
        // Load monthly cost trend chart
        loadMonthlyCostTrends();
        loadCostBySourceTrends();
        
    } catch (e) {
        console.error('Error loading funnels data:', e);
    }
}

// Helper function to fetch real spend from all platforms for a date range
async function fetchPlatformSpend(startDate, endDate, idx) {
    const result = { meta: 0, google: 0, bing: 0, tiktok: 0 };
    
    try {
        // Fetch Meta spend
        const metaUrl = `${BASE_URL}/${API_VERSION}/${ACCOUNT_ID}/insights?fields=spend&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${ACCESS_TOKEN}`;
        const metaRes = await fetch(metaUrl);
        const metaData = await metaRes.json();
        if (metaData.data && metaData.data[0]) {
            result.meta = parseFloat(metaData.data[0].spend) || 0;
        }
    } catch (e) {
        console.error('Meta spend error:', e);
    }
    
    try {
        // Fetch Google spend
        const googleRes = await fetch('/api/google/account-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        const googleData = await googleRes.json();
        if (googleData && !googleData.error) {
            result.google = parseFloat(googleData.spend) || 0;
        }
    } catch (e) {
        console.error('Google spend error:', e);
    }
    
    try {
        // Fetch Bing spend
        const bingRes = await fetch('/api/bing/account-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        const bingData = await bingRes.json();
        if (bingData && !bingData.error) {
            result.bing = parseFloat(bingData.spend) || 0;
        }
    } catch (e) {
        console.error('Bing spend error:', e);
    }
    
    try {
        // Fetch TikTok spend
        const tiktokRes = await fetch('/api/tiktok/account-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        const tiktokData = await tiktokRes.json();
        if (tiktokData && !tiktokData.error) {
            result.tiktok = parseFloat(tiktokData.spend) || 0;
        }
    } catch (e) {
        console.error('TikTok spend error:', e);
    }
    
    return result;
}

// Monthly Cost Per Stage Trends Chart
let costTrendChart = null;
let costTrendWeeklyChart = null;
let costTrendDailyChart = null;
let costTrendData = null;
let costTrendWeeklyData = null;
let costTrendDailyData = null;
let costTrendSpendData = null;
let costTrendWeeklySpendData = null;
let costTrendDailySpendData = null;
let costTrendSource = 'all';
let costTrendStage = 'all';
let costTrendStartDate = null;
let costTrendEndDate = null;
let costTrendFiltersInitialized = false;

async function loadMonthlyCostTrends(startDate = null, endDate = null) {
    const container = document.getElementById('costTrendChartContainer');
    const weeklyContainer = document.getElementById('costTrendWeeklyContainer');
    const dailyContainer = document.getElementById('costTrendDailyContainer');
    const loading = document.getElementById('costTrendLoading');
    
    if (!container) return;
    
    // Use provided dates or defaults
    if (startDate !== null) costTrendStartDate = startDate;
    if (endDate !== null) costTrendEndDate = endDate;
    
    // Build API URLs
    let monthlyUrl = '/api/looker/monthly-cost-trends';
    let weeklyUrl = '/api/looker/weekly-cost-trends';
    const params = [];
    if (costTrendStartDate) params.push(`startDate=${costTrendStartDate}`);
    if (costTrendEndDate) params.push(`endDate=${costTrendEndDate}`);
    
    if (params.length > 0) {
        monthlyUrl += '?' + params.join('&');
        weeklyUrl += '?' + params.join('&');
    } else {
        // Default to last 30 days
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        costTrendStartDate = thirtyDaysAgo.toISOString().split('T')[0];
        costTrendEndDate = today.toISOString().split('T')[0];
        monthlyUrl += `?startDate=${costTrendStartDate}&endDate=${costTrendEndDate}`;
        weeklyUrl += `?startDate=${costTrendStartDate}&endDate=${costTrendEndDate}`;
    }
    
    loading.style.display = 'block';
    container.style.opacity = '0.5';
    if (weeklyContainer) weeklyContainer.style.opacity = '0.5';
    if (dailyContainer) dailyContainer.style.opacity = '0.5';
    
    // Build daily URL
    let dailyUrl = '/api/looker/daily-cost-trends';
    if (params.length > 0) {
        dailyUrl += '?' + params.join('&');
    } else {
        dailyUrl += `?startDate=${costTrendStartDate}&endDate=${costTrendEndDate}`;
    }
    
    try {
        // Fetch monthly, weekly, and daily data in parallel
        const [monthlyRes, weeklyRes, dailyRes] = await Promise.all([
            fetch(monthlyUrl),
            fetch(weeklyUrl),
            fetch(dailyUrl)
        ]);
        
        const monthlyData = await monthlyRes.json();
        const weeklyData = await weeklyRes.json();
        const dailyData = await dailyRes.json();
        
        if (!monthlyData.success) {
            throw new Error(monthlyData.error || 'Failed to load monthly data');
        }
        
        costTrendData = monthlyData;
        costTrendWeeklyData = weeklyData.success ? weeklyData : null;
        costTrendDailyData = dailyData.success ? dailyData : null;
        
        // Fetch REAL spend data from each platform for monthly periods
        costTrendSpendData = { mutm: [], g1utm: [], butm: [], tutm: [], all: [] };
        
        // Initialize arrays
        for (let i = 0; i < monthlyData.months.length; i++) {
            costTrendSpendData.mutm.push(0);
            costTrendSpendData.g1utm.push(0);
            costTrendSpendData.butm.push(0);
            costTrendSpendData.tutm.push(0);
            costTrendSpendData.all.push(0);
        }
        
        // Fetch real spend for each month from each platform
        const monthlySpendPromises = [];
        for (let i = 0; i < monthlyData.months.length; i++) {
            const period = monthlyData.periods[i]; // {start, end}
            monthlySpendPromises.push(fetchPlatformSpend(period.start, period.end, i));
        }
        
        const monthlySpendResults = await Promise.all(monthlySpendPromises);
        monthlySpendResults.forEach((spend, idx) => {
            costTrendSpendData.mutm[idx] = spend.meta;
            costTrendSpendData.g1utm[idx] = spend.google;
            costTrendSpendData.butm[idx] = spend.bing;
            costTrendSpendData.tutm[idx] = spend.tiktok;
            costTrendSpendData.all[idx] = spend.meta + spend.google + spend.bing + spend.tiktok;
        });
        
        // Fetch REAL spend data for weekly periods
        if (costTrendWeeklyData) {
            costTrendWeeklySpendData = { mutm: [], g1utm: [], butm: [], tutm: [], all: [] };
            
            for (let i = 0; i < weeklyData.weeks.length; i++) {
                costTrendWeeklySpendData.mutm.push(0);
                costTrendWeeklySpendData.g1utm.push(0);
                costTrendWeeklySpendData.butm.push(0);
                costTrendWeeklySpendData.tutm.push(0);
                costTrendWeeklySpendData.all.push(0);
            }
            
            const weeklySpendPromises = [];
            for (let i = 0; i < weeklyData.weeks.length; i++) {
                const period = weeklyData.periods[i];
                weeklySpendPromises.push(fetchPlatformSpend(period.start, period.end, i));
            }
            
            const weeklySpendResults = await Promise.all(weeklySpendPromises);
            weeklySpendResults.forEach((spend, idx) => {
                costTrendWeeklySpendData.mutm[idx] = spend.meta;
                costTrendWeeklySpendData.g1utm[idx] = spend.google;
                costTrendWeeklySpendData.butm[idx] = spend.bing;
                costTrendWeeklySpendData.tutm[idx] = spend.tiktok;
                costTrendWeeklySpendData.all[idx] = spend.meta + spend.google + spend.bing + spend.tiktok;
            });
        }
        
        // Daily spend comes from the server cache (no extra API calls needed)
        if (costTrendDailyData && costTrendDailyData.spend) {
            costTrendDailySpendData = costTrendDailyData.spend;
        } else if (costTrendDailyData) {
            // Fallback: initialize empty spend
            costTrendDailySpendData = { mutm: [], g1utm: [], butm: [], tutm: [], all: [] };
            for (let i = 0; i < dailyData.days.length; i++) {
                costTrendDailySpendData.mutm.push(0);
                costTrendDailySpendData.g1utm.push(0);
                costTrendDailySpendData.butm.push(0);
                costTrendDailySpendData.tutm.push(0);
                costTrendDailySpendData.all.push(0);
            }
        }
        
        renderCostTrendChart(costTrendSource, costTrendStage);
        renderCostTrendWeeklyChart(costTrendSource, costTrendStage);
        renderCostTrendDailyChart(costTrendSource, costTrendStage);
        
        // Setup filters (only once)
        if (!costTrendFiltersInitialized) {
            document.getElementById('costTrendSourceFilter').addEventListener('change', (e) => {
                costTrendSource = e.target.value;
                renderCostTrendChart(costTrendSource, costTrendStage);
                renderCostTrendWeeklyChart(costTrendSource, costTrendStage);
                renderCostTrendDailyChart(costTrendSource, costTrendStage);
            });
            
            document.getElementById('costTrendStageFilter').addEventListener('change', (e) => {
                costTrendStage = e.target.value;
                renderCostTrendChart(costTrendSource, costTrendStage);
                renderCostTrendWeeklyChart(costTrendSource, costTrendStage);
                renderCostTrendDailyChart(costTrendSource, costTrendStage);
            });
            
            // Initialize date pickers with default values (last 30 days)
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            document.getElementById('costTrendEndDate').value = today.toISOString().split('T')[0];
            document.getElementById('costTrendStartDate').value = thirtyDaysAgo.toISOString().split('T')[0];
            
            // Preset buttons
            document.querySelectorAll('.cost-trend-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    // Update active state
                    document.querySelectorAll('.cost-trend-preset').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'white';
                        b.style.color = '#333';
                    });
                    btn.classList.add('active');
                    btn.style.background = '#1877f2';
                    btn.style.color = 'white';
                    
                    // Calculate date range
                    const range = btn.dataset.range;
                    const today = new Date();
                    const start = new Date(today);
                    
                    if (range === '7d') start.setDate(today.getDate() - 7);
                    else if (range === '14d') start.setDate(today.getDate() - 14);
                    else if (range === '30d') start.setDate(today.getDate() - 30);
                    else if (range === '90d') start.setDate(today.getDate() - 90);
                    
                    const startStr = start.toISOString().split('T')[0];
                    const endStr = today.toISOString().split('T')[0];
                    
                    // Update date inputs
                    document.getElementById('costTrendStartDate').value = startStr;
                    document.getElementById('costTrendEndDate').value = endStr;
                    
                    // Sync filter variables with current dropdown values
                    costTrendSource = document.getElementById("costTrendSourceFilter").value;
                    costTrendStage = document.getElementById("costTrendStageFilter").value;
                    loadMonthlyCostTrends(startStr, endStr);
                });
            });
            
            document.getElementById('costTrendApplyDate').addEventListener('click', () => {
                const start = document.getElementById('costTrendStartDate').value;
                const end = document.getElementById('costTrendEndDate').value;
                
                if (!start || !end) {
                    alert('Please select both start and end dates');
                    return;
                }
                if (start > end) {
                    alert('Start date must be before end date');
                    return;
                }
                
                // Clear preset active states
                document.querySelectorAll('.cost-trend-preset').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'white';
                    b.style.color = '#333';
                });
                
                // Sync filter variables with current dropdown values
                costTrendSource = document.getElementById("costTrendSourceFilter").value;
                costTrendStage = document.getElementById("costTrendStageFilter").value;
                loadMonthlyCostTrends(start, end);
            });
            
            costTrendFiltersInitialized = true;
        }
        
        loading.style.display = 'none';
        container.style.opacity = '1';
        if (weeklyContainer) weeklyContainer.style.opacity = '1';
        if (dailyContainer) dailyContainer.style.opacity = '1';
    } catch (error) {
        console.error('Cost trend error:', error);
        loading.innerHTML = `<div class="error">Error loading trend data: ${error.message}</div>`;
        container.style.opacity = '1';
        if (weeklyContainer) weeklyContainer.style.opacity = '1';
        if (dailyContainer) dailyContainer.style.opacity = '1';
    }
}

function renderCostTrendChart(source, stage = 'all') {
    if (!costTrendData || !costTrendSpendData) return;
    
    const ctx = document.getElementById('costTrendChart').getContext('2d');
    const data = costTrendData.data[source];
    const spend = costTrendSpendData[source];
    
    // Calculate cost per stage for each month
    const stageConfig = {
        l_f_s: {
            label: 'Cost per l_f_s (LookerML)',
            data: data.l_f_s.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)'
        },
        is_booked: {
            label: 'Cost per Is Booked',
            data: data.is_booked.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)'
        },
        sent_to_verification: {
            label: 'Cost per Sent to Verif.',
            data: data.sent_to_verification.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)'
        },
        is_booked_covered: {
            label: 'Cost per Booked Covered',
            data: data.is_booked_covered.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        initial_fulfilled: {
            label: 'Cost per Fulfilled',
            data: data.initial_fulfilled.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }
    };
    
    // Build datasets based on stage filter
    let datasets;
    if (stage === 'all') {
        // Show all stages
        datasets = Object.keys(stageConfig).map(key => ({
            label: stageConfig[key].label,
            data: stageConfig[key].data,
            borderColor: stageConfig[key].borderColor,
            backgroundColor: stageConfig[key].backgroundColor,
            tension: 0.3,
            fill: false
        }));
    } else {
        // Show only selected stage
        const cfg = stageConfig[stage];
        datasets = [{
            label: cfg.label,
            data: cfg.data,
            borderColor: cfg.borderColor,
            backgroundColor: cfg.backgroundColor,
            tension: 0.3,
            fill: true
        }];
    }
    
    
    if (costTrendChart) {
        costTrendChart.destroy();
    }
    
    const sourceNames = { all: 'All Sources', mutm: 'Meta', g1utm: 'Google', butm: 'Bing', tutm: 'TikTok' };
    const stageNames = { 
        all: 'All Stages',
        l_f_s: 'l_f_s',
        is_booked: 'Is Booked',
        sent_to_verification: 'Sent to Verification',
        is_booked_covered: 'Booked Covered',
        initial_fulfilled: 'Fulfilled'
    };
    
    const titleText = stage === 'all' 
        ? `Cost Per Stage Trends - ${sourceNames[source]}`
        : `Cost Per ${stageNames[stage]} - ${sourceNames[source]}`;
    
    costTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: costTrendData.months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: titleText,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + (context.raw?.toFixed(2) || '-');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cost ($)' },
                    ticks: {
                        callback: function(value) { return '$' + value; }
                    }
                }
            }
        }
    });
}

function renderCostTrendWeeklyChart(source, stage = 'all') {
    if (!costTrendWeeklyData || !costTrendWeeklySpendData) return;
    
    const canvas = document.getElementById('costTrendWeeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = costTrendWeeklyData.data[source];
    const spend = costTrendWeeklySpendData[source];
    
    // Calculate cost per stage for each week
    const stageConfig = {
        l_f_s: {
            label: 'Cost per l_f_s (LookerML)',
            data: data.l_f_s.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)'
        },
        is_booked: {
            label: 'Cost per Is Booked',
            data: data.is_booked.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)'
        },
        sent_to_verification: {
            label: 'Cost per Sent to Verif.',
            data: data.sent_to_verification.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)'
        },
        is_booked_covered: {
            label: 'Cost per Booked Covered',
            data: data.is_booked_covered.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        initial_fulfilled: {
            label: 'Cost per Fulfilled',
            data: data.initial_fulfilled.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }
    };
    
    // Build datasets based on stage filter
    let datasets;
    if (stage === 'all') {
        datasets = Object.keys(stageConfig).map(key => ({
            label: stageConfig[key].label,
            data: stageConfig[key].data,
            borderColor: stageConfig[key].borderColor,
            backgroundColor: stageConfig[key].backgroundColor,
            tension: 0.3,
            fill: false
        }));
    } else {
        const cfg = stageConfig[stage];
        datasets = [{
            label: cfg.label,
            data: cfg.data,
            borderColor: cfg.borderColor,
            backgroundColor: cfg.backgroundColor,
            tension: 0.3,
            fill: true
        }];
    }
    
    if (costTrendWeeklyChart) {
        costTrendWeeklyChart.destroy();
    }
    
    const sourceNames = { all: 'All Sources', mutm: 'Meta', g1utm: 'Google', butm: 'Bing', tutm: 'TikTok' };
    const stageNames = { 
        all: 'All Stages',
        l_f_s: 'l_f_s',
        is_booked: 'Is Booked',
        sent_to_verification: 'Sent to Verification',
        is_booked_covered: 'Booked Covered',
        initial_fulfilled: 'Fulfilled'
    };
    
    const titleText = stage === 'all' 
        ? `Weekly Trends - ${sourceNames[source]}`
        : `${stageNames[stage]} by Week - ${sourceNames[source]}`;
    
    costTrendWeeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: costTrendWeeklyData.weeks,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: titleText,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + (context.raw?.toFixed(2) || '-');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cost ($)' },
                    ticks: {
                        callback: function(value) { return '$' + value; }
                    }
                }
            }
        }
    });
}

function renderCostTrendDailyChart(source, stage = 'all') {
    if (!costTrendDailyData || !costTrendDailySpendData) return;
    
    const canvas = document.getElementById('costTrendDailyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = costTrendDailyData.data[source];
    const spend = costTrendDailySpendData[source];
    
    const stageConfig = {
        l_f_s: {
            label: 'Cost per l_f_s (LookerML)',
            data: data.l_f_s.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)'
        },
        is_booked: {
            label: 'Cost per Is Booked',
            data: data.is_booked.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.1)'
        },
        sent_to_verification: {
            label: 'Cost per Sent to Verif.',
            data: data.sent_to_verification.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)'
        },
        is_booked_covered: {
            label: 'Cost per Booked Covered',
            data: data.is_booked_covered.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
        },
        initial_fulfilled: {
            label: 'Cost per Fulfilled',
            data: data.initial_fulfilled.map((v, i) => v > 0 ? spend[i] / v : null),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)'
        }
    };
    
    let datasets;
    if (stage === 'all') {
        datasets = Object.keys(stageConfig).map(key => ({
            label: stageConfig[key].label,
            data: stageConfig[key].data,
            borderColor: stageConfig[key].borderColor,
            backgroundColor: stageConfig[key].backgroundColor,
            tension: 0.3,
            fill: false,
            pointRadius: 2,
            yAxisID: 'y'
        }));
    } else {
        const cfg = stageConfig[stage];
        datasets = [{
            label: cfg.label,
            data: cfg.data,
            borderColor: cfg.borderColor,
            backgroundColor: cfg.backgroundColor,
            tension: 0.3,
            fill: true,
            pointRadius: 2,
            yAxisID: 'y'
        }];
    }
    
    // Add l_f_s count line on secondary axis
    const lfsCountData = data.l_f_s || [];
    datasets.push({
        label: 'Total l_f_s (LookerML)',
        data: lfsCountData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: false,
        pointRadius: 3,
        pointBackgroundColor: '#3b82f6',
        borderWidth: 2,
        borderDash: [],
        yAxisID: 'y1',
        datalabels: {
            display: true,
            color: '#3b82f6',
            anchor: 'end',
            align: 'top',
            font: { size: 10, weight: 'bold' },
            formatter: (value) => value != null ? Math.round(value) : ''
        }
    });
    
    // Add datalabels to cost datasets
    datasets.forEach(ds => {
        if (ds.yAxisID === 'y') {
            ds.datalabels = {
                display: true,
                color: ds.borderColor || '#ef4444',
                anchor: 'end',
                align: 'bottom',
                font: { size: 10 },
                formatter: (value) => value != null ? '$' + value.toFixed(0) : ''
            };
        }
    });
    
    if (costTrendDailyChart) {
        costTrendDailyChart.destroy();
    }
    
    const sourceNames = { all: 'All Sources', mutm: 'Meta', g1utm: 'Google', butm: 'Bing', tutm: 'TikTok' };
    const stageNames = { 
        all: 'All Stages',
        l_f_s: 'l_f_s',
        is_booked: 'Is Booked',
        sent_to_verification: 'Sent to Verification',
        is_booked_covered: 'Booked Covered',
        initial_fulfilled: 'Fulfilled'
    };
    
    const titleText = stage === 'all' 
        ? `Daily Trends - ${sourceNames[source]}`
        : `${stageNames[stage]} by Day - ${sourceNames[source]}`;
    
    costTrendDailyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: costTrendDailyData.days,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: titleText,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.yAxisID === 'y1') {
                                return context.dataset.label + ': ' + (context.raw || 0);
                            }
                            return context.dataset.label + ': $' + (context.raw?.toFixed(2) || '-');
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 15
                    }
                },
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: { display: true, text: 'Cost ($)' },
                    ticks: {
                        callback: function(value) { return '$' + value; }
                    }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    title: { display: true, text: 'l_f_s Count' },
                    grid: { drawOnChartArea: false },
                    ticks: {
                        callback: function(value) { return Math.round(value); }
                    }
                }
            }
        }
    });
}

// Load Medwork funnel for Funnels view
async function loadFunnelsMedworkData(startDate, endDate, spendByPlatform = {}) {
    const container = document.getElementById('funnelsMedworkContainer');
    const totalsContainer = document.getElementById('funnelsTotalFunnel');
    if (!container) {
        console.error('Medwork container not found');
        return;
    }
    
    container.innerHTML = '<div class="loading">Loading Medwork funnel data...</div>';
    
    try {
        const url = `/api/looker/leads-funnel?startDate=${startDate}&endDate=${endDate}`;
        console.log('Fetching Medwork funnel:', url);
        const response = await fetch(url);
        const result = await response.json();
        console.log('Medwork funnel result:', result);
        
        if (!result.success) {
            container.innerHTML = '<div class="loading">Error loading funnel data: ' + (result.error || 'Unknown error') + '</div>';
            return;
        }
        
        const data = result.data;
        const totals = result.totals;
        
        // Tracking type labels with logos
        const typeLabels = {
            'mutm': { name: 'Meta', color: '#4267B2', icon: '<img src="images/meta-icon.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;">' },
            'outm': { name: 'Organic', color: '#34A853', icon: '🌿' },
            'tutm': { name: 'TikTok', color: '#00f2ea', icon: '🎵' },
            'g1utm': { name: 'Google', color: '#EA4335', icon: '🔴' },
            'butm': { name: 'Bing', color: '#00A4EF', icon: '🔷' },
            'gbputm': { name: 'GBP', color: '#F4B400', icon: '📍' },
            'gbutm': { name: 'GBP', color: '#F4B400', icon: '📍' }
        };
        
        // Helper to format cost with commas (e.g., $12,222.00)
        const formatCost = (spend, count) => count > 0 ? '$' + (spend / count).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
        
        // Build funnel cards for each tracking type
        let html = '';
        Object.keys(data).forEach(type => {
            const info = typeLabels[type] || { name: type, color: '#666', icon: '📊' };
            const d = data[type];
            const spend = spendByPlatform[type] || 0;
            
            html += `
                <div class="funnel-card" style="flex: 1; min-width: 220px; max-width: 280px; background: #f8f9fa; border-radius: 12px; padding: 15px; border-top: 4px solid ${info.color};">
                    <h3 style="margin: 0 0 15px 0; color: ${info.color};">${info.icon} ${info.name}</h3>
                    <div class="mini-funnel">
                        <div class="mini-funnel-row highlight"><span>l_f_s (LookerML)</span><span>${d.l_f_s.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.l_f_s)}</span></div>
                        <div class="mini-funnel-row"><span>Is Booked</span><span>${d.is_booked.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.is_booked)}</span></div>
                        <div class="mini-funnel-row"><span>Sent to Verif.</span><span>${d.sent_to_verification.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.sent_to_verification)}</span></div>
                        <div class="mini-funnel-row"><span>Booked Covered</span><span>${d.is_booked_covered.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.is_booked_covered)}</span></div>
                        <div class="mini-funnel-row" style="background: #d4edda;"><span>Fulfilled</span><span>${d.initial_fulfilled.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.initial_fulfilled)}</span></div>
                    </div>
                    ${spend > 0 ? `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">Total Spend: <strong>$${spend.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong></div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="loading">No funnel data available</div>';
        
        // Calculate total spend for cost per stage in totals
        const totalSpend = Object.values(spendByPlatform).reduce((a, b) => a + b, 0);
        
        // Build total funnel visualization with cost per stage
        const stages = [
            { label: 'l_f_s (LookerML)', value: totals.l_f_s, color: '#6366f1' },
            { label: 'Is Booked', value: totals.is_booked, color: '#8b5cf6' },
            { label: 'Sent to Verif.', value: totals.sent_to_verification, color: '#a855f7' },
            { label: 'Booked Covered', value: totals.is_booked_covered, color: '#d946ef' },
            { label: 'Fulfilled', value: totals.initial_fulfilled, color: '#22c55e' }
        ];
        
        const maxValue = Math.max(...stages.map(s => s.value), 1);
        
        totalsContainer.innerHTML = stages.map(stage => {
            const height = Math.max((stage.value / maxValue) * 150, 20);
            const rate = totals.l_f_s > 0 ? ((stage.value / totals.l_f_s) * 100).toFixed(1) : 0;
            const costPerStage = stage.value > 0 ? '$' + (totalSpend / stage.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
            return `
                <div style="flex: 1; text-align: center;">
                    <div style="height: ${height}px; background: ${stage.color}; border-radius: 8px 8px 0 0; min-width: 60px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${stage.value}
                    </div>
                    <div style="font-size: 11px; margin-top: 5px; color: #666;">${stage.label}</div>
                    <div style="font-size: 10px; color: #999;">${rate}%</div>
                    <div style="font-size: 10px; color: #2196F3; font-weight: 500;">${costPerStage}</div>
                </div>
            `;
        }).join('');
        
    } catch (e) {
        console.error('Error loading Medwork funnel for Funnels view:', e);
        container.innerHTML = '<div class="loading">Error: ' + e.message + '</div>';
    }
}

// Render Funnels Comparison Chart
function renderFunnelsComparisonChart(data) {
    const ctx = document.getElementById('funnelsComparisonChart');
    if (!ctx) return;
    
    if (funnelsComparisonChart) funnelsComparisonChart.destroy();
    
    funnelsComparisonChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Meta', 'Google', 'Bing'],
            datasets: [
                {
                    label: 'Results',
                    data: [data.meta.results, data.google.results, data.bing.results],
                    backgroundColor: ['rgba(66, 103, 178, 0.7)', 'rgba(234, 67, 53, 0.7)', 'rgba(0, 164, 239, 0.7)'],
                    borderColor: ['#4267B2', '#EA4335', '#00A4EF'],
                    borderWidth: 1
                },
                {
                    label: 'l_f_s',
                    data: [data.meta.lfs, data.google.lfs, data.bing.lfs],
                    backgroundColor: ['rgba(66, 103, 178, 0.4)', 'rgba(234, 67, 53, 0.4)', 'rgba(0, 164, 239, 0.4)'],
                    borderColor: ['#4267B2', '#EA4335', '#00A4EF'],
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Results vs l_f_s (LookerML) by Platform' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function loadSummaryData() {
    document.getElementById('summaryDailyBody').innerHTML = '<tr><td colspan="11" class="loading">Loading summary data...</td></tr>';
    document.getElementById('summaryWeeklyBody').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
    document.getElementById('summaryMonthlyBody').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
    
    try {
        // Get date range based on current filter
        const range = dateRanges[currentRange];
        const today = getESTDate();
        const dates = [];
        
        let startDate, endDate;
        
        // Determine number of days based on current range
        let numDays = range.days || 14;
        
        // Handle custom date range
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
            // Generate dates array for custom range
            const start = new Date(customStartDate + 'T12:00:00');
            const end = new Date(customEndDate + 'T12:00:00');
            for (let d = new Date(end); d >= start; d.setDate(d.getDate() - 1)) {
                dates.push(formatDateEST(new Date(d)));
            }
            numDays = dates.length;
        } else {
            if (range.preset === 'today') numDays = 1;
            if (range.preset === 'yesterday') numDays = 1;
            
            // For today/yesterday, adjust the start date
            let startOffset = 0;
            if (range.preset === 'yesterday') startOffset = 1;
            
            for (let i = startOffset; i < numDays + startOffset; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                dates.push(formatDateEST(d));
            }
            
            startDate = dates[dates.length - 1];
            endDate = dates[0];
        }
        
        // Fetch daily data from API (Google + Bing)
        const dailyResponse = await fetch('/api/summary/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        const dailyData = await dailyResponse.json();
        
        // Fetch Meta daily data directly (with results)
        let metaByDate = {};
        let metaConvByDate = {};
        try {
            const metaUrl = `${BASE_URL}/${API_VERSION}/${ACCOUNT_ID}/insights?fields=spend,actions&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${ACCESS_TOKEN}`;
            const metaResponse = await fetch(metaUrl);
            const metaData = await metaResponse.json();
            if (metaData.data) {
                metaData.data.forEach(row => {
                    metaByDate[row.date_start] = parseFloat(row.spend) || 0;
                    // Use same getResults() function as Meta Campaigns page for consistency
                    metaConvByDate[row.date_start] = getResults(row.actions);
                });
            }
        } catch (e) {
            console.error('Meta summary error:', e);
        }
        
        // Fetch TikTok daily data
        let tiktokByDate = {};
        let tiktokConvByDate = {};
        try {
            const tiktokResponse = await fetch('/api/tiktok/daily-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });
            const tiktokData = await tiktokResponse.json();
            if (tiktokData && tiktokData.rows) {
                tiktokData.rows.forEach(row => {
                    const dateStr = (row.date || '').split('T')[0].split(' ')[0];
                    tiktokByDate[dateStr] = parseFloat(row.spend) || 0;
                    tiktokConvByDate[dateStr] = parseInt(row.conversions) || 0;
                });
            }
        } catch (e) {
            console.error('TikTok summary error:', e);
        }
        
        // Build daily map
        const googleByDate = {};
        const googleConvByDate = {};
        const bingByDate = {};
        const bingConvByDate = {};
        
        (dailyData.google || []).forEach(row => {
            googleByDate[row.date] = row.spend;
            googleConvByDate[row.date] = row.conversions || 0;
        });
        (dailyData.bing || []).forEach(row => {
            // Bing dates might be formatted differently
            const dateStr = row.date?.split('T')[0] || row.date;
            bingByDate[dateStr] = row.spend;
            bingConvByDate[dateStr] = row.conversions || 0;
        });
        
        // Build daily table
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let dailyHtml = '';
        let totalMeta = 0, totalGoogle = 0, totalBing = 0, totalTiktok = 0;
        let totalMetaConv = 0, totalGoogleConv = 0, totalBingConv = 0, totalTiktokConv = 0;
        
        dates.forEach(date => {
            const d = new Date(date + 'T12:00:00');
            const dayName = dayNames[d.getDay()];
            const meta = metaByDate[date] || 0;
            const google = googleByDate[date] || 0;
            const bing = bingByDate[date] || 0;
            const tiktok = tiktokByDate[date] || 0;
            const total = meta + google + bing + tiktok;
            
            const metaConv = metaConvByDate[date] || 0;
            const googleConv = googleConvByDate[date] || 0;
            const bingConv = bingConvByDate[date] || 0;
            const tiktokConv = tiktokConvByDate[date] || 0;
            const totalConv = metaConv + googleConv + bingConv + tiktokConv;
            
            totalMeta += meta;
            totalGoogle += google;
            totalBing += bing;
            totalTiktok += tiktok;
            totalMetaConv += metaConv;
            totalGoogleConv += googleConv;
            totalBingConv += bingConv;
            totalTiktokConv += tiktokConv;
            
            dailyHtml += `
                <tr>
                    <td>${date}</td>
                    <td>${dayName}</td>
                    <td>${meta > 0 ? '$' + meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${metaConv.toFixed(1)}</td>
                    <td>${google > 0 ? '$' + google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${googleConv.toFixed(1)}</td>
                    <td>${bing > 0 ? '$' + bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${bingConv.toFixed(1)}</td>
                    <td>${tiktok > 0 ? '$' + tiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${tiktokConv.toFixed(1)}</td>
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td><strong>${totalConv.toFixed(1)}</strong></td>
                </tr>
            `;
        });
        
        document.getElementById('summaryDailyBody').innerHTML = dailyHtml;
        
        // Add totals row
        const grandTotal = totalMeta + totalGoogle + totalBing + totalTiktok;
        const grandTotalConvDaily = totalMetaConv + totalGoogleConv + totalBingConv + totalTiktokConv;
        const rangeLabel = range.preset === 'today' ? 'Today' : 
                          range.preset === 'yesterday' ? 'Yesterday' : 
                          `${numDays}-Day Total`;
        document.getElementById('summaryDailyFoot').innerHTML = `
            <tr class="total-row">
                <td><strong>${rangeLabel}</strong></td>
                <td></td>
                <td><strong>$${totalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${totalMetaConv.toFixed(1)}</strong></td>
                <td><strong>$${totalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${totalGoogleConv.toFixed(1)}</strong></td>
                <td><strong>$${totalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${totalBingConv.toFixed(1)}</strong></td>
                <td><strong>$${totalTiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${totalTiktokConv.toFixed(1)}</strong></td>
                <td><strong>$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${grandTotalConvDaily.toFixed(1)}</strong></td>
            </tr>
        `;
        
        // Update KPI cards
        const grandTotalConv = totalMetaConv + totalGoogleConv + totalBingConv + totalTiktokConv;
        document.getElementById('summaryTotalSpend').textContent = '$' + grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryTotalConversions').textContent = grandTotalConv.toFixed(1);
        document.getElementById('summaryMetaSpend').textContent = '$' + totalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryMetaConversions').textContent = totalMetaConv.toFixed(1);
        document.getElementById('summaryGoogleSpend').textContent = '$' + totalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryGoogleConversions').textContent = totalGoogleConv.toFixed(1);
        document.getElementById('summaryBingSpend').textContent = '$' + totalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryBingConversions').textContent = totalBingConv.toFixed(1);
        document.getElementById('summaryTiktokSpend').textContent = '$' + totalTiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryTiktokConversions').textContent = totalTiktokConv.toFixed(1);
        
        // Weekly breakdown
        const weeklyPeriods = [
            { name: 'Last 7 Days', startDate: dates[6], endDate: dates[0] },
            { name: '7-14 Days Ago', startDate: dates[13], endDate: dates[7] }
        ];
        
        // Monthly breakdown - current and last month
        const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        
        const monthlyPeriods = [
            { 
                name: currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                startDate: formatDateEST(currentMonth),
                endDate: formatDateEST(today)
            },
            {
                name: lastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
                startDate: formatDateEST(lastMonth),
                endDate: formatDateEST(lastDayLastMonth)
            }
        ];
        
        // Fetch aggregated data (Google + Bing from server)
        const aggregatedResponse = await fetch('/api/summary/aggregated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periods: [...weeklyPeriods, ...monthlyPeriods] })
        });
        const aggregatedData = await aggregatedResponse.json();
        
        // Fetch Meta aggregated data for each period
        const allPeriods = [...weeklyPeriods, ...monthlyPeriods];
        for (let i = 0; i < allPeriods.length; i++) {
            // Skip if aggregatedData doesn't have this index (server may have skipped periods)
            if (!aggregatedData[i]) continue;
            try {
                const metaUrl = `${BASE_URL}/${API_VERSION}/${ACCOUNT_ID}/insights?fields=spend&time_range={"since":"${allPeriods[i].startDate}","until":"${allPeriods[i].endDate}"}&access_token=${ACCESS_TOKEN}`;
                const metaResponse = await fetch(metaUrl);
                const metaData = await metaResponse.json();
                if (metaData.data && metaData.data[0]) {
                    aggregatedData[i].meta = parseFloat(metaData.data[0].spend) || 0;
                }
            } catch (e) {
                console.error('Meta aggregated error:', e);
            }
        }
        
        // Weekly table
        let weeklyHtml = '';
        let weeklyTotalMeta = 0, weeklyTotalGoogle = 0, weeklyTotalBing = 0, weeklyTotalTiktok = 0;
        
        aggregatedData.slice(0, 2).forEach(row => {
            const tiktok = row.tiktok || 0;
            const total = row.meta + row.google + row.bing + tiktok;
            weeklyTotalMeta += row.meta;
            weeklyTotalGoogle += row.google;
            weeklyTotalBing += row.bing;
            weeklyTotalTiktok += tiktok;
            
            weeklyHtml += `
                <tr>
                    <td>${row.name}</td>
                    <td>${row.meta > 0 ? '$' + row.meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.google > 0 ? '$' + row.google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.bing > 0 ? '$' + row.bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${tiktok > 0 ? '$' + tiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                </tr>
            `;
        });
        
        const weeklyGrandTotal = weeklyTotalMeta + weeklyTotalGoogle + weeklyTotalBing + weeklyTotalTiktok;
        weeklyHtml += `
            <tr class="total-row">
                <td><strong>2-Week Total</strong></td>
                <td><strong>$${weeklyTotalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyTotalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyTotalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyTotalTiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
        `;
        document.getElementById('summaryWeeklyBody').innerHTML = weeklyHtml;
        
        // Monthly table
        let monthlyHtml = '';
        let monthlyTotalMeta = 0, monthlyTotalGoogle = 0, monthlyTotalBing = 0, monthlyTotalTiktok = 0;
        
        aggregatedData.slice(2).forEach(row => {
            const tiktok = row.tiktok || 0;
            const total = row.meta + row.google + row.bing + tiktok;
            monthlyTotalMeta += row.meta;
            monthlyTotalGoogle += row.google;
            monthlyTotalBing += row.bing;
            monthlyTotalTiktok += tiktok;
            
            monthlyHtml += `
                <tr>
                    <td>${row.name}</td>
                    <td>${row.meta > 0 ? '$' + row.meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.google > 0 ? '$' + row.google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.bing > 0 ? '$' + row.bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${tiktok > 0 ? '$' + tiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                </tr>
            `;
        });
        
        const monthlyGrandTotal = monthlyTotalMeta + monthlyTotalGoogle + monthlyTotalBing + monthlyTotalTiktok;
        monthlyHtml += `
            <tr class="total-row">
                <td><strong>Grand Total</strong></td>
                <td><strong>$${monthlyTotalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyTotalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyTotalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyTotalTiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
        `;
        document.getElementById('summaryMonthlyBody').innerHTML = monthlyHtml;
        
        // Load State Spend Breakdown
        await loadStateSpend(startDate, endDate);
        
        summaryDataLoaded = true;
        updateLastUpdated();
        
    } catch (error) {
        console.error('Summary error:', error);
        document.getElementById('summaryDailyBody').innerHTML = '<tr><td colspan="11" class="error">Error loading summary data</td></tr>';
    }
}

// Load State Spend Breakdown
async function loadStateSpend(startDate, endDate) {
    const tbody = document.getElementById('summaryStateBody');
    const tfoot = document.getElementById('summaryStateFoot');
    
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Loading state data...</td></tr>';
    
    try {
        // VTC states we care about
        const vtcStates = ['New York', 'New Jersey', 'California', 'Texas', 'Maryland', 'Connecticut'];
        // DMV states (DC/Virginia) that count towards Maryland
        const dmvStates = ['Virginia', 'Washington, District of Columbia'];
        const stateAbbrev = {
            'New York': 'NY', 'New Jersey': 'NJ', 'California': 'CA', 
            'Texas': 'TX', 'Maryland': 'MD', 'Connecticut': 'CT'
        };
        
        // Initialize state data
        const stateData = {};
        vtcStates.forEach(state => {
            stateData[state] = { meta: 0, google: 0, bing: 0, tiktok: 0, total: 0 };
        });
        stateData['Other'] = { meta: 0, google: 0, bing: 0, tiktok: 0, total: 0 };
        
        // Fetch Meta geographic data
        try {
            const metaUrl = `${BASE_URL}/${API_VERSION}/${ACCOUNT_ID}/insights?fields=spend&breakdowns=region&time_range={"since":"${startDate}","until":"${endDate}"}&limit=500&access_token=${ACCESS_TOKEN}`;
            const metaRes = await fetch(metaUrl);
            const metaData = await metaRes.json();
            
            if (metaData.data) {
                metaData.data.forEach(row => {
                    const region = row.region || 'Unknown';
                    const spend = parseFloat(row.spend) || 0;
                    
                    if (vtcStates.includes(region)) {
                        stateData[region].meta += spend;
                    } else if (dmvStates.includes(region)) {
                        stateData['Maryland'].meta += spend;
                    } else {
                        stateData['Other'].meta += spend;
                    }
                });
            }
        } catch (e) {
            console.error('Meta state spend error:', e);
        }
        
        // Fetch Bing geographic data
        try {
            const bingRes = await fetch('/api/bing/geographic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });
            const bingData = await bingRes.json();
            
            if (bingData.locations) {
                bingData.locations.forEach(row => {
                    const state = row.state || row.location || 'Unknown';
                    const spend = parseFloat(row.cost) || 0;
                    
                    // Match state name
                    const matchedState = vtcStates.find(s => 
                        state.includes(s) || s.includes(state) ||
                        state === stateAbbrev[s]
                    );
                    
                    if (matchedState) {
                        stateData[matchedState].bing += spend;
                    } else if (state.includes('Virginia') || state.includes('District of Columbia') || state === 'VA' || state === 'DC') {
                        stateData['Maryland'].bing += spend;
                    } else {
                        stateData['Other'].bing += spend;
                    }
                });
            }
        } catch (e) {
            console.error('Bing state spend error:', e);
        }
        
        // Fetch Google geographic data
        try {
            const googleRes = await fetch('/api/google/geographic-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });
            const googleData = await googleRes.json();
            
            if (googleData.locations) {
                googleData.locations.forEach(row => {
                    // Parse state from canonicalName
                    // geographic_view format: "State,United States" or "Region,State,United States"
                    let state = 'Unknown';
                    if (row.canonicalName) {
                        const parts = row.canonicalName.split(',').map(p => p.trim());
                        // Check each part against VTC states (state could be at any position)
                        const foundState = parts.find(p => vtcStates.includes(p) || 
                            dmvStates.includes(p) || p === 'Virginia' || p === 'District of Columbia');
                        state = foundState || parts[0] || 'Unknown';
                    } else {
                        state = row.name || row.state || row.location || 'Unknown';
                    }
                    const spend = parseFloat(row.cost) || 0;
                    
                    const matchedState = vtcStates.find(s => 
                        state.includes(s) || s.includes(state) ||
                        state === stateAbbrev[s]
                    );
                    
                    if (matchedState) {
                        stateData[matchedState].google += spend;
                    } else if (state.includes('Virginia') || state.includes('District of Columbia') || state === 'VA' || state === 'DC') {
                        stateData['Maryland'].google += spend;
                    } else {
                        stateData['Other'].google += spend;
                    }
                });
            }
        } catch (e) {
            console.error('Google state spend error:', e);
        }
        
        // Fetch TikTok geographic data
        try {
            const tiktokRes = await fetch('/api/tiktok/geographic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            });
            const tiktokData = await tiktokRes.json();
            
            if (tiktokData.locations) {
                tiktokData.locations.forEach(row => {
                    const state = row.state || 'Unknown';
                    const spend = parseFloat(row.cost) || 0;
                    
                    const matchedState = vtcStates.find(s => 
                        state.includes(s) || s.includes(state) ||
                        state === stateAbbrev[s]
                    );
                    
                    if (matchedState) {
                        stateData[matchedState].tiktok += spend;
                    } else if (state.includes('Virginia') || state.includes('District of Columbia') || state === 'VA' || state === 'DC') {
                        stateData['Maryland'].tiktok += spend;
                    } else {
                        stateData['Other'].tiktok += spend;
                    }
                });
            }
        } catch (e) {
            console.error('TikTok state spend error:', e);
        }
        
        // Calculate totals
        let grandTotal = 0;
        Object.keys(stateData).forEach(state => {
            stateData[state].total = stateData[state].meta + stateData[state].google + stateData[state].bing + stateData[state].tiktok;
            grandTotal += stateData[state].total;
        });
        
        // Sort by total spend descending
        const sortedStates = Object.keys(stateData)
            .filter(s => s !== 'Other')
            .sort((a, b) => stateData[b].total - stateData[a].total);
        sortedStates.push('Other'); // Add Other at the end
        
        // Render table
        let html = '';
        let totalMeta = 0, totalGoogle = 0, totalBing = 0, totalTiktok = 0;
        
        sortedStates.forEach(state => {
            const data = stateData[state];
            if (data.total === 0 && state === 'Other') return; // Skip if no other spend
            
            const pct = grandTotal > 0 ? (data.total / grandTotal * 100).toFixed(1) : 0;
            const displayName = state === 'Other' ? 'Other States' : `${stateAbbrev[state] || state}`;
            
            totalMeta += data.meta;
            totalGoogle += data.google;
            totalBing += data.bing;
            totalTiktok += data.tiktok;
            
            html += `
                <tr>
                    <td><strong>${displayName}</strong></td>
                    <td>$${data.meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>$${data.google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>$${data.bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td>$${data.tiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td><strong>$${data.total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td>${pct}%</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="7">No state data available</td></tr>';
        
        // Add totals row
        tfoot.innerHTML = `
            <tr class="total-row">
                <td><strong>Total</strong></td>
                <td><strong>$${totalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${totalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${totalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${totalTiktok.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>100%</strong></td>
            </tr>
        `;
        
    } catch (error) {
        console.error('State spend error:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error">Error loading state data</td></tr>';
    }
}

// ==================== Bing Functions ====================

// Main Bing data loading function
async function loadBingData() {
    document.getElementById('bingCampaignBody').innerHTML = '<tr><td colspan="8" class="loading">Loading Bing data...</td></tr>';
    document.getElementById('bingDailyBody').innerHTML = '<tr><td colspan="12" class="loading">Loading...</td></tr>';

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
    document.getElementById('bingDailyBody').innerHTML = `<tr><td colspan="12" class="loading">${errorMsg}</td></tr>`;
    
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
        `<tr><td colspan="12" class="loading">${message}</td></tr>`;
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
            
            // Update Bing funnel
            updateBingFunnel(impressions, clicks, conversions);
        }
    } catch (e) { 
        console.error('Bing KPI error:', e);
        throw e;
    }
}

async function updateBingFunnel(impressions, clicks, conversions) {
    // Update Bing metrics in funnel
    document.getElementById('bingFunnelImpressions').textContent = impressions.toLocaleString();
    document.getElementById('bingFunnelClicks').textContent = clicks.toLocaleString();
    document.getElementById('bingFunnelConversions').textContent = Math.round(conversions).toLocaleString();
    
    // Calculate rates
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;
    document.getElementById('bingFunnelCtr').textContent = ctr + '% CTR';
    document.getElementById('bingFunnelConvRate').textContent = convRate + '% conv rate';
    
    // Fetch l_f_s data for Bing
    try {
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        const response = await fetch(`/api/ours-privacy/lfs-by-platform?platform=bing&startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();
        
        const lfsCount = data.total || 0;
        document.getElementById('bingFunnelLfs').textContent = lfsCount.toLocaleString();
        
        const lfsRate = conversions > 0 ? ((lfsCount / conversions) * 100).toFixed(1) : 0;
        document.getElementById('bingFunnelLfsRate').textContent = lfsRate + '% of conv';
        
        // Update funnel bar widths
        const funnelSteps = document.querySelectorAll('#bingView .funnel-step');
        if (funnelSteps.length >= 4) {
            funnelSteps[0].style.setProperty('--step-width', '100%');
            funnelSteps[1].style.setProperty('--step-width', clicks > 0 ? '70%' : '10%');
            const maxLower = Math.max(conversions, lfsCount, 1);
            const resultsWidth = conversions > 0 ? Math.max((conversions / maxLower) * 45, 15) : 10;
            const lfsWidth = lfsCount > 0 ? Math.max((lfsCount / maxLower) * 45, 15) : 10;
            funnelSteps[2].style.setProperty('--step-width', resultsWidth + '%');
            funnelSteps[3].style.setProperty('--step-width', lfsWidth + '%');
        }
    } catch (e) {
        console.error('Error fetching Bing l_f_s:', e);
        document.getElementById('bingFunnelLfs').textContent = '-';
        document.getElementById('bingFunnelLfsRate').textContent = '';
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
        // Fetch Bing data, Looker l_f_s, and Ours Privacy l_f_s in parallel
        const [data, lfsResponse, oursLfsResponse] = await Promise.all([
            bingApiCall('daily-performance', {
                startDate: dateRange.since,
                endDate: dateRange.until
            }),
            fetch(`/api/ours-privacy/lfs-by-date?platform=bing&startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json()),
            fetch(`/api/ours-privacy/lfs-daily-breakdown?startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};
        const oursLfsByDate = oursLfsResponse.byDate || {};

        const tbody = document.getElementById('bingDailyBody');
        
        if (!data?.rows || data.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" class="loading">No daily data for this period</td></tr>';
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
            const lfs = lfsByDate[day.normalizedDate] || 0;
            const oursLfsDay = oursLfsByDate[day.normalizedDate];
            const oursLfs = oursLfsDay ? (oursLfsDay.bing || 0) : 0;
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            const costPerOursLfs = oursLfs > 0 ? '$' + (spend / oursLfs).toFixed(2) : '-';
            
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
                    <td>${lfs}</td>
                    <td>${costPerLfs}</td>
                    <td>${oursLfs}</td>
                    <td>${costPerOursLfs}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Bing Daily error:', e);
        document.getElementById('bingDailyBody').innerHTML = `<tr><td colspan="13" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// =====================================================
// GOOGLE ADS INTEGRATION (via Google Sheets)
// =====================================================

// Get date range for Google API (YYYY-MM-DD format)
function getGoogleDateRange(range) {
    const today = getESTDate();
    let since, until;
    
    if (range.custom && customStartDate && customEndDate) {
        since = customStartDate;
        until = customEndDate;
    } else if (range.preset === 'today') {
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

// Main Google data loading function
async function loadGoogleData() {
    document.getElementById('googleCampaignBody').innerHTML = '<tr><td colspan="8" class="loading">Loading Google Ads data...</td></tr>';
    document.getElementById('googleDailyBody').innerHTML = '<tr><td colspan="12" class="loading">Loading...</td></tr>';
    document.getElementById('googleKeywordBody').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadGoogleKPIs(),
            loadGoogleChartData(),
            loadGoogleCampaignData(),
            loadGoogleDailyData(),
            loadGoogleKeywordData()
        ]);
        googleDataLoaded = true;
        updateLastUpdated();
    } catch (error) {
        console.error('Google data error:', error);
        showGoogleLoadingError('Error loading Google Ads data: ' + error.message);
    }
}

// Show error message for Google
function showGoogleLoadingError(errorMsg) {
    const message = `
        <tr>
            <td colspan="8" class="loading">
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 10px;">⚠️ Error Loading Google Ads Data</h3>
                    <p style="color: #65676b;">${errorMsg}</p>
                </div>
            </td>
        </tr>
    `;
    document.getElementById('googleCampaignBody').innerHTML = message;
    document.getElementById('googleDailyBody').innerHTML = `<tr><td colspan="12" class="loading">${errorMsg}</td></tr>`;
    document.getElementById('googleKeywordBody').innerHTML = `<tr><td colspan="5" class="loading">${errorMsg}</td></tr>`;
    
    // Reset KPIs
    document.getElementById('googleTotalSpend').textContent = '$0.00';
    document.getElementById('googleTotalConversions').textContent = '0';
    document.getElementById('googleCostPerConversion').textContent = '$0.00';
    document.getElementById('googleCpc').textContent = '$0.00';
    document.getElementById('googleCtr').textContent = '0.00%';
    document.getElementById('googleImpressions').textContent = '0';
    
    // Show empty charts
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);
    renderGoogleSpendChart(days, new Array(range.days).fill(0));
    renderGoogleConversionsChart(days, new Array(range.days).fill(0));
}

// Google API call helper - calls the backend proxy
async function googleApiCall(endpoint, params = {}) {
    const response = await fetch(`/api/google/${endpoint}`, {
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

// Load Google KPIs
async function loadGoogleKPIs() {
    const range = dateRanges[currentRange];
    const dateRange = getGoogleDateRange(range);
    
    try {
        const data = await googleApiCall('account-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        if (data) {
            const spend = parseFloat(data.spend || 0);
            const impressions = parseInt(data.impressions || 0);
            const clicks = parseInt(data.clicks || 0);
            const conversions = parseFloat(data.conversions || 0);

            document.getElementById('googleTotalSpend').textContent = '$' + spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('googleTotalConversions').textContent = Math.round(conversions).toLocaleString();
            document.getElementById('googleCostPerConversion').textContent = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            document.getElementById('googleCpc').textContent = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            document.getElementById('googleCtr').textContent = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '-';
            document.getElementById('googleImpressions').textContent = impressions.toLocaleString();
            
            // Update Google funnel
            updateGoogleFunnel(impressions, clicks, conversions);
        }
    } catch (e) { 
        console.error('Google KPI error:', e);
        throw e;
    }
}

async function updateGoogleFunnel(impressions, clicks, conversions) {
    // Update Google metrics in funnel
    document.getElementById('googleFunnelImpressions').textContent = impressions.toLocaleString();
    document.getElementById('googleFunnelClicks').textContent = clicks.toLocaleString();
    document.getElementById('googleFunnelConversions').textContent = Math.round(conversions).toLocaleString();
    
    // Calculate rates
    const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
    const convRate = clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : 0;
    document.getElementById('googleFunnelCtr').textContent = ctr + '% CTR';
    document.getElementById('googleFunnelConvRate').textContent = convRate + '% conv rate';
    
    // Fetch l_f_s data for Google
    try {
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = new Date();
            const end = new Date(today);
            const start = new Date(today);
            if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        const response = await fetch(`/api/ours-privacy/lfs-by-platform?platform=google&startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();
        
        const lfsCount = data.total || 0;
        document.getElementById('googleFunnelLfs').textContent = lfsCount.toLocaleString();
        
        const lfsRate = conversions > 0 ? ((lfsCount / conversions) * 100).toFixed(1) : 0;
        document.getElementById('googleFunnelLfsRate').textContent = lfsRate + '% of conv';
        
        // Update funnel bar widths
        const funnelSteps = document.querySelectorAll('#googleView .funnel-step');
        if (funnelSteps.length >= 4) {
            funnelSteps[0].style.setProperty('--step-width', '100%');
            funnelSteps[1].style.setProperty('--step-width', clicks > 0 ? '70%' : '10%');
            const maxLower = Math.max(conversions, lfsCount, 1);
            const resultsWidth = conversions > 0 ? Math.max((conversions / maxLower) * 45, 15) : 10;
            const lfsWidth = lfsCount > 0 ? Math.max((lfsCount / maxLower) * 45, 15) : 10;
            funnelSteps[2].style.setProperty('--step-width', resultsWidth + '%');
            funnelSteps[3].style.setProperty('--step-width', lfsWidth + '%');
        }
    } catch (e) {
        console.error('Error fetching Google l_f_s:', e);
        document.getElementById('googleFunnelLfs').textContent = '-';
        document.getElementById('googleFunnelLfsRate').textContent = '';
    }
}

// Load Google Chart Data
async function loadGoogleChartData() {
    const range = dateRanges[currentRange];
    const days = getDaysArray(range.days);

    try {
        const dateRange = getGoogleDateRange(range);
        const data = await googleApiCall('daily-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        const dailySpend = new Array(range.days).fill(0);
        const dailyConversions = new Array(range.days).fill(0);

        if (data && data.rows) {
            const dataByDate = {};
            data.rows.forEach(row => {
                dataByDate[row.date] = row;
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

        renderGoogleSpendChart(days, dailySpend);
        renderGoogleConversionsChart(days, dailyConversions);
    } catch (e) { 
        console.error('Google Chart error:', e);
        renderGoogleSpendChart(days, new Array(range.days).fill(0));
        renderGoogleConversionsChart(days, new Array(range.days).fill(0));
    }
}

// Render Google Spend Chart
function renderGoogleSpendChart(labels, data) {
    const ctx = document.getElementById('googleSpendChart').getContext('2d');
    if (googleSpendChart) googleSpendChart.destroy();
    
    googleSpendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Daily Spend ($)',
                data,
                borderColor: '#ea4335',  // Google red
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ea4335',
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

// Render Google Conversions Chart
function renderGoogleConversionsChart(labels, data) {
    const ctx = document.getElementById('googleConversionsChart').getContext('2d');
    if (googleConversionsChart) googleConversionsChart.destroy();
    
    googleConversionsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Conversions',
                data,
                backgroundColor: 'rgba(234, 67, 53, 0.8)',  // Google red
                borderColor: '#ea4335',
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

// Load Google Campaign Data
async function loadGoogleCampaignData() {
    const range = dateRanges[currentRange];
    const dateRange = getGoogleDateRange(range);

    try {
        const data = await googleApiCall('campaign-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });

        const campaigns = data?.campaigns || [];
        const tbody = document.getElementById('googleCampaignBody');
        
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
        console.error('Google Campaign error:', e);
        document.getElementById('googleCampaignBody').innerHTML = `<tr><td colspan="8" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Load Google Daily Data
async function loadGoogleDailyData() {
    const range = dateRanges[currentRange];
    const dateRange = getGoogleDateRange(range);

    try {
        // Fetch Google data, Looker l_f_s, and Ours Privacy l_f_s in parallel
        const [data, lfsResponse, oursLfsResponse] = await Promise.all([
            googleApiCall('daily-performance', {
                startDate: dateRange.since,
                endDate: dateRange.until
            }),
            fetch(`/api/ours-privacy/lfs-by-date?platform=google&startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json()),
            fetch(`/api/ours-privacy/lfs-daily-breakdown?startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};
        const oursLfsByDate = oursLfsResponse.byDate || {};

        const tbody = document.getElementById('googleDailyBody');
        
        if (!data?.rows || data.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" class="loading">No daily data for this period</td></tr>';
            return;
        }

        // Sort by date descending
        const sortedData = data.rows.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sortedData.map(day => {
            const spend = parseFloat(day.spend || 0);
            const impressions = parseInt(day.impressions || 0);
            const clicks = parseInt(day.clicks || 0);
            const conversions = Math.round(parseFloat(day.conversions || 0));
            const lfs = lfsByDate[day.date] || 0;
            const oursLfsDay = oursLfsByDate[day.date];
            const oursLfs = oursLfsDay ? (oursLfsDay.google || 0) : 0;
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            const costPerOursLfs = oursLfs > 0 ? '$' + (spend / oursLfs).toFixed(2) : '-';
            
            // Parse date
            const dateParts = day.date.split('-');
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
                    <td>${lfs}</td>
                    <td>${costPerLfs}</td>
                    <td>${oursLfs}</td>
                    <td>${costPerOursLfs}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Google Daily error:', e);
        document.getElementById('googleDailyBody').innerHTML = `<tr><td colspan="13" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Load Google Keyword Data (simple view on Google Campaigns page)
async function loadGoogleKeywordData() {
    try {
        const range = dateRanges[currentRange];
        const dateRange = getGoogleDateRange(range);
        
        const data = await googleApiCall('keyword-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });

        const tbody = document.getElementById('googleKeywordBody');
        const keywords = data?.keywords || [];
        
        if (keywords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="loading">No keyword data available</td></tr>';
            return;
        }

        // Sort by clicks descending
        keywords.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));

        // Show top 20
        tbody.innerHTML = keywords.slice(0, 20).map(kw => {
            const qualityScore = kw.qualityScore ? kw.qualityScore : '-';
            const qsClass = kw.qualityScore >= 7 ? 'qs-good' : (kw.qualityScore >= 5 ? 'qs-ok' : 'qs-low');
            
            return `
                <tr>
                    <td>${kw.keyword}</td>
                    <td class="${qsClass}">${qualityScore}</td>
                    <td>${(kw.clicks || 0).toLocaleString()}</td>
                    <td>$${(kw.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td>$${(kw.cpc || 0).toFixed(2)}</td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Google Keyword error:', e);
        document.getElementById('googleKeywordBody').innerHTML = `<tr><td colspan="5" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Load Google Keywords Data (detailed Keywords tab)
async function loadGoogleKeywordsData() {
    document.getElementById('keywordsFullBody').innerHTML = '<tr><td colspan="12" class="loading">Loading keywords...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getGoogleDateRange(range);
        
        const data = await googleApiCall('keyword-performance-full', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        const keywords = data?.keywords || [];
        
        if (keywords.length === 0) {
            document.getElementById('keywordsFullBody').innerHTML = '<tr><td colspan="12" class="loading">No keyword data available</td></tr>';
            return;
        }

        // Store raw data for sorting
        keywordsRawData = keywords.map(kw => ({
            ...kw,
            ctr: kw.impressions > 0 ? (kw.clicks / kw.impressions) * 100 : 0,
            costPerConv: kw.conversions > 0 ? kw.cost / kw.conversions : 0
        }));
        
        // Calculate totals for KPI cards
        let totalClicks = 0, totalCost = 0, totalImpressions = 0, totalConversions = 0;
        let qsSum = 0, qsCount = 0;
        
        keywords.forEach(kw => {
            totalClicks += kw.clicks || 0;
            totalCost += kw.cost || 0;
            totalImpressions += kw.impressions || 0;
            totalConversions += kw.conversions || 0;
            if (kw.qualityScore) {
                qsSum += kw.qualityScore;
                qsCount++;
            }
        });
        
        // Update KPI cards
        document.getElementById('keywordsTotalCount').textContent = keywords.length.toLocaleString();
        document.getElementById('keywordsTotalClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('keywordsTotalCost').textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('keywordsAvgCpc').textContent = totalClicks > 0 ? '$' + (totalCost / totalClicks).toFixed(2) : '$0.00';
        document.getElementById('keywordsAvgQs').textContent = qsCount > 0 ? (qsSum / qsCount).toFixed(1) : '-';
        document.getElementById('keywordsTotalImpressions').textContent = totalImpressions.toLocaleString();
        
        // Update date range display
        document.getElementById('keywordsDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;

        // Reset filters and populate dropdowns
        googleKeywordsCampaignFilter = '';
        googleKeywordsAdGroupFilter = [];
        populateGoogleKeywordsFilterDropdowns();

        // Render table with current sort
        renderKeywordsTable();
        
        googleKeywordsDataLoaded = true;
        updateLastUpdated();
    } catch (e) { 
        console.error('Google Keywords error:', e);
        document.getElementById('keywordsFullBody').innerHTML = `<tr><td colspan="12" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Render Keywords table with sorting
function renderKeywordsTable() {
    if (keywordsRawData.length === 0) return;
    
    // Apply filters
    let filtered = keywordsRawData;
    
    // Campaign filter
    if (googleKeywordsCampaignFilter) {
        filtered = filtered.filter(kw => kw.campaign === googleKeywordsCampaignFilter);
    }
    
    // Ad group filter
    if (googleKeywordsAdGroupFilter.length > 0) {
        filtered = filtered.filter(kw => googleKeywordsAdGroupFilter.includes(kw.adGroup));
    }
    
    // Search filter
    if (keywordsSearchText) {
        filtered = filtered.filter(kw => 
            kw.keyword.toLowerCase().includes(keywordsSearchText)
        );
    }
    
    // Sort data
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[keywordsSortColumn];
        let bVal = b[keywordsSortColumn];
        
        // Handle nulls
        if (aVal === null || aVal === undefined) aVal = keywordsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = keywordsSortDirection === 'desc' ? -Infinity : Infinity;
        
        // String comparison for keyword, matchType, campaign, adGroup
        if (keywordsSortColumn === 'keyword' || keywordsSortColumn === 'matchType' || keywordsSortColumn === 'campaign' || keywordsSortColumn === 'adGroup') {
            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();
            if (keywordsSortDirection === 'asc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        }
        
        // Numeric comparison
        if (keywordsSortDirection === 'asc') {
            return aVal - bVal;
        } else {
            return bVal - aVal;
        }
    });
    
    // Build table
    document.getElementById('keywordsFullBody').innerHTML = sorted.map(kw => {
        const qualityScore = kw.qualityScore ? kw.qualityScore : '-';
        const qsClass = kw.qualityScore >= 7 ? 'qs-good' : (kw.qualityScore >= 5 ? 'qs-ok' : 'qs-low');
        const ctr = kw.ctr > 0 ? kw.ctr.toFixed(2) + '%' : '0.00%';
        const costPerConv = kw.costPerConv > 0 ? '$' + kw.costPerConv.toFixed(2) : '-';
        
        return `
            <tr>
                <td>${kw.keyword}</td>
                <td>${kw.campaign || '-'}</td>
                <td>${kw.adGroup || '-'}</td>
                <td>${kw.matchType || '-'}</td>
                <td class="${qsClass}">${qualityScore}</td>
                <td>${(kw.impressions || 0).toLocaleString()}</td>
                <td>${(kw.clicks || 0).toLocaleString()}</td>
                <td>${ctr}</td>
                <td>$${(kw.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>$${(kw.cpc || 0).toFixed(2)}</td>
                <td>${(kw.conversions || 0).toFixed(1)}</td>
                <td>${costPerConv}</td>
            </tr>
        `;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('keywordsFullBody').innerHTML = '<tr><td colspan="12" class="loading">No keywords match the filters</td></tr>';
    }
}

// Populate Google Keywords filter dropdowns
function populateGoogleKeywordsFilterDropdowns() {
    const campaigns = [...new Set(keywordsRawData.map(kw => kw.campaign))].filter(c => c && c !== 'Unknown').sort();
    const campaignSelect = document.getElementById('googleKeywordsCampaignFilter');
    campaignSelect.innerHTML = '<option value="">All Campaigns</option>' + 
        campaigns.map(c => `<option value="${c}">${c}</option>`).join('');
    
    populateGoogleKeywordsAdGroupDropdown();
}

function populateGoogleKeywordsAdGroupDropdown() {
    let filteredData = keywordsRawData;
    if (googleKeywordsCampaignFilter) {
        filteredData = filteredData.filter(kw => kw.campaign === googleKeywordsCampaignFilter);
    }
    
    const adGroups = [...new Set(filteredData.map(kw => kw.adGroup))].filter(a => a && a !== 'Unknown').sort();
    const optionsContainer = document.getElementById('googleKeywordsAdGroupOptions');
    const labelEl = document.getElementById('googleKeywordsAdGroupLabel');
    
    // Build checkbox options
    let html = `
        <label class="multi-select-option select-all">
            <input type="checkbox" id="adGroupSelectAll" ${googleKeywordsAdGroupFilter.length === 0 ? 'checked' : ''}>
            <span>All Ad Groups</span>
        </label>
    `;
    
    adGroups.forEach(adGroup => {
        const checked = googleKeywordsAdGroupFilter.includes(adGroup) ? 'checked' : '';
        html += `
            <label class="multi-select-option">
                <input type="checkbox" value="${adGroup}" ${checked} class="adgroup-checkbox">
                <span>${adGroup}</span>
            </label>
        `;
    });
    
    optionsContainer.innerHTML = html;
    
    // Update label
    updateAdGroupLabel();
    
    // Add event listeners
    document.getElementById('adGroupSelectAll').addEventListener('change', (e) => {
        if (e.target.checked) {
            googleKeywordsAdGroupFilter = [];
            document.querySelectorAll('.adgroup-checkbox').forEach(cb => cb.checked = false);
        }
        updateAdGroupLabel();
        renderKeywordsTable();
    });
    
    document.querySelectorAll('.adgroup-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const selectAll = document.getElementById('adGroupSelectAll');
            
            if (e.target.checked) {
                if (!googleKeywordsAdGroupFilter.includes(e.target.value)) {
                    googleKeywordsAdGroupFilter.push(e.target.value);
                }
                selectAll.checked = false;
            } else {
                googleKeywordsAdGroupFilter = googleKeywordsAdGroupFilter.filter(v => v !== e.target.value);
                if (googleKeywordsAdGroupFilter.length === 0) {
                    selectAll.checked = true;
                }
            }
            updateAdGroupLabel();
            renderKeywordsTable();
        });
    });
    
    // Reset filter if current selections not in list
    googleKeywordsAdGroupFilter = googleKeywordsAdGroupFilter.filter(ag => adGroups.includes(ag));
}

function updateAdGroupLabel() {
    const labelEl = document.getElementById('googleKeywordsAdGroupLabel');
    if (googleKeywordsAdGroupFilter.length === 0) {
        labelEl.textContent = 'All Ad Groups';
    } else if (googleKeywordsAdGroupFilter.length === 1) {
        labelEl.textContent = googleKeywordsAdGroupFilter[0].length > 25 
            ? googleKeywordsAdGroupFilter[0].substring(0, 25) + '...' 
            : googleKeywordsAdGroupFilter[0];
    } else {
        labelEl.textContent = `${googleKeywordsAdGroupFilter.length} Ad Groups`;
    }
}

// Load Google QS History Data
async function loadGoogleQsHistoryData() {
    document.getElementById('qsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">Loading QS history...</td></tr>';
    
    try {
        const data = await googleApiCall('qs-history', {});
        const history = data?.history || [];
        const chartData = data?.chartData || [];
        
        if (history.length === 0) {
            document.getElementById('qsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">No QS history data available yet. Data will accumulate over time.</td></tr>';
            
            // Reset KPI cards
            document.getElementById('qsImprovedCount').textContent = '0';
            document.getElementById('qsStableCount').textContent = '0';
            document.getElementById('qsDeclinedCount').textContent = '0';
            document.getElementById('qsAvgCurrent').textContent = '-';
            document.getElementById('qsAvg30d').textContent = '-';
            document.getElementById('qsTotalKeywords').textContent = '0';
            return;
        }

        // Calculate summary stats
        let improved = 0, stable = 0, declined = 0;
        let currentQsSum = 0, currentQsCount = 0;
        let oldQsSum = 0, oldQsCount = 0;
        
        history.forEach(kw => {
            if (kw.currentQs) {
                currentQsSum += kw.currentQs;
                currentQsCount++;
            }
            // Use 7D ago for comparison, fall back to 30D ago
            const compareQs = kw.qs7dAgo || kw.qs30dAgo;
            if (compareQs) {
                oldQsSum += compareQs;
                oldQsCount++;
            }
            
            const change = (kw.currentQs || 0) - (compareQs || kw.currentQs || 0);
            if (change > 0) improved++;
            else if (change < 0) declined++;
            else stable++;
        });
        
        // Update KPI cards
        document.getElementById('qsImprovedCount').textContent = improved;
        document.getElementById('qsStableCount').textContent = stable;
        document.getElementById('qsDeclinedCount').textContent = declined;
        document.getElementById('qsAvgCurrent').textContent = currentQsCount > 0 ? (currentQsSum / currentQsCount).toFixed(1) : '-';
        document.getElementById('qsAvg30d').textContent = oldQsCount > 0 ? (oldQsSum / oldQsCount).toFixed(1) : '-';
        document.getElementById('qsTotalKeywords').textContent = history.length;

        // Store data for search filtering
        qsHistoryRawData = history;
        
        // Render table
        renderQsHistoryTable();
        
        // Update chart
        if (chartData.length > 0) {
            updateQsHistoryChart(chartData);
        }
        
        googleQsHistoryDataLoaded = true;
        updateLastUpdated();
    } catch (e) { 
        console.error('Google QS History error:', e);
        document.getElementById('qsHistoryBody').innerHTML = `<tr><td colspan="6" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderQsHistoryTable() {
    if (qsHistoryRawData.length === 0) return;
    
    // Filter by search text
    let filtered = qsHistoryRawData;
    if (qsHistorySearchText) {
        filtered = filtered.filter(kw => 
            kw.keyword.toLowerCase().includes(qsHistorySearchText)
        );
    }
    
    // Filter by status (improved/stable/declined)
    if (qsHistoryStatusFilter !== 'all') {
        filtered = filtered.filter(kw => {
            const compareValue = kw.qs7dAgo || kw.qs30dAgo;
            const change = kw.currentQs && compareValue ? kw.currentQs - compareValue : 0;
            if (qsHistoryStatusFilter === 'improved') return change > 0;
            if (qsHistoryStatusFilter === 'declined') return change < 0;
            if (qsHistoryStatusFilter === 'stable') return change === 0;
            return true;
        });
    }
    
    // Build table
    document.getElementById('qsHistoryBody').innerHTML = filtered.map(kw => {
        const currentQs = kw.currentQs || '-';
        const qs7d = kw.qs7dAgo || '-';
        const qs30d = kw.qs30dAgo || '-';
        
        const compareValue = kw.qs7dAgo || kw.qs30dAgo; const change = kw.currentQs && compareValue ? kw.currentQs - compareValue : 0;
        let trendIcon, trendClass, changeText;
        
        if (change > 0) {
            trendIcon = '↑';
            trendClass = 'qs-good';
            changeText = `+${change} 🟢`;
        } else if (change < 0) {
            trendIcon = '↓';
            trendClass = 'qs-low';
            changeText = `${change} 🔴`;
        } else {
            trendIcon = '→';
            trendClass = '';
            changeText = '0';
        }
        
        const qsClass = kw.currentQs >= 7 ? 'qs-good' : (kw.currentQs >= 5 ? 'qs-ok' : 'qs-low');
        
        return `
            <tr>
                <td>${kw.keyword}</td>
                <td>${kw.adGroup || '-'}</td>
                <td class="${qsClass}">${currentQs}</td>
                <td>${qs7d}</td>
                <td>${qs30d}</td>
                <td class="${trendClass}">${trendIcon}</td>
                <td class="${trendClass}">${changeText}</td>
            </tr>
        `;
    }).join('');
    
    if (filtered.length === 0) {
        document.getElementById('qsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">No keywords match the filters</td></tr>';
    }
}

function updateQsHistoryChart(chartData) {
    const ctx = document.getElementById('qsHistoryChart').getContext('2d');
    
    if (qsHistoryChart) {
        qsHistoryChart.destroy();
    }
    
    qsHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [{
                label: 'Average Quality Score',
                data: chartData.map(d => d.avgQs),
                borderColor: '#4285f4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 10,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ==================== Insurance Analytics ====================

let insMonthlyChart = null;
let insFunnelChart = null;
let insAnalyticsInitialized = false;

const SOURCE_FRIENDLY = {
    mutm: 'Meta (Facebook)',
    g1utm: 'Google',
    butm: 'Bing',
    tutm: 'TikTok',
    gbputm: 'GBP',
    igoutm: 'Instagram',
    outm: 'Organic/Other',
    pts_mutm: 'PTS Meta'
};

const SOURCE_COLORS = {
    mutm: '#3b82f6',
    g1utm: '#ef4444',
    butm: '#06b6d4',
    tutm: '#ec4899',
    gbputm: '#f59e0b',
    igoutm: '#a855f7',
    outm: '#64748b',
    pts_mutm: '#14b8a6'
};

function initInsuranceFilters() {
    if (insAnalyticsInitialized) return;
    insAnalyticsInitialized = true;
    const today = new Date();
    const nineMonthsAgo = new Date(today);
    nineMonthsAgo.setMonth(today.getMonth() - 9);
    document.getElementById('insStartDate').value = nineMonthsAgo.toISOString().slice(0, 10);
    document.getElementById('insEndDate').value = today.toISOString().slice(0, 10);
    document.getElementById('insApplyFilters').addEventListener('click', () => {
        insuranceDataLoaded = false;
        loadInsuranceAnalytics();
    });
}

async function loadInsuranceAnalytics() {
    initInsuranceFilters();
    const loading = document.getElementById('insuranceLoading');
    loading.style.display = 'block';
    document.getElementById('insMonthlyChartWrap').style.display = 'none';
    document.getElementById('insFunnelChartWrap').style.display = 'none';

    try {
        const startDate = document.getElementById('insStartDate').value;
        const endDate = document.getElementById('insEndDate').value;
        const location = document.getElementById('insLocation').value;
        const insType = document.getElementById('insInsuranceType').value;
        const insName = document.getElementById('insInsuranceName').value;
        const trackType = document.getElementById('insTrackingType').value;

        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        if (location) params.set('location', location);
        if (insType) params.set('insuranceType', insType);
        if (insName) params.set('insuranceName', insName);
        if (trackType) params.set('trackingType', trackType);

        const response = await fetch('/api/looker/insurance-analytics?' + params.toString());
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to load data');

        const { monthlyBySource, insuranceByStatus, filterOptions } = result;

        // Populate filter dropdowns (preserve current selection)
        function populateSelect(id, options, current) {
            const sel = document.getElementById(id);
            const prev = current || sel.value;
            const firstOpt = sel.options[0].textContent;
            sel.innerHTML = `<option value="">${firstOpt}</option>`;
            for (const opt of options) {
                if (!opt) continue;
                const o = document.createElement('option');
                o.value = opt;
                o.textContent = opt;
                if (opt === prev) o.selected = true;
                sel.appendChild(o);
            }
        }
        populateSelect('insLocation', filterOptions.locations);
        populateSelect('insInsuranceType', filterOptions.insuranceTypes);
        populateSelect('insInsuranceName', filterOptions.insuranceNames);
        populateSelect('insTrackingType', filterOptions.trackingTypes);

        // ===== Chart 1: Monthly Stacked Bar =====
        // Group data by month then by source
        const monthMap = {};
        const allSources = new Set();
        for (const row of monthlyBySource) {
            if (!row.month) continue;
            if (!monthMap[row.month]) monthMap[row.month] = {};
            monthMap[row.month][row.source] = (monthMap[row.month][row.source] || 0) + row.count;
            allSources.add(row.source);
        }
        const months = Object.keys(monthMap).sort();
        const sourceList = Array.from(allSources);

        const monthlyDatasets = sourceList.map(src => ({
            label: SOURCE_FRIENDLY[src] || src,
            data: months.map(m => monthMap[m][src] || 0),
            backgroundColor: SOURCE_COLORS[src] || '#6b7280'
        }));

        if (insMonthlyChart) insMonthlyChart.destroy();
        const ctx1 = document.getElementById('insMonthlyChart').getContext('2d');
        insMonthlyChart = new Chart(ctx1, {
            type: 'bar',
            data: { labels: months.map(m => m.slice(0, 7)), datasets: monthlyDatasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } }
                },
                scales: {
                    x: { stacked: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: { stacked: true, beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
                }
            }
        });
        document.getElementById('insMonthlyChartWrap').style.display = 'block';

        // ===== Chart 2: Insurance Funnel Horizontal Stacked Bar =====
        const sorted = Object.entries(insuranceByStatus)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 25);

        const insLabels = sorted.map(([name]) => name.replace(/^\*/, ''));
        // Use clean non-overlapping segments: Not Booked | Booked (not fulfilled) | Fulfilled
        const notBooked = sorted.map(([, s]) => Math.max(0, s.total - s.booked));
        const bookedNotFulfilled = sorted.map(([, s]) => Math.max(0, s.booked - s.fulfilled));
        const fulfilled = sorted.map(([, s]) => s.fulfilled);

        if (insFunnelChart) insFunnelChart.destroy();
        const ctx2 = document.getElementById('insFunnelChart').getContext('2d');
        insFunnelChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: insLabels,
                datasets: [
                    { label: 'Fulfilled', data: fulfilled, backgroundColor: '#10b981' },
                    { label: 'Booked (not fulfilled)', data: bookedNotFulfilled, backgroundColor: '#3b82f6' },
                    { label: 'Not Booked', data: notBooked, backgroundColor: '#94a3b8' }
                ]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e2e8f0' } },
                    tooltip: {
                        callbacks: {
                            afterBody: function(items) {
                                const idx = items[0].dataIndex;
                                const s = sorted[idx][1];
                                return `\nTotal: ${s.total} | Booked: ${s.booked} | Verified: ${s.inVerification} | Covered: ${s.covered} | Fulfilled: ${s.fulfilled}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                    y: { stacked: true, ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { display: false } }
                }
            }
        });
        document.getElementById('insFunnelChartWrap').style.display = 'block';

        loading.style.display = 'none';
        insuranceDataLoaded = true;
    } catch (error) {
        console.error('Insurance analytics error:', error);
        loading.innerHTML = `<div class="error" style="color:#f87171;">Error loading insurance analytics: ${error.message}</div>`;
    }
}

// ==================== Geographic Performance ====================

async function loadGoogleGeoData() {
    document.getElementById('geoBody').innerHTML = '<tr><td colspan="12" class="loading">Loading geographic data...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getGoogleDateRange(range);
        
        const data = await googleApiCall('geographic-performance', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        const locations = data?.locations || [];
        
        if (locations.length === 0) {
            document.getElementById('geoBody').innerHTML = '<tr><td colspan="12" class="loading">No geographic data available</td></tr>';
            return;
        }
        
        // Store raw data for filtering/sorting
        geoRawData = locations;
        
        // Calculate totals
        let totalClicks = 0, totalCost = 0, totalConversions = 0, totalImpressions = 0;
        let zipCount = 0;
        
        locations.forEach(loc => {
            totalClicks += loc.clicks || 0;
            totalCost += loc.cost || 0;
            totalConversions += loc.conversions || 0;
            totalImpressions += loc.impressions || 0;
            if (loc.type === 'Postal Code') zipCount++;
        });
        
        // Update KPI cards
        document.getElementById('geoTotalLocations').textContent = locations.length.toLocaleString();
        document.getElementById('geoZipCount').textContent = zipCount.toLocaleString();
        document.getElementById('geoTotalClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('geoTotalCost').textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('geoTotalConversions').textContent = totalConversions.toFixed(1);
        document.getElementById('geoAvgConvRate').textContent = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0%';
        
        // Update date range display
        document.getElementById('geoDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;
        
        // Render table
        renderGeoTable();
        
        googleGeoDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Google Geographic error:', e);
        document.getElementById('geoBody').innerHTML = `<tr><td colspan="12" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderGeoTable() {
    if (geoRawData.length === 0) return;
    
    // Filter by type
    let filtered = geoRawData;
    if (geoTypeFilter !== 'all') {
        filtered = geoRawData.filter(loc => loc.type === geoTypeFilter);
    }
    
    // Sort data
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[geoSortColumn];
        let bVal = b[geoSortColumn];
        
        if (aVal === null || aVal === undefined) aVal = geoSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = geoSortDirection === 'desc' ? -Infinity : Infinity;
        
        if (geoSortColumn === 'name' || geoSortColumn === 'type') {
            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();
            return geoSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        return geoSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Build table
    document.getElementById('geoBody').innerHTML = sorted.map(loc => {
        const convRateClass = loc.convRate >= 10 ? 'qs-good' : (loc.convRate >= 5 ? 'qs-ok' : 'qs-low');
        
        // Extract state from canonical name
        // geographic_view format: "State,United States" or "Region,State,United States"
        let stateAbbr = '';
        if (loc.canonicalName) {
            const parts = loc.canonicalName.split(',').map(p => p.trim());
            const stateMap = {
                'New York': 'NY', 'California': 'CA', 'Texas': 'TX', 'New Jersey': 'NJ',
                'Connecticut': 'CT', 'Maryland': 'MD', 'District of Columbia': 'DC',
                'Florida': 'FL', 'Pennsylvania': 'PA', 'Virginia': 'VA', 'Massachusetts': 'MA',
                'Georgia': 'GA', 'Illinois': 'IL', 'Ohio': 'OH', 'Michigan': 'MI',
                'North Carolina': 'NC', 'Arizona': 'AZ', 'Washington': 'WA', 'Colorado': 'CO'
            };
            // Check each part for a state match
            for (const part of parts) {
                if (stateMap[part]) { stateAbbr = stateMap[part]; break; }
            }
            if (!stateAbbr && parts.length >= 1 && parts[0] !== 'United States') {
                stateAbbr = parts[0].substring(0, 2).toUpperCase();
            }
        }
        const locationDisplay = stateAbbr ? `${loc.name} <span class="state-badge">${stateAbbr}</span>` : loc.name;
        
        return `
            <tr>
                <td title="${loc.canonicalName || ''}">${locationDisplay}</td>
                <td>${loc.type || '-'}</td>
                <td>${(loc.impressions || 0).toLocaleString()}</td>
                <td>${(loc.clicks || 0).toLocaleString()}</td>
                <td>${loc.ctr?.toFixed(2) || '0.00'}%</td>
                <td>$${(loc.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>$${(loc.cpc || 0).toFixed(2)}</td>
                <td>${(loc.conversions || 0).toFixed(1)}</td>
                <td class="${convRateClass}">${loc.convRate?.toFixed(2) || '0.00'}%</td>
                <td>${loc.conversions > 0 ? '$' + loc.costPerConv.toFixed(2) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// ==================== Search Terms ====================

async function loadGoogleSearchTermsData() {
    document.getElementById('searchTermsBody').innerHTML = '<tr><td colspan="12" class="loading">Loading search terms...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getGoogleDateRange(range);
        
        const data = await googleApiCall('search-terms', {
            startDate: dateRange.since,
            endDate: dateRange.until
        });
        
        const searchTerms = data?.searchTerms || [];
        
        if (searchTerms.length === 0) {
            document.getElementById('searchTermsBody').innerHTML = '<tr><td colspan="12" class="loading">No search terms data available</td></tr>';
            return;
        }
        
        // Store raw data
        searchTermsRawData = searchTerms;
        
        // Populate campaign dropdown
        const campaigns = [...new Set(searchTerms.map(st => st.campaign))].sort();
        const campaignSelect = document.getElementById('searchTermsCampaignFilter');
        campaignSelect.innerHTML = '<option value="all">All Campaigns</option>' + 
            campaigns.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // Calculate totals
        let totalClicks = 0, totalCost = 0, totalConversions = 0, wastedCost = 0;
        
        searchTerms.forEach(st => {
            totalClicks += st.clicks || 0;
            totalCost += st.cost || 0;
            totalConversions += st.conversions || 0;
            if ((st.conversions || 0) === 0) {
                wastedCost += st.cost || 0;
            }
        });
        
        // Update KPI cards
        document.getElementById('searchTermsCount').textContent = searchTerms.length.toLocaleString();
        document.getElementById('searchTermsClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('searchTermsCost').textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('searchTermsConversions').textContent = totalConversions.toFixed(1);
        document.getElementById('searchTermsConvRate').textContent = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) + '%' : '0%';
        document.getElementById('searchTermsWasted').textContent = '$' + wastedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Update date range
        document.getElementById('searchTermsDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;
        
        // Render table
        renderSearchTermsTable();
        
        searchTermsDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Search Terms error:', e);
        document.getElementById('searchTermsBody').innerHTML = `<tr><td colspan="12" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderSearchTermsTable() {
    if (searchTermsRawData.length === 0) return;
    
    // Filter data
    let filtered = searchTermsRawData;
    
    // Apply filter dropdown
    if (searchTermsFilter === 'wasted') {
        filtered = filtered.filter(st => (st.conversions || 0) === 0);
    } else if (searchTermsFilter === 'high-cpc') {
        filtered = filtered.filter(st => (st.cpc || 0) > 100);
    } else if (searchTermsFilter === 'low-conv') {
        filtered = filtered.filter(st => (st.convRate || 0) < 5 && (st.clicks || 0) > 0);
    }
    
    // Apply text search
    if (searchTermsSearchText) {
        filtered = filtered.filter(st => 
            st.searchTerm.toLowerCase().includes(searchTermsSearchText)
        );
    }
    
    // Apply campaign filter
    if (searchTermsCampaignFilter !== 'all') {
        filtered = filtered.filter(st => st.campaign === searchTermsCampaignFilter);
    }
    
    // Sort data
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[searchTermsSortColumn];
        let bVal = b[searchTermsSortColumn];
        
        if (aVal === null || aVal === undefined) aVal = searchTermsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = searchTermsSortDirection === 'desc' ? -Infinity : Infinity;
        
        if (searchTermsSortColumn === 'searchTerm' || searchTermsSortColumn === 'status' || searchTermsSortColumn === 'keyword' || searchTermsSortColumn === 'adGroup') {
            aVal = (aVal || '').toLowerCase();
            bVal = (bVal || '').toLowerCase();
            return searchTermsSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        return searchTermsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Build table
    document.getElementById('searchTermsBody').innerHTML = sorted.map(st => {
        const convRateClass = st.convRate >= 10 ? 'qs-good' : (st.convRate >= 5 ? 'qs-ok' : 'qs-low');
        const wastedClass = (st.conversions || 0) === 0 && (st.cost || 0) > 0 ? 'wasted-row' : '';
        
        return `
            <tr class="${wastedClass}">
                <td title="Campaign: ${st.campaign}">${st.searchTerm}</td>
                <td>${st.keyword || '-'}</td>
                <td>${st.adGroup || '-'}</td>
                <td>${st.status}</td>
                <td>${(st.impressions || 0).toLocaleString()}</td>
                <td>${(st.clicks || 0).toLocaleString()}</td>
                <td>${st.ctr?.toFixed(2) || '0.00'}%</td>
                <td>$${(st.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td>$${(st.cpc || 0).toFixed(2)}</td>
                <td>${(st.conversions || 0).toFixed(1)}</td>
                <td class="${convRateClass}">${st.convRate?.toFixed(2) || '0.00'}%</td>
                <td>${st.conversions > 0 ? '$' + st.costPerConv.toFixed(2) : '-'}</td>
            </tr>
        `;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('searchTermsBody').innerHTML = '<tr><td colspan="12" class="loading">No search terms match the filter</td></tr>';
    }
}

// ==================== Bing QS History ====================

async function loadBingQsHistoryData() {
    document.getElementById('bingQsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">Loading QS history...</td></tr>';
    
    try {
        const response = await fetch('/api/bing/qs-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        if (!response.ok) throw new Error('Failed to load Bing QS history');
        const data = await response.json();
        
        const history = data.history || [];
        const chartData = data.chartData || [];
        
        if (history.length === 0) {
            document.getElementById('bingQsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">No QS history data available yet. Data will accumulate over time.</td></tr>';
            return;
        }
        
        bingQsHistoryRawData = history;
        
        // Calculate KPI stats
        let improved = 0, declined = 0, stable = 0;
        let currentQsSum = 0, currentQsCount = 0;
        let oldQsSum = 0, oldQsCount = 0;
        
        history.forEach(kw => {
            if (kw.currentQs) {
                currentQsSum += kw.currentQs;
                currentQsCount++;
            }
            // Use 7D ago for comparison, fall back to 30D ago
            const compareQs = kw.qs7dAgo || kw.qs30dAgo;
            if (compareQs) {
                oldQsSum += compareQs;
                oldQsCount++;
            }
            
            const compareValue = kw.qs7dAgo || kw.qs30dAgo; const change = kw.currentQs && compareValue ? kw.currentQs - compareValue : 0;
            if (change > 0) improved++;
            else if (change < 0) declined++;
            else stable++;
        });
        
        document.getElementById('bingQsImprovedCount').textContent = improved;
        document.getElementById('bingQsStableCount').textContent = stable;
        document.getElementById('bingQsDeclinedCount').textContent = declined;
        document.getElementById('bingQsAvgCurrent').textContent = currentQsCount > 0 ? (currentQsSum / currentQsCount).toFixed(1) : '-';
        document.getElementById('bingQsAvg30d').textContent = oldQsCount > 0 ? (oldQsSum / oldQsCount).toFixed(1) : '-';
        document.getElementById('bingQsTotalKeywords').textContent = history.length;
        
        renderBingQsHistoryTable();
        
        // Update chart
        if (chartData.length > 0) {
            updateBingQsHistoryChart(chartData);
        }
        
        bingQsHistoryDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Bing QS History error:', e);
        document.getElementById('bingQsHistoryBody').innerHTML = `<tr><td colspan="6" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderBingQsHistoryTable() {
    if (bingQsHistoryRawData.length === 0) return;
    
    let filtered = bingQsHistoryRawData;
    if (bingQsHistorySearchText) {
        filtered = filtered.filter(kw => kw.keyword.toLowerCase().includes(bingQsHistorySearchText));
    }
    
    // Filter by status (improved/stable/declined)
    if (bingQsHistoryStatusFilter !== 'all') {
        filtered = filtered.filter(kw => {
            const compareValue = kw.qs7dAgo || kw.qs30dAgo;
            const change = kw.currentQs && compareValue ? kw.currentQs - compareValue : 0;
            if (bingQsHistoryStatusFilter === 'improved') return change > 0;
            if (bingQsHistoryStatusFilter === 'declined') return change < 0;
            if (bingQsHistoryStatusFilter === 'stable') return change === 0;
            return true;
        });
    }
    
    document.getElementById('bingQsHistoryBody').innerHTML = filtered.map(kw => {
        const currentQs = kw.currentQs || '-';
        const qs7d = kw.qs7dAgo || '-';
        const qs30d = kw.qs30dAgo || '-';
        
        const compareValue = kw.qs7dAgo || kw.qs30dAgo; const change = kw.currentQs && compareValue ? kw.currentQs - compareValue : 0;
        let trendIcon, trendClass, changeText;
        
        if (change > 0) {
            trendIcon = '↑';
            trendClass = 'qs-good';
            changeText = `+${change} 🟢`;
        } else if (change < 0) {
            trendIcon = '↓';
            trendClass = 'qs-low';
            changeText = `${change} 🔴`;
        } else {
            trendIcon = '→';
            trendClass = '';
            changeText = '0';
        }
        
        const qsClass = kw.currentQs >= 7 ? 'qs-good' : (kw.currentQs >= 5 ? 'qs-ok' : 'qs-low');
        
        return `<tr>
            <td>${kw.keyword}</td>
            <td>${kw.adGroup || '-'}</td>
            <td class="${qsClass}">${currentQs}</td>
            <td>${qs7d}</td>
            <td>${qs30d}</td>
            <td class="${trendClass}">${trendIcon}</td>
            <td class="${trendClass}">${changeText}</td>
        </tr>`;
    }).join('');
    
    if (filtered.length === 0) {
        document.getElementById('bingQsHistoryBody').innerHTML = '<tr><td colspan="7" class="loading">No keywords match the filters</td></tr>';
    }
}

function updateBingQsHistoryChart(chartData) {
    const ctx = document.getElementById('bingQsHistoryChart').getContext('2d');
    
    if (bingQsHistoryChart) {
        bingQsHistoryChart.destroy();
    }
    
    bingQsHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.date),
            datasets: [{
                label: 'Average Quality Score',
                data: chartData.map(d => d.avgQs),
                borderColor: '#0078d4',
                backgroundColor: 'rgba(0, 120, 212, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 10,
                    title: { display: true, text: 'Quality Score' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ==================== Bing Keywords ====================

async function loadBingKeywordsData() {
    document.getElementById('bingKeywordsBody').innerHTML = '<tr><td colspan="11" class="loading">Loading keywords...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getBingDateRange(range);
        const response = await fetch('/api/bing/keywords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load Bing keywords');
        const data = await response.json();
        
        bingKeywordsRawData = data.keywords || [];
        document.getElementById('bingKeywordsDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;
        
        // Reset filters and populate dropdowns
        bingKeywordsCampaignFilter = '';
        bingKeywordsAdGroupFilter = '';
        populateBingKeywordsFilterDropdowns();
        
        renderBingKeywordsTable();
        bingKeywordsDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Bing keywords error:', e);
        document.getElementById('bingKeywordsBody').innerHTML = `<tr><td colspan="11" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderBingKeywordsTable() {
    if (bingKeywordsRawData.length === 0) return;
    
    let filtered = bingKeywordsRawData;
    
    // Apply campaign filter
    if (bingKeywordsCampaignFilter) {
        filtered = filtered.filter(kw => kw.campaign === bingKeywordsCampaignFilter);
    }
    
    // Apply ad group filter
    if (bingKeywordsAdGroupFilter) {
        filtered = filtered.filter(kw => kw.adGroup === bingKeywordsAdGroupFilter);
    }
    
    // Apply search filter
    if (bingKeywordsSearchText) {
        filtered = filtered.filter(kw => kw.keyword.toLowerCase().includes(bingKeywordsSearchText));
    }
    
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[bingKeywordsSortColumn];
        let bVal = b[bingKeywordsSortColumn];
        if (aVal === null || aVal === undefined) aVal = bingKeywordsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = bingKeywordsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bingKeywordsSortColumn === 'keyword' || bingKeywordsSortColumn === 'campaign' || bingKeywordsSortColumn === 'adGroup') {
            return bingKeywordsSortDirection === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
        }
        return bingKeywordsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    document.getElementById('bingKeywordsBody').innerHTML = sorted.map(kw => {
        const qsClass = kw.qualityScore >= 7 ? 'qs-good' : (kw.qualityScore >= 5 ? 'qs-ok' : 'qs-low');
        return `<tr>
            <td>${kw.keyword}</td>
            <td>${kw.campaign}</td>
            <td>${kw.adGroup}</td>
            <td class="${qsClass}">${kw.qualityScore || '-'}</td>
            <td>${(kw.impressions || 0).toLocaleString()}</td>
            <td>${(kw.clicks || 0).toLocaleString()}</td>
            <td>${kw.ctr?.toFixed(2) || '0.00'}%</td>
            <td>$${(kw.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${(kw.cpc || 0).toFixed(2)}</td>
            <td>${(kw.conversions || 0).toFixed(1)}</td>
            <td>${kw.conversions > 0 ? '$' + kw.costPerConv.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('bingKeywordsBody').innerHTML = '<tr><td colspan="11" class="loading">No keywords match the filters</td></tr>';
    }
}

// Populate Bing Keywords filter dropdowns
function populateBingKeywordsFilterDropdowns() {
    const campaigns = [...new Set(bingKeywordsRawData.map(kw => kw.campaign))].filter(c => c).sort();
    const campaignSelect = document.getElementById('bingKeywordsCampaignFilter');
    campaignSelect.innerHTML = '<option value="">All Campaigns</option>' + 
        campaigns.map(c => `<option value="${c}">${c}</option>`).join('');
    
    populateBingKeywordsAdGroupDropdown();
}

function populateBingKeywordsAdGroupDropdown() {
    let filteredData = bingKeywordsRawData;
    if (bingKeywordsCampaignFilter) {
        filteredData = filteredData.filter(kw => kw.campaign === bingKeywordsCampaignFilter);
    }
    
    const adGroups = [...new Set(filteredData.map(kw => kw.adGroup))].filter(a => a).sort();
    const adGroupSelect = document.getElementById('bingKeywordsAdGroupFilter');
    adGroupSelect.innerHTML = '<option value="">All Ad Groups</option>' + 
        adGroups.map(a => `<option value="${a}">${a}</option>`).join('');
    
    // Reset filter if current selection not in list
    if (bingKeywordsAdGroupFilter && !adGroups.includes(bingKeywordsAdGroupFilter)) {
        bingKeywordsAdGroupFilter = '';
        adGroupSelect.value = '';
    }
}

// ==================== Meta Geographic ====================

async function loadMetaGeoData() {
    document.getElementById('metaGeoBody').innerHTML = '<tr><td colspan="9" class="loading">Loading geographic data...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        
        // Get geographic breakdown from Meta API
        const data = await apiCall(
            `${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&breakdowns=region&${getDateRange(range)}&limit=500`
        );
        
        if (!data || !data.data) {
            throw new Error('No data returned from Meta API');
        }
        
        // Process the data
        metaGeoRawData = data.data.map(row => {
            const spend = parseFloat(row.spend) || 0;
            const impressions = parseInt(row.impressions) || 0;
            const clicks = parseInt(row.clicks) || 0;
            const results = getResults(row.actions) || 0;
            const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;
            const cpc = clicks > 0 ? spend / clicks : 0;
            const costPerConv = results > 0 ? spend / results : 0;
            
            return {
                region: row.region || 'Unknown',
                country: row.country || 'US',
                impressions,
                clicks,
                ctr,
                spend,
                cpc,
                conversions: results,
                costPerConv
            };
        });
        
        // Update KPIs
        const totalSpend = metaGeoRawData.reduce((sum, r) => sum + r.spend, 0);
        const totalClicks = metaGeoRawData.reduce((sum, r) => sum + r.clicks, 0);
        const totalConversions = metaGeoRawData.reduce((sum, r) => sum + r.conversions, 0);
        
        document.getElementById('metaGeoTotalRegions').textContent = metaGeoRawData.length;
        document.getElementById('metaGeoTotalSpend').textContent = '$' + totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('metaGeoTotalClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('metaGeoTotalConversions').textContent = totalConversions.toLocaleString();
        
        document.getElementById('metaGeoDateRange').textContent = `Showing ${metaGeoRawData.length} regions`;
        renderMetaGeoTable();
        renderMetaGeoHeatmap();
        metaGeoDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Meta geographic error:', e);
        document.getElementById('metaGeoBody').innerHTML = `<tr><td colspan="9" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderMetaGeoTable() {
    if (metaGeoRawData.length === 0) return;
    
    let filtered = metaGeoRawData;
    if (metaGeoSearchText) {
        const search = metaGeoSearchText.toLowerCase();
        filtered = filtered.filter(loc => 
            loc.region.toLowerCase().includes(search) || 
            (loc.country || '').toLowerCase().includes(search)
        );
    }
    
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[metaGeoSortColumn];
        let bVal = b[metaGeoSortColumn];
        if (aVal === null || aVal === undefined) aVal = metaGeoSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = metaGeoSortDirection === 'desc' ? -Infinity : Infinity;
        if (metaGeoSortColumn === 'region' || metaGeoSortColumn === 'country') {
            return metaGeoSortDirection === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
        }
        return metaGeoSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    document.getElementById('metaGeoBody').innerHTML = sorted.map(loc => {
        return `<tr>
            <td>${loc.region}</td>
            <td>${loc.country || '-'}</td>
            <td>${(loc.impressions || 0).toLocaleString()}</td>
            <td>${(loc.clicks || 0).toLocaleString()}</td>
            <td>${loc.ctr?.toFixed(2) || '0.00'}%</td>
            <td>$${(loc.spend || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${(loc.cpc || 0).toFixed(2)}</td>
            <td>${loc.conversions || 0}</td>
            <td>${loc.conversions > 0 ? '$' + loc.costPerConv.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('metaGeoBody').innerHTML = '<tr><td colspan="9" class="loading">No regions match the search</td></tr>';
    }
}

// US State coordinates for heatmap
const usStateCoords = {
    'Alabama': [32.806671, -86.791130],
    'Alaska': [61.370716, -152.404419],
    'Arizona': [33.729759, -111.431221],
    'Arkansas': [34.969704, -92.373123],
    'California': [36.116203, -119.681564],
    'Colorado': [39.059811, -105.311104],
    'Connecticut': [41.597782, -72.755371],
    'Delaware': [39.318523, -75.507141],
    'Florida': [27.766279, -81.686783],
    'Georgia': [33.040619, -83.643074],
    'Hawaii': [21.094318, -157.498337],
    'Idaho': [44.240459, -114.478828],
    'Illinois': [40.349457, -88.986137],
    'Indiana': [39.849426, -86.258278],
    'Iowa': [42.011539, -93.210526],
    'Kansas': [38.526600, -96.726486],
    'Kentucky': [37.668140, -84.670067],
    'Louisiana': [31.169546, -91.867805],
    'Maine': [44.693947, -69.381927],
    'Maryland': [39.063946, -76.802101],
    'Massachusetts': [42.230171, -71.530106],
    'Michigan': [43.326618, -84.536095],
    'Minnesota': [45.694454, -93.900192],
    'Mississippi': [32.741646, -89.678696],
    'Missouri': [38.456085, -92.288368],
    'Montana': [46.921925, -110.454353],
    'Nebraska': [41.125370, -98.268082],
    'Nevada': [38.313515, -117.055374],
    'New Hampshire': [43.452492, -71.563896],
    'New Jersey': [40.298904, -74.521011],
    'New Mexico': [34.840515, -106.248482],
    'New York': [42.165726, -74.948051],
    'North Carolina': [35.630066, -79.806419],
    'North Dakota': [47.528912, -99.784012],
    'Ohio': [40.388783, -82.764915],
    'Oklahoma': [35.565342, -96.928917],
    'Oregon': [44.572021, -122.070938],
    'Pennsylvania': [40.590752, -77.209755],
    'Rhode Island': [41.680893, -71.511780],
    'South Carolina': [33.856892, -80.945007],
    'South Dakota': [44.299782, -99.438828],
    'Tennessee': [35.747845, -86.692345],
    'Texas': [31.054487, -97.563461],
    'Utah': [40.150032, -111.862434],
    'Vermont': [44.045876, -72.710686],
    'Virginia': [37.769337, -78.169968],
    'Washington': [47.400902, -121.490494],
    'West Virginia': [38.491226, -80.954453],
    'Wisconsin': [44.268543, -89.616508],
    'Wyoming': [42.755966, -107.302490],
    'District of Columbia': [38.897438, -77.026817]
};

function renderMetaGeoHeatmap() {
    const container = document.getElementById('metaGeoHeatmap');
    if (!container) return;
    
    // Initialize map if not exists
    if (!metaGeoMap) {
        metaGeoMap = L.map('metaGeoHeatmap').setView([39.8283, -98.5795], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(metaGeoMap);
    }
    
    // Remove existing layer
    if (metaGeoHeatmapLayer) {
        metaGeoMap.removeLayer(metaGeoHeatmapLayer);
    }
    
    // Get selected metric
    const metric = document.getElementById('metaGeoHeatmapMetric')?.value || 'spend';
    
    // Create heat points from state data
    const heatData = [];
    const maxValue = Math.max(...metaGeoRawData.map(r => r[metric] || 0), 1);
    
    metaGeoRawData.forEach(row => {
        const coords = usStateCoords[row.region];
        if (coords) {
            const value = row[metric] || 0;
            const intensity = value / maxValue;
            heatData.push([coords[0], coords[1], intensity]);
        }
    });
    
    // Add heatmap layer
    if (heatData.length > 0) {
        metaGeoHeatmapLayer = L.heatLayer(heatData, {
            radius: 35,
            blur: 25,
            maxZoom: 10,
            gradient: {0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1: 'red'}
        }).addTo(metaGeoMap);
    }
    
    // Add markers with tooltips
    metaGeoRawData.forEach(row => {
        const coords = usStateCoords[row.region];
        if (coords) {
            const marker = L.circleMarker(coords, {
                radius: 6,
                fillColor: '#4267B2',
                color: '#fff',
                weight: 1,
                fillOpacity: 0.8
            });
            marker.bindTooltip(`
                <strong>${row.region}</strong><br>
                Spend: $${row.spend?.toLocaleString('en-US', {minimumFractionDigits: 2}) || '0.00'}<br>
                Clicks: ${row.clicks?.toLocaleString() || 0}<br>
                Results: ${row.conversions || 0}
            `, {direction: 'top'});
            marker.addTo(metaGeoMap);
        }
    });
}

// ==================== Bing Geographic ====================

async function loadBingGeoData() {
    document.getElementById('bingGeoBody').innerHTML = '<tr><td colspan="11" class="loading">Loading geographic data...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getBingDateRange(range);
        const response = await fetch('/api/bing/geographic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load Bing geographic data');
        const data = await response.json();
        
        bingGeoRawData = data.locations || [];
        document.getElementById('bingGeoDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;
        renderBingGeoTable();
        bingGeoDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Bing geographic error:', e);
        document.getElementById('bingGeoBody').innerHTML = `<tr><td colspan="11" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderBingGeoTable() {
    if (bingGeoRawData.length === 0) return;
    
    let filtered = bingGeoRawData;
    if (bingGeoSearchText) {
        filtered = filtered.filter(loc => loc.location.toLowerCase().includes(bingGeoSearchText) || (loc.state || '').toLowerCase().includes(bingGeoSearchText));
    }
    
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[bingGeoSortColumn];
        let bVal = b[bingGeoSortColumn];
        if (aVal === null || aVal === undefined) aVal = bingGeoSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = bingGeoSortDirection === 'desc' ? -Infinity : Infinity;
        if (bingGeoSortColumn === 'location' || bingGeoSortColumn === 'state') {
            return bingGeoSortDirection === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
        }
        return bingGeoSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    document.getElementById('bingGeoBody').innerHTML = sorted.map(loc => {
        const convRateClass = loc.convRate >= 10 ? 'qs-good' : (loc.convRate >= 5 ? 'qs-ok' : 'qs-low');
        return `<tr>
            <td>${loc.location}</td>
            <td>${loc.state || '-'}</td>
            <td>${(loc.impressions || 0).toLocaleString()}</td>
            <td>${(loc.clicks || 0).toLocaleString()}</td>
            <td>${loc.ctr?.toFixed(2) || '0.00'}%</td>
            <td>$${(loc.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${(loc.cpc || 0).toFixed(2)}</td>
            <td>${(loc.conversions || 0).toFixed(1)}</td>
            <td class="${convRateClass}">${loc.convRate?.toFixed(2) || '0.00'}%</td>
            <td>${loc.conversions > 0 ? '$' + loc.costPerConv.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('bingGeoBody').innerHTML = '<tr><td colspan="11" class="loading">No locations match the search</td></tr>';
    }
}

// ==================== Bing Search Terms ====================

async function loadBingSearchTermsData() {
    document.getElementById('bingSearchTermsBody').innerHTML = '<tr><td colspan="11" class="loading">Loading search terms...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getBingDateRange(range);
        const response = await fetch('/api/bing/search-terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load Bing search terms');
        const data = await response.json();
        
        bingSearchTermsRawData = data.searchTerms || [];
        
        // Populate campaign dropdown
        const campaigns = [...new Set(bingSearchTermsRawData.map(st => st.campaign))].sort();
        const campaignSelect = document.getElementById('bingSearchTermsCampaignFilter');
        campaignSelect.innerHTML = '<option value="all">All Campaigns</option>' + 
            campaigns.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // Calculate totals
        let totalClicks = 0, totalCost = 0, totalConversions = 0, wastedCost = 0;
        bingSearchTermsRawData.forEach(st => {
            totalClicks += st.clicks || 0;
            totalCost += st.cost || 0;
            totalConversions += st.conversions || 0;
            if ((st.conversions || 0) === 0) wastedCost += st.cost || 0;
        });
        
        document.getElementById('bingSearchTermsCount').textContent = bingSearchTermsRawData.length.toLocaleString();
        document.getElementById('bingSearchTermsClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('bingSearchTermsCost').textContent = '$' + totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('bingSearchTermsConversions').textContent = totalConversions.toFixed(1);
        document.getElementById('bingSearchTermsWasted').textContent = '$' + wastedCost.toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('bingSearchTermsDateRange').textContent = `Data from ${dateRange.since} to ${dateRange.until}`;
        
        renderBingSearchTermsTable();
        bingSearchTermsDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Bing search terms error:', e);
        document.getElementById('bingSearchTermsBody').innerHTML = `<tr><td colspan="11" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function renderBingSearchTermsTable() {
    if (bingSearchTermsRawData.length === 0) return;
    
    let filtered = bingSearchTermsRawData;
    
    // Apply filter dropdown
    if (bingSearchTermsFilter === 'wasted') {
        filtered = filtered.filter(st => (st.conversions || 0) === 0);
    } else if (bingSearchTermsFilter === 'high-cpc') {
        filtered = filtered.filter(st => (st.cpc || 0) > 100);
    } else if (bingSearchTermsFilter === 'low-conv') {
        filtered = filtered.filter(st => (st.convRate || 0) < 5 && (st.clicks || 0) > 0);
    }
    
    // Apply text search
    if (bingSearchTermsSearchText) {
        filtered = filtered.filter(st => st.searchTerm.toLowerCase().includes(bingSearchTermsSearchText));
    }
    
    // Apply campaign filter
    if (bingSearchTermsCampaignFilter !== 'all') {
        filtered = filtered.filter(st => st.campaign === bingSearchTermsCampaignFilter);
    }
    
    const sorted = [...filtered].sort((a, b) => {
        let aVal = a[bingSearchTermsSortColumn];
        let bVal = b[bingSearchTermsSortColumn];
        if (aVal === null || aVal === undefined) aVal = bingSearchTermsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = bingSearchTermsSortDirection === 'desc' ? -Infinity : Infinity;
        if (bingSearchTermsSortColumn === 'searchTerm' || bingSearchTermsSortColumn === 'keyword' || bingSearchTermsSortColumn === 'adGroup') {
            return bingSearchTermsSortDirection === 'asc' ? (aVal || '').localeCompare(bVal || '') : (bVal || '').localeCompare(aVal || '');
        }
        return bingSearchTermsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    document.getElementById('bingSearchTermsBody').innerHTML = sorted.map(st => {
        const convRateClass = st.convRate >= 10 ? 'qs-good' : (st.convRate >= 5 ? 'qs-ok' : 'qs-low');
        const wastedClass = (st.conversions || 0) === 0 && (st.cost || 0) > 0 ? 'wasted-row' : '';
        return `<tr class="${wastedClass}">
            <td title="Campaign: ${st.campaign}">${st.searchTerm}</td>
            <td>${st.keyword || '-'}</td>
            <td>${st.adGroup || '-'}</td>
            <td>${(st.impressions || 0).toLocaleString()}</td>
            <td>${(st.clicks || 0).toLocaleString()}</td>
            <td>${st.ctr?.toFixed(2) || '0.00'}%</td>
            <td>$${(st.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            <td>$${(st.cpc || 0).toFixed(2)}</td>
            <td>${(st.conversions || 0).toFixed(1)}</td>
            <td class="${convRateClass}">${st.convRate?.toFixed(2) || '0.00'}%</td>
            <td>${st.conversions > 0 ? '$' + st.costPerConv.toFixed(2) : '-'}</td>
        </tr>`;
    }).join('');
    
    if (sorted.length === 0) {
        document.getElementById('bingSearchTermsBody').innerHTML = '<tr><td colspan="11" class="loading">No search terms match the filter</td></tr>';
    }
}

// ==================== Resizable Columns ====================

function makeTableResizable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    table.classList.add('resizable-table');
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    
    const headers = headerRow.querySelectorAll('th');
    
    headers.forEach((th, index) => {
        // Don't add handle to last column
        if (index === headers.length - 1) return;
        
        // Remove existing handle if any
        const existingHandle = th.querySelector('.resize-handle');
        if (existingHandle) existingHandle.remove();
        
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        th.appendChild(handle);
        
        let startX, startWidth;
        
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.pageX;
            startWidth = th.offsetWidth;
            handle.classList.add('resizing');
            
            const onMouseMove = (e) => {
                const diff = e.pageX - startX;
                const newWidth = Math.max(80, startWidth + diff);
                th.style.width = newWidth + 'px';
                th.style.minWidth = newWidth + 'px';
            };
            
            const onMouseUp = () => {
                handle.classList.remove('resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// Make all tables resizable after data loads
function initResizableTables() {
    const tableIds = [
        'campaignTable', 'adsTable', 'dailyTable',
        'bingCampaignTable', 'bingDailyTable', 'bingKeywordsTable', 
        'bingGeoTable', 'bingSearchTermsTable', 'bingQsHistoryTable',
        'googleCampaignTable', 'googleDailyTable', 'googleKeywordTable',
        'geoTable', 'searchTermsTable', 'qsHistoryTable', 'keywordsFullTable'
    ];
    tableIds.forEach(id => makeTableResizable(id));
}

// Initialize on page load and after each data load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initResizableTables, 1000);
});

// Re-init after major data loads
const originalUpdateLastUpdated = updateLastUpdated;
updateLastUpdated = function() {
    originalUpdateLastUpdated();
    setTimeout(initResizableTables, 100);
};

// ==================== Heatmap ====================

let heatmapDataLoaded = false;
let heatmapMap = null;
let heatmapLayer = null;
let zipcodeMarkers = [];
let clinicMarkers = [];
let heatmapRawData = [];

// VTC Clinic Locations
const VTC_CLINICS = [
    // New York
    { name: 'Astoria', address: '23-25 31st St, Astoria, NY', lat: 40.7699, lng: -73.9103, state: 'NY' },
    { name: 'Brighton Beach', address: '23 Brighton 11th St, Brooklyn, NY', lat: 40.5780, lng: -73.9595, state: 'NY' },
    { name: 'Bronx', address: '2100 Bartow Ave, Bronx, NY', lat: 40.8719, lng: -73.8256, state: 'NY' },
    { name: 'Downtown Brooklyn', address: '188 Montague St, Brooklyn, NY', lat: 40.6935, lng: -73.9910, state: 'NY' },
    { name: 'Financial District', address: '156 William St, New York, NY', lat: 40.7094, lng: -74.0066, state: 'NY' },
    { name: 'Forest Hills', address: '107-30 71st Rd, Forest Hills, NY', lat: 40.7210, lng: -73.8448, state: 'NY' },
    { name: 'Hartsdale', address: '280 N Central Ave, Hartsdale, NY', lat: 41.0190, lng: -73.7987, state: 'NY' },
    { name: 'Jericho', address: '350 Jericho Tpke, Jericho, NY', lat: 40.7920, lng: -73.5396, state: 'NY' },
    { name: 'Midtown Manhattan', address: '290 Madison Ave, New York, NY', lat: 40.7527, lng: -73.9796, state: 'NY' },
    { name: 'Port Jefferson', address: '70 N Country Rd, Port Jefferson, NY', lat: 40.9465, lng: -73.0691, state: 'NY' },
    { name: 'Staten Island', address: '4236 Hylan Blvd, Staten Island, NY', lat: 40.5440, lng: -74.1518, state: 'NY' },
    { name: 'Upper East Side', address: '1111 Park Ave, New York, NY', lat: 40.7873, lng: -73.9559, state: 'NY' },
    { name: 'West Islip', address: '500 Montauk Hwy, West Islip, NY', lat: 40.7065, lng: -73.2912, state: 'NY' },
    { name: 'Yonkers', address: '124 New Main St, Yonkers, NY', lat: 40.9312, lng: -73.8987, state: 'NY' },
    // New Jersey
    { name: 'Clifton', address: '1117 US-46, Clifton, NJ', lat: 40.8584, lng: -74.1638, state: 'NJ' },
    { name: 'Edgewater', address: '968 River Rd, Edgewater, NJ', lat: 40.8270, lng: -73.9754, state: 'NJ' },
    { name: 'Harrison', address: '620 Essex St, Harrison, NJ', lat: 40.7465, lng: -74.1565, state: 'NJ' },
    { name: 'Hoboken', address: '70 Hudson St, Hoboken, NJ', lat: 40.7359, lng: -74.0307, state: 'NJ' },
    { name: 'Parsippany', address: '3695 Hill Rd, Parsippany, NJ', lat: 40.8578, lng: -74.4260, state: 'NJ' },
    { name: 'Morristown', address: '310 Madison Ave, Morristown, NJ', lat: 40.7968, lng: -74.4773, state: 'NJ' },
    { name: 'Paramus', address: '140 NJ-17, Paramus, NJ', lat: 40.9445, lng: -74.0702, state: 'NJ' },
    { name: 'Princeton', address: '8 Forrestal Rd S, Princeton, NJ', lat: 40.3267, lng: -74.6592, state: 'NJ' },
    { name: 'Scotch Plains', address: '2253 South Ave, Scotch Plains, NJ', lat: 40.6531, lng: -74.3890, state: 'NJ' },
    { name: 'West Orange', address: '405 Northfield Ave, West Orange, NJ', lat: 40.7879, lng: -74.2390, state: 'NJ' },
    { name: 'Woodbridge', address: '517 U.S. Rte 1, Iselin, NJ', lat: 40.5687, lng: -74.3224, state: 'NJ' },
    { name: 'Woodland Park', address: '1167 McBride Ave, Woodland Park, NJ', lat: 40.8898, lng: -74.1943, state: 'NJ' },
    // California
    { name: 'Huntington Beach', address: '7677 Center Ave, Huntington Beach, CA', lat: 33.7175, lng: -117.9989, state: 'CA' },
    { name: 'Irvine', address: '4482 Barranca Pkwy, Irvine, CA', lat: 33.6846, lng: -117.8265, state: 'CA' },
    { name: 'National City', address: '22 W 35th St, National City, CA', lat: 32.6781, lng: -117.0992, state: 'CA' },
    { name: 'Newport Beach', address: '1525 Superior Ave, Newport Beach, CA', lat: 33.6189, lng: -117.9298, state: 'CA' },
    { name: 'Palo Alto', address: '2248 Park Blvd, Palo Alto, CA', lat: 37.4419, lng: -122.1430, state: 'CA' },
    { name: 'Poway', address: '15708 Pomerado Rd, Poway, CA', lat: 32.9628, lng: -117.0359, state: 'CA' },
    { name: 'San Diego', address: '5330 Carroll Canyon Rd, San Diego, CA', lat: 32.9051, lng: -117.1958, state: 'CA' },
    { name: 'San Jose', address: '1270 S Winchester Blvd, San Jose, CA', lat: 37.2969, lng: -121.9510, state: 'CA' },
    { name: 'Temecula', address: '27290 Madison Ave, Temecula, CA', lat: 33.4936, lng: -117.1484, state: 'CA' },
    // Texas
    { name: 'Arlington', address: '3050 S Center St, Arlington, TX', lat: 32.7002, lng: -97.1031, state: 'TX' },
    { name: 'Cedar Park', address: '351 Cypress Creek Road, Cedar Park, TX', lat: 30.5052, lng: -97.8203, state: 'TX' },
    { name: 'Fort Worth', address: '3455 Locke Ave, Fort Worth, TX', lat: 32.7340, lng: -97.3830, state: 'TX' },
    { name: 'Kyle', address: '135 Bunton Creek Rd, Kyle, TX', lat: 29.9891, lng: -97.8772, state: 'TX' },
    // Maryland
    { name: 'Bethesda', address: '6903 Rockledge Dr, Bethesda, MD', lat: 39.0030, lng: -77.0998, state: 'MD' },
    { name: 'Bowie', address: '4201 Northview Dr, Bowie, MD', lat: 38.9784, lng: -76.7253, state: 'MD' },
    { name: 'Maple Lawn', address: '11810 W Market Pl, Fulton, MD', lat: 39.1515, lng: -76.9238, state: 'MD' },
    // Connecticut
    { name: 'Farmington', address: '399 Farmington Ave, Farmington, CT', lat: 41.7270, lng: -72.8312, state: 'CT' },
    { name: 'Hamden', address: '2080 Whitney Ave, Hamden, CT', lat: 41.3540, lng: -72.9098, state: 'CT' },
    { name: 'Stamford', address: '1266 E Main St, Stamford, CT', lat: 41.0534, lng: -73.5387, state: 'CT' }
];
let heatmapSortColumn = 'conversions';
let heatmapSortDirection = 'desc';
let heatmapSourceFilter = 'all';
let heatmapStateFilter = 'all';
let heatmapSearchText = '';
let heatmapMetric = 'conversions';

// US Zipcode coordinates cache (loaded dynamically)
const zipcodeCoords = {};

async function loadZipcodeCoordinates(zipcodes) {
    const uncached = zipcodes.filter(z => !zipcodeCoords[z]);
    if (uncached.length === 0) return;
    
    // Load all uncached zipcodes
    for (const zip of uncached) {
        try {
            const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
            if (response.ok) {
                const data = await response.json();
                if (data.places && data.places[0]) {
                    zipcodeCoords[zip] = {
                        lat: parseFloat(data.places[0].latitude),
                        lng: parseFloat(data.places[0].longitude),
                        city: data.places[0]['place name'],
                        state: data.places[0]['state abbreviation']
                    };
                }
            }
        } catch (e) {}
    }
}

async function loadHeatmapData() {
    if (heatmapDataLoaded) return;
    
    document.getElementById('zipcodeTableBody').innerHTML = '<tr><td colspan="8" class="loading">Loading zipcode data...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const dateRange = getBingDateRange(range);
        
        const response = await fetch('/api/heatmap/zipcode-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load heatmap data');
        const data = await response.json();
        
        heatmapRawData = data.zipcodes || [];
        
        // Populate state dropdown
        const states = [...new Set(heatmapRawData.map(z => z.state).filter(s => s))].sort();
        const stateSelect = document.getElementById('heatmapStateFilter');
        stateSelect.innerHTML = '<option value="all">All States</option>' + 
            states.map(s => `<option value="${s}">${s}</option>`).join('');
        
        // Load coordinates for ALL zipcodes
        await loadZipcodeCoordinates(heatmapRawData.map(z => z.zipcode));
        
        // Setup filter event listeners
        setupHeatmapFilters();
        
        // Initial render
        updateHeatmapDisplay();
        
        heatmapDataLoaded = true;
        updateLastUpdated();
    } catch (e) {
        console.error('Heatmap error:', e);
        document.getElementById('zipcodeTableBody').innerHTML = `<tr><td colspan="8" class="loading">Error: ${e.message}</td></tr>`;
    }
}

function setupHeatmapFilters() {
    document.getElementById('heatmapMetric').addEventListener('change', (e) => {
        heatmapMetric = e.target.value;
        updateHeatmapDisplay();
    });

    document.getElementById('heatmapSourceFilter').addEventListener('change', (e) => {
        heatmapSourceFilter = e.target.value;
        updateHeatmapDisplay();
    });
    
    document.getElementById('heatmapStateFilter').addEventListener('change', (e) => {
        heatmapStateFilter = e.target.value;
        updateHeatmapDisplay();
    });
    
    document.getElementById('heatmapSearch').addEventListener('input', (e) => {
        heatmapSearchText = e.target.value.toLowerCase();
        updateHeatmapDisplay();
    });
    
    // Sort on column click
    document.querySelectorAll('#zipcodeTable th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (heatmapSortColumn === col) {
                heatmapSortDirection = heatmapSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                heatmapSortColumn = col;
                heatmapSortDirection = 'desc';
            }
            // Update header indicators
            document.querySelectorAll('#zipcodeTable th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
                h.textContent = h.textContent.replace(' ↑', '').replace(' ↓', '');
            });
            th.classList.add(heatmapSortDirection);
            th.textContent += heatmapSortDirection === 'asc' ? ' ↑' : ' ↓';
            updateHeatmapDisplay();
        });
    });
}

function getFilteredHeatmapData() {
    let filtered = [...heatmapRawData];
    
    // Filter by source
    if (heatmapSourceFilter === 'Google') {
        filtered = filtered.filter(z => z.sources.includes('Google'));
    } else if (heatmapSourceFilter === 'Bing') {
        filtered = filtered.filter(z => z.sources.includes('Bing'));
    } else if (heatmapSourceFilter === 'both') {
        filtered = filtered.filter(z => z.sources.includes('Google') && z.sources.includes('Bing'));
    }
    
    // Filter by state
    if (heatmapStateFilter !== 'all') {
        filtered = filtered.filter(z => z.state === heatmapStateFilter);
    }
    
    // Filter by search
    if (heatmapSearchText) {
        filtered = filtered.filter(z => 
            z.zipcode.includes(heatmapSearchText) ||
            (z.city && z.city.toLowerCase().includes(heatmapSearchText)) ||
            (z.state && z.state.toLowerCase().includes(heatmapSearchText))
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        let aVal = a[heatmapSortColumn];
        let bVal = b[heatmapSortColumn];
        
        if (heatmapSortColumn === 'source') {
            aVal = a.sources.join(',');
            bVal = b.sources.join(',');
        } else if (heatmapSortColumn === 'costPerConv') {
            aVal = a.conversions > 0 ? a.cost / a.conversions : 999999;
            bVal = b.conversions > 0 ? b.cost / b.conversions : 999999;
        }
        
        if (typeof aVal === 'string') {
            return heatmapSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return heatmapSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
}

async function updateHeatmapDisplay() {
    const filtered = getFilteredHeatmapData();
    
    // Load coordinates for filtered zipcodes that don't have them yet
    const needCoords = filtered.filter(z => !zipcodeCoords[z.zipcode]).map(z => z.zipcode);
    if (needCoords.length > 0) {
        await loadZipcodeCoordinates(needCoords);
    }
    
    // Update stats for filtered data
    document.getElementById("heatmapZipcodeCount").textContent = filtered.length.toLocaleString();
    
    // Update all metric totals
    document.getElementById("heatmapTotalImpressions").textContent = 
        filtered.reduce((sum, z) => sum + (z.impressions || 0), 0).toLocaleString();
    document.getElementById("heatmapTotalClicks").textContent = 
        filtered.reduce((sum, z) => sum + (z.clicks || 0), 0).toLocaleString();
    document.getElementById("heatmapTotalConversions").textContent = 
        filtered.reduce((sum, z) => sum + (z.conversions || 0), 0).toFixed(1);
    document.getElementById("heatmapTotalSpend").textContent = 
        "$" + filtered.reduce((sum, z) => sum + (z.cost || 0), 0).toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
    // Update legend label
    const metricName = heatmapMetric.charAt(0).toUpperCase() + heatmapMetric.slice(1);
    const legendLabel = document.getElementById("heatmapLegendLabel");
    if (legendLabel) legendLabel.textContent = metricName + ":";
    
    renderHeatmap(filtered);
    renderZipcodeTable(filtered);
}


function renderHeatmap(zipcodes) {
    // Initialize map if not exists
    if (!heatmapMap) {
        heatmapMap = L.map('heatmapContainer').setView([39.8283, -98.5795], 4); // Center of US
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(heatmapMap);
    }
    
    // Clear existing layers
    if (heatmapLayer) {
        heatmapMap.removeLayer(heatmapLayer);
    }
    zipcodeMarkers.forEach(m => heatmapMap.removeLayer(m));
    zipcodeMarkers = [];
    
    // Prepare heatmap data
    const heatData = [];
    const maxValue = Math.max(...zipcodes.map(z => z[heatmapMetric] || 0), 1);
    
    zipcodes.forEach(z => {
        const coords = zipcodeCoords[z.zipcode];
        if (coords) {
            // Add to heatmap with intensity based on conversions
            const intensity = (z[heatmapMetric] || 0) / maxValue;
            heatData.push([coords.lat, coords.lng, intensity]);
            
            // Add marker for ALL zipcodes with data
            if ((z[heatmapMetric] || 0) > 0) {
                const marker = L.circleMarker([coords.lat, coords.lng], {
                    radius: Math.min(5 + ((z[heatmapMetric] || 0) / maxValue) * 15, 20),
                    fillColor: getHeatColor((z[heatmapMetric] || 0) / maxValue),
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(heatmapMap);
                
                marker.bindPopup(`
                    <div class="popup-zipcode">${z.zipcode}</div>
                    <div class="popup-stats">
                        ${coords.city ? `<strong>${coords.city}, ${coords.state}</strong><br>` : ''}
                        <strong>Impressions:</strong> ${(z.impressions || 0).toLocaleString()}<br>
                        <strong>Clicks:</strong> ${z.clicks.toLocaleString()}<br>
                        <strong>Conversions:</strong> ${z.conversions.toFixed(1)}<br>
                        <strong>Cost:</strong> $${z.cost.toFixed(2)}<br>
                        <strong>Cost/Conv:</strong> ${z.conversions > 0 ? '$' + (z.cost / z.conversions).toFixed(2) : '-'}<br>
                        <strong>Source:</strong> ${z.sources.join(', ')}
                    </div>
                `);
                
                zipcodeMarkers.push(marker);
            }
        }
    });
    
    // Add heatmap layer
    if (heatData.length > 0) {
        heatmapLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 10,
            gradient: {
                0.0: '#ffffcc',
                0.2: '#ffeda0',
                0.4: '#feb24c',
                0.6: '#fd8d3c',
                0.8: '#e31a1c',
                1.0: '#800026'
            }
        }).addTo(heatmapMap);
    }
    
    // Add clinic markers
    clinicMarkers.forEach(m => heatmapMap.removeLayer(m));
    clinicMarkers = [];
    
    // Create clinic icon
    const clinicIcon = L.divIcon({
        className: 'clinic-marker',
        html: '<div style="background: #7c3aed; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏥</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });
    
    VTC_CLINICS.forEach(clinic => {
        // Only show clinics in filtered state, or all if no filter
        if (heatmapStateFilter !== 'all' && clinic.state !== heatmapStateFilter) return;
        
        const marker = L.marker([clinic.lat, clinic.lng], { icon: clinicIcon }).addTo(heatmapMap);
        
        // Show name on hover (tooltip)
        marker.bindTooltip(`VTC ${clinic.name}`, {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'clinic-tooltip'
        });
        
        // Show full details on click (popup)
        marker.bindPopup(`
            <div style="font-weight: bold; font-size: 14px; color: #7c3aed;">🏥 VTC ${clinic.name}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">${clinic.address}</div>
        `);
        clinicMarkers.push(marker);
    });
}

function getHeatColor(intensity) {
    const colors = ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'];
    const index = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
    return colors[index];
}

function renderZipcodeTable(zipcodes) {
    const tbody = document.getElementById('zipcodeTableBody');
    
    if (zipcodes.length === 0) {
        let message = 'No zipcode data available for the selected filters';
        if (heatmapSourceFilter === 'both') {
            message = 'No zipcodes with data from both Google and Bing';
        }
        tbody.innerHTML = `<tr><td colspan="8" class="loading">${message}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = zipcodes.slice(0, 200).map(z => {
        const coords = zipcodeCoords[z.zipcode];
        const city = z.city || (coords ? coords.city : '');
        const state = z.state || (coords ? coords.state : '');
        const location = city ? `${z.zipcode} (${city})` : z.zipcode;
        const costPerConv = z.conversions > 0 ? '$' + (z.cost / z.conversions).toFixed(2) : '-';
        
        return `<tr>
            <td>${location}</td>
            <td>${z.sources.join(', ')}</td>
            <td>${state}</td>
            <td>${z.impressions.toLocaleString()}</td>
            <td>${z.clicks.toLocaleString()}</td>
            <td>$${z.cost.toFixed(2)}</td>
            <td>${z.conversions.toFixed(1)}</td>
            <td>${costPerConv}</td>
        </tr>`;
    }).join('');
}


// ==================== Bing Ads Creative Functions ====================

async function loadBingAdsData() {
    const range = dateRanges[currentRange];
    const dateRange = getBingDateRange(range);
    document.getElementById('bingAdsBody').innerHTML = '<tr><td colspan="11" class="loading">Loading ad data...</td></tr>';
    
    try {
        const response = await fetch('/api/bing/ad-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load Bing ad data');
        
        const data = await response.json();
        bingAdsRawData = data.ads || [];
        bingAdsDataLoaded = true;
        
        // Update KPIs
        const totalAds = bingAdsRawData.length;
        const totalClicks = bingAdsRawData.reduce((sum, ad) => sum + ad.clicks, 0);
        const totalConversions = bingAdsRawData.reduce((sum, ad) => sum + ad.conversions, 0);
        const totalImpressions = bingAdsRawData.reduce((sum, ad) => sum + ad.impressions, 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        
        document.getElementById('bingAdsTotalAds').textContent = totalAds.toLocaleString();
        document.getElementById('bingAdsTotalClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('bingAdsTotalConversions').textContent = Math.round(totalConversions).toLocaleString();
        document.getElementById('bingAdsAvgCtr').textContent = avgCtr.toFixed(2) + '%';
        
        renderBingAdsTable(bingAdsRawData);
    } catch (e) {
        console.error('Bing ads error:', e);
        document.getElementById('bingAdsBody').innerHTML = '<tr><td colspan="11" class="loading">Error loading ad data</td></tr>';
    }
}

function renderBingAdsTable(ads) {
    const tbody = document.getElementById('bingAdsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="loading">No ad data available</td></tr>';
        return;
    }
    
    // Sort the ads
    const sorted = [...ads].sort((a, b) => {
        let aVal = a[bingAdsSortColumn];
        let bVal = b[bingAdsSortColumn];
        if (typeof aVal === 'string') {
            return bingAdsSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return bingAdsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Update header sort indicators
    document.querySelectorAll('#bingAdsTable th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        th.textContent = th.textContent.replace(/ [↑↓]$/, '');
        if (th.dataset.sort === bingAdsSortColumn) {
            th.classList.add(bingAdsSortDirection);
            th.textContent += bingAdsSortDirection === 'asc' ? ' ↑' : ' ↓';
        }
    });
    
    tbody.innerHTML = sorted.slice(0, 100).map(ad => {
        const headlines = ad.headlines.join(' | ') || '-';
        const descriptions = ad.descriptions.join(' | ') || '-';
        const costPerConv = ad.conversions > 0 ? '$' + ad.costPerConv.toFixed(2) : '-';
        
        return `<tr>
            <td title="${ad.campaign}">${truncate(ad.campaign, 25)}</td>
            <td title="${ad.adGroup}">${truncate(ad.adGroup, 20)}</td>
            <td class="ad-text" title="${headlines}">${truncate(headlines, 40)}</td>
            <td class="ad-text" title="${descriptions}">${truncate(descriptions, 40)}</td>
            <td>${ad.impressions.toLocaleString()}</td>
            <td>${ad.clicks.toLocaleString()}</td>
            <td>${ad.ctr.toFixed(2)}%</td>
            <td>$${ad.cost.toFixed(2)}</td>
            <td>${ad.conversions.toFixed(1)}</td>
            <td>${costPerConv}</td>
        </tr>`;
    }).join('');
}

// ==================== Google Ads Creative Functions ====================

async function loadGoogleAdsData() {
    const range = dateRanges[currentRange];
    const dateRange = getGoogleDateRange(range);
    document.getElementById('googleAdsBody').innerHTML = '<tr><td colspan="11" class="loading">Loading ad data...</td></tr>';
    
    try {
        const response = await fetch('/api/google/ad-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate: dateRange.since, endDate: dateRange.until })
        });
        
        if (!response.ok) throw new Error('Failed to load Google ad data');
        
        const data = await response.json();
        googleAdsRawData = data.ads || [];
        googleAdsDataLoaded = true;
        
        // Update KPIs
        const totalAds = googleAdsRawData.length;
        const totalClicks = googleAdsRawData.reduce((sum, ad) => sum + ad.clicks, 0);
        const totalConversions = googleAdsRawData.reduce((sum, ad) => sum + ad.conversions, 0);
        const totalImpressions = googleAdsRawData.reduce((sum, ad) => sum + ad.impressions, 0);
        const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        
        document.getElementById('googleAdsTotalAds').textContent = totalAds.toLocaleString();
        document.getElementById('googleAdsTotalClicks').textContent = totalClicks.toLocaleString();
        document.getElementById('googleAdsTotalConversions').textContent = Math.round(totalConversions).toLocaleString();
        document.getElementById('googleAdsAvgCtr').textContent = avgCtr.toFixed(2) + '%';
        
        renderGoogleAdsTable(googleAdsRawData);
    } catch (e) {
        console.error('Google ads error:', e);
        document.getElementById('googleAdsBody').innerHTML = '<tr><td colspan="11" class="loading">Error loading ad data</td></tr>';
    }
}

function renderGoogleAdsTable(ads) {
    const tbody = document.getElementById('googleAdsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="loading">No ad data available</td></tr>';
        return;
    }
    
    // Sort the ads
    const sorted = [...ads].sort((a, b) => {
        let aVal = a[googleAdsSortColumn];
        let bVal = b[googleAdsSortColumn];
        if (typeof aVal === 'string') {
            return googleAdsSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return googleAdsSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    // Update header sort indicators
    document.querySelectorAll('#googleAdsTable th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        th.textContent = th.textContent.replace(/ [↑↓]$/, '');
        if (th.dataset.sort === googleAdsSortColumn) {
            th.classList.add(googleAdsSortDirection);
            th.textContent += googleAdsSortDirection === 'asc' ? ' ↑' : ' ↓';
        }
    });
    
    tbody.innerHTML = sorted.slice(0, 100).map(ad => {
        const headlines = ad.headlines.join(' | ') || '-';
        const descriptions = ad.descriptions.join(' | ') || '-';
        const costPerConv = ad.conversions > 0 ? '$' + ad.costPerConv.toFixed(2) : '-';
        
        return `<tr>
            <td title="${ad.campaign}">${truncate(ad.campaign, 25)}</td>
            <td title="${ad.adGroup}">${truncate(ad.adGroup, 20)}</td>
            <td class="ad-text" title="${headlines}">${truncate(headlines, 40)}</td>
            <td class="ad-text" title="${descriptions}">${truncate(descriptions, 40)}</td>
            <td>${ad.impressions.toLocaleString()}</td>
            <td>${ad.clicks.toLocaleString()}</td>
            <td>${ad.ctr.toFixed(2)}%</td>
            <td>$${ad.cost.toFixed(2)}</td>
            <td>${ad.conversions.toFixed(1)}</td>
            <td>${costPerConv}</td>
        </tr>`;
    }).join('');
}

function truncate(str, maxLen) {
    if (!str) return '-';
    return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}






// ==================== Ours Privacy (By Source) ====================

async function loadOursPrivacyData() {
    try {
        // Get current date range - use preset buttons unless custom range is selected
        let startDate, endDate;
        
        if (currentRange === "custom") {
            const startDateEl = document.getElementById("startDate");
            const endDateEl = document.getElementById("endDate");
            startDate = startDateEl ? startDateEl.value : "";
            endDate = endDateEl ? endDateEl.value : "";
        }
        
        if (!startDate || !endDate) {
            const today = new Date();
            const end = new Date(today);
            let start = new Date(today);
            
            if (currentRange === "today") {
                // start and end are already today
            } else if (currentRange === "yesterday") {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (currentRange === "7d") {
                start.setDate(start.getDate() - 6);
            } else if (currentRange === "14d") {
                start.setDate(start.getDate() - 13);
            } else if (currentRange === "30d") {
                start.setDate(start.getDate() - 29);
            }
            
            startDate = start.toISOString().split("T")[0];
            endDate = end.toISOString().split("T")[0];
        }
        
        const params = new URLSearchParams({ startDate, endDate });
        
        const [sourceRes, lfsRes, rawRes, dailyRes] = await Promise.all([
            fetch("/api/ours-privacy/by-source?" + params),
            fetch("/api/ours-privacy/lfs?" + params),
            fetch("/api/ours-privacy/raw?limit=15"),
            fetch("/api/ours-privacy/lfs-daily-breakdown?" + params)
        ]);
        
        const sourceData = await sourceRes.json();
        const lfsData = await lfsRes.json();
        const rawData = await rawRes.json();
        const dailyData = await dailyRes.json();
        
        // Build daily breakdown table
        const dailyBody = document.getElementById("oursDailyBody");
        const dates = Object.keys(dailyData.byDate || {}).sort().reverse();
        
        if (dates.length === 0) {
            dailyBody.innerHTML = "<tr><td colspan=\"8\" class=\"loading\">No data for this period</td></tr>";
        } else {
            dailyBody.innerHTML = dates.map(date => {
                const d = dailyData.byDate[date];
                const dateParts = date.split('-');
                const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), 12, 0, 0);
                const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return `
                    <tr>
                        <td>${dateFormatted}</td>
                        <td>${dayOfWeek}</td>
                        <td><strong>${d.total}</strong></td>
                        <td>${d.meta || 0}</td>
                        <td>${d.google || 0}</td>
                        <td>${d.bing || 0}</td>
                        <td>${d.tiktok || 0}</td>
                        <td>${d.other || 0}</td>
                    </tr>
                `;
            }).join('');
        }
        
        // Update KPIs
        document.getElementById("oursTotalEvents").textContent = sourceData.totalEvents.toLocaleString();
        document.getElementById("oursUniqueVisitors").textContent = sourceData.uniqueVisitors || 0;
        document.getElementById("oursLfsTotal").textContent = lfsData.total || 0;
        
        if (sourceData.lastUpdated) {
            const lastTime = new Date(sourceData.lastUpdated);
            document.getElementById("oursLastEvent").textContent = lastTime.toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
            document.getElementById("oursLastEvent").textContent = "-";
        }
        
        // Build l_f_s card
        const lfsBody = document.getElementById("oursLfsBody");
        if (lfsData.sources.length === 0) {
            lfsBody.innerHTML = "<tr><td colspan=\"2\" style=\"padding:15px;color:#888;\">No l_f_s (LookerML) events</td></tr>";
        } else {
            let lfsHtml = "";
            lfsData.sources.forEach(src => {
                lfsHtml += "<tr class=\"ours-event-row\">";
                lfsHtml += "<td class=\"ours-event-name\">" + src.source + "</td>";
                lfsHtml += "<td class=\"ours-event-count\">" + src.count + "</td>";
                lfsHtml += "</tr>";
            });
            // Add total row
            lfsHtml += "<tr class=\"ours-source-row\">";
            lfsHtml += "<td>Total</td>";
            lfsHtml += "<td class=\"ours-source-total\">" + lfsData.total + "</td>";
            lfsHtml += "</tr>";
            lfsBody.innerHTML = lfsHtml;
        }
        
        // Build source table
        const tbody = document.getElementById("oursSourceBody");
        if (sourceData.sources.length === 0) {
            tbody.innerHTML = "<tr><td colspan=\"2\" style=\"color:#888;padding:20px;\">No events</td></tr>";
        } else {
            let html = "";
            sourceData.sources.forEach(src => {
                html += "<tr class=\"ours-source-row\">";
                html += "<td class=\"ours-source-name\">" + src.prefix + "</td>";
                html += "<td class=\"ours-source-total\">" + src.total + "</td>";
                html += "</tr>";
                src.events.forEach(ev => {
                    html += "<tr class=\"ours-event-row\">";
                    html += "<td class=\"ours-event-name\">" + ev.event + "</td>";
                    html += "<td class=\"ours-event-count\">" + ev.count + "</td>";
                    html += "</tr>";
                });
            });
            tbody.innerHTML = html;
        }
        
        // Recent events table
        const recentBody = document.getElementById("oursRecentBody");
        if (rawData.data.length === 0) {
            recentBody.innerHTML = "<tr><td colspan=\"4\">No recent events</td></tr>";
        } else {
            recentBody.innerHTML = rawData.data.map(d => {
                const time = new Date(d.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
                const event = d.body?.event?.event || "-";
                const source = d.body?.visitor?.utm_source || "-";
                const campaign = d.body?.visitor?.utm_campaign || "-";
                const shortCampaign = campaign.length > 30 ? campaign.substring(0, 30) + "..." : campaign;
                return "<tr><td>" + time + "</td><td><code>" + event + "</code></td><td>" + source + "</td><td title=\"" + campaign + "\">" + shortCampaign + "</td></tr>";
            }).join("");
        }
        
        // Load cross-attribution analysis
        try {
            const crossRes = await fetch("/api/ours-privacy/cross-attribution?" + params);
            const crossData = await crossRes.json();
            
            const platformConfig = {
                meta: { name: 'Meta', color: '#4267B2', icon: '<img src="images/meta-icon.png" style="width: 20px; height: 20px; vertical-align: middle;">' },
                google: { name: 'Google', color: '#EA4335', icon: '🔴' },
                bing: { name: 'Bing', color: '#00A4EF', icon: '🔷' },
                tiktok: { name: 'TikTok', color: '#00f2ea', icon: '🎵' },
                organic: { name: 'Organic', color: '#34A853', icon: '🌿' },
                instagramOrganic: { name: 'IG Organic', color: '#E4405F', icon: '📸' }
            };
            
            const crossContainer = document.getElementById("crossAttributionContainer");
            let crossHtml = '';
            
            ['meta', 'google', 'bing', 'tiktok', 'organic', 'instagramOrganic'].forEach(platform => {
                const data = crossData.analysis[platform];
                const config = platformConfig[platform];
                const lossRate = data.convertedSame + data.convertedOther > 0 
                    ? ((data.convertedOther / (data.convertedSame + data.convertedOther)) * 100).toFixed(1) 
                    : 0;
                
                const lostToList = Object.entries(data.lostTo || {})
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([src, count]) => `${src}: ${count}`)
                    .join(', ') || 'None';
                
                crossHtml += `
                    <div class="funnel-card" style="flex: 1; min-width: 220px; max-width: 280px; background: #f8f9fa; border-radius: 12px; padding: 15px; border-top: 4px solid ${config.color};">
                        <h3 style="margin: 0 0 15px 0; color: ${config.color};">${config.icon} ${config.name}</h3>
                        <div class="mini-funnel">
                            <div class="mini-funnel-row"><span>Visitors Entered</span><span>${data.entered.toLocaleString()}</span></div>
                            <div class="mini-funnel-row" style="background: #d4edda;"><span>Converted (same)</span><span>${data.convertedSame}</span></div>
                            <div class="mini-funnel-row" style="background: #f8d7da;"><span>Converted (other)</span><span>${data.convertedOther}</span></div>
                            <div class="mini-funnel-row"><span>Loss Rate</span><span>${lossRate}%</span></div>
                        </div>
                        ${data.convertedOther > 0 ? `<div style="margin-top: 10px; font-size: 11px; color: #666;">Lost to: ${lostToList}</div>` : ''}
                    </div>
                `;
            });
            
            crossContainer.innerHTML = crossHtml || '<div class="loading">No data</div>';
            
            // Platform overlaps
            const overlapsContainer = document.getElementById("platformOverlaps");
            const overlaps = crossData.overlaps || {};
            const overlapPairs = [
                { key: 'metaGoogle', label: 'Meta + Google', colors: ['#4267B2', '#EA4335'], platforms: ['meta', 'google'] },
                { key: 'metaBing', label: 'Meta + Bing', colors: ['#4267B2', '#00A4EF'], platforms: ['meta', 'bing'] },
                { key: 'metaTiktok', label: 'Meta + TikTok', colors: ['#4267B2', '#00f2ea'], platforms: ['meta', 'tiktok'] },
                { key: 'metaOrganic', label: 'Meta + Organic', colors: ['#4267B2', '#34A853'], platforms: ['meta', 'organic'] },
                { key: 'metaInstagramOrganic', label: 'Meta + IG Organic', colors: ['#4267B2', '#E4405F'], platforms: ['meta', 'instagramOrganic'] },
                { key: 'googleBing', label: 'Google + Bing', colors: ['#EA4335', '#00A4EF'], platforms: ['google', 'bing'] },
                { key: 'googleTiktok', label: 'Google + TikTok', colors: ['#EA4335', '#00f2ea'], platforms: ['google', 'tiktok'] },
                { key: 'googleOrganic', label: 'Google + Organic', colors: ['#EA4335', '#34A853'], platforms: ['google', 'organic'] },
                { key: 'googleInstagramOrganic', label: 'Google + IG Organic', colors: ['#EA4335', '#E4405F'], platforms: ['google', 'instagramOrganic'] },
                { key: 'bingTiktok', label: 'Bing + TikTok', colors: ['#00A4EF', '#00f2ea'], platforms: ['bing', 'tiktok'] },
                { key: 'bingOrganic', label: 'Bing + Organic', colors: ['#00A4EF', '#34A853'], platforms: ['bing', 'organic'] },
                { key: 'bingInstagramOrganic', label: 'Bing + IG Organic', colors: ['#00A4EF', '#E4405F'], platforms: ['bing', 'instagramOrganic'] },
                { key: 'tiktokOrganic', label: 'TikTok + Organic', colors: ['#00f2ea', '#34A853'], platforms: ['tiktok', 'organic'] },
                { key: 'tiktokInstagramOrganic', label: 'TikTok + IG Organic', colors: ['#00f2ea', '#E4405F'], platforms: ['tiktok', 'instagramOrganic'] },
                { key: 'organicInstagramOrganic', label: 'Organic + IG Organic', colors: ['#34A853', '#E4405F'], platforms: ['organic', 'instagramOrganic'] }
            ];
            
            // Store data for filtering
            window.overlapData = { overlaps, overlapPairs };
            
            // Render function
            function renderOverlaps(filter = 'all') {
                const filtered = filter === 'all' 
                    ? overlapPairs 
                    : overlapPairs.filter(p => p.platforms.includes(filter));
                
                overlapsContainer.innerHTML = filtered.map(pair => `
                    <div style="background: linear-gradient(135deg, ${pair.colors[0]}22, ${pair.colors[1]}22); border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; text-align: center;">
                        <div style="font-size: 11px; color: #666;">${pair.label}</div>
                        <div style="font-size: 20px; font-weight: bold; color: #333;">${overlaps[pair.key] || 0}</div>
                    </div>
                `).join('') || '<div style="color: #666;">No overlaps for this filter</div>';
            }
            
            // Initial render
            renderOverlaps();
            
            // Filter change handler
            const filterSelect = document.getElementById("overlapPlatformFilter");
            if (filterSelect) {
                filterSelect.onchange = () => renderOverlaps(filterSelect.value);
            }
            
        } catch (crossErr) {
            console.error("Cross-attribution load error:", crossErr);
        }
        
        // Load converted visitors for journey dropdown
        try {
            const visitorsRes = await fetch("/api/ours-privacy/converted-visitors?" + params);
            const visitorsData = await visitorsRes.json();
            
            const select = document.getElementById("journeyVisitorSelect");
            if (select && visitorsData.visitors) {
                select.innerHTML = '<option value="">Select a converted visitor...</option>' +
                    visitorsData.visitors.map(v => {
                        const time = new Date(v.conversionTime).toLocaleString('en-US', { 
                            timeZone: 'America/New_York', 
                            month: 'short', 
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        });
                        const shortId = v.visitorId.substring(0, 8);
                        return `<option value="${v.visitorId}">${shortId}... | ${v.utm_source || 'Unknown'} | ${v.totalEvents} events | ${time}</option>`;
                    }).join('');
            }
            
            // Journey button handler
            const loadBtn = document.getElementById("loadJourneyBtn");
            if (loadBtn) {
                loadBtn.onclick = async () => {
                    const visitorId = document.getElementById("journeyVisitorSelect").value;
                    if (!visitorId) return;
                    
                    const timeline = document.getElementById("journeyTimeline");
                    timeline.innerHTML = '<div class="loading">Loading journey...</div>';
                    
                    try {
                        const journeyRes = await fetch(`/api/ours-privacy/visitor-journey/${visitorId}`);
                        const journey = await journeyRes.json();
                        
                        const eventColors = {
                            'mutm_': '#4267B2',
                            'g1utm_': '#EA4335',
                            'butm_': '#00A4EF',
                            'tutm_': '#00f2ea',
                            'outm_': '#34A853',
                            'l_f_s': '#22c55e'
                        };
                        
                        const getEventColor = (event) => {
                            for (const [prefix, color] of Object.entries(eventColors)) {
                                if (event.startsWith(prefix) || event === prefix) return color;
                            }
                            return '#666';
                        };
                        
                        const getEventLabel = (event) => {
                            if (event === 'l_f_s') return '🎯 CONVERTED';
                            if (event.startsWith('mutm_')) return '📘 Meta: ' + event.replace('mutm_', '');
                            if (event.startsWith('g1utm_')) return '🔴 Google: ' + event.replace('g1utm_', '');
                            if (event.startsWith('butm_')) return '🔷 Bing: ' + event.replace('butm_', '');
                            if (event.startsWith('tutm_')) return '🎵 TikTok: ' + event.replace('tutm_', '');
                            if (event.startsWith('outm_')) return '🌿 Organic: ' + event.replace('outm_', '');
                            return event;
                        };
                        
                        timeline.innerHTML = `
                            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                                    <div>
                                        <strong>Visitor ID:</strong> ${journey.visitorId.substring(0, 12)}...
                                    </div>
                                    <div>
                                        <strong>Total Events:</strong> ${journey.totalEvents}
                                    </div>
                                    <div>
                                        <strong>Converted:</strong> ${journey.converted ? '✅ Yes' : '❌ No'}
                                        ${journey.conversionSource ? ` (via ${journey.conversionSource})` : ''}
                                    </div>
                                </div>
                                <div style="position: relative; padding-left: 30px; border-left: 3px solid #ddd;">
                                    ${journey.events.map((e, i) => {
                                        const time = new Date(e.timestamp).toLocaleString('en-US', {
                                            timeZone: 'America/New_York',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        });
                                        const color = getEventColor(e.event);
                                        const isConversion = e.event === 'l_f_s';
                                        return `
                                            <div style="position: relative; margin-bottom: 15px; ${isConversion ? 'background: #d4edda; padding: 10px; border-radius: 8px; margin-left: -10px;' : ''}">
                                                <div style="position: absolute; left: -38px; top: 5px; width: 16px; height: 16px; background: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 2px ${color};"></div>
                                                <div style="font-size: 11px; color: #666;">${time}</div>
                                                <div style="font-weight: ${isConversion ? 'bold' : 'normal'}; color: ${color}; font-size: ${isConversion ? '16px' : '14px'};">
                                                    ${getEventLabel(e.event)}
                                                </div>
                                                ${e.utm_source ? `<div style="font-size: 11px; color: #888;">Source: ${e.utm_source}</div>` : ''}
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    } catch (journeyErr) {
                        timeline.innerHTML = '<div style="color: red;">Error loading journey</div>';
                    }
                };
            }
        } catch (visitorsErr) {
            console.error("Visitors load error:", visitorsErr);
        }
        
    } catch (err) {
        console.error("Ours Privacy load error:", err);
    }
}


// ==================== Clinic Performance ====================
let clinicPerfDataLoaded = false;
let clinicPerfChart = null;
let clinicCampaignsLoaded = false;
let clinicSelectedCampaignIds = []; // empty = all

// Campaign filter dropdown logic
function initClinicCampaignFilter() {
    const selected = document.getElementById('clinicCampaignSelected');
    const dropdown = document.getElementById('clinicCampaignDropdown');
    const selectAll = document.getElementById('clinicCampaignSelectAll');
    const applyBtn = document.getElementById('clinicCampaignApply');
    
    if (!selected) return;
    
    selected.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#clinicCampaignFilter')) {
            dropdown.style.display = 'none';
        }
    });
    
    selectAll.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('#clinicCampaignOptions input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
        updateCampaignLabel();
    });
    
    applyBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#clinicCampaignOptions input[type="checkbox"]');
        const allChecked = document.getElementById('clinicCampaignSelectAll').checked;
        
        if (allChecked || [...checkboxes].every(cb => cb.checked)) {
            clinicSelectedCampaignIds = [];
        } else {
            clinicSelectedCampaignIds = [...checkboxes].filter(cb => cb.checked).map(cb => cb.value);
        }
        
        dropdown.style.display = 'none';
        clinicPerfDataLoaded = false;
        loadClinicPerformanceData();
    });
}

function updateCampaignLabel() {
    const checkboxes = document.querySelectorAll('#clinicCampaignOptions input[type="checkbox"]');
    const checked = [...checkboxes].filter(cb => cb.checked);
    const label = document.getElementById('clinicCampaignLabel');
    const selectAll = document.getElementById('clinicCampaignSelectAll');
    
    if (checked.length === 0) {
        label.textContent = 'None selected';
        selectAll.checked = false;
    } else if (checked.length === checkboxes.length) {
        label.textContent = 'All Campaigns';
        selectAll.checked = true;
    } else {
        label.textContent = `${checked.length} campaign${checked.length > 1 ? 's' : ''} selected`;
        selectAll.checked = false;
    }
}

async function loadClinicCampaigns(startDate, endDate) {
    try {
        const response = await fetch(`/api/google/campaigns-list?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();
        const options = document.getElementById('clinicCampaignOptions');
        if (!options) return;
        
        options.innerHTML = data.campaigns.map(c => `
            <label style="display:flex; align-items:center; gap:8px; padding:6px 8px; cursor:pointer; font-size:13px; color:#e5e7eb; hover:background:#374151;">
                <input type="checkbox" value="${c.id}" checked> ${c.name}
            </label>
        `).join('');
        
        // Add change listeners
        options.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', updateCampaignLabel);
        });
        
        clinicCampaignsLoaded = true;
    } catch (e) {
        console.error('Error loading campaigns for filter:', e);
    }
}

async function loadClinicPerformanceData() {
    if (clinicPerfDataLoaded) return;
    
    const loading = document.getElementById('clinicPerfLoading');
    const kpis = document.getElementById('clinicPerfKpis');
    const chartContainer = document.getElementById('clinicPerfChartContainer');
    const tableContainer = document.getElementById('clinicPerfTableContainer');
    const insights = document.getElementById('clinicPerfInsights');
    
    loading.style.display = 'block';
    kpis.style.display = 'none';
    chartContainer.style.display = 'none';
    tableContainer.style.display = 'none';
    insights.style.display = 'none';
    
    try {
        const range = dateRanges[currentRange];
        let startDate, endDate;
        
        if (range.custom && customStartDate && customEndDate) {
            startDate = customStartDate;
            endDate = customEndDate;
        } else {
            const today = getESTDate();
            const end = new Date(today);
            const start = new Date(today);
            if (range.preset === 'today') {
                // start and end are already today
            } else if (range.preset === 'yesterday') {
                start.setDate(start.getDate() - 1);
                end.setDate(end.getDate() - 1);
            } else if (range.days && range.days > 1) {
                start.setDate(start.getDate() - range.days + 1);
            }
            startDate = formatDateEST(start);
            endDate = formatDateEST(end);
        }
        
        // Show delay note if date range includes today
        const delayNote = document.getElementById('clinicPerfDelayNote');
        if (delayNote) {
            const todayStr = formatDateEST(getESTDate());
            delayNote.style.display = (endDate >= todayStr) ? 'block' : 'none';
        }
        
        // Load campaign filter options (once)
        if (!clinicCampaignsLoaded) {
            await loadClinicCampaigns(startDate, endDate);
            initClinicCampaignFilter();
        }
        
        // Build API URL with campaign filter
        let clinicPerfUrl = `/api/looker/clinic-performance?startDate=${startDate}&endDate=${endDate}`;
        if (clinicSelectedCampaignIds.length > 0) {
            clinicPerfUrl += `&campaignIds=${clinicSelectedCampaignIds.join(',')}`;
        }
        
        // Use the Looker clinic-performance endpoint (Ad Clicks + Bookings)
        const response = await fetch(clinicPerfUrl);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load data');
        }
        
        const { clinics, summary, correlation } = result;
        
        // Map clinic data for display
        const clinicsData = clinics.map(c => ({
            clinic: c.clinic,
            adImpressions: c.adImpressions || 0,
            adClicks: c.adClicks || 0,
            leads: c.leads || 0,
            booked: c.booked || 0,
            fulfilled: c.fulfilled || 0,
            bookedPer100Clicks: c.bookedPer100Clicks,
            bookedPer100Leads: c.bookedPer100Leads
        }));
        
        // Update KPIs
        document.getElementById('clinicPerfClinicsCount').textContent = summary.clinicsWithData;
        document.getElementById('clinicPerfTotalClicks').textContent = summary.totalClicks?.toLocaleString() || '0';
        document.getElementById('clinicPerfTotalBooked').textContent = summary.totalBooked.toLocaleString();
        document.getElementById('clinicPerfAvgConversion').textContent = summary.avgBookedPer100Clicks || '-';
        document.getElementById('clinicPerfCorrelation').textContent = correlation.clicks_vs_booked || '-';
        
        // Render chart
        renderClinicPerfChart(clinicsData);
        
        // Render table
        renderClinicPerfTable(clinicsData);
        
        // Generate insights
        generateClinicPerfInsights(clinicsData, correlation);
        
        loading.style.display = 'none';
        kpis.style.display = 'flex';
        chartContainer.style.display = 'block';
        tableContainer.style.display = 'block';
        insights.style.display = 'block';
        
        clinicPerfDataLoaded = true;
    } catch (error) {
        console.error('Clinic performance error:', error);
        loading.innerHTML = `<div class="error">Error loading data: ${error.message}</div>`;
    }
}

function renderClinicPerfChart(clinics) {
    const chartContainer = document.getElementById('clinicPerfChartContainer');
    const canvas = document.getElementById('clinicPerfChart');
    if (!canvas) { console.error('clinicPerfChart canvas not found'); return; }
    const ctx = canvas.getContext('2d');
    
    // Filter clinics with ad click data and sort by booked per 100 clicks
    const withRate = clinics
        .filter(c => c.adClicks >= 5 && c.bookedPer100Clicks !== null) // At least 5 clicks
        .sort((a, b) => (b.bookedPer100Clicks || 0) - (a.bookedPer100Clicks || 0))
        .slice(0, 25); // Show top 25
    
    if (clinicPerfChart) {
        clinicPerfChart.destroy();
    }
    
    if (withRate.length === 0) {
        chartContainer.innerHTML = '<p style="padding: 20px; color: #666;">Not enough ad click data to show chart. Try a longer date range.</p>';
        return;
    }
    
    // Dynamic height based on number of clinics (35px per bar)
    const chartHeight = Math.max(400, withRate.length * 35);
    canvas.parentElement.style.height = chartHeight + 'px';
    
    clinicPerfChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: withRate.map(c => c.clinic),
            datasets: [
                {
                    label: 'Booked per 100 Ad Clicks',
                    data: withRate.map(c => c.bookedPer100Clicks?.toFixed(1) || 0),
                    backgroundColor: withRate.map(c => {
                        const rate = c.bookedPer100Clicks || 0;
                        return rate >= 10 ? 'rgba(34, 197, 94, 0.85)' :
                               rate >= 5 ? 'rgba(74, 222, 128, 0.8)' :
                               rate >= 2 ? 'rgba(250, 204, 21, 0.8)' :
                               'rgba(239, 68, 68, 0.8)';
                    }),
                    borderColor: withRate.map(c => {
                        const rate = c.bookedPer100Clicks || 0;
                        return rate >= 10 ? '#16a34a' : rate >= 5 ? '#22c55e' : rate >= 2 ? '#eab308' : '#dc2626';
                    }),
                    borderWidth: 1,
                    barThickness: 22,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: '🟢 ≥10 (Excellent)  |  🟩 ≥5 (Good)  |  🟡 ≥2 (Okay)  |  🔴 <2 (Needs work)',
                    font: { size: 12, weight: 'normal' },
                    color: '#666',
                    padding: { bottom: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const c = withRate[ctx.dataIndex];
                            return `${ctx.raw} booked per 100 clicks (${c.booked} booked / ${c.adClicks} clicks)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Booked per 100 Ad Clicks' },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    ticks: { font: { size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
}

let clinicPerfRawData = [];
let clinicPerfSortColumn = 'bookedPer100Clicks';
let clinicPerfSortDirection = 'desc';

function renderClinicPerfTable(clinics) {
    clinicPerfRawData = clinics;
    sortAndRenderClinicPerfTable();
    setupClinicPerfTableSorting();
}

function sortAndRenderClinicPerfTable() {
    const tbody = document.getElementById('clinicPerfTableBody');
    
    const sorted = [...clinicPerfRawData].sort((a, b) => {
        let aVal = a[clinicPerfSortColumn];
        let bVal = b[clinicPerfSortColumn];
        
        // Handle null values - put them at the end
        if (aVal === null || aVal === undefined) aVal = clinicPerfSortDirection === 'desc' ? -Infinity : Infinity;
        if (bVal === null || bVal === undefined) bVal = clinicPerfSortDirection === 'desc' ? -Infinity : Infinity;
        
        // String comparison for clinic names
        if (clinicPerfSortColumn === 'clinic') {
            return clinicPerfSortDirection === 'asc' 
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        }
        
        // Numeric comparison
        return clinicPerfSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    tbody.innerHTML = sorted.map(c => {
        const clickRate = c.bookedPer100Clicks;
        const leadRate = c.bookedPer100Leads;
        
        const clickRateClass = clickRate === null ? '' : 
            clickRate >= 10 ? 'qs-good' : clickRate >= 5 ? 'qs-good' : clickRate >= 2 ? 'qs-ok' : 'qs-low';
        const clickRateEmoji = clickRate === null ? '' :
            clickRate >= 10 ? '🌟' : clickRate >= 5 ? '⭐' : clickRate >= 2 ? '' : '⚠️';
        
        return `
            <tr>
                <td><strong>${c.clinic}</strong></td>
                <td>${c.adImpressions > 0 ? c.adImpressions.toLocaleString() : '-'}</td>
                <td>${c.adClicks > 0 ? c.adClicks.toLocaleString() : '-'}</td>
                <td>${c.leads.toLocaleString()}</td>
                <td><strong>${c.booked}</strong></td>
                <td class="${clickRateClass}"><strong>${clickRate !== null ? clickRate.toFixed(1) : '-'}</strong> ${clickRateEmoji}</td>
                <td>${leadRate !== null ? leadRate.toFixed(1) : '-'}</td>
            </tr>
        `;
    }).join('');
}

function setupClinicPerfTableSorting() {
    const table = document.getElementById('clinicPerfTable');
    if (!table) return;
    
    table.querySelectorAll('th.sortable').forEach(th => {
        th.style.cursor = 'pointer';
        th.onclick = () => {
            const column = th.dataset.sort;
            
            // Update sort direction
            if (clinicPerfSortColumn === column) {
                clinicPerfSortDirection = clinicPerfSortDirection === 'desc' ? 'asc' : 'desc';
            } else {
                clinicPerfSortColumn = column;
                clinicPerfSortDirection = 'desc'; // Default to desc for new column
            }
            
            // Update header styling
            table.querySelectorAll('th.sortable').forEach(h => {
                h.classList.remove('asc', 'desc');
            });
            th.classList.add(clinicPerfSortDirection);
            
            // Re-render
            sortAndRenderClinicPerfTable();
        };
    });
}

function generateClinicPerfInsights(clinics, correlation) {
    const insights = [];
    
    // Filter clinics with ad click data
    const withClicks = clinics.filter(c => c.adClicks >= 10 && c.bookedPer100Clicks !== null);
    const withLeads = clinics.filter(c => c.leads >= 5 && c.bookedPer100Leads !== null);
    
    if (withClicks.length > 0) {
        // Sort by click conversion rate
        const byClickRate = [...withClicks].sort((a, b) => b.bookedPer100Clicks - a.bookedPer100Clicks);
        
        // Calculate average
        const avgClickRate = withClicks.reduce((s, c) => s + c.bookedPer100Clicks, 0) / withClicks.length;
        
        // Top performers
        const top = byClickRate.filter(c => c.bookedPer100Clicks >= 5);
        if (top.length > 0) {
            insights.push(`⭐ <strong>Best converters (≥5/100 clicks):</strong><br>${top.slice(0, 5).map(c => 
                `• ${c.clinic}: <strong>${c.bookedPer100Clicks.toFixed(1)}</strong> booked per 100 clicks`
            ).join('<br>')}`);
        }
        
        // Prediction guide
        insights.push(`🎯 <strong>Prediction benchmark:</strong><br>
            Average = <strong>${avgClickRate.toFixed(1)}</strong> booked per 100 ad clicks<br>
            <em>If your test campaign gets 100 clicks, expect ~${Math.round(avgClickRate)} bookings</em>`);
        
        // Correlation
        const corr = parseFloat(correlation.clicks_vs_booked);
        if (!isNaN(corr) && corr !== 0) {
            insights.push(`📈 <strong>Correlation (Clicks↔Booked):</strong> ${corr} — ${
                corr > 0.5 ? 'Strong predictor! More clicks = more bookings' :
                corr > 0.3 ? 'Moderate predictor' :
                'Weak predictor — conversion efficiency varies a lot by clinic'
            }`);
        }
    } else {
        insights.push(`⚠️ <strong>No ad click data available</strong> for the selected date range. Try selecting a longer period or check if Bing geo reports are configured.`);
        
        // Fall back to leads-based insights
        if (withLeads.length > 0) {
            const avgLeadRate = withLeads.reduce((s, c) => s + c.bookedPer100Leads, 0) / withLeads.length;
            insights.push(`📊 <strong>Leads-based benchmark:</strong> ${avgLeadRate.toFixed(0)} booked per 100 leads`);
        }
    }
    
    document.getElementById('clinicPerfInsightsList').innerHTML = insights.map(i => `<p style="margin: 12px 0; line-height: 1.6;">${i}</p>`).join('');
}

// Hook into view switching
const originalSwitchView = typeof switchView === "function" ? switchView : null;
if (originalSwitchView) {
    const newSwitchView = function(view) {
        originalSwitchView(view);
        if (view === "oursPrivacy") {
            loadOursPrivacyData();
        } else if (view === "clinicPerformance") {
            loadClinicPerformanceData();
        }
    };
    // Replace switchView reference
    document.querySelectorAll("[data-view]").forEach(btn => {
        btn.addEventListener("click", () => {
            const view = btn.dataset.view;
            if (view === "oursPrivacy") {
                document.querySelectorAll(".view-content").forEach(v => v.classList.add("hidden"));
                document.getElementById("oursPrivacyView")?.classList.remove("hidden");
                document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
                btn.classList.add("active");
                loadOursPrivacyData();
            } else if (view === "clinicPerformance") {
                document.querySelectorAll(".view-content").forEach(v => v.classList.add("hidden"));
                document.getElementById("clinicPerformanceView")?.classList.remove("hidden");
                document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
                btn.classList.add("active");
                loadClinicPerformanceData();
            }
        });
    });
}

// ========== Cost Per Stage by Source Section ==========
let costBySourceChart = null;
let costBySourceWeeklyChart = null;
let costBySourceStage = 'l_f_s';
let costBySourceStartDate = null;
let costBySourceEndDate = null;
let costBySourceData = null;
let costBySourceWeeklyData = null;
let costBySourceSpendData = null;
let costBySourceWeeklySpendData = null;
let costBySourceFiltersInitialized = false;

async function loadCostBySourceTrends(startDate = null, endDate = null) {
    const container = document.getElementById('costBySourceChartContainer');
    const weeklyContainer = document.getElementById('costBySourceWeeklyContainer');
    const loading = document.getElementById('costBySourceLoading');
    
    if (!container) return;
    
    if (startDate !== null) costBySourceStartDate = startDate;
    if (endDate !== null) costBySourceEndDate = endDate;
    
    let monthlyUrl = '/api/looker/monthly-cost-trends';
    let weeklyUrl = '/api/looker/weekly-cost-trends';
    const params = [];
    if (costBySourceStartDate) params.push(`startDate=${costBySourceStartDate}`);
    if (costBySourceEndDate) params.push(`endDate=${costBySourceEndDate}`);
    
    if (params.length > 0) {
        monthlyUrl += '?' + params.join('&');
        weeklyUrl += '?' + params.join('&');
    } else {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        costBySourceStartDate = sevenDaysAgo.toISOString().split('T')[0];
        costBySourceEndDate = today.toISOString().split('T')[0];
        monthlyUrl += `?startDate=${costBySourceStartDate}&endDate=${costBySourceEndDate}`;
        weeklyUrl += `?startDate=${costBySourceStartDate}&endDate=${costBySourceEndDate}`;
    }
    
    loading.style.display = 'block';
    container.style.opacity = '0.5';
    if (weeklyContainer) weeklyContainer.style.opacity = '0.5';
    
    try {
        const [monthlyRes, weeklyRes] = await Promise.all([
            fetch(monthlyUrl),
            fetch(weeklyUrl)
        ]);
        
        const monthlyData = await monthlyRes.json();
        const weeklyData = await weeklyRes.json();
        
        if (!monthlyData.success) {
            throw new Error(monthlyData.error || 'Failed to load data');
        }
        
        costBySourceData = monthlyData;
        costBySourceWeeklyData = weeklyData.success ? weeklyData : null;
        
        // Fetch spend for monthly periods
        costBySourceSpendData = { mutm: [], g1utm: [], butm: [], tutm: [] };
        for (let i = 0; i < monthlyData.months.length; i++) {
            costBySourceSpendData.mutm.push(0);
            costBySourceSpendData.g1utm.push(0);
            costBySourceSpendData.butm.push(0);
            costBySourceSpendData.tutm.push(0);
        }
        
        const monthlySpendPromises = [];
        for (let i = 0; i < monthlyData.months.length; i++) {
            const period = monthlyData.periods[i];
            monthlySpendPromises.push(fetchPlatformSpend(period.start, period.end, i));
        }
        
        const monthlySpendResults = await Promise.all(monthlySpendPromises);
        monthlySpendResults.forEach((spend, idx) => {
            costBySourceSpendData.mutm[idx] = spend.meta;
            costBySourceSpendData.g1utm[idx] = spend.google;
            costBySourceSpendData.butm[idx] = spend.bing;
            costBySourceSpendData.tutm[idx] = spend.tiktok;
        });
        
        // Fetch spend for weekly periods
        if (costBySourceWeeklyData) {
            costBySourceWeeklySpendData = { mutm: [], g1utm: [], butm: [], tutm: [] };
            for (let i = 0; i < weeklyData.weeks.length; i++) {
                costBySourceWeeklySpendData.mutm.push(0);
                costBySourceWeeklySpendData.g1utm.push(0);
                costBySourceWeeklySpendData.butm.push(0);
                costBySourceWeeklySpendData.tutm.push(0);
            }
            
            const weeklySpendPromises = [];
            for (let i = 0; i < weeklyData.weeks.length; i++) {
                const period = weeklyData.periods[i];
                weeklySpendPromises.push(fetchPlatformSpend(period.start, period.end, i));
            }
            
            const weeklySpendResults = await Promise.all(weeklySpendPromises);
            weeklySpendResults.forEach((spend, idx) => {
                costBySourceWeeklySpendData.mutm[idx] = spend.meta;
                costBySourceWeeklySpendData.g1utm[idx] = spend.google;
                costBySourceWeeklySpendData.butm[idx] = spend.bing;
                costBySourceWeeklySpendData.tutm[idx] = spend.tiktok;
            });
        }
        
        // Sync stage filter
        costBySourceStage = document.getElementById('costBySourceStageFilter').value;
        
        renderCostBySourceChart(costBySourceStage);
        renderCostBySourceWeeklyChart(costBySourceStage);
        
        // Setup filters
        if (!costBySourceFiltersInitialized) {
            document.getElementById('costBySourceStageFilter').addEventListener('change', (e) => {
                costBySourceStage = e.target.value;
                renderCostBySourceChart(costBySourceStage);
                renderCostBySourceWeeklyChart(costBySourceStage);
            });
            
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            document.getElementById('costBySourceEndDate').value = today.toISOString().split('T')[0];
            document.getElementById('costBySourceStartDate').value = sevenDaysAgo.toISOString().split('T')[0];
            
            document.querySelectorAll('.cost-by-source-preset').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.cost-by-source-preset').forEach(b => {
                        b.classList.remove('active');
                        b.style.background = 'white';
                        b.style.color = '#333';
                    });
                    btn.classList.add('active');
                    btn.style.background = '#1877f2';
                    btn.style.color = 'white';
                    
                    const range = btn.dataset.range;
                    const today = new Date();
                    const start = new Date(today);
                    
                    if (range === '7d') start.setDate(today.getDate() - 7);
                    else if (range === '14d') start.setDate(today.getDate() - 14);
                    else if (range === '30d') start.setDate(today.getDate() - 30);
                    else if (range === '90d') start.setDate(today.getDate() - 90);
                    
                    const startStr = start.toISOString().split('T')[0];
                    const endStr = today.toISOString().split('T')[0];
                    
                    document.getElementById('costBySourceStartDate').value = startStr;
                    document.getElementById('costBySourceEndDate').value = endStr;
                    
                    costBySourceStage = document.getElementById('costBySourceStageFilter').value;
                    loadCostBySourceTrends(startStr, endStr);
                });
            });
            
            document.getElementById('costBySourceApplyDate').addEventListener('click', () => {
                const start = document.getElementById('costBySourceStartDate').value;
                const end = document.getElementById('costBySourceEndDate').value;
                
                if (!start || !end) {
                    alert('Please select both start and end dates');
                    return;
                }
                
                document.querySelectorAll('.cost-by-source-preset').forEach(b => {
                    b.classList.remove('active');
                    b.style.background = 'white';
                    b.style.color = '#333';
                });
                
                costBySourceStage = document.getElementById('costBySourceStageFilter').value;
                loadCostBySourceTrends(start, end);
            });
            
            costBySourceFiltersInitialized = true;
        }
        
        loading.style.display = 'none';
        container.style.opacity = '1';
        if (weeklyContainer) weeklyContainer.style.opacity = '1';
        
    } catch (error) {
        console.error('Cost by source error:', error);
        loading.innerHTML = 'Error loading data: ' + error.message;
    }
}

function renderCostBySourceChart(stage) {
    if (!costBySourceData || !costBySourceSpendData) return;
    
    const canvas = document.getElementById('costBySourceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const sourceConfig = {
        mutm: { label: 'Meta', borderColor: '#1877f2', backgroundColor: 'rgba(24, 119, 242, 0.1)' },
        g1utm: { label: 'Google', borderColor: '#34a853', backgroundColor: 'rgba(52, 168, 83, 0.1)' },
        butm: { label: 'Bing', borderColor: '#00a4ef', backgroundColor: 'rgba(0, 164, 239, 0.1)' },
        tutm: { label: 'TikTok', borderColor: '#000000', backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    };
    
    const datasets = Object.keys(sourceConfig).map(source => {
        const stageData = costBySourceData.data[source][stage];
        const spendData = costBySourceSpendData[source];
        const costPerStage = stageData.map((v, i) => v > 0 ? spendData[i] / v : null);
        
        return {
            label: sourceConfig[source].label,
            data: costPerStage,
            borderColor: sourceConfig[source].borderColor,
            backgroundColor: sourceConfig[source].backgroundColor,
            tension: 0.3,
            fill: false
        };
    });
    
    if (costBySourceChart) {
        costBySourceChart.destroy();
    }
    
    const stageNames = {
        l_f_s: 'l_f_s',
        is_booked: 'Is Booked',
        sent_to_verification: 'Sent to Verification',
        is_booked_covered: 'Booked Covered',
        initial_fulfilled: 'Fulfilled'
    };
    
    costBySourceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: costBySourceData.months,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Cost Per ${stageNames[stage]} - By Source`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + (context.raw?.toFixed(2) || '-');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cost ($)' },
                    ticks: {
                        callback: function(value) { return '$' + value; }
                    }
                }
            }
        }
    });
}

function renderCostBySourceWeeklyChart(stage) {
    if (!costBySourceWeeklyData || !costBySourceWeeklySpendData) return;
    
    const canvas = document.getElementById('costBySourceWeeklyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const sourceConfig = {
        mutm: { label: 'Meta', borderColor: '#1877f2', backgroundColor: 'rgba(24, 119, 242, 0.1)' },
        g1utm: { label: 'Google', borderColor: '#34a853', backgroundColor: 'rgba(52, 168, 83, 0.1)' },
        butm: { label: 'Bing', borderColor: '#00a4ef', backgroundColor: 'rgba(0, 164, 239, 0.1)' },
        tutm: { label: 'TikTok', borderColor: '#000000', backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    };
    
    const datasets = Object.keys(sourceConfig).map(source => {
        const stageData = costBySourceWeeklyData.data[source][stage];
        const spendData = costBySourceWeeklySpendData[source];
        const costPerStage = stageData.map((v, i) => v > 0 ? spendData[i] / v : null);
        
        return {
            label: sourceConfig[source].label,
            data: costPerStage,
            borderColor: sourceConfig[source].borderColor,
            backgroundColor: sourceConfig[source].backgroundColor,
            tension: 0.3,
            fill: false
        };
    });
    
    if (costBySourceWeeklyChart) {
        costBySourceWeeklyChart.destroy();
    }
    
    const stageNames = {
        l_f_s: 'l_f_s',
        is_booked: 'Is Booked',
        sent_to_verification: 'Sent to Verification',
        is_booked_covered: 'Booked Covered',
        initial_fulfilled: 'Fulfilled'
    };
    
    costBySourceWeeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: costBySourceWeeklyData.weeks,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Cost Per ${stageNames[stage]} by Week - By Source`,
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': $' + (context.raw?.toFixed(2) || '-');
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Cost ($)' },
                    ticks: {
                        callback: function(value) { return '$' + value; }
                    }
                }
            }
        }
    });
}

// Initialize when Funnels tab is shown
document.addEventListener('DOMContentLoaded', () => {
    // Add to existing tab click handler or call directly
    const existingTabHandler = document.querySelector('[data-view="funnels"]');
    if (existingTabHandler) {
        existingTabHandler.addEventListener('click', () => {
            setTimeout(() => loadCostBySourceTrends(), 100);
        });
    }
});

// ========== Unified Platform Funnels ==========
async function loadUnifiedFunnels(startDate, endDate) {
    try {
        // Fetch ad platform data in parallel
        const [metaData, googleData, bingData, tiktokData] = await Promise.all([
            apiCall(`${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${startDate}","until":"${endDate}"}`).catch(() => null),
            fetch('/api/google/account-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            }).then(r => r.json()).catch(() => null),
            fetch('/api/bing/account-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            }).then(r => r.json()).catch(() => null),
            fetch('/api/tiktok/account-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startDate, endDate })
            }).then(r => r.json()).catch(() => null)
        ]);
        
        // Fetch Looker funnel data
        const lookerData = await fetch(`/api/looker/leads-funnel?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => null);
        
        // Fetch Ours Privacy l_f_s data from RAW WEBHOOKS (not Looker)
        const [metaOursLfs, googleOursLfs, bingOursLfs, tiktokOursLfs] = await Promise.all([
            fetch(`/api/ours-privacy/lfs-raw-by-platform?platform=meta&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => ({total: 0})),
            fetch(`/api/ours-privacy/lfs-raw-by-platform?platform=google&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => ({total: 0})),
            fetch(`/api/ours-privacy/lfs-raw-by-platform?platform=bing&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => ({total: 0})),
            fetch(`/api/ours-privacy/lfs-raw-by-platform?platform=tiktok&startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => ({total: 0}))
        ]);
        
        // Fetch Invoca calls data
        const invocaData = await fetch(`/api/ours-privacy/invoca-by-platform?startDate=${startDate}&endDate=${endDate}`).then(r => r.json()).catch(() => ({byPlatform: {meta: 0, google: 0, bing: 0}}));
        
        // Process Meta
        let metaSpend = 0, metaImpressions = 0, metaClicks = 0, metaResults = 0;
        if (metaData?.data?.[0]) {
            const m = metaData.data[0];
            metaSpend = parseFloat(m.spend) || 0;
            metaImpressions = parseInt(m.impressions) || 0;
            metaClicks = parseInt(m.clicks) || 0;
            // Use getResults function for proper counting
            metaResults = getResults(m.actions);
        }
        
        // Process Google
        let googleSpend = 0, googleImpressions = 0, googleClicks = 0, googleResults = 0;
        if (googleData && !googleData.error) {
            googleSpend = parseFloat(googleData.spend) || 0;
            googleImpressions = parseInt(googleData.impressions) || 0;
            googleClicks = parseInt(googleData.clicks) || 0;
            googleResults = parseInt(googleData.conversions) || 0;
        }
        
        // Process Bing
        let bingSpend = 0, bingImpressions = 0, bingClicks = 0, bingResults = 0;
        if (bingData && !bingData.error) {
            bingSpend = parseFloat(bingData.spend) || 0;
            bingImpressions = parseInt(bingData.impressions) || 0;
            bingClicks = parseInt(bingData.clicks) || 0;
            bingResults = parseInt(bingData.conversions) || 0;
        }
        
        // Process TikTok
        let tiktokSpend = 0, tiktokImpressions = 0, tiktokClicks = 0, tiktokResults = 0;
        if (tiktokData && !tiktokData.error) {
            tiktokSpend = parseFloat(tiktokData.spend) || 0;
            tiktokImpressions = parseInt(tiktokData.impressions) || 0;
            tiktokClicks = parseInt(tiktokData.clicks) || 0;
            tiktokResults = parseInt(tiktokData.conversions) || 0;
        }
        
        // Process Looker data
        const looker = {
            mutm: { lfs: 0, booked: 0, verif: 0, covered: 0, fulfilled: 0 },
            g1utm: { lfs: 0, booked: 0, verif: 0, covered: 0, fulfilled: 0 },
            butm: { lfs: 0, booked: 0, verif: 0, covered: 0, fulfilled: 0 },
            tutm: { lfs: 0, booked: 0, verif: 0, covered: 0, fulfilled: 0 }
        };
        
        if (lookerData?.data) {
            for (const platform of ['mutm', 'g1utm', 'butm', 'tutm']) {
                if (lookerData.data[platform]) {
                    const p = lookerData.data[platform];
                    looker[platform] = {
                        lfs: p.l_f_s || p.lfs || 0,
                        booked: p.is_booked || p.booked || 0,
                        verif: p.sent_to_verification || p.verif || 0,
                        covered: p.is_booked_covered || p.covered || 0,
                        fulfilled: p.initial_fulfilled || p.fulfilled || 0
                    };
                }
            }
        }
        
        // Update Meta card
        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        const fmt = n => n.toLocaleString('en-US');
        const fmtMoney = n => '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        
        el('unifiedMetaCost', fmtMoney(metaSpend));
        el('unifiedMetaImpressions', fmt(metaImpressions));
        el('unifiedMetaClicks', fmt(metaClicks));
        el('unifiedMetaResults', fmt(metaResults));
        el('unifiedMetaCostPerResult', metaResults > 0 ? fmtMoney(metaSpend / metaResults) : '');
        el('unifiedMetaLfs', fmt(looker.mutm.lfs));
        // Ours Privacy l_f_s for Meta
        const metaOursLfsVal = metaOursLfs?.total || 0;
        el('unifiedMetaLfsOurs', fmt(metaOursLfsVal));
        el('unifiedMetaInvoca', fmt(invocaData?.byPlatform?.meta || 0));
        el('unifiedMetaCostPerLfsOurs', metaOursLfsVal > 0 ? fmtMoney(metaSpend / metaOursLfsVal) : '');
        el('unifiedMetaBooked', fmt(looker.mutm.booked));
        el('unifiedMetaVerif', fmt(looker.mutm.verif));
        el('unifiedMetaCovered', fmt(looker.mutm.covered));
        el('unifiedMetaFulfilled', fmt(looker.mutm.fulfilled));
        el('unifiedMetaCostLfs', looker.mutm.lfs > 0 ? fmtMoney(metaSpend / looker.mutm.lfs) : '-');
        el('unifiedMetaCostFulfilled', looker.mutm.fulfilled > 0 ? fmtMoney(metaSpend / looker.mutm.fulfilled) : '-');
        // Cost per stage for Meta
        el("unifiedMetaCostPerLfs", looker.mutm.lfs > 0 ? fmtMoney(metaSpend / looker.mutm.lfs) : "");
        el("unifiedMetaCostPerBooked", looker.mutm.booked > 0 ? fmtMoney(metaSpend / looker.mutm.booked) : "");
        el("unifiedMetaCostPerVerif", looker.mutm.verif > 0 ? fmtMoney(metaSpend / looker.mutm.verif) : "");
        el("unifiedMetaCostPerCovered", looker.mutm.covered > 0 ? fmtMoney(metaSpend / looker.mutm.covered) : "");
        el("unifiedMetaCostPerFulfilled", looker.mutm.fulfilled > 0 ? fmtMoney(metaSpend / looker.mutm.fulfilled) : "");
        
        // Update Google card
        el('unifiedGoogleCost', fmtMoney(googleSpend));
        el('unifiedGoogleImpressions', fmt(googleImpressions));
        el('unifiedGoogleClicks', fmt(googleClicks));
        el('unifiedGoogleResults', fmt(googleResults));
        el('unifiedGoogleCostPerResult', googleResults > 0 ? fmtMoney(googleSpend / googleResults) : '');
        el('unifiedGoogleLfs', fmt(looker.g1utm.lfs));
        // Ours Privacy l_f_s for Google
        const googleOursLfsVal = googleOursLfs?.total || 0;
        el('unifiedGoogleLfsOurs', fmt(googleOursLfsVal));
        el('unifiedGoogleInvoca', fmt(invocaData?.byPlatform?.google || 0));
        el('unifiedGoogleGmbInvoca', fmt(invocaData?.byPlatform?.google_gmb || 0));
        el('unifiedGoogleCostPerLfsOurs', googleOursLfsVal > 0 ? fmtMoney(googleSpend / googleOursLfsVal) : '');
        el('unifiedGoogleBooked', fmt(looker.g1utm.booked));
        el('unifiedGoogleVerif', fmt(looker.g1utm.verif));
        el('unifiedGoogleCovered', fmt(looker.g1utm.covered));
        el('unifiedGoogleFulfilled', fmt(looker.g1utm.fulfilled));
        el('unifiedGoogleCostLfs', looker.g1utm.lfs > 0 ? fmtMoney(googleSpend / looker.g1utm.lfs) : '-');
        el('unifiedGoogleCostFulfilled', looker.g1utm.fulfilled > 0 ? fmtMoney(googleSpend / looker.g1utm.fulfilled) : '-');
        // Cost per stage for Google
        el("unifiedGoogleCostPerLfs", looker.g1utm.lfs > 0 ? fmtMoney(googleSpend / looker.g1utm.lfs) : "");
        el("unifiedGoogleCostPerBooked", looker.g1utm.booked > 0 ? fmtMoney(googleSpend / looker.g1utm.booked) : "");
        el("unifiedGoogleCostPerVerif", looker.g1utm.verif > 0 ? fmtMoney(googleSpend / looker.g1utm.verif) : "");
        el("unifiedGoogleCostPerCovered", looker.g1utm.covered > 0 ? fmtMoney(googleSpend / looker.g1utm.covered) : "");
        el("unifiedGoogleCostPerFulfilled", looker.g1utm.fulfilled > 0 ? fmtMoney(googleSpend / looker.g1utm.fulfilled) : "");
        
        // Update Bing card
        el('unifiedBingCost', fmtMoney(bingSpend));
        el('unifiedBingImpressions', fmt(bingImpressions));
        el('unifiedBingClicks', fmt(bingClicks));
        el('unifiedBingResults', fmt(bingResults));
        el('unifiedBingCostPerResult', bingResults > 0 ? fmtMoney(bingSpend / bingResults) : '');
        el('unifiedBingLfs', fmt(looker.butm.lfs));
        // Ours Privacy l_f_s for Bing
        const bingOursLfsVal = bingOursLfs?.total || 0;
        el('unifiedBingLfsOurs', fmt(bingOursLfsVal));
        el('unifiedBingInvoca', fmt(invocaData?.byPlatform?.bing || 0));
        el('unifiedBingCostPerLfsOurs', bingOursLfsVal > 0 ? fmtMoney(bingSpend / bingOursLfsVal) : '');
        el('unifiedBingBooked', fmt(looker.butm.booked));
        el('unifiedBingVerif', fmt(looker.butm.verif));
        el('unifiedBingCovered', fmt(looker.butm.covered));
        el('unifiedBingFulfilled', fmt(looker.butm.fulfilled));
        el('unifiedBingCostLfs', looker.butm.lfs > 0 ? fmtMoney(bingSpend / looker.butm.lfs) : '-');
        el('unifiedBingCostFulfilled', looker.butm.fulfilled > 0 ? fmtMoney(bingSpend / looker.butm.fulfilled) : '-');
        // Cost per stage for Bing
        el("unifiedBingCostPerLfs", looker.butm.lfs > 0 ? fmtMoney(bingSpend / looker.butm.lfs) : "");
        el("unifiedBingCostPerBooked", looker.butm.booked > 0 ? fmtMoney(bingSpend / looker.butm.booked) : "");
        el("unifiedBingCostPerVerif", looker.butm.verif > 0 ? fmtMoney(bingSpend / looker.butm.verif) : "");
        el("unifiedBingCostPerCovered", looker.butm.covered > 0 ? fmtMoney(bingSpend / looker.butm.covered) : "");
        el("unifiedBingCostPerFulfilled", looker.butm.fulfilled > 0 ? fmtMoney(bingSpend / looker.butm.fulfilled) : "");
        
        // Update TikTok card with real API data
        el('unifiedTiktokCost', fmtMoney(tiktokSpend));
        el('unifiedTiktokImpressions', fmt(tiktokImpressions));
        el('unifiedTiktokClicks', fmt(tiktokClicks));
        el('unifiedTiktokResults', fmt(tiktokResults));
        el('unifiedTiktokLfs', fmt(looker.tutm.lfs));
        // Ours Privacy l_f_s for TikTok (not available)
        const tiktokOursLfsVal = tiktokOursLfs?.total || 0;
        el('unifiedTiktokLfsOurs', fmt(tiktokOursLfsVal));
        el('unifiedTiktokCostPerLfsOurs', tiktokOursLfsVal > 0 ? fmtMoney(tiktokSpend / tiktokOursLfsVal) : '');
        el('unifiedTiktokBooked', fmt(looker.tutm.booked));
        el('unifiedTiktokCostPerBooked', looker.tutm.booked > 0 ? fmtMoney(tiktokSpend / looker.tutm.booked) : "");
        el('unifiedTiktokVerif', fmt(looker.tutm.verif));
        el('unifiedTiktokCostPerVerif', looker.tutm.verif > 0 ? fmtMoney(tiktokSpend / looker.tutm.verif) : "");
        el('unifiedTiktokCovered', fmt(looker.tutm.covered));
        el('unifiedTiktokCostPerCovered', looker.tutm.covered > 0 ? fmtMoney(tiktokSpend / looker.tutm.covered) : "");
        el('unifiedTiktokFulfilled', fmt(looker.tutm.fulfilled));
        el('unifiedTiktokCostPerFulfilled', looker.tutm.fulfilled > 0 ? fmtMoney(tiktokSpend / looker.tutm.fulfilled) : "");
        el('unifiedTiktokCostLfs', looker.tutm.lfs > 0 ? fmtMoney(tiktokSpend / looker.tutm.lfs) : "");
        el('unifiedTiktokCostFulfilled', looker.tutm.fulfilled > 0 ? fmtMoney(tiktokSpend / looker.tutm.fulfilled) : "");
        
    } catch (error) {
        console.error('Error loading unified funnels:', error);
    }
}

// ========== TikTok Data Loading ==========

async function loadTikTokData() {
    document.getElementById('tiktokCampaignBody').innerHTML = '<tr><td colspan="8" class="loading">Loading TikTok data...</td></tr>';
    document.getElementById('tiktokDailyBody').innerHTML = '<tr><td colspan="12" class="loading">Loading...</td></tr>';

    try {
        await Promise.all([
            loadTikTokKPIs(),
            loadTikTokChartData(),
            loadTikTokCampaignData(),
            loadTikTokDailyData()
        ]);
        tiktokDataLoaded = true;
        updateLastUpdated();
    } catch (error) {
        console.error('TikTok data error:', error);
        showTikTokLoadingError('Error loading TikTok data: ' + error.message);
    }
}

// Show error message for TikTok
function showTikTokLoadingError(errorMsg) {
    const message = `
        <tr>
            <td colspan="8" class="loading">
                <div style="padding: 20px;">
                    <h3 style="margin-bottom: 10px;">⚠️ Error Loading TikTok Data</h3>
                    <p style="color: #65676b;">${errorMsg}</p>
                </div>
            </td>
        </tr>
    `;
    document.getElementById('tiktokCampaignBody').innerHTML = message;
    document.getElementById('tiktokDailyBody').innerHTML = `<tr><td colspan="12" class="loading">${errorMsg}</td></tr>`;
}

function getTikTokDateRange() {
    const range = dateRanges[currentRange];
    let startDate, endDate;
    if (range.custom && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
    } else if (range.preset === 'today') {
        startDate = endDate = formatDateEST(getESTDate());
    } else if (range.preset === 'yesterday') {
        const d = getESTDate(); d.setDate(d.getDate() - 1);
        startDate = endDate = formatDateEST(d);
    } else if (range.days) {
        const today = getESTDate();
        const start = new Date(today);
        start.setDate(today.getDate() - range.days + 1);
        startDate = formatDateEST(start);
        endDate = formatDateEST(today);
    }
    return { startDate, endDate };
}

async function loadTikTokKPIs() {
    try {
        const range = dateRanges[currentRange];
        const { startDate, endDate } = getTikTokDateRange();
        
        const response = await fetch('/api/tiktok/account-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update KPI cards
        document.getElementById('tiktokTotalSpend').textContent = '$' + (data.spend || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('tiktokTotalImpressions').textContent = (data.impressions || 0).toLocaleString('en-US');
        document.getElementById('tiktokTotalClicks').textContent = (data.clicks || 0).toLocaleString('en-US');
        document.getElementById('tiktokTotalConversions').textContent = (data.conversions || 0).toLocaleString('en-US');
    } catch (error) {
        console.error('TikTok KPIs error:', error);
    }
}

async function loadTikTokCampaignData() {
    try {
        const range = dateRanges[currentRange];
        const { startDate, endDate } = getTikTokDateRange();
        
        const response = await fetch('/api/tiktok/campaign-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        tiktokRawData = data.campaigns || [];
        renderTikTokCampaignTable();
    } catch (error) {
        console.error('TikTok campaign data error:', error);
        document.getElementById('tiktokCampaignBody').innerHTML = '<tr><td colspan="8" class="loading">Error loading campaign data</td></tr>';
    }
}

function renderTikTokCampaignTable() {
    const tbody = document.getElementById('tiktokCampaignBody');
    if (!tbody) return;
    
    if (tiktokRawData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No campaigns found</td></tr>';
        return;
    }
    
    // Filter out paused campaigns (no spend in period)
    const activeData = tiktokRawData.filter(c => c.spend > 0);
    
    if (activeData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading">No active campaigns in this period</td></tr>';
        return;
    }
    
    // Sort data
    const sortedData = [...activeData].sort((a, b) => {
        const aVal = a[tiktokSortColumn] || 0;
        const bVal = b[tiktokSortColumn] || 0;
        
        if (typeof aVal === 'string') {
            return tiktokSortDirection === 'asc' ? 
                aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        
        return tiktokSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    const rows = sortedData.map(campaign => {
        const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0;
        const costPerConv = campaign.conversions > 0 ? (campaign.spend / campaign.conversions) : 0;
        
        return `
            <tr>
                <td>${campaign.name}</td>
                <td>$${campaign.spend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${campaign.impressions.toLocaleString('en-US')}</td>
                <td>${campaign.clicks.toLocaleString('en-US')}</td>
                <td>${ctr.toFixed(2)}%</td>
                <td>$${campaign.cpc.toFixed(2)}</td>
                <td>${campaign.conversions}</td>
                <td>$${costPerConv.toFixed(2)}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

async function loadTikTokDailyData() {
    try {
        const range = dateRanges[currentRange];
        const { startDate: tiktokStart, endDate: tiktokEnd } = getTikTokDateRange();
        
        // Fetch Looker l_f_s by date for TikTok and Ours Privacy l_f_s by date
        let lookerLfsByDate = {};
        let oursLfsByDate = {};
        try {
            const [lookerRes, oursRes] = await Promise.all([
                fetch('/api/looker/lfs-by-date?platform=tutm&startDate=' + tiktokStart + '&endDate=' + tiktokEnd).then(r => r.json()).catch(() => ({})),
                fetch('/api/ours-privacy/lfs-daily-breakdown?startDate=' + tiktokStart + '&endDate=' + tiktokEnd).then(r => r.json()).catch(() => ({ byDate: {} }))
            ]);
            if (lookerRes && lookerRes.byDate) {
                for (const [date, counts] of Object.entries(lookerRes.byDate)) {
                    lookerLfsByDate[date] = counts.tutm || 0;
                }
            }
            if (oursRes && oursRes.byDate) {
                for (const [date, counts] of Object.entries(oursRes.byDate)) {
                    oursLfsByDate[date] = counts.tiktok || 0;
                }
            }
        } catch(e) { console.error('TikTok l_f_s fetch error:', e); }
        
        // Store for use in rendering
        window._tiktokLookerLfs = lookerLfsByDate;
        window._tiktokOursLfs = oursLfsByDate;
        const { startDate, endDate } = getTikTokDateRange();
        
        const response = await fetch('/api/tiktok/daily-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        renderTikTokDailyTable(data.rows || []);
    } catch (error) {
        console.error('TikTok daily data error:', error);
        document.getElementById('tiktokDailyBody').innerHTML = '<tr><td colspan="12" class="loading">Error loading daily data</td></tr>';
    }
}

function renderTikTokDailyTable(dailyData) {
    const tbody = document.getElementById('tiktokDailyBody');
    if (!tbody) return;
    
    if (dailyData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="loading">No daily data found</td></tr>';
        return;
    }
    
    const rows = dailyData.map(day => {
        const ctr = day.impressions > 0 ? (day.clicks / day.impressions * 100) : 0;
        const costPerConv = day.conversions > 0 ? (day.spend / day.conversions) : 0;
        
        return `
            <tr>
                <td>${(day.date || '').split(' ')[0]}</td>
                <td>$${day.spend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td>${day.impressions.toLocaleString('en-US')}</td>
                <td>${day.clicks.toLocaleString('en-US')}</td>
                <td>${ctr.toFixed(2)}%</td>
                <td>$${day.cpc.toFixed(2)}</td>
                <td>${day.conversions}</td>
                <td>$${costPerConv.toFixed(2)}</td>
                <td>${(() => { const v = (window._tiktokLookerLfs || {})[(day.date || '').split(' ')[0]] || 0; return v > 0 ? v : '-'; })()}</td>
                <td>${(() => { const v = (window._tiktokLookerLfs || {})[(day.date || '').split(' ')[0]] || 0; return v > 0 ? '$' + (day.spend / v).toFixed(2) : '-'; })()}</td>
                <td>${(() => { const v = (window._tiktokOursLfs || {})[(day.date || '').split(' ')[0]] || 0; return v > 0 ? v : '-'; })()}</td>
                <td>${(() => { const v = (window._tiktokOursLfs || {})[(day.date || '').split(' ')[0]] || 0; return v > 0 ? '$' + (day.spend / v).toFixed(2) : '-'; })()}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

async function loadTikTokChartData() {
    // For now, we'll skip the chart implementation
    // This can be added later following the same pattern as other platforms
    console.log('TikTok chart data loading - placeholder');
}


// ==================== TikTok Ads View ====================
let tiktokAdsDataLoaded = false;


function renderTikTokAdsTable(allAds) {
    const tbody = document.getElementById('tiktokAdsBody');
    if (!tbody) return;
    
    // Apply filters
    let filtered = allAds;
    const campaignFilter = document.getElementById('ttFilterCampaign')?.value || '';
    const statusFilter = document.getElementById('ttFilterStatus')?.value || '';
    
    if (campaignFilter) {
        filtered = filtered.filter(a => a.campaignName === campaignFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(a => {
            const s = (a.status || '').toLowerCase();
            if (statusFilter === 'active') return s === 'active' || s === 'enable' || a.spend > 0;
            if (statusFilter === 'paused') return s === 'paused' || s === 'disable' || (a.spend === 0 && s !== 'active');
            return true;
        });
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="loading">No ads match the current filters</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(ad => {
        let thumbnailHtml;
        if (ad.thumbnailUrl && ad.videoPreviewUrl) {
            thumbnailHtml = `
                <a href="${ad.videoPreviewUrl}" target="_blank" class="ad-thumbnail-link" title="Watch video">
                    <img src="${ad.thumbnailUrl}" alt="Ad creative" class="ad-thumbnail" loading="lazy">
                </a>
            `;
        } else if (ad.thumbnailUrl) {
            thumbnailHtml = `<img src="${ad.thumbnailUrl}" alt="Ad creative" class="ad-thumbnail" loading="lazy">`;
        } else {
            thumbnailHtml = `<div class="no-thumbnail">🖼️</div>`;
        }
        
        const statusClass = ad.spend > 0 ? 'status-active' : 'status-paused';
        const statusLabel = ad.spend > 0 ? 'Active' : 'Paused';
        
        return `
        <tr>
            <td>${thumbnailHtml}</td>
            <td>${ad.adName || 'Ad ' + ad.adId}</td>
            <td><span class="${statusClass}">${statusLabel}</span></td>
            <td>${ad.campaignName}</td>
            <td>$${ad.spend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>${ad.impressions.toLocaleString()}</td>
            <td>${ad.clicks.toLocaleString()}</td>
            <td>${ad.ctr.toFixed(2)}%</td>
            <td>$${ad.cpc.toFixed(2)}</td>
            <td>${ad.conversions}</td>
            <td>${ad.conversions > 0 ? '$' + ad.costPerConversion.toFixed(2) : '\u2014'}</td>
        </tr>
    `;
    }).join('');
}

async function loadTikTokAdsData() {
    const tbody = document.getElementById('tiktokAdsBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="11" class="loading">Loading TikTok ads data...</td></tr>';
    
    try {
        const { startDate, endDate } = getTikTokDateRange();
        
        const response = await fetch('/api/tiktok/ad-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update KPIs
        document.getElementById('tiktokAdsTotalAds').textContent = (data.totals?.ads || 0).toLocaleString();
        document.getElementById('tiktokAdsTotalSpend').textContent = '$' + (data.totals?.spend || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('tiktokAdsTotalClicks').textContent = (data.totals?.clicks || 0).toLocaleString();
        document.getElementById('tiktokAdsTotalConversions').textContent = (data.totals?.conversions || 0).toLocaleString();
        
        // Render ads table with filters
        window._tiktokAllAds = (data.ads || []).sort((a, b) => b.spend - a.spend);
        renderTikTokAdsTable(window._tiktokAllAds);
        
        // Populate campaign filter
        const campaigns = [...new Set(data.ads.map(a => a.campaignName))].sort();
        const ttCampaignSelect = document.getElementById('ttFilterCampaign');
        if (ttCampaignSelect) {
            ttCampaignSelect.innerHTML = '<option value="">All Campaigns</option>' + 
                campaigns.map(c => '<option value="' + c + '">' + c + '</option>').join('');
            ttCampaignSelect.addEventListener('change', () => renderTikTokAdsTable(data.ads));
        }
        const ttStatusSelect = document.getElementById('ttFilterStatus');
        if (ttStatusSelect) {
            ttStatusSelect.addEventListener('change', () => renderTikTokAdsTable(data.ads));
        }
        const ttClearBtn = document.getElementById('ttClearFilters');
        if (ttClearBtn) {
            ttClearBtn.addEventListener('click', () => {
                if (ttCampaignSelect) ttCampaignSelect.value = '';
                if (ttStatusSelect) ttStatusSelect.value = '';
                renderTikTokAdsTable(data.ads);
            });
        }
        
        // Store ads data for filtering
        window._tiktokAdsData = data.ads;
        
        tiktokAdsDataLoaded = true;
        updateLastUpdated();
    } catch (error) {
        console.error('TikTok ads data error:', error);
        tbody.innerHTML = '<tr><td colspan="11" class="loading">Error loading TikTok ads: ' + error.message + '</td></tr>';
    }
}

// Fetch and toggle ad set (ad group) breakdown for a campaign
async function toggleAdSetBreakdown(campaignId, row) {
    const existingDetail = row.nextElementSibling;
    if (existingDetail && existingDetail.classList.contains('adset-detail-row')) {
        existingDetail.remove();
        row.classList.remove('expanded');
        return;
    }
    
    // Remove any other open detail rows
    document.querySelectorAll('.adset-detail-row').forEach(r => r.remove());
    document.querySelectorAll('#campaignBody tr.expanded').forEach(r => r.classList.remove('expanded'));
    
    row.classList.add('expanded');
    const colCount = row.children.length;
    
    // Insert loading row
    const loadingRow = document.createElement('tr');
    loadingRow.className = 'adset-detail-row';
    loadingRow.innerHTML = `<td colspan="${colCount}" style="padding:0"><div style="padding:12px 20px;color:#888;font-size:13px;">Loading ad sets...</div></td>`;
    row.after(loadingRow);
    
    try {
        const range = dateRanges[currentRange];
        let insightsQuery;
        if (range.custom && customStartDate && customEndDate) {
            insightsQuery = `insights.time_range({"since":"${customStartDate}","until":"${customEndDate}"})`;
        } else if (range.preset) {
            insightsQuery = `insights.date_preset(${range.preset})`;
        } else {
            const today = getESTDate();
            const since = new Date(today);
            since.setDate(today.getDate() - range.days + 1);
            insightsQuery = `insights.time_range({"since":"${formatDateEST(since)}","until":"${formatDateEST(today)}"})`;
        }
        
        const adsetData = await apiCall(
            `${campaignId}/adsets?fields=name,status,effective_status,campaign_id,${insightsQuery}{spend,impressions,clicks,actions}&limit=100`
        );
        
        const adsets = (adsetData.data || []).filter(a => a.effective_status === 'ACTIVE' || a.insights?.data?.[0]);
        
        if (adsets.length === 0) {
            loadingRow.innerHTML = `<td colspan="${colCount}" style="padding:0"><div style="padding:12px 20px;color:#888;font-size:13px;">No ad set data found</div></td>`;
            return;
        }
        
        adsets.sort((a, b) => parseFloat(b.insights?.data?.[0]?.spend || 0) - parseFloat(a.insights?.data?.[0]?.spend || 0));
        
        const showBudget = currentRange === 'today' || currentRange === 'yesterday';
        
        let tableHtml = `<td colspan="${colCount}" style="padding:0">
            <div style="background:#f8f9ff;border-left:3px solid #667eea;margin:0;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                    <thead>
                        <tr style="background:#eef0ff;color:#555;">
                            <th style="padding:8px 12px;text-align:left;">Ad Set</th>
                            <th style="padding:8px 12px;text-align:left;">Status</th>
                            <th style="padding:8px 12px;text-align:right;">Spend</th>
                            <th style="padding:8px 12px;text-align:right;">Impressions</th>
                            <th style="padding:8px 12px;text-align:right;">Clicks</th>
                            <th style="padding:8px 12px;text-align:right;">CTR</th>
                            <th style="padding:8px 12px;text-align:right;">Results</th>
                            <th style="padding:8px 12px;text-align:right;">Cost/Result</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        adsets.forEach(adset => {
            const ins = adset.insights?.data?.[0] || {};
            const spend = parseFloat(ins.spend || 0);
            const impressions = parseInt(ins.impressions || 0);
            const clicks = parseInt(ins.clicks || 0);
            const results = getResults(ins.actions);
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            const statusDot = adset.effective_status === 'ACTIVE' ? '🟢' : '⚪';
            
            tableHtml += `
                <tr class="adset-row-clickable" data-adset-id="${adset.id}" data-adset-name="${adset.name}" style="border-top:1px solid #e2e5f1;cursor:pointer;" onclick="toggleDailyBreakdown('${adset.id}', '${adset.name.replace(/'/g, '\\\'').replace(/"/g, '&quot;')}', this)">
                    <td style="padding:8px 12px;"><span class="expand-arrow" style="color:#42b883;margin-right:5px;">▶</span>${adset.name}</td>
                    <td style="padding:8px 12px;">${statusDot}</td>
                    <td style="padding:8px 12px;text-align:right;">$${spend.toLocaleString('en-US', {minimumFractionDigits:2})}</td>
                    <td style="padding:8px 12px;text-align:right;">${impressions.toLocaleString()}</td>
                    <td style="padding:8px 12px;text-align:right;">${clicks.toLocaleString()}</td>
                    <td style="padding:8px 12px;text-align:right;">${ctr}</td>
                    <td style="padding:8px 12px;text-align:right;">${results}</td>
                    <td style="padding:8px 12px;text-align:right;">${costPerResult}</td>
                </tr>`;
        });
        
        tableHtml += '</tbody></table></div></td>';
        loadingRow.innerHTML = tableHtml;
        
    } catch(e) {
        console.error('Ad set breakdown error:', e);
        loadingRow.innerHTML = `<td colspan="${colCount}" style="padding:0"><div style="padding:12px 20px;color:#e53e3e;font-size:13px;">Error loading ad sets: ${e.message}</div></td>`;
    }
}

// Toggle daily breakdown for an ad set
async function toggleDailyBreakdown(adsetId, adsetName, row) {
    const expandArrow = row.querySelector('.expand-arrow');
    const existingDetail = row.nextElementSibling;
    
    // Check if this ad set's breakdown is already open
    if (existingDetail && existingDetail.classList.contains('daily-breakdown-row')) {
        existingDetail.remove();
        expandArrow.textContent = '▶';
        return;
    }
    
    // Remove any other open daily breakdowns
    document.querySelectorAll('.daily-breakdown-row').forEach(r => r.remove());
    document.querySelectorAll('.adset-row-clickable .expand-arrow').forEach(arrow => arrow.textContent = '▶');
    
    expandArrow.textContent = '▼';
    
    // Insert loading row
    const loadingRow = document.createElement('tr');
    loadingRow.className = 'daily-breakdown-row';
    loadingRow.innerHTML = `<td colspan="8" style="padding:0;background:#f0f8ff;"><div style="padding:15px 20px;color:#666;font-size:13px;text-align:center;">Loading daily breakdown...</div></td>`;
    row.after(loadingRow);
    
    try {
        const range = dateRanges[currentRange];
        let timeRange;
        if (range.custom && customStartDate && customEndDate) {
            timeRange = `{"since":"${customStartDate}","until":"${customEndDate}"}`;
        } else if (range.preset) {
            // For presets, calculate the actual date range
            const today = getESTDate();
            let since, until;
            
            if (range.preset === 'yesterday') {
                since = new Date(today);
                since.setDate(since.getDate() - 1);
                until = new Date(since);
            } else if (range.days) {
                since = new Date(today);
                since.setDate(today.getDate() - range.days + 1);
                until = new Date(today);
            } else {
                since = new Date(today);
                until = new Date(today);
            }
            
            timeRange = `{"since":"${formatDateEST(since)}","until":"${formatDateEST(until)}"}`;
        } else {
            const today = getESTDate();
            const since = new Date(today);
            since.setDate(today.getDate() - range.days + 1);
            timeRange = `{"since":"${formatDateEST(since)}","until":"${formatDateEST(today)}"}`;
        }
        
        const dailyData = await apiCall(
            `${ACCOUNT_ID}/insights?level=adset&fields=adset_name,spend,clicks,actions&time_increment=1&filtering=[{"field":"adset.id","operator":"IN","value":["${adsetId}"]}]&time_range=${timeRange}`
        );
        
        if (!dailyData.data || dailyData.data.length === 0) {
            loadingRow.innerHTML = `<td colspan="8" style="padding:0;background:#f0f8ff;"><div style="padding:15px 20px;color:#999;font-size:13px;text-align:center;font-style:italic;">No daily data found for this ad set</div></td>`;
            return;
        }
        
        // Sort by date descending
        const sortedData = dailyData.data.sort((a, b) => new Date(b.date_start) - new Date(a.date_start));
        
        // Generate unique chart ID
        const chartId = `daily-chart-${adsetId}`;
        
        let breakdownHtml = `<td colspan="8" style="padding:0;background:#f0f8ff;">
            <div style="padding:15px 20px;">
                <h5 style="margin:0 0 15px 0;color:#42b883;font-size:14px;border-bottom:1px solid #42b883;padding-bottom:5px;">Daily Breakdown: ${adsetName}</h5>
                <div style="display:flex;gap:20px;align-items:flex-start;">
                    <div style="flex:1;min-width:300px;">
                        <table style="width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.1);">
                            <thead>
                                <tr style="background:#42b883;color:white;">
                                    <th style="padding:10px;text-align:left;font-weight:600;font-size:13px;">Date</th>
                                    <th style="padding:10px;text-align:right;font-weight:600;font-size:13px;">Results</th>
                                    <th style="padding:10px;text-align:right;font-weight:600;font-size:13px;">Cost/Result</th>
                                    <th style="padding:10px;text-align:right;font-weight:600;font-size:13px;">Spend</th>
                                </tr>
                            </thead>
                            <tbody>`;
        
        const chartData = [];
        
        sortedData.forEach(day => {
            const spend = parseFloat(day.spend || 0);
            const results = getResults(day.actions);
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            const date = new Date(day.date_start).toLocaleDateString();
            
            breakdownHtml += `
                <tr>
                    <td style="padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;">${date}</td>
                    <td style="padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${results}</td>
                    <td style="padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">${costPerResult}</td>
                    <td style="padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;">$${spend.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
            `;
            
            // Prepare chart data (reverse order for chart)
            chartData.unshift({
                date: date,
                results: results,
                spend: spend,
                costPerResult: results > 0 ? spend / results : 0
            });
        });
        
        breakdownHtml += `
                            </tbody>
                        </table>
                    </div>
                    <div style="flex:1;min-width:300px;">
                        <canvas id="${chartId}" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        </td>`;
        
        loadingRow.innerHTML = breakdownHtml;
        
        // Create the chart
        setTimeout(() => createDailyBreakdownChart(chartId, chartData), 100);
        
    } catch (e) {
        console.error('Error loading daily breakdown:', e);
        loadingRow.innerHTML = `<td colspan="8" style="padding:0;background:#f0f8ff;"><div style="padding:15px 20px;color:#dc3545;font-size:13px;text-align:center;">Error loading daily breakdown: ${e.message}</div></td>`;
    }
}

// Create chart for daily breakdown
function createDailyBreakdownChart(chartId, data) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Results',
                data: data.map(d => d.results),
                borderColor: '#1877f2',
                backgroundColor: 'rgba(24, 119, 242, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Cost per Result',
                data: data.map(d => d.costPerResult),
                borderColor: '#42b883',
                backgroundColor: 'rgba(66, 184, 131, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: '#666'
                    },
                    ticks: {
                        color: '#666'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Results',
                        color: '#1877f2'
                    },
                    ticks: {
                        color: '#1877f2'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Cost per Result ($)',
                        color: '#42b883'
                    },
                    ticks: {
                        color: '#42b883'
                    },
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}


// ========== MEDWORK FUNNEL ==========

const TRACKING_TYPE_LABELS = {
    'mutm': 'Facebook',
    'outm': 'Organic/Website',
    'tutm': 'TikTok',
    'gbputm': 'Google Business Profile',
    'g1utm': 'Google Ads',
    'butm': 'Bing',
    'igoutm': 'Instagram',
    'pts_mutm': 'PTS Meta',
    'gbutm': 'Google Brand',
    '': 'Unknown',
    'null': 'Unknown'
};

const STAGE_LABELS = {
    'l_f_s': 'Lead Form Submissions',
    'is_booked': 'Booked',
    'sent_to_verification': 'Sent to Verification',
    'is_booked_covered': 'Booked & Covered',
    'initial_fulfilled': 'Initial Fulfilled'
};

const STAGE_COLORS = {
    'l_f_s': '#22c55e',
    'is_booked': '#16a34a',
    'sent_to_verification': '#15803d',
    'is_booked_covered': '#166534',
    'initial_fulfilled': '#14532d'
};

let medworkFunnelDataLoaded = false;
let medworkFiltersLoaded = false;

async function loadMedworkFilterOptions() {
    if (medworkFiltersLoaded) return;
    try {
        const resp = await fetch('/api/medwork/filter-options');
        const data = await resp.json();
        if (data.success) {
            const locSel = document.getElementById('medworkLocationFilter');
            const insSel = document.getElementById('medworkInsuranceFilter');
            
            data.locations.forEach(loc => {
                const opt = document.createElement('option');
                opt.value = loc;
                opt.textContent = loc;
                locSel.appendChild(opt);
            });
            
            data.insuranceTypes.forEach(ins => {
                const opt = document.createElement('option');
                opt.value = ins;
                opt.textContent = ins;
                insSel.appendChild(opt);
            });
            
            medworkFiltersLoaded = true;
        }
    } catch (e) {
        console.error('Failed to load medwork filter options:', e);
    }
}

async function loadMedworkFunnelData() {
    const loading = document.getElementById('medworkFunnelLoading');
    const content = document.getElementById('medworkFunnelContent');
    const tablesDiv = document.getElementById('medworkFunnelTables');
    
    loading.style.display = 'block';
    content.style.display = 'none';
    
    // Load filter options in parallel
    loadMedworkFilterOptions();
    
    // Get date range (same pattern as other views)
    const range = dateRanges[currentRange];
    let startDate, endDate;
    
    if (range.custom && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
    } else if (range.preset === 'today' || range.preset === 'yesterday') {
        const today = getESTDate();
        const d = new Date(today);
        if (range.preset === 'yesterday') d.setDate(d.getDate() - 1);
        startDate = endDate = formatDateEST(d);
    } else if (range.days) {
        const today = getESTDate();
        const start = new Date(today);
        start.setDate(today.getDate() - range.days + 1);
        startDate = formatDateEST(start);
        endDate = formatDateEST(today);
    }

    const location = document.getElementById('medworkLocationFilter').value;
    const insuranceType = document.getElementById('medworkInsuranceFilter').value;

    try {
        const resp = await fetch('/api/medwork/weekly-funnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate, location, insuranceType })
        });
        const data = await resp.json();
        
        if (!data.success) {
            tablesDiv.innerHTML = `<div style="color: #ef4444; padding: 20px;">Error: ${data.error}</div>`;
            loading.style.display = 'none';
            content.style.display = 'block';
            return;
        }

        const { stages, weeks, trackingTypes } = data;

        // Get current week (Monday of this week)
        const now = getESTDate();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const currentWeek = formatDateEST(monday);

        // Format week header
        const formatWeekHeader = (weekStr) => {
            const d = new Date(weekStr + 'T00:00:00');
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${months[d.getMonth()]} ${d.getDate()}`;
        };

        // Build tables for each stage
        let html = '';
        const stageOrder = ['l_f_s', 'is_booked', 'sent_to_verification', 'is_booked_covered', 'initial_fulfilled'];

        stageOrder.forEach(stage => {
            const stageRows = stages[stage] || [];
            const color = STAGE_COLORS[stage];
            const label = STAGE_LABELS[stage];

            // Build pivot: tracking_type -> { week -> count }
            const pivot = {};
            const typeTotals = {};
            stageRows.forEach(r => {
                if (!pivot[r.tracking_type]) pivot[r.tracking_type] = {};
                pivot[r.tracking_type][r.week] = (pivot[r.tracking_type][r.week] || 0) + r.count;
                typeTotals[r.tracking_type] = (typeTotals[r.tracking_type] || 0) + r.count;
            });

            // Sort tracking types by total desc
            const sortedTypes = Object.keys(pivot).sort((a, b) => (typeTotals[b] || 0) - (typeTotals[a] || 0));

            // Grand total
            const grandTotal = Object.values(typeTotals).reduce((a, b) => a + b, 0);

            html += `<section class="table-section" style="margin-bottom: 24px;">`;
            html += `<h2 style="color: ${color}; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                <span style="width: 12px; height: 12px; border-radius: 3px; background: ${color}; display: inline-block;"></span>
                ${label} <span style="font-size: 14px; color: #94a3b8; font-weight: normal;">(Total: ${grandTotal.toLocaleString()})</span>
            </h2>`;
            html += `<div style="overflow-x: auto;">`;
            html += `<table class="data-table" style="min-width: 100%; white-space: nowrap;">`;
            
            // Header row
            html += `<thead><tr><th style="position: sticky; left: 0; background: #1e293b; z-index: 2; min-width: 140px;">Source</th>`;
            weeks.forEach(w => {
                const isCurrent = w === currentWeek;
                html += `<th style="text-align: right; min-width: 70px;${isCurrent ? ' background: #1e3a5f; color: #60a5fa;' : ''}">${formatWeekHeader(w)}</th>`;
            });
            html += `<th style="text-align: right; min-width: 80px; font-weight: 700; border-left: 2px solid #475569;">Total</th></tr></thead>`;
            
            // Data rows
            html += `<tbody>`;
            sortedTypes.forEach(type => {
                const friendly = TRACKING_TYPE_LABELS[type] || type || 'Unknown';
                html += `<tr><td style="position: sticky; left: 0; background: #0f172a; z-index: 1; font-weight: 500;">${friendly}</td>`;
                weeks.forEach(w => {
                    const val = pivot[type][w] || 0;
                    const isCurrent = w === currentWeek;
                    html += `<td style="text-align: right;${isCurrent ? ' background: rgba(30,58,95,0.3);' : ''}${val === 0 ? ' color: #475569;' : ''}">${val > 0 ? val.toLocaleString() : '-'}</td>`;
                });
                html += `<td style="text-align: right; font-weight: 700; border-left: 2px solid #475569;">${(typeTotals[type] || 0).toLocaleString()}</td></tr>`;
            });

            // Totals row
            html += `<tr style="font-weight: 700; border-top: 2px solid #475569; background: rgba(30,41,59,0.5);"><td style="position: sticky; left: 0; background: #1e293b; z-index: 1;">Total</td>`;
            weeks.forEach(w => {
                const weekTotal = sortedTypes.reduce((sum, type) => sum + (pivot[type][w] || 0), 0);
                const isCurrent = w === currentWeek;
                html += `<td style="text-align: right;${isCurrent ? ' background: rgba(30,58,95,0.3);' : ''}">${weekTotal > 0 ? weekTotal.toLocaleString() : '-'}</td>`;
            });
            html += `<td style="text-align: right; border-left: 2px solid #475569;">${grandTotal.toLocaleString()}</td></tr>`;
            html += `</tbody></table></div></section>`;
        });

        if (weeks.length === 0) {
            html = '<div style="color: #94a3b8; padding: 40px; text-align: center;">No data found for the selected date range.</div>';
        }

        tablesDiv.innerHTML = html;
        loading.style.display = 'none';
        content.style.display = 'block';
        medworkFunnelDataLoaded = true;

    } catch (error) {
        console.error('Medwork funnel load error:', error);
        tablesDiv.innerHTML = `<div style="color: #ef4444; padding: 20px;">Failed to load data: ${error.message}</div>`;
        loading.style.display = 'none';
        content.style.display = 'block';
    }
}

// Wire up medwork filter dropdowns
document.getElementById('medworkLocationFilter')?.addEventListener('change', () => {
    medworkFunnelDataLoaded = false;
    loadMedworkFunnelData();
});
document.getElementById('medworkInsuranceFilter')?.addEventListener('change', () => {
    medworkFunnelDataLoaded = false;
    loadMedworkFunnelData();
});
