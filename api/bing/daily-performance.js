const { submitAndDownloadReport } = require('./_shared');

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
        
        // Format rows with date
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
};
