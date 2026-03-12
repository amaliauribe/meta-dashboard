require("dotenv").config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { GoogleAdsApi } = require('google-ads-api');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

// ==================== SQLite Persistent Webhook Storage ====================
const DATA_DIR = "/var/www/ranchi/dashboard/data";
const WEBHOOK_FILE = path.join(DATA_DIR, "webhooks.json");
const DB_FILE = path.join(DATA_DIR, "webhooks.db");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL'); // Better concurrent performance
db.pragma('synchronous = NORMAL'); // Good balance of speed and safety

// Create table if not exists
db.exec(`
    CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        source TEXT DEFAULT 'unknown',
        event_name TEXT DEFAULT '',
        visitor_id TEXT DEFAULT '',
        utm_source TEXT DEFAULT '',
        body TEXT NOT NULL,
        headers TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_webhooks_timestamp ON webhooks(timestamp);
    CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_name);
    CREATE INDEX IF NOT EXISTS idx_webhooks_source ON webhooks(source);
    CREATE INDEX IF NOT EXISTS idx_webhooks_visitor ON webhooks(visitor_id);
`);

// Prepared statements for performance
const insertStmt = db.prepare(`
    INSERT INTO webhooks (timestamp, source, event_name, visitor_id, utm_source, body, headers)
    VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const countStmt = db.prepare('SELECT COUNT(*) as count FROM webhooks');

// Save webhook to SQLite
function saveWebhookToDb(entry) {
    try {
        const eventName = entry.body?.event?.event || '';
        const visitorId = entry.body?.visitor?.visitor_id || '';
        const utmSource = entry.body?.visitor?.utm_source || '';
        insertStmt.run(
            entry.timestamp,
            entry.source || 'unknown',
            eventName,
            visitorId,
            utmSource,
            JSON.stringify(entry.body || {}),
            JSON.stringify(entry.headers || {})
        );
    } catch (e) {
        console.error("[DB] Error saving webhook:", e.message);
    }
}

// Migrate existing JSON data to SQLite (one-time)
function migrateJsonToDb() {
    const dbCount = countStmt.get().count;
    if (dbCount > 0) {
        console.log(`[DB] Already has ${dbCount} events, skipping migration`);
        return;
    }
    
    try {
        if (!fs.existsSync(WEBHOOK_FILE)) return;
        const data = JSON.parse(fs.readFileSync(WEBHOOK_FILE, "utf8"));
        console.log(`[DB] Migrating ${data.length} events from JSON to SQLite...`);
        
        const insertMany = db.transaction((entries) => {
            for (const entry of entries) {
                const eventName = entry.body?.event?.event || '';
                const visitorId = entry.body?.visitor?.visitor_id || '';
                const utmSource = entry.body?.visitor?.utm_source || '';
                insertStmt.run(
                    entry.timestamp || new Date().toISOString(),
                    entry.source || 'unknown',
                    eventName,
                    visitorId,
                    utmSource,
                    JSON.stringify(entry.body || {}),
                    JSON.stringify(entry.headers || {})
                );
            }
        });
        
        insertMany(data);
        console.log(`[DB] Migration complete! ${countStmt.get().count} events in database`);
    } catch (e) {
        console.error("[DB] Migration error:", e.message);
    }
}

// Run migration
migrateJsonToDb();

// ==================== Legacy JSON Storage (kept for compatibility) ====================

// Load existing data on startup
function loadWebhookData() {
    try {
        if (fs.existsSync(WEBHOOK_FILE)) {
            const data = fs.readFileSync(WEBHOOK_FILE, "utf8");
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Error loading webhook data:", e.message);
    }
    return [];
}

// Save data to file (legacy)
function saveWebhookData(data) {
    try {
        fs.writeFileSync(WEBHOOK_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error saving webhook data:", e.message);
    }
}

// Initialize global webhook data from file
global.webhookData = loadWebhookData();
console.log("[WEBHOOK] Loaded", global.webhookData.length, "historical events from JSON storage");
console.log("[DB] SQLite database:", DB_FILE, "- Events:", countStmt.get().count);

// Override webhook handler to persist data
app.post("/webhook", express.json(), (req, res) => {
    const timestamp = new Date().toISOString();
    const source = req.headers["x-source"] || req.body.source || "unknown";
    
    const entry = {
        timestamp,
        source,
        headers: req.headers,
        body: req.body
    };
    
    global.webhookData.push(entry);
    
    // Save to SQLite (permanent storage)
    saveWebhookToDb(entry);
    
    // Save to JSON file (legacy, async to not block response)
    setImmediate(() => saveWebhookData(global.webhookData));
    
    res.json({ success: true, message: "Data received", timestamp });
});

// Also handle POST to root
app.post("/", express.json(), (req, res) => {
    const timestamp = new Date().toISOString();
    const source = req.headers["x-source"] || req.body.source || "unknown";
    
    const entry = {
        timestamp,
        source,
        headers: req.headers,
        body: req.body
    };
    
    global.webhookData.push(entry);
    
    // Save to SQLite (permanent storage)
    saveWebhookToDb(entry);
    
    // Save to JSON file (legacy)
    setImmediate(() => saveWebhookData(global.webhookData));
    
    res.json({ success: true, message: "Data received", timestamp });
});


// Database stats endpoint
app.get("/api/db/stats", (req, res) => {
    const total = countStmt.get().count;
    const firstEvent = db.prepare('SELECT timestamp FROM webhooks ORDER BY timestamp ASC LIMIT 1').get();
    const lastEvent = db.prepare('SELECT timestamp FROM webhooks ORDER BY timestamp DESC LIMIT 1').get();
    const eventCounts = db.prepare('SELECT event_name, COUNT(*) as count FROM webhooks GROUP BY event_name ORDER BY count DESC LIMIT 20').all();
    const dbSize = fs.existsSync(DB_FILE) ? (fs.statSync(DB_FILE).size / 1024 / 1024).toFixed(1) + 'MB' : '0MB';
    
    res.json({
        totalEvents: total,
        firstEvent: firstEvent?.timestamp,
        lastEvent: lastEvent?.timestamp,
        dbSize,
        topEvents: eventCounts
    });
});

app.use(express.static('public'));

// Google Ads API Configuration
const GOOGLE_ADS_CONFIG = {
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || process.env.GOOGLE_ADS_CUSTOMER_ID
};

function isGoogleAdsConfigured() {
    return GOOGLE_ADS_CONFIG.clientId && 
           GOOGLE_ADS_CONFIG.clientSecret && 
           GOOGLE_ADS_CONFIG.developerToken &&
           GOOGLE_ADS_CONFIG.refreshToken &&
           GOOGLE_ADS_CONFIG.customerId;
}

// Google Ads API client
let googleAdsClient = null;

function getGoogleAdsClient() {
    if (!googleAdsClient && isGoogleAdsConfigured()) {
        googleAdsClient = new GoogleAdsApi({
            client_id: GOOGLE_ADS_CONFIG.clientId,
            client_secret: GOOGLE_ADS_CONFIG.clientSecret,
            developer_token: GOOGLE_ADS_CONFIG.developerToken
        });
    }
    return googleAdsClient;
}

// Make Google Ads API request
async function googleAdsApiRequest(query) {
    const client = getGoogleAdsClient();
    if (!client) {
        throw new Error('Google Ads API not configured');
    }
    
    const customerId = GOOGLE_ADS_CONFIG.customerId.replace(/-/g, '');
    const loginCustomerId = GOOGLE_ADS_CONFIG.loginCustomerId.replace(/-/g, '');
    
    console.log('Google Ads API query for customer:', customerId);
    console.log('Login customer ID:', loginCustomerId);
    
    const customer = client.Customer({
        customer_id: customerId,
        login_customer_id: loginCustomerId,
        refresh_token: GOOGLE_ADS_CONFIG.refreshToken
    });
    
    const results = await customer.query(query);
    console.log('Google Ads API success, results:', results?.length || 0);
    return results || [];
}

// TikTok Ads API Configuration
const TIKTOK_CONFIG = {
    appId: process.env.TIKTOK_APP_ID,
    appSecret: process.env.TIKTOK_APP_SECRET,
    adAccountId: process.env.TIKTOK_AD_ACCOUNT_ID,
    accessToken: process.env.TIKTOK_ACCESS_TOKEN
};

function isTikTokConfigured() {
    return TIKTOK_CONFIG.appId && 
           TIKTOK_CONFIG.appSecret && 
           TIKTOK_CONFIG.adAccountId &&
           TIKTOK_CONFIG.accessToken;
}

// Looker API Configuration
const LOOKER_CONFIG = {
    baseUrl: process.env.LOOKER_BASE_URL || 'https://vipmedicalgroup.cloud.looker.com',
    clientId: process.env.LOOKER_CLIENT_ID || 'zSZYbwPQyFbTBzJ6VYXk',
    clientSecret: process.env.LOOKER_CLIENT_SECRET || 'nZ8KCdDcqqrcMtPgXMm5GrJy'
};

// Looker token cache
let lookerAccessToken = null;
let lookerTokenExpiry = null;

async function getLookerToken() {
    if (lookerAccessToken && lookerTokenExpiry && Date.now() < lookerTokenExpiry) {
        return lookerAccessToken;
    }
    
    const response = await fetch(`${LOOKER_CONFIG.baseUrl}/api/4.0/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${LOOKER_CONFIG.clientId}&client_secret=${LOOKER_CONFIG.clientSecret}`
    });
    
    const data = await response.json();
    lookerAccessToken = data.access_token;
    lookerTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return lookerAccessToken;
}

// Looker query cache (15 min TTL)
const lookerCache = new Map();
const LOOKER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

function getCacheKey(view, fields, filters, sorts, limit) {
    return JSON.stringify({ view, fields, filters, sorts, limit });
}

async function lookerQuery(view, fields, filters = {}, sorts = [], limit = 500) {
    const cacheKey = getCacheKey(view, fields, filters, sorts, limit);
    
    // Check cache
    const cached = lookerCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < LOOKER_CACHE_TTL) {
        return cached.data;
    }
    
    const token = await getLookerToken();
    const response = await fetch(`${LOOKER_CONFIG.baseUrl}/api/4.0/queries/run/json`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'snow_prd_analytics_db',
            view,
            fields,
            filters,
            sorts,
            limit: String(limit)
        })
    });
    const data = await response.json();
    
    // Store in cache
    lookerCache.set(cacheKey, { data, timestamp: Date.now() });
    
    // Clean old cache entries periodically
    if (lookerCache.size > 500) {
        const now = Date.now();
        for (const [key, value] of lookerCache) {
            if (now - value.timestamp > LOOKER_CACHE_TTL) {
                lookerCache.delete(key);
            }
        }
    }
    
    return data;
}

// Microsoft Advertising API Configuration (from environment variables)
const MSADS_CONFIG = {
    clientId: process.env.MSADS_CLIENT_ID,
    clientSecret: process.env.MSADS_CLIENT_SECRET,
    developerToken: process.env.MSADS_DEVELOPER_TOKEN,
    refreshToken: process.env.MSADS_REFRESH_TOKEN,
    customerId: process.env.MSADS_CUSTOMER_ID,
    accountId: process.env.MSADS_ACCOUNT_ID
};

// Check if Bing credentials are configured
function isBingConfigured() {
    return MSADS_CONFIG.clientId && 
           MSADS_CONFIG.clientSecret && 
           MSADS_CONFIG.developerToken && 
           MSADS_CONFIG.refreshToken &&
           MSADS_CONFIG.accountId;
}

// Token cache
let accessToken = null;
let tokenExpiry = null;

// Get OAuth access token
async function getAccessToken() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    console.log('Refreshing Microsoft Ads access token...');
    
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const params = new URLSearchParams({
        client_id: MSADS_CONFIG.clientId,
        client_secret: MSADS_CONFIG.clientSecret,
        refresh_token: MSADS_CONFIG.refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://ads.microsoft.com/msads.manage offline_access'
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const data = await response.json();
    
    if (data.error) {
        console.error('Token refresh error:', data);
        // Clear cached token so it retries
        accessToken = null;
        tokenExpiry = null;
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }

    if (!data.access_token) {
        console.error('No access token in response:', data);
        throw new Error('No access token received');
    }

    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    
    console.log('Access token refreshed successfully');
    return accessToken;
}

// Submit report and poll for completion
async function submitAndDownloadReport(reportType, startDate, endDate, columns) {
    const token = await getAccessToken();
    const submitUrl = 'https://reporting.api.bingads.microsoft.com/Api/Advertiser/Reporting/v13/ReportingService.svc';
    
    let reportRequest;
    if (reportType === 'campaign') {
        reportRequest = buildCampaignReportRequest(startDate, endDate, columns);
    } else if (reportType === 'keyword') {
        reportRequest = buildKeywordReportRequest(startDate, endDate, columns);
    } else if (reportType === 'geographic') {
        reportRequest = buildGeographicReportRequest(startDate, endDate, columns);
    } else if (reportType === 'searchQuery') {
        reportRequest = buildSearchQueryReportRequest(startDate, endDate, columns);
    } else if (reportType === 'ad') {
        reportRequest = buildAdReportRequest(startDate, endDate, columns);
    } else {
        reportRequest = buildAccountReportRequest(startDate, endDate, columns);
    }

    const submitEnvelope = buildSoapEnvelope('SubmitGenerateReportRequest', reportRequest, token);

    const submitResponse = await fetch(submitUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'SubmitGenerateReport'
        },
        body: submitEnvelope
    });

    const submitText = await submitResponse.text();
    
    const requestIdMatch = submitText.match(/<ReportRequestId[^>]*>([^<]+)<\/ReportRequestId>/);
    if (!requestIdMatch) {
        console.error('Submit response:', submitText);
        // Extract error message if present
        const faultMatch = submitText.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/);
        const errorMsg = faultMatch ? faultMatch[1] : 'Failed to get report request ID';
        throw new Error(errorMsg);
    }
    
    const reportRequestId = requestIdMatch[1];
    console.log('Report submitted, ID:', reportRequestId);

    // Poll for completion
    let downloadUrl = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!downloadUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const pollEnvelope = buildSoapEnvelope('PollGenerateReportRequest', 
            `<ReportRequestId>${reportRequestId}</ReportRequestId>`, token);

        const pollResponse = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'PollGenerateReport'
            },
            body: pollEnvelope
        });

        const pollText = await pollResponse.text();
        
        const statusMatch = pollText.match(/<Status[^>]*>([^<]+)<\/Status>/);
        const status = statusMatch ? statusMatch[1] : 'Unknown';
        console.log('Report status:', status);
        
        if (status === 'Success') {
            const urlMatch = pollText.match(/<ReportDownloadUrl[^>]*>([^<]+)<\/ReportDownloadUrl>/);
            if (urlMatch) {
                // Decode XML entities in URL (e.g., &amp; -> &)
                downloadUrl = urlMatch[1].replace(/&amp;/g, '&');
            }
        } else if (status === 'Error') {
            throw new Error('Report generation failed');
        }
        
        attempts++;
    }

    if (!downloadUrl) {
        throw new Error('Report generation timed out');
    }

    // Download the ZIP file and extract CSV
    const reportResponse = await fetch(downloadUrl);
    const zipBuffer = await reportResponse.buffer();
    
    // Use built-in zlib to decompress (the ZIP is simple enough)
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    
    if (zipEntries.length === 0) {
        throw new Error('Empty report ZIP file');
    }
    
    const reportText = zipEntries[0].getData().toString('utf8');
    console.log('Report CSV preview:', reportText.substring(0, 200));
    
    return parseReportCsv(reportText);
}

function buildSoapEnvelope(action, body, token) {
    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <AuthenticationToken xmlns="https://bingads.microsoft.com/Reporting/v13">${token}</AuthenticationToken>
    <DeveloperToken xmlns="https://bingads.microsoft.com/Reporting/v13">${MSADS_CONFIG.developerToken}</DeveloperToken>
    <CustomerId xmlns="https://bingads.microsoft.com/Reporting/v13">${MSADS_CONFIG.customerId}</CustomerId>
  </s:Header>
  <s:Body>
    <${action} xmlns="https://bingads.microsoft.com/Reporting/v13">
      ${body}
    </${action}>
  </s:Body>
</s:Envelope>`;
}

function buildAccountReportRequest(startDate, endDate, columns) {
    // Use CampaignPerformanceReport for account-level daily data (aggregated)
    const requiredColumns = ['TimePeriod'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<CampaignPerformanceReportColumn>${c}</CampaignPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="CampaignPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>AccountPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Daily</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function buildCampaignReportRequest(startDate, endDate, columns) {
    // Ensure required columns are included
    const requiredColumns = ['CampaignName'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<CampaignPerformanceReportColumn>${c}</CampaignPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="CampaignPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>CampaignPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Summary</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function buildKeywordReportRequest(startDate, endDate, columns) {
    const requiredColumns = ['Keyword', 'CampaignName', 'AdGroupName'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<KeywordPerformanceReportColumn>${c}</KeywordPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="KeywordPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>KeywordPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Summary</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function buildGeographicReportRequest(startDate, endDate, columns) {
    const requiredColumns = ['LocationType', 'MostSpecificLocation'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<GeographicPerformanceReportColumn>${c}</GeographicPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="GeographicPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>GeographicPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Summary</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function buildSearchQueryReportRequest(startDate, endDate, columns) {
    const requiredColumns = ['SearchQuery', 'CampaignName', 'AdGroupName', 'Keyword'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<SearchQueryPerformanceReportColumn>${c}</SearchQueryPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="SearchQueryPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>SearchQueryPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Summary</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function buildAdReportRequest(startDate, endDate, columns) {
    const requiredColumns = ['AdId', 'CampaignName', 'AdGroupName'];
    const allColumns = [...new Set([...requiredColumns, ...columns])];
    const columnElements = allColumns.map(c => `<AdPerformanceReportColumn>${c}</AdPerformanceReportColumn>`).join('\n          ');
    
    return `<ReportRequest i:type="AdPerformanceReportRequest" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
        <FormatVersion>2.0</FormatVersion>
        <ReportName>AdPerformance</ReportName>
        <ReturnOnlyCompleteData>false</ReturnOnlyCompleteData>
        <Aggregation>Summary</Aggregation>
        <Columns>
          ${columnElements}
        </Columns>
        <Scope>
            <AccountIds xmlns:a="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
                <a:long>${MSADS_CONFIG.accountId}</a:long>
            </AccountIds>
        </Scope>
        <Time>
            <CustomDateRangeEnd>
                <Day>${parseInt(endDate.split('-')[2])}</Day>
                <Month>${parseInt(endDate.split('-')[1])}</Month>
                <Year>${parseInt(endDate.split('-')[0])}</Year>
            </CustomDateRangeEnd>
            <CustomDateRangeStart>
                <Day>${parseInt(startDate.split('-')[2])}</Day>
                <Month>${parseInt(startDate.split('-')[1])}</Month>
                <Year>${parseInt(startDate.split('-')[0])}</Year>
            </CustomDateRangeStart>
        </Time>
    </ReportRequest>`;
}

function parseReportCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return { rows: [] };
    
    // Parse CSV properly handling quoted fields with commas
    function parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    }
    
    const headers = parseCsvLine(lines[0]);
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCsvLine(lines[i]);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
        });
        rows.push(row);
    }
    
    return { headers, rows };
}

