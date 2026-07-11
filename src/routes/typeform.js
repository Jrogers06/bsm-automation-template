const express = require('express');
const router = express.Router();
const { sendDiscordMessage } = require('../utils/discord');

router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const answers = payload.form_response?.answers || [];
    const fields_def = payload.form_response?.definition?.fields || [];

    const lines = [];
    let isQualified = false;

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
          value = 'Call Booked ✅';
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
        lines.push(`**${fieldTitle}**`);
        lines.push(value);
        lines.push('');
      }
    });

    const now = new Date().toLocaleDateString('en-GB');
    const title = isQualified
      ? `**New Lead Optin - QUALIFIED**\nTime ${now}`
      : `**New Lead Optin - UNQUALIFIED**\nTime ${now}`;

    const message = `${title}\n\n${lines.join('\n')}`;
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NEW_LEADS, message);

    res.json({ success: true });
  } catch (err) {
    console.error('Typeform webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
