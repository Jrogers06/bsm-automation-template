const axios = require('axios');

async function sendSlackMessage(webhookUrl, embed) {
  try {
    if (!webhookUrl) return;

    const fields = embed.fields || [];
    const fieldBlocks = [];

    for (let i = 0; i < fields.length; i += 2) {
      const left = fields[i];
      const right = fields[i + 1];

      if (right) {
        fieldBlocks.push({
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*${left.name}*\n${left.value}` },
            { type: 'mrkdwn', text: `*${right.name}*\n${right.value}` }
          ]
        });
      } else {
        fieldBlocks.push({
          type: 'section',
          text: { type: 'mrkdwn', text: `*${left.name}*\n${left.value}` }
        });
      }
    }

    const payload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: embed.title || 'Notification', emoji: true }
        },
        { type: 'divider' },
        ...fieldBlocks
      ]
    };

    await axios.post(webhookUrl, payload);
    console.log('Slack message sent successfully');
  } catch (error) {
    console.error('Slack webhook error:', error.message);
  }
}

module.exports = { sendSlackMessage };
