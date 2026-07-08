const express = require('express');
const router = express.Router();
const { sendDiscordMessage, createEmbed, COLORS } = require('../utils/discord');

function buildPaymentFields(data) {
  return [
    { name: '👤 Full Name', value: data.name || 'N/A', inline: true },
    { name: '💰 Amount', value: data.amount || 'N/A', inline: true },
    { name: '📧 Email', value: data.email || 'N/A', inline: true },
    { name: '📞 Phone', value: data.phone || 'N/A', inline: true },
    { name: '🛍️ Product', value: data.product || 'N/A', inline: true },
  ];
}

router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    const membership = event.data || {};

    const data = {
      name: membership.user?.name || 'N/A',
      amount: membership.renewal_period_price
        ? `£${membership.renewal_period_price}`
        : 'N/A',
      email: membership.user?.email || 'N/A',
      phone: membership.user?.phone_number || 'N/A',
      product: membership.product?.name || 'N/A',
    };

    const fields = buildPaymentFields(data);

    if (event.action === 'membership.went_valid') {
      const embed = createEmbed('💳 New Whop Payment', fields, COLORS.GOLD);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_NEW_PAYMENTS, embed);
    } else if (event.action === 'membership.went_invalid') {
      const embed = createEmbed('❌ Failed Whop Payment', fields, COLORS.RED);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_FAILED_PAYMENTS, embed);
    } else if (event.action === 'membership.dispute.created') {
      const embed = createEmbed('⚠️ Whop Dispute', fields, COLORS.ORANGE);
      await sendDiscordMessage(process.env.DISCORD_WEBHOOK_FAILED_PAYMENTS, embed);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Whop handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
