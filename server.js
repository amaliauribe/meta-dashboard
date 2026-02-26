const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

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
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
    }

    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    
    console.log('Access token refreshed successfully');
    return accessToken;
}

// Submit report and poll for completion
async function submitAndDownloadReport(reportType, startDate, endDate, columns) {
    const token = await getAccessToken();
    const submitUrl = 'https://reporting.api.bingads.microsoft.com/Reporting/v13/ReportingService.svc';
    
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
        throw new Error('Failed to get report request ID');
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
                downloadUrl = urlMatch[1];
            }
        } else if (status === 'Error') {
            throw new Error('Report generation failed');
        }
        
        attempts++;
    }

    if (!downloadUrl) {
        throw new Error('Report generation timed out');
    }

    // Download and parse
    const reportResponse = await fetch(downloadUrl);
    const reportText = await reportResponse.text();
    
    return parseReportCsv(reportText);
}

function buildSoapEnvelope(action, body, token) {
    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${token}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${MSADS_CONFIG.developerToken}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${MSADS_CONFIG.customerId}</h:CustomerId>
  </s:Header>
  <s:Body>
    <${action} xmlns="https://bingads.microsoft.com/Reporting/v13">
      ${body}
    </${action}>
  </s:Body>
</s:Envelope>`;
}

function buildAccountReportRequest(startDate, endDate, columns) {
    const columnElements = columns.map(c => `<Column>${c}</Column>`).join('\n            ');
    
    return `<ReportRequest xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:type="AccountPerformanceReportRequest">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
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
    const columnElements = columns.map(c => `<Column>${c}</Column>`).join('\n            ');
    
    return `<ReportRequest xmlns:i="http://www.w3.org/2001/XMLSchema-instance" i:type="CampaignPerformanceReportRequest">
        <ExcludeColumnHeaders>false</ExcludeColumnHeaders>
        <ExcludeReportFooter>true</ExcludeReportFooter>
        <ExcludeReportHeader>true</ExcludeReportHeader>
        <Format>Csv</Format>
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
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
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

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Dashboard server running on port ${PORT}`);
    console.log(`Bing API configured: ${isBingConfigured()}`);
});
