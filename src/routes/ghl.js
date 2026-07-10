const express = require('express');
const router = express.Router();
const { sendDiscordMessage, createEmbed, COLORS } = require('../utils/discord');
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

function buildCallFields(body) {
  const contactId = body.contact_id || body.contactId || '';
  const contactName = body.contact_name || body.full_name || 'Unknown';
  const ghlLink = getContactGHLLink(contactId);

  return [
    { name: '👤 Contact', value: `[${contactName}](${ghlLink})`, inline: true },
    { name: '📧 Email', value: body.email || 'N/A', inline: true },
    { name: '📞 Phone', value: body.phone || 'N/A', inline: true },
    { name: '📅 Calendar', value: body.calendar_name || 'N/A', inline: true },
    { name: '🧑‍💼 Closer', value: body.assigned_user || 'N/A', inline: true },
    { name: '🔀 Pipeline', value: body.pipeline_name || 'N/A', inline: true },
    { name: '🌍 Timezone', value: body.timezone || 'N/A', inline: true },
    { name: '📆 Appointment', value: body.appointment_date || 'N/A', inline: true },
  ];
}

async function addToSheet(body) {
  try {
    const sheets = await getSheets();
    const spreadsheetId = process.env.REVENUE_SHEET_ID;
    const now = new Date().toLocaleDateString('en-GB');
    const contactId = body.contact_id || body.contactId || '';
    const profileLink = getContactGHLLink(contactId);

    const row = [
      body.contact_name || body.full_name || '',  // A - Name
      body.email || '',                            // B - Email Address
      now,                                         // C - Date
      body.calendar_name || '',                    // D - Booked By/Calendar Source
      profileLink,                                 // E - Profile Link
      now,                                         // F - Created
      body.appointment_date || '',                 // G - Scheduled For
      '',                                          // H - Platform (manual)
      '',                                          // I - Lead Type (manual)
      '',                                          // J - Status (manual)
      '',                                          // K - Next FU (manual)
      '',                                          // L - Qualified? (manual)
      '',                                          // M - Notes (manual)
      body.appointment_id || '',                   // N - Appointment ID
      '',                                          // O - Zoom Link (manual)
      body.assigned_user || '',                    // P - Call Taken By
      body.timezone || '',                         // Q - Lead's Timezone
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
    const embed = createEmbed('📞 New Booked Call', buildCallFields(req.body), COLORS.PURPLE);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_BOOKED_CALLS, embed);
    await addToSheet(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/confirmed-call', async (req, res) => {
  try {
    const embed = createEmbed('✅ Confirmed Call', buildCallFields(req.body), COLORS.GREEN);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CONFIRMED_CALLS, embed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/no-show', async (req, res) => {
  try {
    const embed = createEmbed('❌ No Show', buildCallFields(req.body), COLORS.RED);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NO_SHOW, embed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cancelled', async (req, res) => {
  try {
    const embed = createEmbed('🚫 Cancelled Call', buildCallFields(req.body), COLORS.ORANGE);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CANCELLED, embed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/follow-up', async (req, res) => {
  try {
    const embed = createEmbed('🔄 Follow Up', buildCallFields(req.body), COLORS.YELLOW);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_FOLLOW_UP, embed);
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

    const fields = [
      { name: '👤 Contact', value: `[${contactName}](${ghlLink})`, inline: true },
      { name: '📧 Email', value: req.body.email || 'N/A', inline: true },
      { name: '📞 Phone', value: req.body.phone || 'N/A', inline: true },
      { name: '📅 Calendar', value: req.body.calendar_name || 'N/A', inline: true },
      { name: '🧑‍💼 Closer', value: req.body.assigned_user || 'N/A', inline: true },
      { name: '🔀 Pipeline', value: req.body.pipeline_name || 'N/A', inline: true },
      { name: '🌍 Timezone', value: req.body.timezone || 'N/A', inline: true },
      { name: '💰 Value', value: req.body.opportunity_value || 'N/A', inline: true },
      { name: '📆 Appointment', value: req.body.appointment_date || 'N/A', inline: true },
      { name: '📝 Notes', value: req.body.opportunity_notes || 'N/A', inline: false },
    ];

    const embed = createEmbed('🏆 CLOSED DEAL', fields, COLORS.GOLD);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_CLOSED_DEAL, embed);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