// API Endpoints

// Get account performance (KPIs)
app.post('/api/bing/account-performance', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['TimePeriod', 'Spend', 'Impressions', 'Clicks', 'Ctr', 'AverageCpc', 'Conversions', 'Revenue'];
        const report = await submitAndDownloadReport('account', startDate, endDate, columns);
        
        let totals = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
        
        report.rows.forEach(row => {
            totals.spend += parseFloat(row.Spend) || 0;
            totals.impressions += parseInt(row.Impressions) || 0;
            totals.clicks += parseInt(row.Clicks) || 0;
            totals.conversions += parseFloat(row.Conversions) || 0;
            totals.revenue += parseFloat(row.Revenue) || 0;
        });
        
        res.json(totals);
    } catch (error) {
        console.error('Account performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get daily performance
app.post('/api/bing/daily-performance', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['TimePeriod', 'Spend', 'Impressions', 'Clicks', 'Ctr', 'AverageCpc', 'Conversions', 'Revenue'];
        const report = await submitAndDownloadReport('account', startDate, endDate, columns);
        
        const rows = report.rows.map(row => ({
            date: row.TimePeriod,
            spend: parseFloat(row.Spend) || 0,
            impressions: parseInt(row.Impressions) || 0,
            clicks: parseInt(row.Clicks) || 0,
            ctr: parseFloat(row.Ctr) || 0,
            cpc: parseFloat(row.AverageCpc) || 0,
            conversions: parseFloat(row.Conversions) || 0,
            revenue: parseFloat(row.Revenue) || 0
        }));
        
        res.json({ rows });
    } catch (error) {
        console.error('Daily performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get campaign performance
app.post('/api/bing/campaign-performance', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['CampaignName', 'CampaignStatus', 'Spend', 'Impressions', 'Clicks', 'Ctr', 'AverageCpc', 'Conversions', 'Revenue'];
        const report = await submitAndDownloadReport('campaign', startDate, endDate, columns);
        
        const campaigns = report.rows.map(row => ({
            name: row.CampaignName,
            status: row.CampaignStatus,
            spend: parseFloat(row.Spend) || 0,
            impressions: parseInt(row.Impressions) || 0,
            clicks: parseInt(row.Clicks) || 0,
            ctr: parseFloat(row.Ctr) || 0,
            cpc: parseFloat(row.AverageCpc) || 0,
            conversions: parseFloat(row.Conversions) || 0,
            revenue: parseFloat(row.Revenue) || 0
        }));
        
        res.json({ campaigns });
    } catch (error) {
        console.error('Campaign performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bing Keywords Performance
app.post('/api/bing/keywords', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['Keyword', 'CampaignName', 'AdGroupName', 'QualityScore', 'Impressions', 'Clicks', 'Ctr', 'Spend', 'AverageCpc', 'Conversions', 'CostPerConversion'];
        const report = await submitAndDownloadReport('keyword', startDate, endDate, columns);
        
        const keywords = report.rows.map(row => ({
            keyword: row.Keyword || 'Unknown',
            campaign: row.CampaignName || 'Unknown',
            adGroup: row.AdGroupName || 'Unknown',
            qualityScore: parseInt(row.QualityScore) || null,
            impressions: parseInt(row.Impressions) || 0,
            clicks: parseInt(row.Clicks) || 0,
            ctr: parseFloat(row.Ctr?.replace('%', '')) || 0,
            cost: parseFloat(row.Spend) || 0,
            cpc: parseFloat(row.AverageCpc) || 0,
            conversions: parseFloat(row.Conversions) || 0,
            costPerConv: parseFloat(row.CostPerConversion) || 0
        }));
        
        res.json({ keywords });
    } catch (error) {
        console.error('Bing keywords error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bing Geographic Performance
app.post('/api/bing/geographic', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['LocationType', 'MostSpecificLocation', 'Country', 'State', 'City', 'Impressions', 'Clicks', 'Ctr', 'Spend', 'AverageCpc', 'Conversions', 'CostPerConversion'];
        const report = await submitAndDownloadReport('geographic', startDate, endDate, columns);
        
        const locations = report.rows.map(row => ({
            locationType: row.LocationType || 'Unknown',
            location: row.MostSpecificLocation || row.City || row.State || row.Country || 'Unknown',
            country: row.Country || '',
            state: row.State || '',
            city: row.City || '',
            impressions: parseInt(row.Impressions) || 0,
            clicks: parseInt(row.Clicks) || 0,
            ctr: parseFloat(row.Ctr?.replace('%', '')) || 0,
            cost: parseFloat(row.Spend) || 0,
            cpc: parseFloat(row.AverageCpc) || 0,
            conversions: parseFloat(row.Conversions) || 0,
            costPerConv: parseFloat(row.CostPerConversion) || 0,
            convRate: row.Clicks > 0 ? (parseFloat(row.Conversions) / parseInt(row.Clicks)) * 100 : 0
        }));
        
        res.json({ locations });
    } catch (error) {
        console.error('Bing geographic error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bing Search Terms (Search Query Performance)
app.post('/api/bing/search-terms', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['SearchQuery', 'CampaignName', 'AdGroupName', 'Keyword', 'Impressions', 'Clicks', 'Ctr', 'Spend', 'AverageCpc', 'Conversions', 'CostPerConversion'];
        const report = await submitAndDownloadReport('searchQuery', startDate, endDate, columns);
        
        const searchTerms = report.rows.map(row => {
            const clicks = parseInt(row.Clicks) || 0;
            const cost = parseFloat(row.Spend) || 0;
            const conversions = parseFloat(row.Conversions) || 0;
            
            return {
                searchTerm: row.SearchQuery || 'Unknown',
                campaign: row.CampaignName || 'Unknown',
                adGroup: row.AdGroupName || 'Unknown',
                keyword: row.Keyword || '-',
                impressions: parseInt(row.Impressions) || 0,
                clicks,
                ctr: parseFloat(row.Ctr?.replace('%', '')) || 0,
                cost,
                cpc: clicks > 0 ? cost / clicks : 0,
                conversions,
                costPerConv: conversions > 0 ? cost / conversions : 0,
                convRate: clicks > 0 ? (conversions / clicks) * 100 : 0
            };
        });
        
        res.json({ searchTerms });
    } catch (error) {
        console.error('Bing search terms error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', configured: isBingConfigured() });
});

// OAuth helper - Step 1: Redirect to Microsoft login
app.get('/auth/bing', (req, res) => {
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${MSADS_CONFIG.clientId}&response_type=code&redirect_uri=${encodeURIComponent('https://vtc-ads-dashboard.onrender.com/auth/bing/callback')}&scope=${encodeURIComponent('https://ads.microsoft.com/msads.manage offline_access')}&state=auth`;
    res.redirect(authUrl);
});

// OAuth helper - Step 2: Handle callback and exchange code for tokens
app.get('/auth/bing/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        return res.send(`<h2>Error: ${error}</h2><p>${req.query.error_description || ''}</p>`);
    }
    
    if (!code) {
        return res.send('<h2>Error: No authorization code received</h2>');
    }
    
    try {
        const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: MSADS_CONFIG.clientId,
                client_secret: MSADS_CONFIG.clientSecret,
                code: code,
                redirect_uri: 'https://vtc-ads-dashboard.onrender.com/auth/bing/callback',
                grant_type: 'authorization_code',
                scope: 'https://ads.microsoft.com/msads.manage offline_access'
            }).toString()
        });
        
        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
            return res.send(`<h2>Token Error</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
        }
        
        // Show the refresh token so it can be saved
        res.send(`
            <html>
            <head><title>Bing Auth Success</title></head>
            <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                <h2 style="color: green;">✅ Authentication Successful!</h2>
                <p>Copy this refresh token and send it to your admin to update the server:</p>
                <textarea style="width: 100%; height: 150px; font-family: monospace; font-size: 12px;" readonly>${tokens.refresh_token}</textarea>
                <p style="color: #666; margin-top: 20px;">This page is temporary - the token needs to be saved in the server environment variables.</p>
            </body>
            </html>
        `);
    } catch (err) {
        res.send(`<h2>Error exchanging code</h2><pre>${err.message}</pre>`);
    }
});

// ==================== TikTok Ads API ====================

// TikTok URL verification - serve at multiple paths to cover all cases
const TIKTOK_VERIFY_CONTENT = 'tiktok-developers-site-verification=i02rDYyrdA068fwx277aURAMgirXqwwz';

// Various possible paths TikTok might check
app.get('/auth/tiktok/callback/tiktokANOnTRrxnjAlJOinIIYFdacJIFGaCUMA.txt', (req, res) => {
    res.type('text/plain').send(TIKTOK_VERIFY_CONTENT);
});
app.get('/auth/tiktok/callback/tiktokANOnTRrxnjAIJOinIlYFdacJIFGaCUMA.txt', (req, res) => {
    res.type('text/plain').send(TIKTOK_VERIFY_CONTENT);
});
// Serve verification content at the callback root too
app.get('/auth/tiktok/callback/verification.txt', (req, res) => {
    res.type('text/plain').send(TIKTOK_VERIFY_CONTENT);
});

// ==================== Google Ads OAuth ====================

// Google OAuth - Step 1: Redirect to Google auth
app.get('/auth/google', (req, res) => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_ADS_CONFIG.clientId}&redirect_uri=${encodeURIComponent('https://vtc-ads-dashboard.onrender.com/auth/google/callback')}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/adwords')}&access_type=offline&prompt=consent`;
    res.redirect(authUrl);
});

// Google OAuth - Step 2: Handle callback
app.get('/auth/google/callback', async (req, res) => {
    const { code, error } = req.query;
    
    if (error) {
        return res.send(`<h2>Error: ${error}</h2>`);
    }
    
    if (!code) {
        return res.send('<h2>Error: No authorization code received</h2>');
    }
    
    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_ADS_CONFIG.clientId,
                client_secret: GOOGLE_ADS_CONFIG.clientSecret,
                code: code,
                redirect_uri: 'https://vtc-ads-dashboard.onrender.com/auth/google/callback',
                grant_type: 'authorization_code'
            }).toString()
        });
        
        const tokens = await tokenResponse.json();
        
        if (tokens.error) {
            return res.send(`<h2>Token Error</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
        }
        
        res.send(`
            <html>
            <head><title>Google Ads Auth Success</title></head>
            <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                <h2 style="color: green;">✅ Google Ads Authentication Successful!</h2>
                <p>Copy this refresh token and send it to your admin to update the server:</p>
                <textarea style="width: 100%; height: 150px; font-family: monospace; font-size: 12px;" readonly>${tokens.refresh_token}</textarea>
                <p style="color: #666; margin-top: 20px;">This page is temporary - the token needs to be saved in the server environment variables.</p>
            </body>
            </html>
        `);
    } catch (err) {
        res.send(`<h2>Error exchanging code</h2><pre>${err.message}</pre>`);
    }
});

// Catch any .txt file request in callback folder
app.get('/auth/tiktok/callback/*.txt', (req, res) => {
    res.type('text/plain').send(TIKTOK_VERIFY_CONTENT);
});

// TikTok OAuth - Step 1: Redirect to TikTok auth
app.get('/auth/tiktok', (req, res) => {
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${TIKTOK_CONFIG.appId}&redirect_uri=${encodeURIComponent('https://ranchi.vipmedicalgroup.ai/dashboard/auth/tiktok/callback')}&state=tiktok`;
    res.redirect(authUrl);
});

// TikTok OAuth - Step 2: Handle callback
app.get('/auth/tiktok/callback', async (req, res) => {
    const { auth_code, error } = req.query;
    
    if (error) {
        return res.send(`<h2>Error: ${error}</h2>`);
    }
    
    if (!auth_code) {
        return res.send('<h2>Error: No authorization code received</h2>');
    }
    
    try {
        const tokenResponse = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: TIKTOK_CONFIG.appId,
                secret: TIKTOK_CONFIG.appSecret,
                auth_code: auth_code
            })
        });
        
        const result = await tokenResponse.json();
        
        if (result.code !== 0) {
            return res.send(`<h2>Token Error</h2><pre>${JSON.stringify(result, null, 2)}</pre>`);
        }
        
        res.send(`
            <html>
            <head><title>TikTok Auth Success</title></head>
            <body style="font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
                <h2 style="color: green;">✅ TikTok Authentication Successful!</h2>
                <p>Copy this access token and send it to your admin to update the server:</p>
                <textarea style="width: 100%; height: 150px; font-family: monospace; font-size: 12px;" readonly>${result.data.access_token}</textarea>
                <p style="color: #666; margin-top: 20px;">Advertiser IDs with access: ${JSON.stringify(result.data.advertiser_ids)}</p>
            </body>
            </html>
        `);
    } catch (err) {
        res.send(`<h2>Error exchanging code</h2><pre>${err.message}</pre>`);
    }
});

// TikTok: Check if configured
app.get('/api/tiktok/status', (req, res) => {
    res.json({ configured: isTikTokConfigured() });
});

