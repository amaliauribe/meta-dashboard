const { getAccessToken, submitAndDownloadReport } = require('./_shared');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.MSADS_CLIENT_ID || !process.env.MSADS_DEVELOPER_TOKEN) {
        return res.status(503).json({ error: 'Microsoft Ads credentials not configured' });
    }

    try {
        const { startDate, endDate } = req.body;
        
        const columns = ['TimePeriod', 'Spend', 'Impressions', 'Clicks', 'Ctr', 'AverageCpc', 'Conversions', 'Revenue'];
        const report = await submitAndDownloadReport('account', startDate, endDate, columns);
        
        // Aggregate totals
        let totals = {
            spend: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0
        };
        
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
};
