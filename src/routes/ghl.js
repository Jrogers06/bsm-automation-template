const express = require('express');
const router = express.Router();
const { sendDiscordMessage, buildPlainMessage } = require('../utils/discord');
const { google } = require('googleapis');

async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getContactGHLLink(contactId) {
  const locationId = process.env.GHL_LOCATION_ID;
  return `https://app.gohighlevel.com/location/${locationId}/contacts/detail/${contactId}`;
}

function buildCallMessage(title, body) {
  const contactId = body.contact_id || body.contactId || '';
  const contactName = body.contact_name || body.full_name || 'Unknown';
  const ghlLink = getContactGHLLink(contactId);

  return buildPlainMessage(title, [
    { name: 'Name', value: `[${contactName}](${ghlLink})` },
    { name: 'Phone', value: body.phone },
    { name: 'First_name', value: body.first_name },
    { name: 'Email', value: body.email },
    { name: 'Last_name', value: body.last_name },
    { name: 'Full_name', value: contactName },
    { name: 'Tags', value: body.tags },
    { name: 'Timezone', value: body.timezone },
    { name: 'Date_created', value: body.date_created },
    { name: 'Opportunity_name', value: body.opportunity_name || contactName },
    { name: 'Lead_value', value: body.opportunity_value },
    { name: 'Pipeline_stage', value: body.pipeline_stage },
    { name: 'Pipeline_name', value: body.pipeline_name },
    { name: 'Calendar', value: body.calendar_name },
    { name: 'Closer', value: body.assigned_user },
    { name: 'Appointment', value: body.appointment_date },
  ]);
}

async function addToSheet(body) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.REVENUE_SHEET_ID;
    const now = new Date().toLocaleDateString('en-GB');
    const contactId = body.contact_id || body.contactId || '';
    const profileLink = getContactGHLLink(contactId);

    const row = [
      body.contact_name || body.full_name || '',
      body.email || '',
      now,
      body.calendar_name || '',
      profileLink,
      now,
      body.appointment_date || '',
      '',
      '',
      '',
      '',
      '',
      '',
      body.appointment_id || '',
      '',
      body.assigned_user || '',
      body.timezone || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `Sales CRM!A:Q`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] },
    });
    console.log('Added to Sales CRM sheet successfully');
  } catch (err) {
    console.error('Google Sheets error:', err.message);
  }
}

router.post('/booked-call', async (req, res) => {
  try {
    const msg = buildCallMessage('Pipeline: Call Booked', req.body);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_BOOKED_CALLS, msg);
    await addToSheet(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirmed-call', async (req, res) => {
  try {
    const msg = buildCallMessage('Pipeline: Confirmed Call', req.body);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CONFIRMED_CALLS, msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/no-show', async (req, res) => {
  try {
    const msg = buildCallMessage('Pipeline: No Show', req.body);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NO_SHOW, msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancelled', async (req, res) => {
  try {
    const msg = buildCallMessage('Pipeline: Cancelled', req.body);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CANCELLED, msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/follow-up', async (req, res) => {
  try {
    const msg = buildCallMessage('Pipeline: Follow Up', req.body);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_FOLLOW_UP, msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/closed-deal', async (req, res) => {
  try {
    const contactId = req.body.contact_id || req.body.contactId || '';
    const contactName = req.body.contact_name || req.body.full_name || 'Unknown';
    const ghlLink = getContactGHLLink(contactId);

    const msg = buildPlainMessage('Pipeline: Closed Deal 🏆', [
      { name: 'Name', value: `[${contactName}](${ghlLink})` },
      { name: 'Phone', value: req.body.phone },
      { name: 'Email', value: req.body.email },
      { name: 'Full_name', value: contactName },
      { name: 'Tags', value: req.body.tags },
      { name: 'Timezone', value: req.body.timezone },
      { name: 'Opportunity_name', value: req.body.opportunity_name || contactName },
      { name: 'Lead_value', value: req.body.opportunity_value },
      { name: 'Pipeline_stage', value: req.body.pipeline_stage },
      { name: 'Pipeline_name', value: req.body.pipeline_name },
      { name: 'Owner', value: req.body.assigned_user },
      { name: 'Notes', value: req.body.opportunity_notes },
    ]);

    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CLOSED_DEAL, msg);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