// TikTok: Account performance
app.post('/api/tiktok/account-performance', async (req, res) => {
    if (!isTikTokConfigured()) {
        return res.status(503).json({ error: 'TikTok Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const params = new URLSearchParams({
            advertiser_id: TIKTOK_CONFIG.adAccountId,
            start_date: startDate,
            end_date: endDate,
            metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion', 'cost_per_conversion', 'ctr', 'cpc']),
            data_level: 'AUCTION_ADVERTISER'
        });
        
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`, {
            headers: {
                'Access-Token': TIKTOK_CONFIG.accessToken
            }
        });
        
        const result = await response.json();
        
        if (result.code !== 0) {
            throw new Error(result.message);
        }
        
        // Aggregate data
        let totals = { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
        
        if (result.data && result.data.list) {
            result.data.list.forEach(row => {
                const metrics = row.metrics;
                totals.spend += parseFloat(metrics.spend) || 0;
                totals.impressions += parseInt(metrics.impressions) || 0;
                totals.clicks += parseInt(metrics.clicks) || 0;
                totals.conversions += parseInt(metrics.conversion) || 0;
            });
        }
        
        res.json(totals);
    } catch (error) {
        console.error('TikTok account performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TikTok: Daily performance
app.post('/api/tiktok/daily-performance', async (req, res) => {
    if (!isTikTokConfigured()) {
        return res.status(503).json({ error: 'TikTok Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const params = new URLSearchParams({
            advertiser_id: TIKTOK_CONFIG.adAccountId,
            start_date: startDate,
            end_date: endDate,
            metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion', 'ctr', 'cpc']),
            data_level: 'AUCTION_ADVERTISER',
            dimensions: JSON.stringify(['stat_time_day'])
        });
        
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`, {
            headers: {
                'Access-Token': TIKTOK_CONFIG.accessToken
            }
        });
        
        const result = await response.json();
        
        if (result.code !== 0) {
            throw new Error(result.message);
        }
        
        const rows = (result.data?.list || []).map(row => ({
            date: row.dimensions.stat_time_day,
            spend: parseFloat(row.metrics.spend) || 0,
            impressions: parseInt(row.metrics.impressions) || 0,
            clicks: parseInt(row.metrics.clicks) || 0,
            ctr: parseFloat(row.metrics.ctr) || 0,
            cpc: parseFloat(row.metrics.cpc) || 0,
            conversions: parseInt(row.metrics.conversion) || 0
        }));
        
        res.json({ rows });
    } catch (error) {
        console.error('TikTok daily performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// TikTok: Campaign performance
app.post('/api/tiktok/campaign-performance', async (req, res) => {
    if (!isTikTokConfigured()) {
        return res.status(503).json({ error: 'TikTok Ads credentials not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const params = new URLSearchParams({
            advertiser_id: TIKTOK_CONFIG.adAccountId,
            start_date: startDate,
            end_date: endDate,
            metrics: JSON.stringify(['spend', 'impressions', 'clicks', 'conversion', 'ctr', 'cpc', 'cost_per_conversion']),
            data_level: 'AUCTION_CAMPAIGN',
            dimensions: JSON.stringify(['campaign_id'])
        });
        
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`, {
            headers: {
                'Access-Token': TIKTOK_CONFIG.accessToken
            }
        });
        
        const result = await response.json();
        
        if (result.code !== 0) {
            throw new Error(result.message);
        }
        
        // Get campaign names
        const campaignIds = (result.data?.list || []).map(r => r.dimensions.campaign_id);
        let campaignNames = {};
        
        if (campaignIds.length > 0) {
            const campaignParams = new URLSearchParams({
                advertiser_id: TIKTOK_CONFIG.adAccountId,
                filtering: JSON.stringify({ campaign_ids: campaignIds })
            });
            
            const campaignResponse = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?${campaignParams}`, {
                headers: { 'Access-Token': TIKTOK_CONFIG.accessToken }
            });
            
            const campaignResult = await campaignResponse.json();
            if (campaignResult.code === 0 && campaignResult.data?.list) {
                campaignResult.data.list.forEach(c => {
                    campaignNames[c.campaign_id] = c.campaign_name;
                });
            }
        }
        
        const campaigns = (result.data?.list || []).map(row => ({
            id: row.dimensions.campaign_id,
            name: campaignNames[row.dimensions.campaign_id] || `Campaign ${row.dimensions.campaign_id}`,
            spend: parseFloat(row.metrics.spend) || 0,
            impressions: parseInt(row.metrics.impressions) || 0,
            clicks: parseInt(row.metrics.clicks) || 0,
            ctr: parseFloat(row.metrics.ctr) || 0,
            cpc: parseFloat(row.metrics.cpc) || 0,
            conversions: parseInt(row.metrics.conversion) || 0,
            costPerConversion: parseFloat(row.metrics.cost_per_conversion) || 0
        }));
        
        res.json({ campaigns });
    } catch (error) {
        console.error('TikTok campaign performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Google Ads API ====================

// Google Ads: Check if configured
app.get('/api/google/status', (req, res) => {
    res.json({ configured: isGoogleAdsConfigured() });
});

// Google Ads: Account performance (aggregated KPIs)
app.post('/api/google/account-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const query = `
            SELECT 
                metrics.cost_micros,
                metrics.impressions,
                metrics.clicks,
                metrics.conversions,
                metrics.conversions_value
            FROM customer
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        `;
        
        const results = await googleAdsApiRequest(query);
        
        let totals = { spend: 0, impressions: 0, clicks: 0, conversions: 0, conversionValue: 0 };
        
        results.forEach(row => {
            const metrics = row.metrics || {};
            totals.spend += (parseInt(metrics.cost_micros) || 0) / 1000000;
            totals.impressions += parseInt(metrics.impressions) || 0;
            totals.clicks += parseInt(metrics.clicks) || 0;
            totals.conversions += parseFloat(metrics.conversions) || 0;
            totals.conversionValue += parseFloat(metrics.conversions_value) || 0;
        });
        
        res.json(totals);
    } catch (error) {
        console.error('Google account performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Ads: Daily performance
app.post('/api/google/daily-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const query = `
            SELECT 
                segments.date,
                metrics.cost_micros,
                metrics.impressions,
                metrics.clicks,
                metrics.conversions
            FROM customer
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY segments.date DESC
        `;
        
        const results = await googleAdsApiRequest(query);
        
        const rows = results.map(row => {
            const metrics = row.metrics || {};
            const segments = row.segments || {};
            const spend = (parseInt(metrics.cost_micros) || 0) / 1000000;
            const impressions = parseInt(metrics.impressions) || 0;
            const clicks = parseInt(metrics.clicks) || 0;
            const conversions = parseFloat(metrics.conversions) || 0;
            
            return {
                date: segments.date,
                spend,
                impressions,
                clicks,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                conversions
            };
        });
        
        res.json({ rows });
    } catch (error) {
        console.error('Google daily performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Ads: Campaign performance
app.post('/api/google/campaign-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const query = `
            SELECT 
                campaign.name,
                campaign.status,
                metrics.cost_micros,
                metrics.impressions,
                metrics.clicks,
                metrics.conversions
            FROM campaign
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                AND campaign.status = 'ENABLED'
            ORDER BY metrics.cost_micros DESC
        `;
        
        const results = await googleAdsApiRequest(query);
        
        const campaigns = results.map(row => {
            const campaign = row.campaign || {};
            const metrics = row.metrics || {};
            const spend = (parseInt(metrics.cost_micros) || 0) / 1000000;
            const impressions = parseInt(metrics.impressions) || 0;
            const clicks = parseInt(metrics.clicks) || 0;
            const conversions = parseFloat(metrics.conversions) || 0;
            
            return {
                name: campaign.name,
                status: campaign.status,
                spend,
                impressions,
                clicks,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cpc: clicks > 0 ? spend / clicks : 0,
                conversions,
                costPerConversion: conversions > 0 ? spend / conversions : 0
            };
        });
        
        res.json({ campaigns });
    } catch (error) {
        console.error('Google campaign performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Ads: Keyword performance
app.post('/api/google/keyword-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const query = `
            SELECT 
                ad_group_criterion.keyword.text,
                ad_group_criterion.quality_info.quality_score,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.average_cpc
            FROM keyword_view
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY metrics.clicks DESC
            LIMIT 100
        `;
        
        const results = await googleAdsApiRequest(query);
        
        const keywords = results.map(row => {
            const criterion = row.ad_group_criterion || {};
            const keyword = criterion.keyword || {};
            const qualityInfo = criterion.quality_info || {};
            const metrics = row.metrics || {};
            
            return {
                keyword: keyword.text || 'Unknown',
                qualityScore: qualityInfo.quality_score || null,
                impressions: parseInt(metrics.impressions) || 0,
                clicks: parseInt(metrics.clicks) || 0,
                cost: (parseInt(metrics.cost_micros) || 0) / 1000000,
                cpc: (parseInt(metrics.average_cpc) || 0) / 1000000
            };
        });
        
        res.json({ keywords });
    } catch (error) {
        console.error('Google keyword performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Google Ads: Full Keyword performance (for dedicated Keywords tab)
app.post('/api/google/keyword-performance-full', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const { startDate, endDate } = req.body;
        
        const query = `
            SELECT 
                campaign.name,
                ad_group.name,
                ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type,
                ad_group_criterion.quality_info.quality_score,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.average_cpc,
                metrics.conversions
            FROM keyword_view
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY metrics.clicks DESC
            LIMIT 200
        `;
        
        const results = await googleAdsApiRequest(query);
        
        // Match type mapping
        const matchTypes = {
            'EXACT': 'Exact',
            'PHRASE': 'Phrase',
            'BROAD': 'Broad',
            '2': 'Exact',
            '3': 'Phrase',
            '4': 'Broad'
        };
        
        const keywords = results.map(row => {
            const campaign = row.campaign || {};
            const adGroup = row.ad_group || {};
            const criterion = row.ad_group_criterion || {};
            const keyword = criterion.keyword || {};
            const qualityInfo = criterion.quality_info || {};
            const metrics = row.metrics || {};
            
            return {
                keyword: keyword.text || 'Unknown',
                campaign: campaign.name || 'Unknown',
                adGroup: adGroup.name || 'Unknown',
                matchType: matchTypes[keyword.match_type] || keyword.match_type || '-',
                qualityScore: qualityInfo.quality_score || null,
                impressions: parseInt(metrics.impressions) || 0,
                clicks: parseInt(metrics.clicks) || 0,
                cost: (parseInt(metrics.cost_micros) || 0) / 1000000,
                cpc: (parseInt(metrics.average_cpc) || 0) / 1000000,
                conversions: parseFloat(metrics.conversions) || 0
            };
        });
        
        res.json({ keywords });
    } catch (error) {
        console.error('Google keyword performance full error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Search Terms API ====================

// Google Ads: Search Terms Report
app.post('/api/google/search-terms', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    const { startDate, endDate } = req.body;
    
    try {
        const query = `
            SELECT 
                search_term_view.search_term,
                search_term_view.status,
                campaign.name,
                ad_group.name,
                segments.keyword.info.text,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.average_cpc
            FROM search_term_view
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                AND metrics.impressions > 0
            ORDER BY metrics.clicks DESC
            LIMIT 500
        `;
        
        const results = await googleAdsApiRequest(query);
        
        // Status mapping
        const statusMap = {
            '2': 'Added',
            '3': 'Excluded', 
            '4': 'Added (Excluded)',
            '5': 'None',
            'ADDED': 'Added',
            'EXCLUDED': 'Excluded',
            'ADDED_EXCLUDED': 'Added (Excluded)',
            'NONE': 'None'
        };
        
        const searchTerms = results.map(row => {
            const st = row.search_term_view || {};
            const metrics = row.metrics || {};
            const clicks = parseInt(metrics.clicks) || 0;
            const cost = (parseInt(metrics.cost_micros) || 0) / 1000000;
            const conversions = parseFloat(metrics.conversions) || 0;
            
            return {
                searchTerm: st.search_term || 'Unknown',
                status: statusMap[st.status] || st.status || 'None',
                campaign: row.campaign?.name || 'Unknown',
                adGroup: row.ad_group?.name || 'Unknown',
                keyword: row.segments?.keyword?.info?.text || '-',
                impressions: parseInt(metrics.impressions) || 0,
                clicks,
                cost,
                conversions,
                ctr: metrics.impressions > 0 ? (clicks / parseInt(metrics.impressions)) * 100 : 0,
                cpc: clicks > 0 ? cost / clicks : 0,
                costPerConv: conversions > 0 ? cost / conversions : 0,
                convRate: clicks > 0 ? (conversions / clicks) * 100 : 0
            };
        });
        
        res.json({ searchTerms });
    } catch (error) {
        console.error('Google search terms error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Ad Creative Performance API ====================

// Google Ads: Ad creative performance
app.post('/api/google/ad-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    const { startDate, endDate } = req.body;
    
    try {
        const query = `
            SELECT 
                campaign.name,
                ad_group.name,
                ad_group_ad.ad.id,
                ad_group_ad.ad.type,
                ad_group_ad.ad.responsive_search_ad.headlines,
                ad_group_ad.ad.responsive_search_ad.descriptions,
                ad_group_ad.ad.expanded_text_ad.headline_part1,
                ad_group_ad.ad.expanded_text_ad.headline_part2,
                ad_group_ad.ad.expanded_text_ad.headline_part3,
                ad_group_ad.ad.expanded_text_ad.description,
                ad_group_ad.ad.expanded_text_ad.description2,
                ad_group_ad.ad.final_urls,
                ad_group_ad.status,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value
            FROM ad_group_ad
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                AND ad_group_ad.status != 'REMOVED'
                AND metrics.impressions > 0
            ORDER BY metrics.conversions DESC, metrics.clicks DESC
            LIMIT 200
        `;
        
        const results = await googleAdsApiRequest(query);
        
        const ads = results.map(row => {
            const campaign = row.campaign || {};
            const adGroup = row.ad_group || {};
            const adGroupAd = row.ad_group_ad || {};
            const ad = adGroupAd.ad || {};
            const metrics = row.metrics || {};
            
            // Extract headlines and descriptions based on ad type
            // Google Ads API returns type as enum number: 15 = RESPONSIVE_SEARCH_AD, 3 = EXPANDED_TEXT_AD
            let headlines = [];
            let descriptions = [];
            
            if ((ad.type === 15 || ad.type === 'RESPONSIVE_SEARCH_AD') && ad.responsive_search_ad) {
                headlines = (ad.responsive_search_ad.headlines || []).map(h => h.text).filter(Boolean);
                descriptions = (ad.responsive_search_ad.descriptions || []).map(d => d.text).filter(Boolean);
            } else if ((ad.type === 3 || ad.type === 'EXPANDED_TEXT_AD') && ad.expanded_text_ad) {
                const eta = ad.expanded_text_ad;
                headlines = [eta.headline_part1, eta.headline_part2, eta.headline_part3].filter(Boolean);
                descriptions = [eta.description, eta.description2].filter(Boolean);
            }
            
            const impressions = parseInt(metrics.impressions) || 0;
            const clicks = parseInt(metrics.clicks) || 0;
            const cost = (parseInt(metrics.cost_micros) || 0) / 1000000;
            const conversions = parseFloat(metrics.conversions) || 0;
            
            // Convert type enum to readable string
            const adTypeMap = { 15: 'RSA', 3: 'ETA', 2: 'Text' };
            const typeStr = adTypeMap[ad.type] || ad.type || 'Unknown';
            
            return {
                adId: ad.id,
                campaign: campaign.name || 'Unknown',
                adGroup: adGroup.name || 'Unknown',
                type: typeStr,
                status: adGroupAd.status || 'Unknown',
                headlines: headlines.slice(0, 3),  // First 3 headlines
                descriptions: descriptions.slice(0, 2),  // First 2 descriptions
                finalUrl: (ad.final_urls || [])[0] || '',
                impressions,
                clicks,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cost,
                cpc: clicks > 0 ? cost / clicks : 0,
                conversions,
                costPerConv: conversions > 0 ? cost / conversions : 0,
                convRate: clicks > 0 ? (conversions / clicks) * 100 : 0
            };
        });
        
        res.json({ ads });
    } catch (error) {
        console.error('Google ad performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Bing Ads: Ad creative performance
app.post('/api/bing/ad-performance', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Bing Ads API not configured' });
    }
    
    const { startDate, endDate } = req.body;
    
    try {
        // Note: TitlePart1/2/3 and AdDescription columns return empty for RSAs
        // Only Expanded Text Ads return creative text in performance reports
        const columns = [
            'CampaignName', 'AdGroupName', 'AdId', 'AdType', 'AdStatus',
            'TitlePart1', 'TitlePart2', 'TitlePart3',
            'AdDescription', 'AdDescription2',
            'FinalUrl',
            'Impressions', 'Clicks', 'Spend', 'Conversions'
        ];
        
        const report = await submitAndDownloadReport('ad', startDate, endDate, columns);
        
        const ads = report.rows.map(row => {
            const impressions = parseInt(row.Impressions) || 0;
            const clicks = parseInt(row.Clicks) || 0;
            const cost = parseFloat(row.Spend) || 0;
            const conversions = parseFloat(row.Conversions) || 0;
            
            // For RSAs, these will be empty - that's expected
            let headlines = [row.TitlePart1, row.TitlePart2, row.TitlePart3].filter(Boolean);
            let descriptions = [row.AdDescription, row.AdDescription2].filter(Boolean);
            
            // If no headlines (RSA), show indicator
            if (headlines.length === 0 && row.AdType === 'Responsive search ad') {
                headlines = ['(Responsive Search Ad)'];
            }
            
            return {
                adId: row.AdId,
                campaign: row.CampaignName || 'Unknown',
                adGroup: row.AdGroupName || 'Unknown',
                type: row.AdType || 'Unknown',
                status: row.AdStatus || 'Unknown',
                headlines,
                descriptions,
                finalUrl: row.FinalUrl || '',
                impressions,
                clicks,
                ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
                cost,
                cpc: clicks > 0 ? cost / clicks : 0,
                conversions,
                costPerConv: conversions > 0 ? cost / conversions : 0,
                convRate: clicks > 0 ? (conversions / clicks) * 100 : 0
            };
        });
        
        // Sort by conversions, then clicks
        ads.sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks);
        
        res.json({ ads: ads.slice(0, 200) });
    } catch (error) {
        console.error('Bing ad performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Geographic Performance API ====================

// Cache for geo target constant names (to avoid repeated lookups)
const geoNameCache = {};

// Google Ads: Geographic performance by location
app.post('/api/google/geographic-performance', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    const { startDate, endDate } = req.body;
    
    try {
        // Use geographic_view (user location) instead of location_view (targeted location)
        // geographic_view captures ALL spend by where users actually are,
        // not just spend on explicitly targeted locations (~34% was missing before)
        const query = `
            SELECT 
                segments.geo_target_region,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions
            FROM geographic_view
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                AND metrics.impressions > 0
            ORDER BY metrics.clicks DESC
            LIMIT 1000
        `;
        
        const results = await googleAdsApiRequest(query);
        
        // Extract unique geo IDs to look up names
        const geoIds = [...new Set(results.map(r => {
            const geoRegion = r.segments?.geo_target_region || '';
            const match = geoRegion.match(/geoTargetConstants\/(\d+)/);
            return match ? match[1] : null;
        }).filter(Boolean))];
        
        // Look up names for geo IDs not in cache
        const uncachedIds = geoIds.filter(id => !geoNameCache[id]);
        if (uncachedIds.length > 0) {
            const geoQuery = `
                SELECT 
                    geo_target_constant.id,
                    geo_target_constant.name,
                    geo_target_constant.canonical_name,
                    geo_target_constant.target_type
                FROM geo_target_constant
                WHERE geo_target_constant.id IN (${uncachedIds.join(',')})
            `;
            const geoResults = await googleAdsApiRequest(geoQuery);
            geoResults.forEach(r => {
                const g = r.geo_target_constant || {};
                geoNameCache[g.id] = {
                    name: g.name,
                    canonicalName: g.canonical_name,
                    targetType: g.target_type
                };
            });
        }
        
        // Aggregate by region (combining all campaigns)
        const locationMap = {};
        
        results.forEach(row => {
            const geoRegion = row.segments?.geo_target_region || '';
            const match = geoRegion.match(/geoTargetConstants\/(\d+)/);
            const geoId = match ? match[1] : 'unknown';
            const metrics = row.metrics || {};
            
            if (!locationMap[geoId]) {
                const geoInfo = geoNameCache[geoId] || { name: geoId, canonicalName: '', targetType: '' };
                locationMap[geoId] = {
                    geoId,
                    name: geoInfo.name,
                    canonicalName: geoInfo.canonicalName,
                    type: geoInfo.targetType,
                    impressions: 0,
                    clicks: 0,
                    cost: 0,
                    conversions: 0
                };
            }
            
            locationMap[geoId].impressions += parseInt(metrics.impressions) || 0;
            locationMap[geoId].clicks += parseInt(metrics.clicks) || 0;
            locationMap[geoId].cost += (parseInt(metrics.cost_micros) || 0) / 1000000;
            locationMap[geoId].conversions += parseFloat(metrics.conversions) || 0;
        });
        
        // Convert to array and calculate derived metrics
        const locations = Object.values(locationMap).map(loc => ({
            geoId: loc.geoId,
            name: loc.name,
            canonicalName: loc.canonicalName,
            type: loc.type,
            impressions: loc.impressions,
            clicks: loc.clicks,
            cost: loc.cost,
            conversions: loc.conversions,
            ctr: loc.impressions > 0 ? (loc.clicks / loc.impressions) * 100 : 0,
            cpc: loc.clicks > 0 ? loc.cost / loc.clicks : 0,
            costPerConv: loc.conversions > 0 ? loc.cost / loc.conversions : 0,
            convRate: loc.clicks > 0 ? (loc.conversions / loc.clicks) * 100 : 0
        }));
        
        // Sort by clicks descending
        locations.sort((a, b) => b.clicks - a.clicks);
        
        res.json({ locations });
    } catch (error) {
        console.error('Google geographic performance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== QS History API ====================

// Simple file-based storage for QS history
const QS_HISTORY_FILE = '/tmp/qs-history.json';

function loadQsHistory() {
    try {
        if (fs.existsSync(QS_HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(QS_HISTORY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading QS history:', e);
    }
    return { snapshots: [], lastCapture: null };
}

function saveQsHistory(data) {
    try {
        fs.writeFileSync(QS_HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving QS history:', e);
    }
}

// Capture current QS data (call this daily via cron or manually)
app.post('/api/google/qs-capture', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get current keyword QS
        const query = `
            SELECT 
                ad_group_criterion.keyword.text,
                ad_group_criterion.quality_info.quality_score,
                metrics.clicks
            FROM keyword_view
            WHERE segments.date DURING LAST_7_DAYS
            ORDER BY metrics.clicks DESC
            LIMIT 500
        `;
        
        const results = await googleAdsApiRequest(query);
        
        const snapshot = {
            date: today,
            keywords: results.map(row => ({
                keyword: row.ad_group_criterion?.keyword?.text || 'Unknown',
                qs: row.ad_group_criterion?.quality_info?.quality_score || null
            })).filter(k => k.keyword !== 'Unknown')
        };
        
        // Load existing history and add snapshot
        const history = loadQsHistory();
        
        // Remove any existing snapshot for today
        history.snapshots = history.snapshots.filter(s => s.date !== today);
        history.snapshots.push(snapshot);
        
        // Keep only last 90 days
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        history.snapshots = history.snapshots.filter(s => new Date(s.date) >= cutoff);
        
        history.lastCapture = today;
        saveQsHistory(history);
        
        res.json({ success: true, date: today, keywordsCount: snapshot.keywords.length });
    } catch (error) {
        console.error('QS capture error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Helper function to capture QS data
async function captureQsSnapshot() {
    const today = new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT 
            ad_group_criterion.keyword.text,
            ad_group_criterion.quality_info.quality_score,
            ad_group.name,
            metrics.clicks
        FROM keyword_view
        WHERE segments.date DURING LAST_7_DAYS
        ORDER BY metrics.clicks DESC
        LIMIT 500
    `;
    
    const results = await googleAdsApiRequest(query);
    
    const snapshot = {
        date: today,
        keywords: results.map(row => ({
            keyword: row.ad_group_criterion?.keyword?.text || 'Unknown',
            qs: row.ad_group_criterion?.quality_info?.quality_score || null,
            adGroup: row.ad_group?.name || 'Unknown'
        })).filter(k => k.keyword !== 'Unknown')
    };
    
    const history = loadQsHistory();
    history.snapshots = history.snapshots.filter(s => s.date !== today);
    history.snapshots.push(snapshot);
    
    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    history.snapshots = history.snapshots.filter(s => new Date(s.date) >= cutoff);
    
    history.lastCapture = today;
    saveQsHistory(history);
    
    return snapshot.keywords.length;
}

// Get QS history data
app.post('/api/google/qs-history', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.status(503).json({ error: 'Google Ads API not configured' });
    }
    
    try {
        let history = loadQsHistory();
        const today = new Date().toISOString().split('T')[0];
        
        // Auto-capture if no data for today
        const hasToday = history.snapshots.some(s => s.date === today);
        if (!hasToday) {
            console.log('Auto-capturing QS data for today...');
            await captureQsSnapshot();
            history = loadQsHistory(); // Reload after capture
        }
        
        if (history.snapshots.length === 0) {
            return res.json({ history: [], chartData: [], message: 'No history data available' });
        }
        
        // Get current snapshot and historical snapshots
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Find relevant snapshots
        const currentSnapshot = history.snapshots.find(s => s.date === today) || history.snapshots[history.snapshots.length - 1];
        const snapshot7d = history.snapshots.find(s => new Date(s.date) <= sevenDaysAgo);
        const snapshot30d = history.snapshots.find(s => new Date(s.date) <= thirtyDaysAgo);
        
        // Build keyword-level history
        const keywordMap = {};
        
        if (currentSnapshot) {
            currentSnapshot.keywords.forEach(k => {
                keywordMap[k.keyword] = { keyword: k.keyword, currentQs: k.qs, adGroup: k.adGroup || '-' };
            });
        }
        
        if (snapshot7d) {
            snapshot7d.keywords.forEach(k => {
                if (keywordMap[k.keyword]) {
                    keywordMap[k.keyword].qs7dAgo = k.qs;
                }
            });
        }
        
        if (snapshot30d) {
            snapshot30d.keywords.forEach(k => {
                if (keywordMap[k.keyword]) {
                    keywordMap[k.keyword].qs30dAgo = k.qs;
                }
            });
        }
        
        const historyArray = Object.values(keywordMap)
            .filter(k => k.currentQs)
            .sort((a, b) => (b.currentQs || 0) - (a.currentQs || 0));
        
        // Build chart data (average QS per day)
        const chartData = history.snapshots.map(snapshot => {
            const qsValues = snapshot.keywords.map(k => k.qs).filter(q => q);
            const avgQs = qsValues.length > 0 ? qsValues.reduce((a, b) => a + b, 0) / qsValues.length : null;
            return {
                date: snapshot.date,
                avgQs: avgQs ? parseFloat(avgQs.toFixed(2)) : null
            };
        }).filter(d => d.avgQs !== null);
        
        res.json({ history: historyArray, chartData });
    } catch (error) {
        console.error('QS history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Bing QS History ====================

const BING_QS_HISTORY_FILE = '/tmp/bing-qs-history.json';

function loadBingQsHistory() {
    try {
        if (fs.existsSync(BING_QS_HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(BING_QS_HISTORY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading Bing QS history:', e);
    }
    return { snapshots: [], lastCapture: null };
}

function saveBingQsHistory(data) {
    try {
        fs.writeFileSync(BING_QS_HISTORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving Bing QS history:', e);
    }
}

// Capture current Bing QS data
async function captureBingQsSnapshot() {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const columns = ['Keyword', 'AdGroupName', 'QualityScore', 'Clicks'];
    const report = await submitAndDownloadReport('keyword', startDate, today, columns);
    
    const snapshot = {
        date: today,
        keywords: report.rows.map(row => ({
            keyword: row.Keyword || 'Unknown',
            qs: parseInt(row.QualityScore) || null,
            adGroup: row.AdGroupName || 'Unknown'
        })).filter(k => k.keyword !== 'Unknown' && k.qs !== null)
    };
    
    const history = loadBingQsHistory();
    history.snapshots = history.snapshots.filter(s => s.date !== today);
    history.snapshots.push(snapshot);
    
    // Keep only last 90 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    history.snapshots = history.snapshots.filter(s => new Date(s.date) >= cutoff);
    
    history.lastCapture = today;
    saveBingQsHistory(history);
    
    return snapshot.keywords.length;
}

// Manual capture endpoint for Bing QS
app.post('/api/bing/qs-capture', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        const count = await captureBingQsSnapshot();
        const today = new Date().toISOString().split('T')[0];
        res.json({ success: true, date: today, keywordsCount: count });
    } catch (error) {
        console.error('Bing QS capture error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Bing QS history data
app.post('/api/bing/qs-history', async (req, res) => {
    if (!isBingConfigured()) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }
    
    try {
        let history = loadBingQsHistory();
        const today = new Date().toISOString().split('T')[0];
        
        // Auto-capture if no data for today
        const hasToday = history.snapshots.some(s => s.date === today);
        if (!hasToday) {
            console.log('Auto-capturing Bing QS data for today...');
            try {
                await captureBingQsSnapshot();
                history = loadBingQsHistory();
            } catch (e) {
                console.error('Auto-capture failed:', e);
            }
        }
        
        if (history.snapshots.length === 0) {
            return res.json({ history: [], chartData: [], message: 'No history data available yet. Data will accumulate over time.' });
        }
        
        // Get current snapshot and historical snapshots
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const currentSnapshot = history.snapshots.find(s => s.date === today) || history.snapshots[history.snapshots.length - 1];
        const snapshot7d = history.snapshots.find(s => new Date(s.date) <= sevenDaysAgo);
        const snapshot30d = history.snapshots.find(s => new Date(s.date) <= thirtyDaysAgo);
        
        // Build keyword-level history
        const keywordMap = {};
        
        if (currentSnapshot) {
            currentSnapshot.keywords.forEach(k => {
                keywordMap[k.keyword] = { keyword: k.keyword, currentQs: k.qs, adGroup: k.adGroup || '-' };
            });
        }
        
        if (snapshot7d) {
            snapshot7d.keywords.forEach(k => {
                if (keywordMap[k.keyword]) {
                    keywordMap[k.keyword].qs7dAgo = k.qs;
                }
            });
        }
        
        if (snapshot30d) {
            snapshot30d.keywords.forEach(k => {
                if (keywordMap[k.keyword]) {
                    keywordMap[k.keyword].qs30dAgo = k.qs;
                }
            });
        }
        
        const historyArray = Object.values(keywordMap)
            .filter(k => k.currentQs)
            .sort((a, b) => (b.currentQs || 0) - (a.currentQs || 0));
        
        // Build chart data
        const chartData = history.snapshots.map(snapshot => {
            const qsValues = snapshot.keywords.map(k => k.qs).filter(q => q);
            const avgQs = qsValues.length > 0 ? qsValues.reduce((a, b) => a + b, 0) / qsValues.length : null;
            return {
                date: snapshot.date,
                avgQs: avgQs ? parseFloat(avgQs.toFixed(2)) : null
            };
        }).filter(d => d.avgQs !== null);
        
        res.json({ history: historyArray, chartData });
    } catch (error) {
        console.error('Bing QS history error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== Summary API ====================

// Summary: Get daily spend data for all platforms
app.post('/api/summary/daily', async (req, res) => {
    const { startDate, endDate } = req.body;
    
    const results = {
        meta: [],
        google: [],
        bing: []
    };
    
    // Fetch Meta daily data
    try {
        const metaUrl = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v19.0'}/act_${process.env.META_ACCOUNT_ID}/insights?fields=spend,actions&time_range={"since":"${startDate}","until":"${endDate}"}&time_increment=1&access_token=${process.env.META_ACCESS_TOKEN}`;
        const metaResponse = await fetch(metaUrl);
        const metaData = await metaResponse.json();
        
        if (metaData.data) {
            results.meta = metaData.data.map(row => ({
                date: row.date_start,
                spend: parseFloat(row.spend) || 0,
                conversions: row.actions?.filter(a => a.action_type?.includes('offsite_conversion.fb_pixel_custom')).reduce((s, a) => s + parseInt(a.value || 0), 0) || 0
            }));
        }
    } catch (e) {
        console.error('Meta summary error:', e.message);
    }
    
    // Fetch Google daily data
    if (isGoogleAdsConfigured()) {
        try {
            const googleData = await googleAdsApiRequest(`
                SELECT 
                    segments.date,
                    metrics.cost_micros,
                    metrics.conversions
                FROM customer
                WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                ORDER BY segments.date DESC
            `);
            
            results.google = googleData.map(row => ({
                date: row.segments?.date,
                spend: (parseInt(row.metrics?.cost_micros) || 0) / 1000000,
                conversions: parseFloat(row.metrics?.conversions) || 0
            }));
        } catch (e) {
            console.error('Google summary error:', e.message);
        }
    }
    
    // Fetch Bing daily data
    if (isBingConfigured()) {
        try {
            const columns = ['TimePeriod', 'Spend', 'Conversions'];
            const report = await submitAndDownloadReport('account', startDate, endDate, columns);
            
            results.bing = report.rows.map(row => ({
                date: row.TimePeriod,
                spend: parseFloat(row.Spend) || 0,
                conversions: parseFloat(row.Conversions) || 0
            }));
        } catch (e) {
            console.error('Bing summary error:', e.message);
        }
    }
    
    res.json(results);
});

// Summary: Get aggregated spend for periods (weekly/monthly)
app.post('/api/summary/aggregated', async (req, res) => {
    const { periods } = req.body; // Array of {name, startDate, endDate}
    
    if (!periods || !Array.isArray(periods)) {
        return res.json([]);
    }
    
    const results = [];
    
    for (const period of periods) {
        // Skip periods with missing dates
        if (!period.startDate || !period.endDate) {
            console.log('Skipping period with missing dates:', period.name);
            continue;
        }
        
        const periodData = {
            name: period.name,
            meta: 0,
            google: 0,
            bing: 0
        };
        
        // Fetch Google
        if (isGoogleAdsConfigured()) {
            try {
                const googleData = await googleAdsApiRequest(`
                    SELECT metrics.cost_micros
                    FROM customer
                    WHERE segments.date BETWEEN '${period.startDate}' AND '${period.endDate}'
                `);
                
                googleData.forEach(row => {
                    periodData.google += (parseInt(row.metrics?.cost_micros) || 0) / 1000000;
                });
            } catch (e) {
                console.error('Google aggregated error:', e.message);
            }
        }
        
        // Fetch Bing
        if (isBingConfigured() && period.startDate && period.endDate) {
            try {
                const columns = ['TimePeriod', 'Spend'];
                const report = await submitAndDownloadReport('account', period.startDate, period.endDate, columns);
                
                if (report && report.rows) {
                    report.rows.forEach(row => {
                        periodData.bing += parseFloat(row.Spend) || 0;
                    });
                }
            } catch (e) {
                console.error('Bing aggregated error:', e.message);
            }
        }
        
        results.push(periodData);
    }
    
    res.json(results);
});


// API endpoint for webhook data (must be before catch-all)
app.get("/api/webhooks", (req, res) => {
    res.json({ count: global.webhookData?.length || 0, data: (global.webhookData || []).slice(-20) });
});

// ==================== Ours Privacy API ====================

// Get aggregated event counts
app.get("/api/ours-privacy/events", (req, res) => {
    const data = global.webhookData || [];
    
    // Filter only ours-privacy data (has user-agent with ours-privacy)
    const oursData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy")
    );
    
    // Aggregate by event type
    const eventCounts = {};
    const sourceCounts = {};
    
    oursData.forEach(d => {
        if (d.body && d.body.event && d.body.event.event) {
            const event = d.body.event.event;
            eventCounts[event] = (eventCounts[event] || 0) + 1;
        }
        if (d.body && d.body.visitor && d.body.visitor.utm_source) {
            const source = d.body.visitor.utm_source;
            sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        }
    });
    
    // Convert to arrays sorted by count
    const events = Object.entries(eventCounts)
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count);
    
    const sources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    
    res.json({
        totalEvents: oursData.length,
        events,
        sources,
        lastUpdated: oursData.length > 0 ? oursData[oursData.length - 1].timestamp : null
    });
});

// Get raw webhook data (last N entries)
app.get("/api/ours-privacy/raw", (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const data = global.webhookData || [];
    
    const oursData = data
        .filter(d => d.headers && d.headers["user-agent"] && d.headers["user-agent"].includes("ours-privacy"))
        .slice(-limit)
        .reverse();
    
    res.json({ count: oursData.length, data: oursData });
});


// Get aggregated event counts with pivot by source
app.get("/api/ours-privacy/pivot", (req, res) => {
    const data = global.webhookData || [];
    
    const oursData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy")
    );
    
    const sourceData = {};
    const allEngagements = new Set();
    
    oursData.forEach(d => {
        if (!d.body || !d.body.event || !d.body.visitor) return;
        
        const event = d.body.event.event || "";
        const source = d.body.visitor.utm_source || "Unknown";
        
        const match = event.match(/e(\d+)s$/);
        const engagement = match ? "e" + match[1] + "s" : "other";
        
        allEngagements.add(engagement);
        
        if (!sourceData[source]) {
            sourceData[source] = { total: 0, engagements: {} };
        }
        sourceData[source].total++;
        sourceData[source].engagements[engagement] = (sourceData[source].engagements[engagement] || 0) + 1;
    });
    
    const engagementOrder = ["e1s", "e5s", "e15s", "e30s", "e45s", "e60s", "other"];
    const sortedEngagements = [...allEngagements].sort((a, b) => {
        return engagementOrder.indexOf(a) - engagementOrder.indexOf(b);
    });
    
    const sources = Object.entries(sourceData)
        .map(([source, data]) => ({
            source,
            total: data.total,
            engagements: data.engagements
        }))
        .sort((a, b) => b.total - a.total);
    
    res.json({
        totalEvents: oursData.length,
        engagementTypes: sortedEngagements,
        sources,
        lastUpdated: oursData.length > 0 ? oursData[oursData.length - 1].timestamp : null
    });
});


// Get events grouped by source prefix (all visitor events under primary source)
app.get("/api/ours-privacy/by-source", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let oursData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy")
    );
    
    // Apply date filtering
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        oursData = oursData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        oursData = oursData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Known source prefixes
    const sourcePrefixes = ["mutm", "tutm", "butm", "g1utm", "outm", "gbputm"];
    
    // Group by visitor first
    const visitorData = {};
    oursData.forEach(d => {
        if (!d.body || !d.body.event || !d.body.visitor) return;
        
        const vid = d.body.visitor.visitor_id || "unknown";
        const fullEvent = d.body.event.event || "";
        
        // Check if event starts with a known source prefix
        let prefix = "unknown";
        let eventType = fullEvent;
        
        for (const p of sourcePrefixes) {
            if (fullEvent.startsWith(p + "_")) {
                prefix = p;
                eventType = fullEvent.substring(p.length + 1);
                break;
            }
        }
        
        // If no known prefix, keep full event name as eventType
        if (prefix === "unknown") {
            eventType = fullEvent;
            
            // Handle Invoca call events
            if (fullEvent === "google_gmb_invoca_call") {
                prefix = "gbputm";
                eventType = "invoca_call";
            } else if (fullEvent === "bing_invoca_call") {
                prefix = "butm";
                eventType = "invoca_call";
            } else if (fullEvent.includes("invoca_call")) {
                // Generic invoca call - try to detect source from event name
                eventType = "invoca_call";
            }
        }
        
        if (!visitorData[vid]) {
            visitorData[vid] = { prefixes: new Set(), events: [] };
        }
        visitorData[vid].prefixes.add(prefix);
        visitorData[vid].events.push({ prefix, eventType, fullEvent });
    });
    
    // Priority order for sources
    const sourcePriority = ["mutm", "tutm", "butm", "g1utm", "gbputm", "outm", "unknown"];
    
    // Determine primary source per visitor and count ALL events under that source
    const sourceGroups = {};
    
    Object.values(visitorData).forEach(visitor => {
        // Find primary source (highest priority)
        let primarySource = "unknown";
        for (const src of sourcePriority) {
            if (visitor.prefixes.has(src)) {
                primarySource = src;
                break;
            }
        }
        
        if (!sourceGroups[primarySource]) {
            sourceGroups[primarySource] = { total: 0, events: {}, visitors: new Set() };
        }
        
        // Count ALL events under primary source
        visitor.events.forEach(ev => {
            sourceGroups[primarySource].total++;
            sourceGroups[primarySource].events[ev.eventType] = (sourceGroups[primarySource].events[ev.eventType] || 0) + 1;
        });
        sourceGroups[primarySource].visitors.add(visitor);
    });
    
    // Convert to output format
    const sources = Object.entries(sourceGroups)
        .map(([prefix, data]) => {
            const sortedEvents = Object.entries(data.events)
                .map(([event, count]) => ({ event, count }))
                .sort((a, b) => b.count - a.count);
            return { 
                prefix, 
                total: data.total, 
                uniqueVisitors: data.visitors.size,
                events: sortedEvents 
            };
        })
        .sort((a, b) => b.total - a.total);
    
    res.json({
        totalEvents: oursData.length,
        uniqueVisitors: Object.keys(visitorData).length,
        sources,
        dateRange: { startDate, endDate },
        lastUpdated: oursData.length > 0 ? oursData[oursData.length - 1].timestamp : null
    });
});














// Get l_f_s events by platform (meta, google, bing, tiktok)
// l_f_s by platform - NOW USING LOOKER as source of truth
app.get("/api/ours-privacy/lfs-by-platform", async (req, res) => {
    try {
        const platform = (req.query.platform || "").toLowerCase();
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        if (!startDate || !endDate) {
            return res.json({ platform, total: 0, sources: [], events: [] });
        }
        
        // Map platform to tracking types
        const platformToTrackingTypes = {
            meta: ['mutm'],
            google: ['g1utm', 'gbutm', 'gbputm'],
            bing: ['butm'],
            tiktok: ['tutm']
        };
        
        const trackingTypes = platformToTrackingTypes[platform] || [];
        if (trackingTypes.length === 0) {
            return res.json({ platform, total: 0, sources: [], events: [] });
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const dateField = `${v}.lead_created_date_est_date`;
        const trackingField = `${v}.tracking_type`;
        const countField = `${v}.count`;
        
        // Build date filter
        let dateFilter = {};
        if (startDate === endDate) {
            dateFilter[dateField] = startDate;
        } else {
            dateFilter[dateField] = `${startDate} to ${endDate}`;
        }
        
        // Query each tracking type and sum
        let total = 0;
        for (const trackingType of trackingTypes) {
            const filter = { ...dateFilter, [trackingField]: trackingType };
            const results = await lookerQuery(v, [countField], filter, [], 10);
            if (results && results[0]) {
                total += results[0][countField] || 0;
            }
        }
        
        res.json({
            platform,
            total,
            sources: trackingTypes,
            source: 'looker',
            events: [] // Events not available from Looker
        });
    } catch (error) {
        console.error('Looker lfs-by-platform error:', error);
        res.json({ platform: req.query.platform, total: 0, sources: [], events: [], error: error.message });
    }
});

// Get l_f_s daily breakdown with platform counts
app.get("/api/ours-privacy/lfs-daily-breakdown", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    const allData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy")
    );
    
    // Build visitor platform mapping
    const visitorPlatform = {};
    allData.forEach(d => {
        const event = d.body?.event?.event || "";
        const visitorId = d.body?.visitor?.visitor_id;
        if (!visitorId) return;
        
        if (event.startsWith("mutm_") && !visitorPlatform[visitorId]) visitorPlatform[visitorId] = "meta";
        if (event.startsWith("g1utm_") && !visitorPlatform[visitorId]) visitorPlatform[visitorId] = "google";
        if (event.startsWith("butm_") && !visitorPlatform[visitorId]) visitorPlatform[visitorId] = "bing";
        if (event.startsWith("tutm_") && !visitorPlatform[visitorId]) visitorPlatform[visitorId] = "tiktok";
    });
    
    // Filter l_f_s events
    let lfsData = allData.filter(d => d.body?.event?.event === "l_f_s");
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        lfsData = lfsData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        lfsData = lfsData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Group by date with platform breakdown
    const byDate = {};
    lfsData.forEach(d => {
        const date = d.timestamp.split("T")[0];
        const visitorId = d.body?.visitor?.visitor_id;
        const source = (d.body?.visitor?.utm_source || "").toLowerCase();
        
        // Determine platform
        let platform = visitorPlatform[visitorId] || "other";
        if (platform === "other") {
            if (source === "facebook" || source === "fb") platform = "meta";
            else if (source === "google") platform = "google";
            else if (source === "bing") platform = "bing";
            else if (source === "tiktok") platform = "tiktok";
        }
        
        if (!byDate[date]) {
            byDate[date] = { total: 0, meta: 0, google: 0, bing: 0, tiktok: 0, other: 0 };
        }
        byDate[date].total++;
        byDate[date][platform]++;
    });
    
    res.json({ byDate });
});

// Get l_f_s events by platform grouped by date
// l_f_s by date - NOW USING LOOKER as source of truth
app.get("/api/ours-privacy/lfs-by-date", async (req, res) => {
    try {
        const platform = (req.query.platform || "").toLowerCase();
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        if (!startDate || !endDate) {
            return res.json({ platform, byDate: {} });
        }
        
        // Map platform to tracking types
        const platformToTrackingTypes = {
            meta: ['mutm'],
            google: ['g1utm', 'gbutm', 'gbputm'],
            bing: ['butm'],
            tiktok: ['tutm']
        };
        
        const trackingTypes = platformToTrackingTypes[platform] || [];
        if (trackingTypes.length === 0) {
            return res.json({ platform, byDate: {} });
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const dateField = `${v}.lead_created_date_est_date`;
        const trackingField = `${v}.tracking_type`;
        const countField = `${v}.count`;
        
        // Build date filter
        let dateFilter = {};
        if (startDate === endDate) {
            dateFilter[dateField] = startDate;
        } else {
            dateFilter[dateField] = `${startDate} to ${endDate}`;
        }
        
        // Query for each tracking type
        const byDate = {};
        
        for (const trackingType of trackingTypes) {
            const filter = { ...dateFilter, [trackingField]: trackingType };
            const results = await lookerQuery(v, [dateField, countField], filter, [`${dateField} desc`], 100);
            
            results.forEach(row => {
                const date = row[dateField];
                const count = row[countField] || 0;
                byDate[date] = (byDate[date] || 0) + count;
            });
        }
        
        res.json({ platform, byDate, source: 'looker' });
    } catch (error) {
        console.error('Looker lfs-by-date error:', error);
        res.json({ platform: req.query.platform, byDate: {}, error: error.message });
    }
});

// Get l_f_s events grouped by source
// Invoca calls from raw webhooks by platform
app.get("/api/ours-privacy/invoca-by-platform", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let invocaData = data.filter(d => {
        const event = d.body?.event?.event || "";
        return event.includes("invoca_call");
    });
    
    // Date filter
    if (startDate) {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        invocaData = invocaData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        invocaData = invocaData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Group by platform and type based on event name
    const byPlatform = { 
        meta: 0, 
        google: 0, 
        google_gmb: 0, 
        bing: 0, 
        tiktok: 0, 
        other: 0 
    };
    invocaData.forEach(d => {
        const event = (d.body?.event?.event || "").toLowerCase();
        if (event === "fb_invoca_call" || event === "facebook_invoca_call") byPlatform.meta++;
        else if (event === "google_gmb_invoca_call") byPlatform.google_gmb++;
        else if (event === "google_invoca_call") byPlatform.google++;
        else if (event === "bing_invoca_call") byPlatform.bing++;
        else if (event === "tiktok_invoca_call") byPlatform.tiktok++;
        else byPlatform.other++;
    });
    
    res.json({ total: invocaData.length, byPlatform, source: "webhooks" });
});

// Ours Privacy l_f_s from RAW WEBHOOKS (not Looker) - for the "Ours P" rows
app.get("/api/ours-privacy/lfs-raw-by-platform", (req, res) => {
    const data = global.webhookData || [];
    const platform = (req.query.platform || "").toLowerCase();
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    // Map platform to utm_source patterns
    const platformPatterns = {
        meta: ['facebook', 'fb', 'meta', 'ig', 'instagram'],
        google: ['google', 'gclid'],
        bing: ['bing', 'msclkid', 'microsoft'],
        tiktok: ['tiktok', 'tt']
    };
    
    let oursData = data.filter(d => 
        d.headers?.["user-agent"]?.includes("ours-privacy") &&
        d.body?.event?.event === "l_f_s"
    );
    
    // Date filter
    if (startDate) {
        const start = new Date(startDate); start.setHours(0, 0, 0, 0);
        oursData = oursData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        oursData = oursData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Platform filter
    if (platform && platformPatterns[platform]) {
        const patterns = platformPatterns[platform];
        oursData = oursData.filter(d => {
            const source = (d.body.visitor?.utm_source || "").toLowerCase();
            const medium = (d.body.visitor?.utm_medium || "").toLowerCase();
            const url = (d.body.event?.url || "").toLowerCase();
            return patterns.some(p => source.includes(p) || medium.includes(p) || url.includes(p));
        });
    }
    
    res.json({ platform, total: oursData.length, source: "webhooks" });
});

app.get("/api/ours-privacy/lfs", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let oursData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy") &&
        d.body && d.body.event && d.body.event.event === "l_f_s"
    );
    
    // Apply date filtering
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        oursData = oursData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        oursData = oursData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Group by utm_source
    const sourceGroups = {};
    oursData.forEach(d => {
        const source = d.body.visitor?.utm_source || "Unknown";
        sourceGroups[source] = (sourceGroups[source] || 0) + 1;
    });
    
    const sources = Object.entries(sourceGroups)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    
    res.json({
        total: oursData.length,
        sources,
        lastUpdated: oursData.length > 0 ? oursData[oursData.length - 1].timestamp : null
    });
});

// Cross-attribution analysis - visitors who entered via one platform but converted with another
app.get("/api/ours-privacy/cross-attribution", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let allData = data.filter(d => 
        d.headers && d.headers["user-agent"] && 
        d.headers["user-agent"].includes("ours-privacy")
    );
    
    // Apply date filtering to ALL data first
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        allData = allData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        allData = allData.filter(d => new Date(d.timestamp) <= end);
    }
    
    // Build sets of visitor IDs by platform (based on their events within date range)
    const platformVisitors = {
        meta: new Set(),
        google: new Set(),
        bing: new Set(),
        tiktok: new Set(),
        organic: new Set(),
        instagramOrganic: new Set()
    };
    
    // First pass: collect visitors by event prefix
    allData.forEach(d => {
        const event = d.body?.event?.event || "";
        const visitorId = d.body?.visitor?.visitor_id;
        if (!visitorId) return;
        
        if (event.startsWith("mutm_")) platformVisitors.meta.add(visitorId);
        if (event.startsWith("g1utm_")) platformVisitors.google.add(visitorId);
        if (event.startsWith("butm_")) platformVisitors.bing.add(visitorId);
        if (event.startsWith("tutm_")) platformVisitors.tiktok.add(visitorId);
        if (event.startsWith("outm_")) platformVisitors.organic.add(visitorId);
    });
    
    // Second pass: find Instagram Organic (utm_source=instagram but NOT from Meta ads)
    allData.forEach(d => {
        const visitorId = d.body?.visitor?.visitor_id;
        const utmSource = (d.body?.visitor?.utm_source || "").toLowerCase();
        if (!visitorId) return;
        
        if (utmSource === "instagram" && !platformVisitors.meta.has(visitorId)) {
            platformVisitors.instagramOrganic.add(visitorId);
        }
    });
    
    // Get l_f_s events (already date filtered via allData)
    let lfsData = allData.filter(d => d.body?.event?.event === "l_f_s");
    
    // Analyze cross-attribution for each platform
    const metaSources = ["facebook", "fb", "meta"];  // instagram removed - it's now tracked separately
    const googleSources = ["google"];
    const bingSources = ["bing"];
    const tiktokSources = ["tiktok", "tt"];
    const organicSources = ["organic", "direct", "", "(none)", "(direct)"];
    const instagramOrganicSources = ["instagram"];
    
    const analysis = {
        meta: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} },
        google: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} },
        bing: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} },
        tiktok: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} },
        organic: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} },
        instagramOrganic: { entered: 0, convertedSame: 0, convertedOther: 0, lostTo: {} }
    };
    
    // Count visitors who entered via each platform
    analysis.meta.entered = platformVisitors.meta.size;
    analysis.google.entered = platformVisitors.google.size;
    analysis.bing.entered = platformVisitors.bing.size;
    analysis.tiktok.entered = platformVisitors.tiktok.size;
    analysis.organic.entered = platformVisitors.organic.size;
    analysis.instagramOrganic.entered = platformVisitors.instagramOrganic.size;
    
    // Analyze conversions
    lfsData.forEach(d => {
        const visitorId = d.body?.visitor?.visitor_id;
        const utmSource = (d.body?.visitor?.utm_source || "").toLowerCase();
        
        // Check each platform
        ["meta", "google", "bing", "tiktok", "organic", "instagramOrganic"].forEach(platform => {
            if (platformVisitors[platform].has(visitorId)) {
                const platformSources = platform === "meta" ? metaSources :
                                       platform === "google" ? googleSources :
                                       platform === "bing" ? bingSources :
                                       platform === "tiktok" ? tiktokSources :
                                       platform === "instagramOrganic" ? instagramOrganicSources : organicSources;
                
                if (platformSources.some(s => utmSource.includes(s) || (s === "" && utmSource === ""))) {
                    analysis[platform].convertedSame++;
                } else {
                    analysis[platform].convertedOther++;
                    const lostSource = utmSource || "unknown";
                    analysis[platform].lostTo[lostSource] = (analysis[platform].lostTo[lostSource] || 0) + 1;
                }
            }
        });
    });
    
    // Calculate cross-platform overlaps
    const overlaps = {
        metaGoogle: [...platformVisitors.meta].filter(v => platformVisitors.google.has(v)).length,
        metaBing: [...platformVisitors.meta].filter(v => platformVisitors.bing.has(v)).length,
        metaTiktok: [...platformVisitors.meta].filter(v => platformVisitors.tiktok.has(v)).length,
        metaOrganic: [...platformVisitors.meta].filter(v => platformVisitors.organic.has(v)).length,
        metaInstagramOrganic: [...platformVisitors.meta].filter(v => platformVisitors.instagramOrganic.has(v)).length,
        googleBing: [...platformVisitors.google].filter(v => platformVisitors.bing.has(v)).length,
        googleTiktok: [...platformVisitors.google].filter(v => platformVisitors.tiktok.has(v)).length,
        googleOrganic: [...platformVisitors.google].filter(v => platformVisitors.organic.has(v)).length,
        googleInstagramOrganic: [...platformVisitors.google].filter(v => platformVisitors.instagramOrganic.has(v)).length,
        bingTiktok: [...platformVisitors.bing].filter(v => platformVisitors.tiktok.has(v)).length,
        bingOrganic: [...platformVisitors.bing].filter(v => platformVisitors.organic.has(v)).length,
        bingInstagramOrganic: [...platformVisitors.bing].filter(v => platformVisitors.instagramOrganic.has(v)).length,
        tiktokOrganic: [...platformVisitors.tiktok].filter(v => platformVisitors.organic.has(v)).length,
        tiktokInstagramOrganic: [...platformVisitors.tiktok].filter(v => platformVisitors.instagramOrganic.has(v)).length,
        organicInstagramOrganic: [...platformVisitors.organic].filter(v => platformVisitors.instagramOrganic.has(v)).length
    };
    
    res.json({
        analysis,
        overlaps,
        totalLfs: lfsData.length
    });
});

