const express = require('express');
const router = express.Router();
const { sendDiscordMessage, createEmbed, COLORS } = require('../utils/discord');

router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    const formTitle = payload.form_title || 'EOD Report';
    const answers = payload.answers || {};

    const discordFields = Object.entries(answers).map(([question, answer]) => ({
      name: question,
      value: String(answer || 'N/A').substring(0, 1024),
      inline: false
    }));

    let title = `📋 ${formTitle}`;
    let color = COLORS.PURPLE;

    const titleLower = formTitle.toLowerCase();
    if (titleLower.includes('closer')) {
      title = `📋 Closer EOD Report`;
      color = COLORS.BLUE;
    } else if (titleLower.includes('setter')) {
      title = `📋 Setter EOD Report`;
      color = COLORS.GREEN;
    } else if (titleLower.includes('manager')) {
      title = `📋 Sales/Setter Manager EOD Report`;
      color = COLORS.GOLD;
    } else if (titleLower.includes('company')) {
      title = `📋 Company-Wide EOD Report`;
      color = COLORS.PURPLE;
    }

    const embed = createEmbed(title, discordFields, color);
    await sendDiscordMessage(process.env.DISCORD_WEBHOOK_DAILY_REPORTS, embed);

    res.json({ success: true });
  } catch (err) {
    console.error('EOD webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
