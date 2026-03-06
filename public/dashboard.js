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

// Keywords sorting state
let keywordsRawData = [];
let keywordsSortColumn = 'clicks';
let keywordsSortDirection = 'desc';
let keywordsSearchText = '';
let googleKeywordsCampaignFilter = '';
let googleKeywordsAdGroupFilter = '';

// QS History search
let qsHistorySearchText = '';
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

// Bing API is handled by the backend server
const BING_API_ENABLED = true;

// Ads Filters
let filterCampaign = '';
let filterAdset = '';
let filterAd = '';
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
            searchTermsDataLoaded = false; // Reset search terms data when date changes
            summaryDataLoaded = false; // Reset summary data when date changes
            heatmapDataLoaded = false; // Reset heatmap data when date changes
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
        searchTermsDataLoaded = false;
        summaryDataLoaded = false;
        heatmapDataLoaded = false;
        
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
            if (currentView === 'oursPrivacy') {
                loadOursPrivacyData();
            }
            if (currentView === 'bingAds' && !bingAdsDataLoaded) {
                loadBingAdsData();
            }
            if (currentView === 'googleAdsCreative' && !googleAdsDataLoaded) {
                loadGoogleAdsData();
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
        googleKeywordsAdGroupFilter = ''; // Reset ad group when campaign changes
        populateGoogleKeywordsAdGroupDropdown();
        renderKeywordsTable();
    });
    
    // Google Keywords ad group filter
    document.getElementById('googleKeywordsAdGroupFilter').addEventListener('change', (e) => {
        googleKeywordsAdGroupFilter = e.target.value;
        renderKeywordsTable();
    });
    
    // Google Keywords clear filters
    document.getElementById('googleKeywordsClearFilters').addEventListener('click', () => {
        googleKeywordsCampaignFilter = '';
        googleKeywordsAdGroupFilter = '';
        keywordsSearchText = '';
        document.getElementById('googleKeywordsCampaignFilter').value = '';
        document.getElementById('googleKeywordsAdGroupFilter').value = '';
        document.getElementById('keywordsSearch').value = '';
        populateGoogleKeywordsAdGroupDropdown();
        renderKeywordsTable();
    });
    
    // QS History search
    document.getElementById('qsHistorySearch').addEventListener('input', (e) => {
        qsHistorySearchText = e.target.value.toLowerCase();
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
        refreshPlatformPlacementData();
    });
    
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
        const response = await fetch('/api/ours-privacy/lfs-by-platform?platform=meta&' + params);
        const data = await response.json();
        
        const lfsCount = data.total || 0;
        document.getElementById('funnelLfs').textContent = lfsCount.toLocaleString();
        
        const lfsRate = conversions > 0 ? ((lfsCount / conversions) * 100).toFixed(1) : 0;
        document.getElementById('funnelLfsRate').textContent = lfsRate + '% of conv';
        
        // Update funnel bar widths based on actual ratios
        updateFunnelBars(impressions, clicks, conversions, lfsCount);
    } catch (e) {
        console.error('Error fetching l_f_s for funnel:', e);
        document.getElementById('funnelLfs').textContent = '-';
        document.getElementById('funnelLfsRate').textContent = '';
        updateFunnelBars(impressions, clicks, conversions, 0);
    }
}