// ==================== Looker API Endpoints ====================

// Get leads funnel data by tracking type
app.get('/api/looker/leads-funnel', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Build date filter
        let dateFilter = {};
        if (startDate && endDate) {
            // For single day, use just the date; for ranges, use "start to end"
            if (startDate === endDate) {
                dateFilter['fct_leads_funnel_marketing_phi_exclude.lead_created_date_est_date'] = startDate;
            } else {
                dateFilter['fct_leads_funnel_marketing_phi_exclude.lead_created_date_est_date'] = `${startDate} to ${endDate}`;
            }
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const fields = [`${v}.tracking_type`, `${v}.count`];
        const sorts = [`${v}.count desc`];
        
        // Run all base queries in parallel
        const [totalLeads, isBooked, sentToVerification, isBookedCovered, initialFulfilled] = await Promise.all([
            lookerQuery(v, fields, dateFilter, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.is_booked`]: '1' }, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.sent_to_verification`]: '1' }, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.is_booked_covered`]: '1' }, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.initial_fulfilled`]: '1' }, sorts)
        ]);
        
        // Helper to convert array to map
        const toMap = (arr) => {
            const map = {};
            arr.forEach(item => {
                const type = item['fct_leads_funnel_marketing_phi_exclude.tracking_type'] || 'unknown';
                map[type] = item['fct_leads_funnel_marketing_phi_exclude.count'] || 0;
            });
            return map;
        };
        
        // Build response
        const trackingTypes = ['mutm', 'outm', 'tutm', 'g1utm', 'butm', 'gbputm', 'gbutm'];
        const funnelData = {};
        
        const totalMap = toMap(totalLeads);
        const bookedMap = toMap(isBooked);
        const verificationMap = toMap(sentToVerification);
        const coveredMap = toMap(isBookedCovered);
        const fulfilledMap = toMap(initialFulfilled);
        
        trackingTypes.forEach(type => {
            if (totalMap[type]) {
                funnelData[type] = {
                    l_f_s: totalMap[type] || 0,
                    is_booked: bookedMap[type] || 0,
                    sent_to_verification: verificationMap[type] || 0,
                    is_booked_covered: coveredMap[type] || 0,
                    initial_fulfilled: fulfilledMap[type] || 0
                };
            }
        });
        
        // Get insurance breakdown for each stage - ALL queries in parallel
        const insuranceTypes = ['PPO', 'HMO', 'Medicare'];
        const insuranceData = { all: {}, byPlatform: {} };
        
        // Build all insurance queries upfront
        const insuranceQueries = [];
        const queryMeta = []; // Track what each query is for
        
        // Queries for totals (all platforms)
        for (const insType of insuranceTypes) {
            const insFilter = { ...dateFilter, [`${v}.insurance_type`]: insType };
            insuranceQueries.push(
                lookerQuery(v, [`${v}.count`], insFilter),
                lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.is_booked`]: '1' }),
                lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.sent_to_verification`]: '1' }),
                lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.is_booked_covered`]: '1' }),
                lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.initial_fulfilled`]: '1' })
            );
            queryMeta.push({ type: 'all', insType, stage: 'l_f_s' });
            queryMeta.push({ type: 'all', insType, stage: 'is_booked' });
            queryMeta.push({ type: 'all', insType, stage: 'sent_to_verification' });
            queryMeta.push({ type: 'all', insType, stage: 'is_booked_covered' });
            queryMeta.push({ type: 'all', insType, stage: 'initial_fulfilled' });
        }
        
        // Queries for each platform
        for (const platform of trackingTypes) {
            for (const insType of insuranceTypes) {
                const insFilter = { ...dateFilter, [`${v}.insurance_type`]: insType, [`${v}.tracking_type`]: platform };
                insuranceQueries.push(
                    lookerQuery(v, [`${v}.count`], insFilter),
                    lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.is_booked`]: '1' }),
                    lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.sent_to_verification`]: '1' }),
                    lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.is_booked_covered`]: '1' }),
                    lookerQuery(v, [`${v}.count`], { ...insFilter, [`${v}.initial_fulfilled`]: '1' })
                );
                queryMeta.push({ type: 'platform', platform, insType, stage: 'l_f_s' });
                queryMeta.push({ type: 'platform', platform, insType, stage: 'is_booked' });
                queryMeta.push({ type: 'platform', platform, insType, stage: 'sent_to_verification' });
                queryMeta.push({ type: 'platform', platform, insType, stage: 'is_booked_covered' });
                queryMeta.push({ type: 'platform', platform, insType, stage: 'initial_fulfilled' });
            }
        }
        
        // Run ALL insurance queries in parallel
        const insuranceResults = await Promise.all(insuranceQueries);
        
        // Process results
        for (const insType of insuranceTypes) {
            insuranceData.all[insType] = { l_f_s: 0, is_booked: 0, sent_to_verification: 0, is_booked_covered: 0, initial_fulfilled: 0 };
        }
        for (const platform of trackingTypes) {
            insuranceData.byPlatform[platform] = {};
            for (const insType of insuranceTypes) {
                insuranceData.byPlatform[platform][insType] = { l_f_s: 0, is_booked: 0, sent_to_verification: 0, is_booked_covered: 0, initial_fulfilled: 0 };
            }
        }
        
        insuranceResults.forEach((result, idx) => {
            const meta = queryMeta[idx];
            const count = result[0]?.[`${v}.count`] || 0;
            
            if (meta.type === 'all') {
                insuranceData.all[meta.insType][meta.stage] = count;
            } else {
                insuranceData.byPlatform[meta.platform][meta.insType][meta.stage] = count;
            }
        });
        
        res.json({
            success: true,
            data: funnelData,
            totals: {
                l_f_s: Object.values(totalMap).reduce((a, b) => a + b, 0),
                is_booked: Object.values(bookedMap).reduce((a, b) => a + b, 0),
                sent_to_verification: Object.values(verificationMap).reduce((a, b) => a + b, 0),
                is_booked_covered: Object.values(coveredMap).reduce((a, b) => a + b, 0),
                initial_fulfilled: Object.values(fulfilledMap).reduce((a, b) => a + b, 0)
            },
            insurance: insuranceData
        });
    } catch (error) {
        console.error('Looker leads funnel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get insurance funnel data - full funnel breakdown by platform and insurance type
app.get('/api/looker/insurance-funnel', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter['fct_leads_funnel_marketing_phi_exclude.lead_created_date_est_date'] = `${startDate} to ${endDate}`;
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const platforms = ['mutm', 'g1utm', 'butm', 'tutm', 'gbputm', 'gbutm', 'outm'];
        const insuranceTypes = ['PPO', 'HMO', 'Medicare'];
        const stages = ['leads', 'booked', 'verified', 'covered', 'fulfilled'];
        const stageFilters = {
            leads: {},
            booked: { [`${v}.is_booked`]: '1' },
            verified: { [`${v}.sent_to_verification`]: '1' },
            covered: { [`${v}.is_booked_covered`]: '1' },
            fulfilled: { [`${v}.initial_fulfilled`]: '1' }
        };
        
        // Build ALL queries upfront
        const allQueries = [];
        const queryMeta = [];
        
        // Total queries per platform
        for (const platform of platforms) {
            allQueries.push(lookerQuery(v, [`${v}.count`], { ...dateFilter, [`${v}.tracking_type`]: platform }));
            queryMeta.push({ type: 'total', platform });
        }
        
        // Insurance breakdown queries
        for (const platform of platforms) {
            for (const insType of insuranceTypes) {
                for (const stage of stages) {
                    const filters = { 
                        ...dateFilter, 
                        [`${v}.tracking_type`]: platform,
                        [`${v}.insurance_type`]: insType,
                        ...stageFilters[stage]
                    };
                    allQueries.push(lookerQuery(v, [`${v}.count`], filters));
                    queryMeta.push({ type: 'insurance', platform, insType, stage });
                }
            }
            // Unknown insurance
            allQueries.push(lookerQuery(v, [`${v}.count`], { ...dateFilter, [`${v}.tracking_type`]: platform, [`${v}.insurance_type`]: 'NULL' }));
            queryMeta.push({ type: 'unknown', platform });
        }
        
        // Run ALL queries in parallel
        const allResults = await Promise.all(allQueries);
        
        // Initialize result structure
        const result = {};
        for (const platform of platforms) {
            result[platform] = { total: 0, insurance: {} };
            for (const insType of insuranceTypes) {
                result[platform].insurance[insType] = { leads: 0, booked: 0, verified: 0, covered: 0, fulfilled: 0 };
            }
            result[platform].insurance['Unknown'] = { leads: 0, booked: 0, verified: 0, covered: 0, fulfilled: 0 };
        }
        
        // Process results
        allResults.forEach((res, idx) => {
            const meta = queryMeta[idx];
            const count = res[0]?.[`${v}.count`] || 0;
            
            if (meta.type === 'total') {
                result[meta.platform].total = count;
            } else if (meta.type === 'insurance') {
                result[meta.platform].insurance[meta.insType][meta.stage] = count;
            } else if (meta.type === 'unknown') {
                result[meta.platform].insurance['Unknown'].leads = count;
            }
        });
        
        // Calculate totals across all platforms
        const totals = { PPO: { leads: 0, booked: 0, verified: 0, covered: 0, fulfilled: 0 }, 
                        HMO: { leads: 0, booked: 0, verified: 0, covered: 0, fulfilled: 0 },
                        Medicare: { leads: 0, booked: 0, verified: 0, covered: 0, fulfilled: 0 },
                        Unknown: { leads: 0 } };
        
        for (const platform of platforms) {
            for (const insType of [...insuranceTypes, 'Unknown']) {
                const data = result[platform].insurance[insType];
                if (data) {
                    totals[insType].leads += data.leads;
                    if (insType !== 'Unknown') {
                        totals[insType].booked += data.booked;
                        totals[insType].verified += data.verified;
                        totals[insType].covered += data.covered;
                        totals[insType].fulfilled += data.fulfilled;
                    }
                }
            }
        }
        
        res.json({ success: true, data: result, totals, platforms: {
            mutm: 'Meta', g1utm: 'Google', butm: 'Bing', tutm: 'TikTok', gbputm: 'GBP', gbutm: 'GBP', outm: 'Organic'
        }});
    } catch (error) {
        console.error('Looker insurance funnel error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get monthly cost per funnel stage trends
app.get('/api/looker/monthly-cost-trends', async (req, res) => {
    try {
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const platforms = ['mutm', 'g1utm', 'butm', 'tutm'];
        
        // Support custom date range or fall back to months parameter
        const { startDate, endDate, months: monthsParam } = req.query;
        const months = [];
        
        if (startDate && endDate) {
            // Custom date range - group by month within the range
            const start = new Date(startDate + 'T12:00:00');
            const end = new Date(endDate + 'T12:00:00');
            
            // Generate months between start and end dates
            let current = new Date(start.getFullYear(), start.getMonth(), 1);
            while (current <= end) {
                const monthStart = new Date(current);
                const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
                
                // Clamp to actual date range
                const actualStart = monthStart < start ? start : monthStart;
                const actualEnd = monthEnd > end ? end : monthEnd;
                
                months.push({
                    label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    start: actualStart.toISOString().split('T')[0],
                    end: actualEnd.toISOString().split('T')[0]
                });
                
                current.setMonth(current.getMonth() + 1);
            }
        } else {
            // Fall back to numMonths parameter
            const numMonths = parseInt(monthsParam) || 6;
            const today = new Date();
            for (let i = numMonths - 1; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
                months.push({
                    label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                    start: d.toISOString().split('T')[0],
                    end: endOfMonth.toISOString().split('T')[0]
                });
            }
        }
        
        const result = { 
            months: months.map(m => m.label), 
            periods: months.map(m => ({ start: m.start, end: m.end })),
            data: {} 
        };
        
        // Build ALL queries upfront and run in parallel
        const allQueries = [];
        const queryMeta = [];
        const stages = ['l_f_s', 'is_booked', 'sent_to_verification', 'is_booked_covered', 'initial_fulfilled'];
        const stageFilters = {
            l_f_s: {},
            is_booked: { [`${v}.is_booked`]: '1' },
            sent_to_verification: { [`${v}.sent_to_verification`]: '1' },
            is_booked_covered: { [`${v}.is_booked_covered`]: '1' },
            initial_fulfilled: { [`${v}.initial_fulfilled`]: '1' }
        };
        
        for (const platform of platforms) {
            for (let monthIdx = 0; monthIdx < months.length; monthIdx++) {
                const month = months[monthIdx];
                const dateFilter = { [`${v}.lead_created_date_est_date`]: `${month.start} to ${month.end}` };
                const platformFilter = { ...dateFilter, [`${v}.tracking_type`]: platform };
                
                for (const stage of stages) {
                    allQueries.push(lookerQuery(v, [`${v}.count`], { ...platformFilter, ...stageFilters[stage] }));
                    queryMeta.push({ platform, monthIdx, stage });
                }
            }
        }
        
        // Run ALL queries in parallel
        const allResults = await Promise.all(allQueries);
        
        // Initialize result structure
        for (const platform of platforms) {
            result.data[platform] = { l_f_s: [], is_booked: [], sent_to_verification: [], is_booked_covered: [], initial_fulfilled: [] };
            for (let i = 0; i < months.length; i++) {
                stages.forEach(s => result.data[platform][s].push(0));
            }
        }
        
        // Process results
        allResults.forEach((res, idx) => {
            const meta = queryMeta[idx];
            const count = res[0]?.[`${v}.count`] || 0;
            result.data[meta.platform][meta.stage][meta.monthIdx] = count;
        });
        
        // Calculate totals across all platforms
        result.data.all = { l_f_s: [], is_booked: [], sent_to_verification: [], is_booked_covered: [], initial_fulfilled: [] };
        for (let i = 0; i < months.length; i++) {
            stages.forEach(stage => {
                result.data.all[stage].push(platforms.reduce((sum, p) => sum + result.data[p][stage][i], 0));
            });
        }
        
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Monthly cost trends error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Weekly cost trends endpoint
app.get('/api/looker/weekly-cost-trends', async (req, res) => {
    try {
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const platforms = ['mutm', 'g1utm', 'butm', 'tutm'];
        
        const { startDate, endDate } = req.query;
        const weeks = [];
        
        if (startDate && endDate) {
            // Generate weeks between start and end dates
            const start = new Date(startDate + 'T12:00:00');
            const end = new Date(endDate + 'T12:00:00');
            
            // Find the Monday of the start week
            let current = new Date(start);
            const dayOfWeek = current.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
            current.setDate(current.getDate() + diff);
            
            while (current <= end) {
                const weekStart = new Date(current);
                const weekEnd = new Date(current);
                weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
                
                // Clamp to actual date range
                const actualStart = weekStart < start ? start : weekStart;
                const actualEnd = weekEnd > end ? end : weekEnd;
                
                // Format label as "Mon D - Mon D" (e.g., "Feb 3 - Feb 9")
                const label = `${actualStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${actualEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                weeks.push({
                    label,
                    start: actualStart.toISOString().split('T')[0],
                    end: actualEnd.toISOString().split('T')[0]
                });
                
                current.setDate(current.getDate() + 7); // Move to next week
            }
        } else {
            // Default to last 8 weeks
            const today = new Date();
            for (let i = 7; i >= 0; i--) {
                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() - (i * 7));
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekEnd.getDate() - 6);
                
                const label = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                
                weeks.push({
                    label,
                    start: weekStart.toISOString().split('T')[0],
                    end: weekEnd.toISOString().split('T')[0]
                });
            }
        }
        
        const result = { 
            weeks: weeks.map(w => w.label), 
            periods: weeks.map(w => ({ start: w.start, end: w.end })),
            data: {} 
        };
        
        // Build queries
        const allQueries = [];
        const queryMeta = [];
        const stages = ['l_f_s', 'is_booked', 'sent_to_verification', 'is_booked_covered', 'initial_fulfilled'];
        const stageFilters = {
            l_f_s: {},
            is_booked: { [`${v}.is_booked`]: '1' },
            sent_to_verification: { [`${v}.sent_to_verification`]: '1' },
            is_booked_covered: { [`${v}.is_booked_covered`]: '1' },
            initial_fulfilled: { [`${v}.initial_fulfilled`]: '1' }
        };
        
        for (const platform of platforms) {
            for (let weekIdx = 0; weekIdx < weeks.length; weekIdx++) {
                const week = weeks[weekIdx];
                const dateFilter = { [`${v}.lead_created_date_est_date`]: `${week.start} to ${week.end}` };
                const platformFilter = { ...dateFilter, [`${v}.tracking_type`]: platform };
                
                for (const stage of stages) {
                    allQueries.push(lookerQuery(v, [`${v}.count`], { ...platformFilter, ...stageFilters[stage] }));
                    queryMeta.push({ platform, weekIdx, stage });
                }
            }
        }
        
        // Run all queries in parallel
        const allResults = await Promise.all(allQueries);
        
        // Initialize result structure
        for (const platform of platforms) {
            result.data[platform] = { l_f_s: [], is_booked: [], sent_to_verification: [], is_booked_covered: [], initial_fulfilled: [] };
            for (let i = 0; i < weeks.length; i++) {
                stages.forEach(s => result.data[platform][s].push(0));
            }
        }
        
        // Process results
        allResults.forEach((res, idx) => {
            const meta = queryMeta[idx];
            const count = res[0]?.[`${v}.count`] || 0;
            result.data[meta.platform][meta.stage][meta.weekIdx] = count;
        });
        
        // Calculate totals across all platforms
        result.data.all = { l_f_s: [], is_booked: [], sent_to_verification: [], is_booked_covered: [], initial_fulfilled: [] };
        for (let i = 0; i < weeks.length; i++) {
            stages.forEach(stage => {
                result.data.all[stage].push(platforms.reduce((sum, p) => sum + result.data[p][stage][i], 0));
            });
        }
        
        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Weekly cost trends error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Get visitor journey - all events for a specific visitor ID
