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

      // Qualifying logic - only evaluated for booked call message
      const titleLower = fieldTitle.toLowerCase();
      if (
        titleLower.includes('invest') ||
        titleLower.includes('£3500') ||
        titleLower.includes('capital') ||
        titleLower.includes('afford') ||
        titleLower.includes('budget') ||
        titleLower.includes('commit') ||
        titleLower.includes('payment plan')
      ) {
        const valueLower = value.toLowerCase();
        if (
          valueLower.includes('yes') ||
          valueLower.includes('can invest')
        ) {
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

    // Backup Calendly check
    if (!hasCalendly) {
      hasCalendly = discordFields.some(f =>
        f.value &&
        f.value.includes('calendly.com') &&
        f.value.includes('invitees')
      );
    }

    if (hasCalendly) {
      // Booked call - show qualified or unqualified
      const color = isQualified ? COLORS.GREEN : COLORS.BLUE;
      const title = isQualified
        ? '📞 New Call Booked - QUALIFIED'
        : '📞 New Call Booked - UNQUALIFIED';
      const embed = createEmbed(title, discordFields, color);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_BOOKED_CALLS, embed);
    } else {
      // New lead - no qualification label
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
