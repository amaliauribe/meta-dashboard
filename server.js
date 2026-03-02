require("dotenv").config();
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const { GoogleAdsApi } = require('google-ads-api');

const app = express();
app.use(express.json());
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
            const criterion = row.ad_group_criterion || {};
            const keyword = criterion.keyword || {};
            const qualityInfo = criterion.quality_info || {};
            const metrics = row.metrics || {};
            
            return {
                keyword: keyword.text || 'Unknown',
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
            let headlines = [];
            let descriptions = [];
            
            if (ad.type === 'RESPONSIVE_SEARCH_AD' && ad.responsive_search_ad) {
                headlines = (ad.responsive_search_ad.headlines || []).map(h => h.text).filter(Boolean);
                descriptions = (ad.responsive_search_ad.descriptions || []).map(d => d.text).filter(Boolean);
            } else if (ad.type === 'EXPANDED_TEXT_AD' && ad.expanded_text_ad) {
                const eta = ad.expanded_text_ad;
                headlines = [eta.headline_part1, eta.headline_part2, eta.headline_part3].filter(Boolean);
                descriptions = [eta.description, eta.description2].filter(Boolean);
            }
            
            const impressions = parseInt(metrics.impressions) || 0;
            const clicks = parseInt(metrics.clicks) || 0;
            const cost = (parseInt(metrics.cost_micros) || 0) / 1000000;
            const conversions = parseFloat(metrics.conversions) || 0;
            
            return {
                adId: ad.id,
                campaign: campaign.name || 'Unknown',
                adGroup: adGroup.name || 'Unknown',
                type: ad.type || 'Unknown',
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
            
            const headlines = [row.TitlePart1, row.TitlePart2, row.TitlePart3].filter(Boolean);
            const descriptions = [row.AdDescription, row.AdDescription2].filter(Boolean);
            
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
        // Get location performance data
        const query = `
            SELECT 
                campaign.name,
                campaign_criterion.location.geo_target_constant,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions
            FROM location_view
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
                AND metrics.impressions > 0
            ORDER BY metrics.clicks DESC
            LIMIT 500
        `;
        
        const results = await googleAdsApiRequest(query);
        
        // Extract unique geo IDs to look up names
        const geoIds = [...new Set(results.map(r => {
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
        
        // Aggregate by location (combining all campaigns)
        const locationMap = {};
        
        results.forEach(row => {
            const geoConstant = row.campaign_criterion?.location?.geo_target_constant || '';
            const match = geoConstant.match(/geoTargetConstants\/(\d+)/);
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
                    conversions: 0,
                    campaigns: new Set()
                };
            }
            
            locationMap[geoId].impressions += parseInt(metrics.impressions) || 0;
            locationMap[geoId].clicks += parseInt(metrics.clicks) || 0;
            locationMap[geoId].cost += (parseInt(metrics.cost_micros) || 0) / 1000000;
            locationMap[geoId].conversions += parseFloat(metrics.conversions) || 0;
            locationMap[geoId].campaigns.add(row.campaign?.name || 'Unknown');
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
            convRate: loc.clicks > 0 ? (loc.conversions / loc.clicks) * 100 : 0,
            campaignCount: loc.campaigns.size
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
const fs = require('fs');
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
                keywordMap[k.keyword] = { keyword: k.keyword, currentQs: k.qs };
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
    
    const columns = ['Keyword', 'QualityScore', 'Clicks'];
    const report = await submitAndDownloadReport('keyword', startDate, today, columns);
    
    const snapshot = {
        date: today,
        keywords: report.rows.map(row => ({
            keyword: row.Keyword || 'Unknown',
            qs: parseInt(row.QualityScore) || null
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
                keywordMap[k.keyword] = { keyword: k.keyword, currentQs: k.qs };
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
        // Meta API would go here - for now return empty
        // This would need the Meta API integration
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
    
    const results = [];
    
    for (const period of periods) {
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
        if (isBingConfigured()) {
            try {
                const columns = ['TimePeriod', 'Spend'];
                const report = await submitAndDownloadReport('account', period.startDate, period.endDate, columns);
                
                report.rows.forEach(row => {
                    periodData.bing += parseFloat(row.Spend) || 0;
                });
            } catch (e) {
                console.error('Bing aggregated error:', e.message);
            }
        }
        
        results.push(periodData);
    }
    
    res.json(results);
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

