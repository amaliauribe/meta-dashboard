const fetch = require('node-fetch');

// Token cache (in-memory, will reset on cold start)
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
        client_id: process.env.MSADS_CLIENT_ID,
        client_secret: process.env.MSADS_CLIENT_SECRET,
        refresh_token: process.env.MSADS_REFRESH_TOKEN,
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
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/Reporting/v13">${process.env.MSADS_DEVELOPER_TOKEN}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/Reporting/v13">${process.env.MSADS_CUSTOMER_ID}</h:CustomerId>
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
                <a:long>${process.env.MSADS_ACCOUNT_ID}</a:long>
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
                <a:long>${process.env.MSADS_ACCOUNT_ID}</a:long>
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

module.exports = { getAccessToken, submitAndDownloadReport };
