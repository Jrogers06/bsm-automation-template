const axios = require('axios');

async function sendDiscordMessage(webhookUrl, content) {
  try {
    const payload = typeof content === 'string' 
      ? { content } 
      : { embeds: [content] };
    
    await axios.post(webhookUrl, payload);
  } catch (error) {
    console.error('Discord webhook error:', error.message);
  }
}

function buildPlainMessage(title, fields) {
  const lines = [`**${title}**`, ''];
  fields.forEach(f => {
    if (f.value && f.value !== 'N/A') {
      lines.push(`**${f.name}**`);
      lines.push(f.value);
      lines.push('');
    }
  });
  return lines.join('\n');
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

module.exports = { sendDiscordMessage, buildPlainMessage, COLORS };