function updateFunnelBars(impressions, clicks, conversions, lfs) {
    const steps = document.querySelectorAll('.funnel-step');
    if (steps.length < 4) return;
    
    // Scale bars proportionally - impressions is 100%, others relative to clicks
    // Use clicks as the reference for the lower funnel (Results & l_f_s)
    steps[0].style.setProperty('--step-width', '100%');
    steps[1].style.setProperty('--step-width', clicks > 0 ? '70%' : '10%');
    
    // Results and l_f_s scaled relative to each other
    const maxLower = Math.max(conversions, lfs, 1);
    const resultsWidth = conversions > 0 ? Math.max((conversions / maxLower) * 45, 15) : 10;
    const lfsWidth = lfs > 0 ? Math.max((lfs / maxLower) * 45, 15) : 10;
    
    steps[2].style.setProperty('--step-width', resultsWidth + '%');
    steps[3].style.setProperty('--step-width', lfsWidth + '%');
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
        
        // Fetch Meta data and l_f_s data in parallel
        const [data, lfsResponse] = await Promise.all([
            apiCall(`${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&${getDateRange(range)}&time_increment=1`),
            fetch(`/api/ours-privacy/lfs-by-date?platform=meta&startDate=${startDate}&endDate=${endDate}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};

        const tbody = document.getElementById('dailyBody');
        
        if (!data.data || data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading">No daily data for this period</td></tr>';
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
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerResult = results > 0 ? '$' + (spend / results).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            
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
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Daily error:', e);
        document.getElementById('dailyBody').innerHTML = '<tr><td colspan="11" class="loading">Error loading daily data</td></tr>';
    }
}

// Load Ads Data with Creative Thumbnails
async function loadAdsData() {
    const range = dateRanges[currentRange];
    const tbody = document.getElementById('adsBody');
    tbody.innerHTML = '<tr><td colspan="14" class="loading">Loading ads...</td></tr>';

    try {
        // Get ad-level insights for current period
        const insightsData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,ctr,reach,frequency,actions,video_avg_time_watched_actions&${getDateRange(range)}&limit=100`
        );

        if (!insightsData.data || insightsData.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="loading">No ad data for this period</td></tr>';
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

        // Get creative info for each ad (batch requests in chunks of 50)
        const adIds = insightsData.data.map(ad => ad.ad_id);
        const creativeData = {};
        
        // Fetch creative IDs and created_time in batches of 50
        for (let i = 0; i < adIds.length; i += 50) {
            const batchIds = adIds.slice(i, i + 50);
            const adsWithCreatives = await apiCall(
                `?ids=${batchIds.join(',')}&fields=creative,created_time`
            );
            
            // Collect creative IDs and created_time from this batch
            Object.values(adsWithCreatives).forEach(ad => {
                creativeData[ad.id] = { 
                    creativeId: ad.creative?.id,
                    created_time: ad.created_time
                };
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
                created_time: creative.created_time
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
        tbody.innerHTML = `<tr><td colspan="14" class="loading">Error loading ads: ${e.message}</td></tr>`;
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

        return `
            <tr>
                <td>${thumbnailHtml}</td>
                <td>${ad.ad_name}</td>
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
    if (filterAd) {
        filteredData = filteredData.filter(ad => ad.ad_name === filterAd);
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
    tbody.innerHTML = '<tr><td colspan="14" class="loading">Loading ads for this placement...</td></tr>';
    
    try {
        const range = dateRanges[currentRange];
        const placementAdsData = await apiCall(
            `${ACCOUNT_ID}/insights?level=ad&fields=ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,reach,frequency,actions&breakdowns=publisher_platform,platform_position&${getDateRange(range)}&limit=200`
        );
        
        if (!placementAdsData.data) {
            tbody.innerHTML = '<tr><td colspan="14" class="loading">No data for this placement</td></tr>';
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
        tbody.innerHTML = `<tr><td colspan="14" class="loading">Error: ${e.message}</td></tr>`;
    }
}

// Render filtered ads table (for placement filter)
function renderFilteredAdsTable(ads) {
    const tbody = document.getElementById('adsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="loading">No ads for this placement</td></tr>';
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
    if (filterAd) {
        filteredData = filteredData.filter(ad => ad.ad_name === filterAd);
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
            'mutm': { name: 'Meta', color: '#4267B2', emoji: '📘' },
            'outm': { name: 'Organic', color: '#34A853', emoji: '🌿' },
            'tutm': { name: 'TikTok', color: '#00f2ea', emoji: '🎵' },
            'g1utm': { name: 'Google', color: '#EA4335', emoji: '🔴' },
            'butm': { name: 'Bing', color: '#00A4EF', emoji: '🔷' },
            'gbputm': { name: 'GBP', color: '#F4B400', emoji: '📍' }
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
                        <div class="mini-funnel-row highlight"><span>l_f_s</span><span>${d.l_f_s.toLocaleString()}</span></div>
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
            { label: 'l_f_s', value: totals.l_f_s, color: '#6366f1' },
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
        const [metaData, googleData, bingData, metaLfs, googleLfs, bingLfs] = await Promise.all([
            apiCall(`${ACCOUNT_ID}/insights?fields=spend,impressions,clicks,actions&time_range={"since":"${startDate}","until":"${endDate}"}`),
            googleApiCall('account-performance', { startDate, endDate }).catch(() => ({})),
            bingApiCall('account-performance', { startDate, endDate }).catch(() => ({})),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=meta&${params}`).then(r => r.json()).catch(() => ({ total: 0 })),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=google&${params}`).then(r => r.json()).catch(() => ({ total: 0 })),
            fetch(`/api/ours-privacy/lfs-by-platform?platform=bing&${params}`).then(r => r.json()).catch(() => ({ total: 0 }))
        ]);
        
        // Process Meta data
        const meta = metaData.data?.[0] || {};
        const metaSpend = parseFloat(meta.spend || 0);
        const metaImpressions = parseInt(meta.impressions || 0);
        const metaClicks = parseInt(meta.clicks || 0);
        const metaResults = getResults(meta.actions);
        const metaLfsCount = metaLfs.total || 0;
        
        document.getElementById('funnelMetaCost').textContent = '$' + metaSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('funnelMetaImpressions').textContent = metaImpressions.toLocaleString();
        document.getElementById('funnelMetaClicks').textContent = metaClicks.toLocaleString();
        document.getElementById('funnelMetaResults').textContent = metaResults.toLocaleString();
        document.getElementById('funnelMetaLfs').textContent = metaLfsCount.toLocaleString();
        document.getElementById('funnelMetaCostLfs').textContent = metaLfsCount > 0 ? '$' + (metaSpend / metaLfsCount).toFixed(2) : '-';
        
        // Process Google data
        const googleSpend = parseFloat(googleData.spend || 0);
        const googleImpressions = parseInt(googleData.impressions || 0);
        const googleClicks = parseInt(googleData.clicks || 0);
        const googleResults = parseFloat(googleData.conversions || 0);
        const googleLfsCount = googleLfs.total || 0;
        
        document.getElementById('funnelGoogleCost').textContent = '$' + googleSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('funnelGoogleImpressions').textContent = googleImpressions.toLocaleString();
        document.getElementById('funnelGoogleClicks').textContent = googleClicks.toLocaleString();
        document.getElementById('funnelGoogleResults').textContent = Math.round(googleResults).toLocaleString();
        document.getElementById('funnelGoogleLfs').textContent = googleLfsCount.toLocaleString();
        document.getElementById('funnelGoogleCostLfs').textContent = googleLfsCount > 0 ? '$' + (googleSpend / googleLfsCount).toFixed(2) : '-';
        
        // Process Bing data (bingApiCall returns data directly, not nested)
        const bingSpend = parseFloat(bingData.spend || 0);
        const bingImpressions = parseInt(bingData.impressions || 0);
        const bingClicks = parseInt(bingData.clicks || 0);
        const bingResults = parseFloat(bingData.conversions || 0);
        const bingLfsCount = bingLfs.total || 0;
        
        document.getElementById('funnelBingCost').textContent = '$' + bingSpend.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('funnelBingImpressions').textContent = bingImpressions.toLocaleString();
        document.getElementById('funnelBingClicks').textContent = bingClicks.toLocaleString();
        document.getElementById('funnelBingResults').textContent = Math.round(bingResults).toLocaleString();
        document.getElementById('funnelBingLfs').textContent = bingLfsCount.toLocaleString();
        document.getElementById('funnelBingCostLfs').textContent = bingLfsCount > 0 ? '$' + (bingSpend / bingLfsCount).toFixed(2) : '-';
        
        // Load Medwork funnel for Funnels view with spend data for cost per stage
        const spendByPlatform = {
            mutm: metaSpend,      // Meta
            g1utm: googleSpend,   // Google
            butm: bingSpend,      // Bing
            outm: 0,              // Organic (no spend)
            tutm: 0,              // TikTok (not integrated yet)
            gbputm: 0             // GBP (no spend)
        };
        await loadFunnelsMedworkData(startDate, endDate, spendByPlatform);
        
        // Render comparison chart
        renderFunnelsComparisonChart({
            meta: { spend: metaSpend, results: metaResults, lfs: metaLfsCount },
            google: { spend: googleSpend, results: googleResults, lfs: googleLfsCount },
            bing: { spend: bingSpend, results: bingResults, lfs: bingLfsCount }
        });
        
    } catch (e) {
        console.error('Error loading funnels data:', e);
    }
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
            'mutm': { name: 'Meta', color: '#4267B2', icon: '<img src="images/meta-logo.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;">' },
            'outm': { name: 'Organic', color: '#34A853', icon: '🌿' },
            'tutm': { name: 'TikTok', color: '#00f2ea', icon: '🎵' },
            'g1utm': { name: 'Google', color: '#EA4335', icon: '🔴' },
            'butm': { name: 'Bing', color: '#00A4EF', icon: '🔷' },
            'gbputm': { name: 'GBP', color: '#F4B400', icon: '📍' }
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
                        <div class="mini-funnel-row highlight"><span>l_f_s</span><span>${d.l_f_s.toLocaleString()}</span><span class="cost-badge">${formatCost(spend, d.l_f_s)}</span></div>
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
            { label: 'l_f_s', value: totals.l_f_s, color: '#6366f1' },
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
                title: { display: true, text: 'Results vs l_f_s by Platform' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

async function loadSummaryData() {
    document.getElementById('summaryDailyBody').innerHTML = '<tr><td colspan="10" class="loading">Loading summary data...</td></tr>';
    document.getElementById('summaryWeeklyBody').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
    document.getElementById('summaryMonthlyBody').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';
    
    try {
        // Get date range based on current filter
        const range = dateRanges[currentRange];
        const today = getESTDate();
        const dates = [];
        
        // Determine number of days based on current range
        let numDays = range.days || 14;
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
        
        const startDate = dates[dates.length - 1];
        const endDate = dates[0];
        
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
        let totalMeta = 0, totalGoogle = 0, totalBing = 0;
        let totalMetaConv = 0, totalGoogleConv = 0, totalBingConv = 0;
        
        dates.forEach(date => {
            const d = new Date(date + 'T12:00:00');
            const dayName = dayNames[d.getDay()];
            const meta = metaByDate[date] || 0;
            const google = googleByDate[date] || 0;
            const bing = bingByDate[date] || 0;
            const total = meta + google + bing;
            
            const metaConv = metaConvByDate[date] || 0;
            const googleConv = googleConvByDate[date] || 0;
            const bingConv = bingConvByDate[date] || 0;
            const totalConv = metaConv + googleConv + bingConv;
            
            totalMeta += meta;
            totalGoogle += google;
            totalBing += bing;
            totalMetaConv += metaConv;
            totalGoogleConv += googleConv;
            totalBingConv += bingConv;
            
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
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                    <td><strong>${totalConv.toFixed(1)}</strong></td>
                </tr>
            `;
        });
        
        document.getElementById('summaryDailyBody').innerHTML = dailyHtml;
        
        // Add totals row
        const grandTotal = totalMeta + totalGoogle + totalBing;
        const grandTotalConvDaily = totalMetaConv + totalGoogleConv + totalBingConv;
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
                <td><strong>$${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>${grandTotalConvDaily.toFixed(1)}</strong></td>
            </tr>
        `;
        
        // Update KPI cards
        const grandTotalConv = totalMetaConv + totalGoogleConv + totalBingConv;
        document.getElementById('summaryTotalSpend').textContent = '$' + grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryTotalConversions').textContent = grandTotalConv.toFixed(1);
        document.getElementById('summaryMetaSpend').textContent = '$' + totalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryMetaConversions').textContent = totalMetaConv.toFixed(1);
        document.getElementById('summaryGoogleSpend').textContent = '$' + totalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryGoogleConversions').textContent = totalGoogleConv.toFixed(1);
        document.getElementById('summaryBingSpend').textContent = '$' + totalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        document.getElementById('summaryBingConversions').textContent = totalBingConv.toFixed(1);
        
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
        let weeklyTotalMeta = 0, weeklyTotalGoogle = 0, weeklyTotalBing = 0;
        
        aggregatedData.slice(0, 2).forEach(row => {
            const total = row.meta + row.google + row.bing;
            weeklyTotalMeta += row.meta;
            weeklyTotalGoogle += row.google;
            weeklyTotalBing += row.bing;
            
            weeklyHtml += `
                <tr>
                    <td>${row.name}</td>
                    <td>${row.meta > 0 ? '$' + row.meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.google > 0 ? '$' + row.google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.bing > 0 ? '$' + row.bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                </tr>
            `;
        });
        
        const weeklyGrandTotal = weeklyTotalMeta + weeklyTotalGoogle + weeklyTotalBing;
        weeklyHtml += `
            <tr class="total-row">
                <td><strong>2-Week Total</strong></td>
                <td><strong>$${weeklyTotalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyTotalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyTotalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${weeklyGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
        `;
        document.getElementById('summaryWeeklyBody').innerHTML = weeklyHtml;
        
        // Monthly table
        let monthlyHtml = '';
        let monthlyTotalMeta = 0, monthlyTotalGoogle = 0, monthlyTotalBing = 0;
        
        aggregatedData.slice(2).forEach(row => {
            const total = row.meta + row.google + row.bing;
            monthlyTotalMeta += row.meta;
            monthlyTotalGoogle += row.google;
            monthlyTotalBing += row.bing;
            
            monthlyHtml += `
                <tr>
                    <td>${row.name}</td>
                    <td>${row.meta > 0 ? '$' + row.meta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.google > 0 ? '$' + row.google.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td>${row.bing > 0 ? '$' + row.bing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '$0.00'}</td>
                    <td><strong>$${total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                </tr>
            `;
        });
        
        const monthlyGrandTotal = monthlyTotalMeta + monthlyTotalGoogle + monthlyTotalBing;
        monthlyHtml += `
            <tr class="total-row">
                <td><strong>Grand Total</strong></td>
                <td><strong>$${monthlyTotalMeta.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyTotalGoogle.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyTotalBing.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
                <td><strong>$${monthlyGrandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></td>
            </tr>
        `;
        document.getElementById('summaryMonthlyBody').innerHTML = monthlyHtml;
        
        summaryDataLoaded = true;
        updateLastUpdated();
        
    } catch (error) {
        console.error('Summary error:', error);
        document.getElementById('summaryDailyBody').innerHTML = '<tr><td colspan="10" class="error">Error loading summary data</td></tr>';
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
        // Fetch Bing data and l_f_s data in parallel
        const [data, lfsResponse] = await Promise.all([
            bingApiCall('daily-performance', {
                startDate: dateRange.since,
                endDate: dateRange.until
            }),
            fetch(`/api/ours-privacy/lfs-by-date?platform=bing&startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};

        const tbody = document.getElementById('bingDailyBody');
        
        if (!data?.rows || data.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading">No daily data for this period</td></tr>';
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
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            
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
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Bing Daily error:', e);
        document.getElementById('bingDailyBody').innerHTML = `<tr><td colspan="11" class="loading">Error: ${e.message}</td></tr>`;
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
        // Fetch Google data and l_f_s data in parallel
        const [data, lfsResponse] = await Promise.all([
            googleApiCall('daily-performance', {
                startDate: dateRange.since,
                endDate: dateRange.until
            }),
            fetch(`/api/ours-privacy/lfs-by-date?platform=google&startDate=${dateRange.since}&endDate=${dateRange.until}`).then(r => r.json())
        ]);
        
        const lfsByDate = lfsResponse.byDate || {};

        const tbody = document.getElementById('googleDailyBody');
        
        if (!data?.rows || data.rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" class="loading">No daily data for this period</td></tr>';
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
            
            const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '-';
            const cpc = clicks > 0 ? '$' + (spend / clicks).toFixed(2) : '-';
            const costPerConv = conversions > 0 ? '$' + (spend / conversions).toFixed(2) : '-';
            const costPerLfs = lfs > 0 ? '$' + (spend / lfs).toFixed(2) : '-';
            
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
                </tr>
            `;
        }).join('');
    } catch (e) { 
        console.error('Google Daily error:', e);
        document.getElementById('googleDailyBody').innerHTML = `<tr><td colspan="11" class="loading">Error: ${e.message}</td></tr>`;
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
        googleKeywordsAdGroupFilter = '';
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
    if (googleKeywordsAdGroupFilter) {
        filtered = filtered.filter(kw => kw.adGroup === googleKeywordsAdGroupFilter);
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
    const adGroupSelect = document.getElementById('googleKeywordsAdGroupFilter');
    adGroupSelect.innerHTML = '<option value="">All Ad Groups</option>' + 
        adGroups.map(a => `<option value="${a}">${a}</option>`).join('');
    
    // Reset filter if current selection not in list
    if (googleKeywordsAdGroupFilter && !adGroups.includes(googleKeywordsAdGroupFilter)) {
        googleKeywordsAdGroupFilter = '';
        adGroupSelect.value = '';
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
            if (kw.qs30dAgo) {
                oldQsSum += kw.qs30dAgo;
                oldQsCount++;
            }
            
            const change = (kw.currentQs || 0) - (kw.qs30dAgo || kw.currentQs || 0);
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
        filtered = qsHistoryRawData.filter(kw => 
            kw.keyword.toLowerCase().includes(qsHistorySearchText)
        );
    }
    
    // Build table
    document.getElementById('qsHistoryBody').innerHTML = filtered.map(kw => {
        const currentQs = kw.currentQs || '-';
        const qs7d = kw.qs7dAgo || '-';
        const qs30d = kw.qs30dAgo || '-';
        
        const change = kw.currentQs && kw.qs30dAgo ? kw.currentQs - kw.qs30dAgo : 0;
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
                <td class="${qsClass}">${currentQs}</td>
                <td>${qs7d}</td>
                <td>${qs30d}</td>
                <td class="${trendClass}">${trendIcon}</td>
                <td class="${trendClass}">${changeText}</td>
            </tr>
        `;
    }).join('');
    
    if (filtered.length === 0) {
        document.getElementById('qsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">No keywords match the search</td></tr>';
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
        
        // Extract state from canonical name (format: "ZIP,State,Country")
        let stateAbbr = '';
        if (loc.canonicalName) {
            const parts = loc.canonicalName.split(',');
            if (parts.length >= 2) {
                const stateName = parts[1].trim();
                // Convert state name to abbreviation
                const stateMap = {
                    'New York': 'NY', 'California': 'CA', 'Texas': 'TX', 'New Jersey': 'NJ',
                    'Connecticut': 'CT', 'Maryland': 'MD', 'District of Columbia': 'DC',
                    'Florida': 'FL', 'Pennsylvania': 'PA', 'Virginia': 'VA', 'Massachusetts': 'MA',
                    'Georgia': 'GA', 'Illinois': 'IL', 'Ohio': 'OH', 'Michigan': 'MI',
                    'North Carolina': 'NC', 'Arizona': 'AZ', 'Washington': 'WA', 'Colorado': 'CO'
                };
                stateAbbr = stateMap[stateName] || stateName.substring(0, 2).toUpperCase();
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
            if (kw.qs30dAgo) {
                oldQsSum += kw.qs30dAgo;
                oldQsCount++;
            }
            
            const change = kw.currentQs && kw.qs30dAgo ? kw.currentQs - kw.qs30dAgo : 0;
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
    
    document.getElementById('bingQsHistoryBody').innerHTML = filtered.map(kw => {
        const currentQs = kw.currentQs || '-';
        const qs7d = kw.qs7dAgo || '-';
        const qs30d = kw.qs30dAgo || '-';
        
        const change = kw.currentQs && kw.qs30dAgo ? kw.currentQs - kw.qs30dAgo : 0;
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
            <td class="${qsClass}">${currentQs}</td>
            <td>${qs7d}</td>
            <td>${qs30d}</td>
            <td class="${trendClass}">${trendIcon}</td>
            <td class="${trendClass}">${changeText}</td>
        </tr>`;
    }).join('');
    
    if (filtered.length === 0) {
        document.getElementById('bingQsHistoryBody').innerHTML = '<tr><td colspan="6" class="loading">No keywords match the search</td></tr>';
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
    document.getElementById('bingGeoBody').innerHTML = '<tr><td colspan="10" class="loading">Loading geographic data...</td></tr>';
    
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
        document.getElementById('bingGeoBody').innerHTML = `<tr><td colspan="10" class="loading">Error: ${e.message}</td></tr>`;
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
        document.getElementById('bingGeoBody').innerHTML = '<tr><td colspan="10" class="loading">No locations match the search</td></tr>';
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
let heatmapRawData = [];
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
    document.getElementById('bingAdsBody').innerHTML = '<tr><td colspan="10" class="loading">Loading ad data...</td></tr>';
    
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
        document.getElementById('bingAdsBody').innerHTML = '<tr><td colspan="10" class="loading">Error loading ad data</td></tr>';
    }
}

function renderBingAdsTable(ads) {
    const tbody = document.getElementById('bingAdsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">No ad data available</td></tr>';
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
    document.getElementById('googleAdsBody').innerHTML = '<tr><td colspan="10" class="loading">Loading ad data...</td></tr>';
    
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
        document.getElementById('googleAdsBody').innerHTML = '<tr><td colspan="10" class="loading">Error loading ad data</td></tr>';
    }
}

function renderGoogleAdsTable(ads) {
    const tbody = document.getElementById('googleAdsBody');
    
    if (ads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading">No ad data available</td></tr>';
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
        // Get current date range
        const startDateEl = document.getElementById("startDate");
        const endDateEl = document.getElementById("endDate");
        let startDate = startDateEl ? startDateEl.value : "";
        let endDate = endDateEl ? endDateEl.value : "";
        
        if (!startDate || !endDate) {
            const today = new Date();
            const end = new Date(today);
            let start = new Date(today);
            
            if (typeof currentRange !== "undefined") {
                if (currentRange === "today") {
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
            lfsBody.innerHTML = "<tr><td colspan=\"2\" style=\"padding:15px;color:#888;\">No l_f_s events</td></tr>";
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
        
    } catch (err) {
        console.error("Ours Privacy load error:", err);
    }
}


// Hook into view switching
const originalSwitchView = typeof switchView === "function" ? switchView : null;
if (originalSwitchView) {
    const newSwitchView = function(view) {
        originalSwitchView(view);
        if (view === "oursPrivacy") {
            loadOursPrivacyData();
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
            }
        });
    });
}
