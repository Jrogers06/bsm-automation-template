const axios = require('axios');

async function sendDiscordMessage(webhookUrl, embed) {
  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
  } catch (error) {
    console.error('Discord webhook error:', error.message);
  }
}

function createEmbed(title, fields, color = 0x5865F2) {
  return {
    title,
    color,
    fields: fields.map(f => ({
      name: f.name,
      value: String(f.value || 'N/A').substring(0, 1024),
      inline: f.inline || false
    })),
    timestamp: new Date().toISOString()
  };
}

const COLORS = {
  GREEN: 0x00FF00,
  BLUE: 0x0000FF,
  PURPLE: 0x800080,
  YELLOW: 0xFFFF00,
  RED: 0xFF0000,
  GOLD: 0xFFD700,
  ORANGE: 0xFF6600,
};

module.exports = { sendDiscordMessage, createEmbed, COLORS };
