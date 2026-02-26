const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Meta API credentials (from environment)
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = 'v19.0';
const BASE_URL = 'https://graph.facebook.com';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API proxy endpoints
app.get('/api/accounts', async (req, res) => {
    try {
        const response = await fetch(
            `${BASE_URL}/${API_VERSION}/me/adaccounts?fields=name,account_id,currency&limit=50&access_token=${ACCESS_TOKEN}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/insights/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { date_preset, time_increment, level } = req.query;
        
        let url = `${BASE_URL}/${API_VERSION}/${accountId}/insights?`;
        url += `fields=spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type`;
        url += `&date_preset=${date_preset || 'last_7d'}`;
        if (time_increment) url += `&time_increment=${time_increment}`;
        if (level) url += `&level=${level}`;
        url += `&access_token=${ACCESS_TOKEN}`;
        
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/campaigns/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { date_preset } = req.query;
        
        const response = await fetch(
            `${BASE_URL}/${API_VERSION}/${accountId}/campaigns?` +
            `fields=name,status,objective,insights.date_preset(${date_preset || 'last_7d'}){spend,impressions,clicks,cpc,ctr,actions,cost_per_action_type}` +
            `&limit=50&access_token=${ACCESS_TOKEN}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', hasToken: !!ACCESS_TOKEN });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
