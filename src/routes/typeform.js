const express = require('express');
const router = express.Router();
const { sendDiscordMessage, createEmbed, COLORS } = require('../utils/discord');
const axios = require('axios');

// Abbreviate long Typeform question titles
function abbreviateTitle(title) {
  const map = {
    'are you a permanent resident of the uk or us': 'Permanent Resident?',
    'what industry do you currently work in': 'Industry',
    'what is your current job title or role': 'Current Job',
    'how much are you currently earning per year': 'Income',
    'why do you want to break into tech sales': 'Why Tech Sales',
    'have you already applied for or interviewed for any tech sales roles': 'Already Applying?',
    "what's your biggest concern or hesitation about making this career switch": 'Concerns / Hesitations',
    'how soon are you looking to make this transition': 'Timeline',
    'the investment for our program is': 'Investment',
    'to be approved for a 12-month payment plan': 'Credit Score',
    'now, book your tech sales career coaching call': 'Call Booking 1',
    'schedule your tech sales career coaching call below': 'Call Booking 2',
    'how did you hear about entr tech': 'Source',
    'first name': 'First Name',
    'last name': 'Last Name',
    'phone number': 'Phone',
    'email': 'Email',
  };

  const lower = title.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return title;
}

async function createGHLContact(contactData) {
  try {
    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      contactData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      }
    );
    console.log('GHL contact created:', response.data?.contact?.id);
    return response.data?.contact;
  } catch (err) {
    console.error('GHL contact creation error:', err.response?.data || err.message);
    return null;
  }
}

router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const answers = payload.form_response?.answers || [];
    const fields_def = payload.form_response?.definition?.fields || [];
    const hidden = payload.form_response?.hidden || {};

    const discordFields = [];
    let isQualified = false;
    let hasCalendly = false;

    // Extract contact info
    let firstName = '';
    let lastName = '';
    let phone = '';
    let email = '';
    let source = '';

    const now = new Date().toLocaleDateString('en-GB');
    discordFields.push({ name: 'Time', value: now, inline: true });

    answers.forEach((answer, index) => {
      const fieldDef = fields_def[index];
      const rawTitle = fieldDef?.title || `Question ${index + 1}`;
      const fieldTitle = abbreviateTitle(rawTitle);
      let value = '';

      switch (answer.type) {
        case 'text':
          value = answer.text || '';
          break;
        case 'email':
          value = answer.email || '';
          email = value;
          break;
        case 'phone_number':
          value = answer.phone_number || '';
          phone = value;
          break;
        case 'choice':
          value = answer.choice?.label || '';
          break;
        case 'choices':
          value = answer.choices?.labels?.join(', ') || '';
          break;
        case 'boolean':
          value = answer.boolean ? 'Yes' : 'No';
          break;
        case 'number':
          value = String(answer.number) || '';
          break;
        case 'calendly':
          hasCalendly = true;
          value = answer.url || 'Call Booked ✅';
          break;
        case 'url':
          value = answer.url || '';
          if (value.includes('calendly.com') && value.includes('invitees')) {
            hasCalendly = true;
          }
          break;
        default:
          value = answer.url || answer.text || answer.email || '';
          if (value && value.includes('calendly.com') && value.includes('invitees')) {
            hasCalendly = true;
          }
      }

      // Extract name fields
      const titleLower = rawTitle.toLowerCase();
      if (titleLower.includes('first name')) firstName = value;
      if (titleLower.includes('last name')) lastName = value;
      if (titleLower.includes('how did you hear')) source = value;

      // Qualifying logic
      if (
        titleLower.includes('invest') ||
        titleLower.includes('£3500') ||
        titleLower.includes('payment plan')
      ) {
        const valueLower = value.toLowerCase();
        if (valueLower.includes('yes') || valueLower.includes('can invest')) {
          isQualified = true;
        }
      }

      if (value) {
        discordFields.push({
          name: fieldTitle.substring(0, 256),
          value: String(value).substring(0, 1024),
          inline: true
        });
      }
    });

    // Add UTM data if present
    if (hidden && Object.keys(hidden).length > 0) {
      const utmLines = Object.entries(hidden)
        .filter(([k, v]) => v)
        .map(([k, v]) => `**${k}:** ${v}`)
        .join('\n');
      if (utmLines) {
        discordFields.push({
          name: 'ATTRIBUTION',
          value: utmLines,
          inline: false
        });
      }
    }

    // Backup Calendly check
    if (!hasCalendly) {
      hasCalendly = discordFields.some(f =>
        f.value &&
        f.value.includes('calendly.com') &&
        f.value.includes('invitees')
      );
    }

    if (hasCalendly) {
      // Booked call - send to call-booked channel
      const color = isQualified ? COLORS.GREEN : COLORS.BLUE;
      const title = isQualified
        ? '📞 New Call Booked - QUALIFIED'
        : '📞 New Call Booked - UNQUALIFIED';
      const embed = createEmbed(title, discordFields, color);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_BOOKED_CALLS, embed);
    } else {
      // New lead - create contact in GHL + send to new-lead channel
      const contactData = {
        firstName,
        lastName,
        email,
        phone,
        locationId: process.env.GHL_LOCATION_ID,
        source: source || 'Typeform',
        tags: ['typeform-lead'],
      };

      if (firstName || email || phone) {
        await createGHLContact(contactData);
      }

      const embed = createEmbed('New Lead Optin', discordFields, COLORS.BLUE);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NEW_LEADS, embed);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Typeform webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