app.get("/api/ours-privacy/visitor-journey/:visitorId", (req, res) => {
    const data = global.webhookData || [];
    const visitorId = req.params.visitorId;
    
    const events = data.filter(d => 
        d.headers?.["user-agent"]?.includes("ours-privacy") &&
        d.body?.visitor?.visitor_id === visitorId
    ).map(d => ({
        timestamp: d.timestamp,
        event: d.body?.event?.event,
        utm_source: d.body?.visitor?.utm_source,
        utm_campaign: d.body?.visitor?.utm_campaign,
        utm_medium: d.body?.visitor?.utm_medium
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({
        visitorId,
        totalEvents: events.length,
        events,
        converted: events.some(e => e.event === "l_f_s"),
        conversionSource: events.find(e => e.event === "l_f_s")?.utm_source || null
    });
});

// Get list of visitors who converted (for dropdown selection)
app.get("/api/ours-privacy/converted-visitors", (req, res) => {
    const data = global.webhookData || [];
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let allData = data.filter(d => 
        d.headers?.["user-agent"]?.includes("ours-privacy")
    );
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        allData = allData.filter(d => new Date(d.timestamp) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        allData = allData.filter(d => new Date(d.timestamp) <= end);
    }
    
    const lfsEvents = allData.filter(d => d.body?.event?.event === "l_f_s");
    
    const visitors = lfsEvents.map(d => ({
        visitorId: d.body?.visitor?.visitor_id,
        conversionTime: d.timestamp,
        utm_source: d.body?.visitor?.utm_source
    })).sort((a, b) => new Date(b.conversionTime) - new Date(a.conversionTime));
    
    const eventCounts = {};
    allData.forEach(d => {
        const vid = d.body?.visitor?.visitor_id;
        if (vid) eventCounts[vid] = (eventCounts[vid] || 0) + 1;
    });
    
    visitors.forEach(v => {
        v.totalEvents = eventCounts[v.visitorId] || 0;
    });
    
    res.json({
        total: visitors.length,
        visitors: visitors.slice(0, 100)
    });
});

// ==================== Clinic Performance ====================
// Combines: Ad Clicks (by zipcode) + Bookings (from Looker) = Booked per 100 Clicks
// Get Google Ads campaigns list for clinic performance filter
app.get('/api/google/campaigns-list', async (req, res) => {
    if (!isGoogleAdsConfigured()) {
        return res.json({ campaigns: [] });
    }
    try {
        const { startDate, endDate } = req.query;
        const query = `
            SELECT campaign.id, campaign.name, campaign.status
            FROM campaign
            WHERE campaign.status = 'ENABLED'
            ${startDate && endDate ? `AND segments.date BETWEEN '${startDate}' AND '${endDate}' AND metrics.impressions > 0` : ''}
            ORDER BY campaign.name ASC
        `;
        const results = await googleAdsApiRequest(query);
        const campaigns = [...new Map(results.map(r => [r.campaign?.id, { id: r.campaign?.id, name: r.campaign?.name }])).values()];
        campaigns.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        res.json({ campaigns });
    } catch (e) {
        console.error('Google campaigns list error:', e.message);
        res.json({ campaigns: [] });
    }
});

app.get('/api/looker/clinic-performance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const campaignIds = req.query.campaignIds ? req.query.campaignIds.split(',').filter(Boolean) : [];
        
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing startDate or endDate' });
        }
        
        // 1. Get bookings by clinic from Looker
        let dateFilter = {};
        if (startDate === endDate) {
            dateFilter['fct_leads_funnel_marketing_phi_exclude.lead_created_date_est_date'] = startDate;
        } else {
            dateFilter['fct_leads_funnel_marketing_phi_exclude.lead_created_date_est_date'] = `${startDate} to ${endDate}`;
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const fields = [`${v}.location_lead`, `${v}.count`];
        const sorts = [`${v}.count desc`];
        
        // Run Looker queries in parallel
        const [totalLeads, isBooked, initialFulfilled] = await Promise.all([
            lookerQuery(v, fields, dateFilter, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.is_booked`]: '1' }, sorts),
            lookerQuery(v, fields, { ...dateFilter, [`${v}.initial_fulfilled`]: '1' }, sorts)
        ]);
        
        // Convert to maps
        const toMap = (arr) => {
            const map = {};
            arr.forEach(item => {
                const loc = item['fct_leads_funnel_marketing_phi_exclude.location_lead'] || 'Unknown';
                map[loc] = item['fct_leads_funnel_marketing_phi_exclude.count'] || 0;
            });
            return map;
        };
        
        const leadsMap = toMap(totalLeads);
        const bookedMap = toMap(isBooked);
        const fulfilledMap = toMap(initialFulfilled);
        
        // 2. Get ad clicks by zipcode from Google Ads only
        let adClicksByZip = {};
        
        // Google Ads geo data — use geographic_view with postal code segmentation
        // This captures ALL clicks by user location, not just targeted locations
        if (isGoogleAdsConfigured()) {
            try {
                const campaignFilter = campaignIds.length > 0 
                    ? `AND campaign.id IN (${campaignIds.join(',')})` 
                    : '';
                const query = `
                    SELECT 
                        segments.geo_target_postal_code,
                        metrics.impressions,
                        metrics.clicks,
                        metrics.cost_micros
                    FROM geographic_view
                    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                        AND metrics.impressions > 0
                        ${campaignFilter}
                    LIMIT 10000
                `;
                const googleData = await googleAdsApiRequest(query);
                
                // Extract unique geo IDs to look up postal code names
                const geoIds = [...new Set(googleData.map(r => {
                    const geoRef = r.segments?.geo_target_postal_code || '';
                    const match = geoRef.match(/geoTargetConstants\/(\d+)/);
                    return match ? match[1] : null;
                }).filter(Boolean))];
                
                // Look up names for uncached geo IDs
                const uncachedIds = geoIds.filter(id => !geoNameCache[id]);
                if (uncachedIds.length > 0) {
                    // Batch lookups in chunks of 500 to avoid query limits
                    for (let i = 0; i < uncachedIds.length; i += 500) {
                        const chunk = uncachedIds.slice(i, i + 500);
                        const geoQuery = `
                            SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.target_type, geo_target_constant.canonical_name
                            FROM geo_target_constant
                            WHERE geo_target_constant.id IN (${chunk.join(',')})
                        `;
                        const geoResults = await googleAdsApiRequest(geoQuery);
                        geoResults.forEach(r => {
                            const g = r.geo_target_constant || {};
                            geoNameCache[g.id] = { name: g.name, canonicalName: g.canonical_name, targetType: g.target_type };
                        });
                    }
                }
                
                // Aggregate by postal code
                const zipMap = {};
                googleData.forEach(row => {
                    const geoRef = row.segments?.geo_target_postal_code || '';
                    const match = geoRef.match(/geoTargetConstants\/(\d+)/);
                    if (!match) return;
                    const geoId = match[1];
                    const metrics = row.metrics || {};
                    if (!zipMap[geoId]) zipMap[geoId] = { impressions: 0, clicks: 0, cost: 0 };
                    zipMap[geoId].impressions += parseInt(metrics.impressions) || 0;
                    zipMap[geoId].clicks += parseInt(metrics.clicks) || 0;
                    zipMap[geoId].cost += (parseInt(metrics.cost_micros) || 0) / 1000000;
                });
                
                // Map geo IDs to zip codes
                let googleZipCount = 0;
                Object.entries(zipMap).forEach(([geoId, metrics]) => {
                    const geoInfo = geoNameCache[geoId];
                    if (!geoInfo) return;
                    // Extract 5-digit zip from name (e.g., "10001" or "New York 10001")
                    const zipMatch = (geoInfo.name || '').match(/(\d{5})/);
                    if (!zipMatch) return;
                    const zip = zipMatch[1];
                    
                    if (!adClicksByZip[zip]) adClicksByZip[zip] = { clicks: 0, impressions: 0, spend: 0, sources: [] };
                    adClicksByZip[zip].clicks += metrics.clicks;
                    adClicksByZip[zip].impressions += metrics.impressions;
                    adClicksByZip[zip].spend += metrics.cost;
                    if (!adClicksByZip[zip].sources.includes('Google')) adClicksByZip[zip].sources.push('Google');
                    googleZipCount++;
                });
                console.log('Clinic perf: Google geographic_view loaded, zips:', googleZipCount);
            } catch (e) {
                console.log('Google geo for clinic perf:', e.message);
            }
        }
        
        // Debug: Log sample zip entries to check format
        const sampleZips = Object.entries(adClicksByZip).slice(0, 10);
        console.log('Sample zip entries:', sampleZips.map(([z, d]) => `${z}:${d.clicks}clicks`));
        
        // Debug: Check FiDi and Midtown zips in the data
        const fidiZipsDebug = ['10002','10003','10004','10006','10007','10009','10010','10011','10012','10013','10014','10038','10080','10280','10282'];
        const midtownZipsDebug = ['10001','10016','10017','10018','10019','10020','10021','10022','10023','10024','10025','10028','10036','10065','10069','10075','10119','10128','10199'];
        const fidiFound = fidiZipsDebug.filter(z => adClicksByZip[z]);
        const midtownFound = midtownZipsDebug.filter(z => adClicksByZip[z]);
        console.log(`Clinic perf debug: ${Object.keys(adClicksByZip).length} total zips with data`);
        console.log(`FiDi zips with data: ${fidiFound.length}/${fidiZipsDebug.length}`, fidiFound.map(z => `${z}:${adClicksByZip[z].clicks}clicks`));
        console.log(`Midtown zips with data: ${midtownFound.length}/${midtownZipsDebug.length}`, midtownFound.map(z => `${z}:${adClicksByZip[z].clicks}clicks`));
        
        // 3. Map ad clicks to clinics using CLINIC_ZIPCODES
        const clinicAdData = {};
        Object.keys(CLINIC_ZIPCODES).forEach(clinic => {
            clinicAdData[clinic] = { clicks: 0, impressions: 0, spend: 0 };
            CLINIC_ZIPCODES[clinic].forEach(zip => {
                if (adClicksByZip[zip]) {
                    clinicAdData[clinic].clicks += adClicksByZip[zip].clicks;
                    clinicAdData[clinic].impressions += adClicksByZip[zip].impressions;
                    clinicAdData[clinic].spend += adClicksByZip[zip].spend;
                }
            });
        });
        
        // 4. Match Looker clinic names to our clinic keys (fuzzy match)
        const CLINIC_ALIASES = {
            'Financial District': ['fidi', 'financial district', 'fidi manhattan'],
            'Midtown Manhattan': ['midtown'],
            'Downtown Brooklyn': ['downtown brooklyn', 'dtbk'],
            'Upper East Side': ['upper east', 'ues'],
            'Scotch Plains': ['scotch plains'],
            'Woodland Park': ['woodland'],
            'West Orange': ['west orange'],
            'Maple Lawn': ['maple lawn', 'fulton'],
            'Cedar Park': ['cedar park'],
            'Fort Worth': ['fort worth'],
            'National City': ['national city'],
            'Huntington Beach': ['huntington beach', 'huntington'],
            'Newport Beach': ['newport beach', 'newport'],
            'Brighton Beach': ['brighton beach', 'brighton']
        };
        
        const matchClinic = (lookerName) => {
            const lower = lookerName.toLowerCase();
            // Check aliases first
            for (const [clinic, aliases] of Object.entries(CLINIC_ALIASES)) {
                if (CLINIC_ZIPCODES[clinic] && aliases.some(a => lower.includes(a))) {
                    return clinic;
                }
            }
            // Then standard fuzzy match
            for (const clinic of Object.keys(CLINIC_ZIPCODES)) {
                if (lower.includes(clinic.toLowerCase()) || 
                    clinic.toLowerCase().includes(lower.split(' - ').pop()?.toLowerCase() || '')) {
                    return clinic;
                }
            }
            return null;
        };
        
        // 5. Build combined clinic data
        const allLookerClinics = new Set([...Object.keys(leadsMap), ...Object.keys(bookedMap)]);
        const clinicResults = [];
        
        allLookerClinics.forEach(lookerClinic => {
            if (!lookerClinic || lookerClinic === 'Unknown' || lookerClinic === '') return;
            
            const leads = leadsMap[lookerClinic] || 0;
            const booked = bookedMap[lookerClinic] || 0;
            const fulfilled = fulfilledMap[lookerClinic] || 0;
            
            // Try to match to our zipcode-mapped clinic for ad data
            const matchedClinic = matchClinic(lookerClinic);
            const adData = matchedClinic ? clinicAdData[matchedClinic] : { clicks: 0, impressions: 0, spend: 0 };
            
            if (leads > 0 || booked > 0) {
                clinicResults.push({
                    clinic: lookerClinic,
                    adClicks: adData.clicks,
                    adImpressions: adData.impressions,
                    adSpend: adData.spend,
                    leads,
                    booked,
                    fulfilled,
                    bookedPer100Clicks: adData.clicks > 0 ? (booked / adData.clicks * 100) : null,
                    bookedPer100Leads: leads > 0 ? (booked / leads * 100) : null
                });
            }
        });
        
        // Calculate totals
        const totals = clinicResults.reduce((acc, c) => ({
            clicks: acc.clicks + c.adClicks,
            leads: acc.leads + c.leads,
            booked: acc.booked + c.booked,
            fulfilled: acc.fulfilled + c.fulfilled
        }), { clicks: 0, leads: 0, booked: 0, fulfilled: 0 });
        
        // Calculate correlations
        const withClicks = clinicResults.filter(c => c.adClicks > 0 && c.booked > 0);
        const withLeads = clinicResults.filter(c => c.leads > 0 && c.booked > 0);
        
        let clicksCorr = 'N/A', leadsCorr = 'N/A';
        if (withClicks.length >= 3) {
            clicksCorr = calculateCorrelation(withClicks.map(c => c.adClicks), withClicks.map(c => c.booked)).toFixed(2);
        }
        if (withLeads.length >= 3) {
            leadsCorr = calculateCorrelation(withLeads.map(c => c.leads), withLeads.map(c => c.booked)).toFixed(2);
        }
        
        res.json({
            success: true,
            clinics: clinicResults.sort((a, b) => b.booked - a.booked),
            summary: {
                clinicsWithData: clinicResults.length,
                totalClicks: totals.clicks,
                totalLeads: totals.leads,
                totalBooked: totals.booked,
                totalFulfilled: totals.fulfilled,
                avgBookedPer100Clicks: totals.clicks > 0 ? (totals.booked / totals.clicks * 100).toFixed(1) : null,
                avgBookedPer100Leads: totals.leads > 0 ? (totals.booked / totals.leads * 100).toFixed(1) : null
            },
            correlation: { 
                clicks_vs_booked: clicksCorr,
                leads_vs_booked: leadsCorr 
            }
        });
        
    } catch (error) {
        console.error('Clinic performance error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper: Get Bing geographic report
async function getBingGeographicReport(startDate, endDate) {
    if (!isBingConfigured()) return [];
    
    const columns = ['PostalCode', 'Impressions', 'Clicks', 'Spend', 'Conversions'];
    const reportRequest = buildGeographicReportRequest(startDate, endDate, columns);
    
    try {
        const reportId = await submitBingReport(reportRequest);
        const csvData = await pollAndDownloadBingReport(reportId);
        return parseBingCsv(csvData);
    } catch (e) {
        console.log('Bing geo report error:', e.message);
        return [];
    }
}

// VTC Clinic zipcode mappings
const CLINIC_ZIPCODES = {
    // NYC
    'Astoria': ['10035', '11102', '11103', '11105', '11106', '11368', '11369', '11370', '11372', '11373', '11377'],
    'Brighton Beach': ['11203', '11204', '11209', '11210', '11214', '11218', '11219', '11223', '11224', '11226', '11228', '11229', '11230', '11234', '11235', '11236'],
    'Bronx': ['10032', '10033', '10034', '10040', '10452', '10453', '10456', '10457', '10458', '10459', '10460', '10461', '10462', '10463', '10464', '10465', '10466', '10467', '10468', '10469', '10470', '10471', '10472', '10473', '10475'],
    'Downtown Brooklyn': ['11201', '11203', '11204', '11205', '11206', '11210', '11211', '11212', '11213', '11215', '11216', '11217', '11218', '11219', '11220', '11221', '11222', '11225', '11226', '11230', '11231', '11232', '11233', '11237', '11238', '11249'],
    'Financial District': ['10002', '10003', '10004', '10006', '10007', '10009', '10010', '10011', '10012', '10013', '10014', '10038', '10080', '10280', '10282'],
    'Forest Hills': ['11103', '11104', '11354', '11355', '11356', '11357', '11358', '11360', '11361', '11364', '11365', '11366', '11367', '11368', '11369', '11370', '11372', '11373', '11374', '11375', '11377', '11378', '11379', '11381', '11385', '11412', '11415', '11416', '11418', '11419', '11421', '11423', '11427', '11428', '11432', '11433', '11434', '11435', '11439'],
    'Midtown Manhattan': ['10001', '10003', '10009', '10010', '10011', '10016', '10017', '10018', '10019', '10020', '10021', '10022', '10023', '10024', '10025', '10028', '10036', '10065', '10069', '10075', '10119', '10128', '10199'],
    'Staten Island': ['07001', '07008', '07064', '07065', '07066', '07067', '07077', '07095', '08830', '08832', '08837', '08840', '08859', '08861', '08863', '08872', '08879', '10306', '10307', '10308', '10309', '10312', '10314'],
    'Upper East Side': ['10024', '10025', '10026', '10027', '10028', '10029', '10030', '10035', '10037', '10075', '10128', '10451', '10452', '10454', '10455', '10456'],
    'Hartsdale': ['06831', '10502', '10504', '10510', '10514', '10520', '10522', '10523', '10528', '10530', '10532', '10533', '10543', '10546', '10549', '10562', '10570', '10573', '10577', '10580', '10583', '10591', '10594', '10595', '10601', '10603', '10604', '10605', '10606', '10607'],
    'Yonkers': ['10470', '10471', '10502', '10522', '10523', '10530', '10533', '10538', '10550', '10552', '10553', '10583', '10591', '10605', '10606', '10607', '10701', '10703', '10704', '10705', '10706', '10707', '10708', '10709', '10710', '10801', '10803', '10804'],
    'Jericho': ['11001', '11003', '11004', '11005', '11010', '11020', '11021', '11023', '11024', '11030', '11040', '11042', '11050', '11096', '11360', '11361', '11362', '11363', '11364', '11365', '11366', '11411', '11412', '11413', '11422', '11423', '11426', '11427', '11428', '11429', '11430', '11432', '11433', '11434', '11501', '11507', '11509', '11510', '11514', '11516', '11518', '11530', '11542', '11545', '11547', '11548', '11550', '11552', '11553', '11554', '11557', '11558', '11559', '11560', '11561', '11563', '11565', '11568', '11570', '11572', '11576', '11577', '11579', '11580', '11581', '11590', '11596', '11598', '11691', '11721', '11724', '11725', '11731', '11732', '11740', '11743', '11746', '11747', '11753', '11754', '11756', '11765', '11768', '11771', '11791', '11797', '11801', '11803'],
    'West Islip': ['11701', '11702', '11703', '11704', '11705', '11706', '11715', '11716', '11717', '11718', '11722', '11726', '11729', '11730', '11735', '11739', '11741', '11742', '11746', '11747', '11749', '11751', '11752', '11757', '11762', '11769', '11772', '11779', '11782', '11788', '11795', '11796', '11798'],
    'Port Jefferson': ['11713', '11719', '11720', '11727', '11733', '11738', '11742', '11749', '11755', '11763', '11764', '11766', '11767', '11776', '11777', '11778', '11779', '11780', '11784', '11786', '11787', '11788', '11789', '11790', '11792', '11901', '11933', '11934', '11940', '11941', '11949', '11950', '11951', '11953', '11955', '11960', '11961', '11967', '11980'],
    // NJ
    'Harrison': ['07017', '07029', '07031', '07032', '07071', '07083', '07094', '07099', '07102', '07103', '07104', '07105', '07107', '07108', '07109', '07110', '07111', '07112', '07114', '07201', '07205', '07208'],
    'Woodland Park': ['07004', '07005', '07006', '07009', '07011', '07013', '07021', '07034', '07035', '07043', '07044', '07045', '07046', '07054', '07058', '07068', '07082', '07403', '07405', '07407', '07410', '07417', '07420', '07424', '07430', '07432', '07436', '07440', '07442', '07444', '07452', '07457', '07465', '07470', '07481', '07501', '07502', '07503', '07504', '07505', '07506', '07508', '07512', '07513', '07514', '07522', '07524', '07834', '07936', '07981'],
    'Hoboken': ['07030', '07047', '07086', '07087', '07093', '07302', '07306', '07307', '07310'],
    'West Orange': ['07016', '07033', '07039', '07040', '07041', '07050', '07052', '07068', '07076', '07078', '07079', '07081', '07083', '07090', '07092', '07106', '07111', '07204', '07205', '07901', '07922', '07928', '07932', '07933', '07935', '07936', '07940', '07960', '07974', '07976', '07981'],
    'Princeton': ['08502', '08512', '08520', '08525', '08534', '08536', '08540', '08550', '08558', '08609', '08610', '08611', '08618', '08619', '08620', '08628', '08629', '08638', '08648', '08690', '08810', '08824', '08831', '08852', '08902'],
    'Woodbridge': ['07001', '07008', '07016', '07036', '07064', '07065', '07066', '07067', '07077', '07080', '07095', '07201', '07202', '07203', '07204', '07206', '07208', '07718', '07721', '07730', '07733', '07734', '07735', '07747', '07748', '07751', '07758', '08810', '08816', '08817', '08820', '08823', '08824', '08828', '08830', '08837', '08840', '08850', '08852', '08854', '08857', '08859', '08861', '08863', '08872', '08873', '08879', '08882', '08884', '08901', '08902', '08904', '10303', '10306', '10307', '10308', '10309', '10312', '10314'],
    'Edgewater': ['07010', '07020', '07022', '07024', '07030', '07047', '07086', '07087', '07093', '07094', '07307', '07605', '07650', '07657'],
    'Clifton': ['07003', '07011', '07012', '07013', '07014', '07017', '07026', '07028', '07029', '07031', '07032', '07043', '07055', '07057', '07070', '07071', '07072', '07073', '07074', '07075', '07094', '07102', '07103', '07104', '07105', '07107', '07109', '07110', '07513', '07503', '07601', '07603', '07604', '07607', '07608', '07643', '07644', '07657', '07660', '07662', '07663', '07666'],
    'Paramus': ['07011', '07012', '07013', '07024', '07026', '07055', '07072', '07074', '07075', '07401', '07407', '07410', '07423', '07424', '07432', '07446', '07450', '07452', '07458', '07463', '07481', '07501', '07502', '07503', '07504', '07505', '07506', '07508', '07512', '07513', '07514', '07522', '07524', '07601', '07603', '07604', '07605', '07606', '07607', '07608', '07621', '07628', '07630', '07631', '07641', '07642', '07644', '07645', '07646', '07649', '07650', '07652', '07656', '07657', '07660', '07661', '07662', '07663', '07666', '07675', '07676', '07677', '10901', '10952', '10954', '10965', '10974', '10977', '10994'],
    'Morristown': ['07054', '07058', '07901', '07920', '07924', '07927', '07928', '07932', '07935', '07936', '07940', '07950', '07960', '07974', '07981'],
    // TX
    'Kyle': ['78610', '78619', '78640', '78644', '78652', '78655', '78656', '78666', '78676', '78737', '78739', '78744', '78745', '78747', '78748', '78749'],
    'Fort Worth': ['76008', '76036', '76060', '76102', '76103', '76104', '76105', '76106', '76107', '76108', '76109', '76110', '76111', '76112', '76114', '76115', '76116', '76117', '76118', '76119', '76123', '76126', '76127', '76131', '76132', '76133', '76134', '76135', '76137', '76140', '76164'],
    'Cedar Park': ['78613', '78628', '78641', '78645', '78664', '78665', '78681', '78717', '78726', '78727', '78728', '78729', '78732', '78734', '78750', '78758', '78759'],
    'Arlington': ['75051', '75052', '75236', '76001', '76002', '76010', '76011', '76012', '76013', '76014', '76015', '76016', '76017', '76018', '76060', '76112', '76119', '76120'],
    // MD
    'Maple Lawn': ['20701', '20707', '20708', '20723', '20724', '20755', '20759', '20763', '20777', '20794', '20861', '20866', '20868', '20905', '21029', '21036', '21042', '21043', '21044', '21045', '21046', '21075', '21076', '21228', '21737', '21738', '21794'],
    'Bowie': ['20706', '20708', '20715', '20716', '20720', '20721', '20724', '20743', '20746', '20747', '20755', '20762', '20769', '20774', '20776', '20784', '20785', '20794', '21012', '21032', '21035', '21037', '21054', '21056', '21060', '21061', '21075', '21076', '21090', '21108', '21113', '21114', '21122', '21140', '21144', '21146', '21225', '21226', '21240', '21401', '21403', '21409'],
    'Bethesda': ['20001', '20002', '20007', '20008', '20009', '20010', '20011', '20012', '20015', '20016', '20017', '20018', '20190', '20191', '20710', '20722', '20781', '20782', '20783', '20814', '20815', '20816', '20817', '20818', '20850', '20851', '20852', '20853', '20854', '20877', '20878', '20892', '20894', '20895', '20896', '20901', '20902', '20903', '20904', '20906', '20910', '20912', '22027', '22030', '22031', '22033', '22043', '22066', '22101', '22102', '22124', '22180', '22181', '22182', '22201', '22207', '22209'],
    // CT
    'Stamford': ['06807', '06820', '06830', '06840', '06850', '06851', '06853', '06854', '06855', '06870', '06878', '06880', '06901', '06902', '06903', '06905', '06906', '06907', '10528', '10573', '10577', '10580', '10604', '10605'],
    'Hamden': ['06401', '06403', '06410', '06418', '06450', '06451', '06460', '06461', '06473', '06477', '06483', '06484', '06492', '06511', '06513', '06514', '06515', '06516', '06517', '06518', '06519', '06524', '06525', '06614', '06712', '06770'],
    'Farmington': ['06001', '06032', '06051', '06052', '06053', '06062', '06085', '06103', '06105', '06106', '06107', '06109', '06110', '06111', '06112', '06114', '06117', '06119', '06120', '06154'],
    // CA
    'San Jose': ['94022', '94024', '94028', '94040', '94041', '94043', '94085', '94086', '94087', '94089', '94301', '94303', '94304', '94305', '94306', '94536', '94538', '94539', '94555', '94560', '95008', '95014', '95030', '95032', '95035', '95050', '95051', '95054', '95070', '95110', '95111', '95112', '95116', '95117', '95118', '95119', '95120', '95121', '95122', '95123', '95124', '95125', '95126', '95127', '95128', '95129', '95130', '95131', '95132', '95133', '95134', '95136', '95139', '95148'],
    'Temecula': ['92220', '92223', '92503', '92504', '92505', '92506', '92507', '92508', '92518', '92530', '92532', '92543', '92544', '92545', '92548', '92549', '92551', '92553', '92555', '92557', '92562', '92563', '92567', '92570', '92571', '92582', '92583', '92584', '92585', '92586', '92587', '92590', '92591', '92592', '92595', '92596', '92860', '92879', '92881', '92882', '92883'],
    'Palo Alto': ['94002', '94010', '94022', '94024', '94025', '94027', '94028', '94040', '94041', '94043', '94061', '94062', '94063', '94065', '94070', '94085', '94086', '94087', '94089', '94301', '94303', '94304', '94305', '94306', '94401', '94402', '94403', '94404', '94545', '94555', '94560', '94587'],
    'Huntington Beach': ['90620', '90621', '90623', '90630', '90680', '90703', '90713', '90715', '90716', '90720', '90740', '90803', '90804', '90808', '90814', '90815', '90840', '92626', '92627', '92646', '92647', '92648', '92649', '92655', '92663', '92683', '92703', '92704', '92706', '92708', '92801', '92802', '92804', '92805', '92806', '92831', '92832', '92833', '92840', '92841', '92843', '92844', '92845', '92868'],
    'Irvine': ['92602', '92603', '92604', '92606', '92610', '92612', '92614', '92617', '92618', '92620', '92625', '92626', '92627', '92630', '92637', '92647', '92653', '92656', '92660', '92661', '92662', '92663', '92683', '92691', '92692', '92701', '92704', '92705', '92706', '92707', '92708', '92780', '92782', '92866', '92868'],
    'Newport Beach': ['92602', '92603', '92604', '92606', '92612', '92614', '92617', '92618', '92620', '92624', '92625', '92626', '92627', '92629', '92630', '92637', '92646', '92651', '92653', '92656', '92657', '92660', '92661', '92662', '92663', '92672', '92673', '92675', '92677', '92679', '92688', '92691', '92692', '92694', '92701', '92703', '92704', '92705', '92706', '92707', '92708', '92780', '92782', '92807', '92808', '92861', '92866', '92867', '92868', '92869', '92886', '92887'],
    'San Diego': ['91902', '91910', '91914', '91941', '91942', '91945', '91950', '91977', '91978', '92003', '92007', '92008', '92009', '92010', '92011', '92014', '92019', '92020', '92021', '92024', '92037', '92040', '92054', '92056', '92057', '92058', '92067', '92071', '92075', '92081', '92083', '92091', '92101', '92102', '92103', '92104', '92105', '92106', '92107', '92108', '92109', '92110', '92111', '92113', '92114', '92115', '92116', '92117', '92118', '92119', '92120', '92121', '92122', '92123', '92124', '92130', '92139'],
    'National City': ['91902', '91910', '91911', '91950', '91977', '92113', '92114', '92139']
};

// Looker: l_f_s by date and tracking type (replaces Ours Privacy webhooks)
app.get('/api/looker/lfs-by-date', async (req, res) => {
    try {
        const { startDate, endDate, trackingType } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing startDate or endDate' });
        }
        
        const v = 'fct_leads_funnel_marketing_phi_exclude';
        const dateField = `${v}.lead_created_date_est_date`;
        const trackingField = `${v}.tracking_type`;
        const countField = `${v}.count`;
        
        // Build date filter
        let dateFilter = {};
        if (startDate === endDate) {
            dateFilter[dateField] = startDate;
        } else {
            dateFilter[dateField] = `${startDate} to ${endDate}`;
        }
        
        // Add tracking type filter if specified
        if (trackingType) {
            dateFilter[trackingField] = trackingType;
        }
        
        // Query Looker for l_f_s counts by date and tracking type
        const fields = [dateField, trackingField, countField];
        const sorts = [`${dateField} desc`];
        
        const results = await lookerQuery(v, fields, dateFilter, sorts, 1000);
        
        // Group by date and tracking type
        const byDate = {};
        const byTrackingType = {};
        
        // Tracking type to platform mapping
        const platformMap = {
            'mutm': 'meta',
            'g1utm': 'google',
            'gbutm': 'google',
            'gbputm': 'google',
            'butm': 'bing',
            'tutm': 'tiktok',
            'outm': 'organic'
        };
        
        results.forEach(row => {
            const date = row[dateField];
            const type = row[trackingField] || 'unknown';
            const count = row[countField] || 0;
            
            // By date (all tracking types)
            if (!byDate[date]) byDate[date] = {};
            byDate[date][type] = (byDate[date][type] || 0) + count;
            
            // By tracking type (all dates)
            if (!byTrackingType[type]) byTrackingType[type] = 0;
            byTrackingType[type] += count;
        });
        
        // Also group by platform
        const byPlatform = {};
        const byDateByPlatform = {};
        
        results.forEach(row => {
            const date = row[dateField];
            const type = row[trackingField] || 'unknown';
            const platform = platformMap[type] || 'other';
            const count = row[countField] || 0;
            
            // Total by platform
            if (!byPlatform[platform]) byPlatform[platform] = 0;
            byPlatform[platform] += count;
            
            // By date by platform
            if (!byDateByPlatform[date]) byDateByPlatform[date] = {};
            if (!byDateByPlatform[date][platform]) byDateByPlatform[date][platform] = 0;
            byDateByPlatform[date][platform] += count;
        });
        
        res.json({
            success: true,
            startDate,
            endDate,
            byDate,
            byTrackingType,
            byPlatform,
            byDateByPlatform
        });
        
    } catch (error) {
        console.error('Looker lfs-by-date error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/clinic-performance', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Missing startDate or endDate' });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        // Get all webhook events in date range
        const webhookData = global.webhookData || [];
        
        // Get booked events
        const bookedEvents = webhookData.filter(e => 
            e.event_type === 'is_booked' &&
            new Date(e.timestamp) >= start &&
            new Date(e.timestamp) <= end
        );
        
        // Get l_f_s events (leads) for click proxy
        const lfsEvents = webhookData.filter(e => 
            e.event_type === 'l_f_s' &&
            new Date(e.timestamp) >= start &&
            new Date(e.timestamp) <= end
        );
        
        // Aggregate data by clinic
        const clinicData = {};
        
        // Initialize clinics
        Object.keys(CLINIC_ZIPCODES).forEach(clinic => {
            clinicData[clinic] = {
                clinic,
                impressions: 0,
                clicks: 0,  // Using l_f_s as proxy for engaged clicks
                booked: 0,
                ctr: 0,
                zipcodes: CLINIC_ZIPCODES[clinic].length
            };
        });
        
        // Aggregate l_f_s events by clinic (as click proxy)
        lfsEvents.forEach(e => {
            const eventClinic = e.clinic || e.location || e.data?.clinic || '';
            Object.keys(CLINIC_ZIPCODES).forEach(clinic => {
                if (eventClinic.toLowerCase().includes(clinic.toLowerCase()) ||
                    clinic.toLowerCase().includes(eventClinic.toLowerCase().split(' ')[0])) {
                    clinicData[clinic].clicks++;
                }
            });
        });
        
        // Aggregate booked appointments by clinic
        bookedEvents.forEach(e => {
            const eventClinic = e.clinic || e.location || e.data?.clinic || '';
            Object.keys(CLINIC_ZIPCODES).forEach(clinic => {
                if (eventClinic.toLowerCase().includes(clinic.toLowerCase()) ||
                    clinic.toLowerCase().includes(eventClinic.toLowerCase().split(' ')[0])) {
                    clinicData[clinic].booked++;
                }
            });
        });
        
        // Set impressions = clicks * 10 as rough estimate for display purposes
        Object.values(clinicData).forEach(clinic => {
            clinic.impressions = clinic.clicks * 10;
            clinic.ctr = clinic.impressions > 0 
                ? ((clinic.clicks / clinic.impressions) * 100).toFixed(2)
                : '0.00';
        });
        
        // Calculate correlation
        const clinicsWithData = Object.values(clinicData).filter(c => c.clicks > 0 && c.booked > 0);
        let correlation = { clicks_vs_booked: 'N/A' };
        
        if (clinicsWithData.length >= 3) {
            const clicks = clinicsWithData.map(c => c.clicks);
            const booked = clinicsWithData.map(c => c.booked);
            const corr = calculateCorrelation(clicks, booked);
            correlation.clicks_vs_booked = corr.toFixed(2);
        }
        
        // Summary
        const summary = {
            clinicsWithData: Object.values(clinicData).filter(c => c.clicks > 0 || c.booked > 0).length,
            totalClicks: Object.values(clinicData).reduce((sum, c) => sum + c.clicks, 0),
            totalBooked: Object.values(clinicData).reduce((sum, c) => sum + c.booked, 0)
        };
        
        res.json({
            success: true,
            clinics: Object.values(clinicData),
            correlation,
            summary
        });
        
    } catch (error) {
        console.error('Clinic performance error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Helper: Calculate Pearson correlation coefficient
function calculateCorrelation(x, y) {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return den === 0 ? 0 : num / den;
}

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Dashboard server running on port ${PORT}`);
    console.log(`Bing API configured: ${isBingConfigured()}`);
    console.log(`TikTok API configured: ${isTikTokConfigured()}`);
    console.log(`Google Ads API configured: ${isGoogleAdsConfigured()}`);
});


// ==================== Zipcode Heatmap ====================

// Get combined zipcode performance data from Google + Bing
app.post('/api/heatmap/zipcode-performance', async (req, res) => {
    const { startDate, endDate } = req.body;
    const zipcodeData = {};
    
    // Fetch Google geographic data (same approach as geographic-performance endpoint)
    if (isGoogleAdsConfigured()) {
        try {
            const query = `
                SELECT 
                    campaign_criterion.location.geo_target_constant,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions
                FROM location_view
                WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                    AND metrics.impressions > 0
            `;
            const googleData = await googleAdsApiRequest(query);
            
            // Extract unique geo IDs to look up names
            const geoIds = [...new Set(googleData.map(r => {
                const geoConstant = r.campaign_criterion?.location?.geo_target_constant || '';
                const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
                return match ? match[1] : null;
            }).filter(Boolean))];
            
            // Look up names for geo IDs not in cache
            const uncachedIds = geoIds.filter(id => !geoNameCache[id]);
            if (uncachedIds.length > 0) {
                const geoQuery = `
                    SELECT 
                        geo_target_constant.id,
                        geo_target_constant.name,
                        geo_target_constant.canonical_name,
                        geo_target_constant.target_type
                    FROM geo_target_constant
                    WHERE geo_target_constant.id IN (${uncachedIds.join(',')})
                `;
                const geoResults = await googleAdsApiRequest(geoQuery);
                geoResults.forEach(r => {
                    const g = r.geo_target_constant || {};
                    geoNameCache[g.id] = {
                        name: g.name,
                        canonicalName: g.canonical_name,
                        targetType: g.target_type
                    };
                });
            }
            
            // Aggregate by geo ID first
            const geoMap = {};
            googleData.forEach(row => {
                const geoConstant = row.campaign_criterion?.location?.geo_target_constant || '';
                const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
                if (!match) return;
                
                const geoId = match[1];
                const metrics = row.metrics || {};
                
                if (!geoMap[geoId]) {
                    geoMap[geoId] = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
                }
                geoMap[geoId].impressions += parseInt(metrics.impressions) || 0;
                geoMap[geoId].clicks += parseInt(metrics.clicks) || 0;
                geoMap[geoId].cost += (parseInt(metrics.cost_micros) || 0) / 1000000;
                geoMap[geoId].conversions += parseFloat(metrics.conversions) || 0;
            });
            
            // Now process only Postal Code types
            Object.entries(geoMap).forEach(([geoId, metrics]) => {
                const geoInfo = geoNameCache[geoId];
                if (!geoInfo || geoInfo.targetType !== 'Postal Code') return;
                
                // Extract zipcode from name (should be 5-digit)
                const zipMatch = geoInfo.name.match(/^(\d{5})/);
                if (!zipMatch) return;
                
                const zipcode = zipMatch[1];
                // Extract state from canonical name (format: "12345,State,United States")
                const nameParts = (geoInfo.canonicalName || '').split(',');
                const state = nameParts.length >= 2 ? nameParts[1].trim() : '';
                
                if (!zipcodeData[zipcode]) {
                    zipcodeData[zipcode] = { 
                        zipcode,
                        state: state,
                        city: '',
                        impressions: 0, 
                        clicks: 0, 
                        cost: 0, 
                        conversions: 0,
                        sources: []
                    };
                }
                if (state && !zipcodeData[zipcode].state) {
                    zipcodeData[zipcode].state = state;
                }
                
                zipcodeData[zipcode].impressions += metrics.impressions;
                zipcodeData[zipcode].clicks += metrics.clicks;
                zipcodeData[zipcode].cost += metrics.cost;
                zipcodeData[zipcode].conversions += metrics.conversions;
                if (!zipcodeData[zipcode].sources.includes('Google')) {
                    zipcodeData[zipcode].sources.push('Google');
                }
            });
        } catch (e) {
            console.error('Google heatmap error:', e.message);
        }
    }
    
    // Fetch Bing geographic data  
    if (isBingConfigured()) {
        try {
            const columns = ['MostSpecificLocation', 'Country', 'State', 'City', 'LocationType', 
                           'Impressions', 'Clicks', 'Spend', 'Conversions'];
            const report = await submitAndDownloadReport('geographic', startDate, endDate, columns);
            
            report.rows.forEach(row => {
                const location = row.MostSpecificLocation || '';
                if (!/^\d{5}$/.test(location)) return;
                
                const zipcode = location;
                const state = row.State || '';
                const city = row.City || '';
                
                if (!zipcodeData[zipcode]) {
                    zipcodeData[zipcode] = { 
                        zipcode,
                        state: state,
                        city: city,
                        impressions: 0, 
                        clicks: 0, 
                        cost: 0, 
                        conversions: 0,
                        sources: []
                    };
                }
                // Update state/city if we have it from Bing
                if (state && !zipcodeData[zipcode].state) {
                    zipcodeData[zipcode].state = state;
                }
                if (city && !zipcodeData[zipcode].city) {
                    zipcodeData[zipcode].city = city;
                }
                
                zipcodeData[zipcode].impressions += parseInt(row.Impressions) || 0;
                zipcodeData[zipcode].clicks += parseInt(row.Clicks) || 0;
                zipcodeData[zipcode].cost += parseFloat(row.Spend) || 0;
                zipcodeData[zipcode].conversions += parseFloat(row.Conversions) || 0;
                if (!zipcodeData[zipcode].sources.includes('Bing')) {
                    zipcodeData[zipcode].sources.push('Bing');
                }
            });
        } catch (e) {
            console.error('Bing heatmap error:', e.message);
        }
    }
    
    const results = Object.values(zipcodeData)
        
        .sort((a, b) => b.conversions - a.conversions);
    
    res.json({ zipcodes: results });
});
