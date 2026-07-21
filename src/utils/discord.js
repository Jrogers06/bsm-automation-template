const axios = require('axios');

async function sendDiscordMessage(webhookUrl, embed) {
  try {
    if (!webhookUrl) return;
    await axios.post(webhookUrl, { embeds: [embed] });
  } catch (error) {
    console.error('Discord webhook error:', error.message);
  }
}

async function sendSlackMessage(webhookUrl, embed) {
  try {
    if (!webhookUrl) return;

    // Convert Discord embed to Slack block format
    const fields = embed.fields || [];
    const fieldBlocks = [];

    // Group fields in pairs for 2-column layout
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
  } catch (error) {
    console.error('Slack webhook error:', error.message);
  }
}

async function sendToAll(discordUrl, slackUrl, embed) {
  await Promise.all([
    sendDiscordMessage(discordUrl, embed),
    sendSlackMessage(slackUrl, embed)
  ]);
}

function createEmbed(title, fields, color) {
  return {
    title,
    color,
    fields: fields
      .filter(f => f.value && f.value !== 'N/A' && f.value !== '')
      .map(f => ({
        name: f.name,
        value: String(f.value).substring(0, 1024),
        inline: f.inline !== false
      })),
    timestamp: new Date().toISOString(),
    footer: { text: 'BSM Bot • Opportunity Pipeline' }
  };
}

const COLORS = {
  GREEN: 0x57F287,
  BLUE: 0x5865F2,
  PURPLE: 0x9B59B6,
  YELLOW: 0xF1C40F,
  RED: 0xED4245,
  GOLD: 0xF59E0B,
  ORANGE: 0xE67E22,
};

module.exports = { sendDiscordMessage, sendSlackMessage, sendToAll, createEmbed, COLORS };
