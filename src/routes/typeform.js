const express = require('express');
const router = express.Router();
const { sendDiscordMessage, createEmbed, COLORS } = require('../utils/discord');

router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const answers = payload.form_response?.answers || [];
    const fields_def = payload.form_response?.definition?.fields || [];

    const discordFields = [];
    let isQualified = false;
    let hasCalendly = false;
    let calendlyUrl = '';

    const now = new Date().toLocaleDateString('en-GB');
    discordFields.push({ name: 'Time', value: now, inline: true });

    answers.forEach((answer, index) => {
      const fieldDef = fields_def[index];
      const fieldTitle = fieldDef?.title || `Question ${index + 1}`;
      let value = '';

      switch (answer.type) {
        case 'text':
        case 'email':
        case 'phone_number':
          value = answer[answer.type] || '';
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
          calendlyUrl = answer.url || '';
          value = calendlyUrl;
          break;
        case 'url':
          value = answer.url || '';
          break;
        default:
          value = answer.url || answer.text || answer.email || '';
      }

      const titleLower = fieldTitle.toLowerCase();
      if (
        titleLower.includes('invest') ||
        titleLower.includes('capital') ||
        titleLower.includes('afford') ||
        titleLower.includes('budget') ||
        titleLower.includes('commit') ||
        titleLower.includes('ready') ||
        titleLower.includes('residency') ||
        titleLower.includes('qualify')
      ) {
        const valueLower = value.toLowerCase();
        if (
          valueLower.includes('yes') ||
          valueLower.includes('i have') ||
          valueLower.includes('ready') ||
          valueLower.includes('12 months')
        ) {
          isQualified = true;
        }
      }

      if (value) {
        discordFields.push({
          name: fieldTitle,
          value: String(value).substring(0, 1024),
          inline: true
        });
      }
    });

    if (hasCalendly) {
      // Second submission - booking confirmed - send to call-booked channel
      const embed = createEmbed('📞 New Call Booked', discordFields, COLORS.PURPLE);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_BOOKED_CALLS, embed);
    } else {
      // First submission - new lead - send to new-lead channel
      const color = isQualified ? COLORS.GREEN : COLORS.BLUE;
      const title = isQualified ? 'New Lead Optin - QUALIFIED' : 'New Lead Optin - UNQUALIFIED';
      const embed = createEmbed(title, discordFields, color);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NEW_LEADS, embed);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Typeform webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
