const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

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
// Catch any .txt file request in callback folder
app.get('/auth/tiktok/callback/*.txt', (req, res) => {
    res.type('text/plain').send(TIKTOK_VERIFY_CONTENT);
});

// TikTok OAuth - Step 1: Redirect to TikTok auth
app.get('/auth/tiktok', (req, res) => {
    const authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${TIKTOK_CONFIG.appId}&redirect_uri=${encodeURIComponent('https://vtc-ads-dashboard.onrender.com/auth/tiktok/callback')}&state=tiktok`;
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Dashboard server running on port ${PORT}`);
    console.log(`Bing API configured: ${isBingConfigured()}`);
    console.log(`TikTok API configured: ${isTikTokConfigured()}`);
});
