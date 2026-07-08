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

    answers.forEach((answer, index) => {
      const fieldDef = fields_def[index];
      const fieldTitle = fieldDef?.title || `Question ${index + 1}`;
      let value = '';

      switch (answer.type) {
        case 'text':
        case 'email':
        case 'phone_number':
          value = answer[answer.type] || 'N/A';
          break;
        case 'choice':
          value = answer.choice?.label || 'N/A';
          break;
        case 'choices':
          value = answer.choices?.labels?.join(', ') || 'N/A';
          break;
        case 'boolean':
          value = answer.boolean ? 'Yes' : 'No';
          break;
        case 'number':
          value = String(answer.number) || 'N/A';
          break;
        default:
          value = JSON.stringify(answer) || 'N/A';
      }

      const titleLower = fieldTitle.toLowerCase();
      if (
        titleLower.includes('invest') ||
        titleLower.includes('capital') ||
        titleLower.includes('afford') ||
        titleLower.includes('budget')
      ) {
        const valueLower = value.toLowerCase();
        if (valueLower.includes('yes') || valueLower.includes('i have')) {
          isQualified = true;
        }
      }

      discordFields.push({
        name: fieldTitle,
        value: value.substring(0, 1024),
        inline: false
      });
    });

    const color = isQualified ? COLORS.GREEN : COLORS.BLUE;
    const title = isQualified ? '🟢 New Qualified Lead' : '🔵 New Unqualified Lead';

    const embed = createEmbed(title, discordFields, color);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NEW_LEADS, embed);

    res.json({ success: true });
  } catch (err) {
    console.error('Typeform webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
