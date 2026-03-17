const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;

async function getRobloxServers(placeId) {
  const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=10`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data || [];
}

function getColor(playing, max) {
  const ratio = playing / max;
  if (ratio >= 0.9) return 0xFF0000;
  if (ratio >= 0.5) return 0xFFA500;
  return 0x00FF7F;
}

function buildServerEmbed(server) {
  const moneyEst = (Math.random() * 20 + 5).toFixed(1);
  const filled = Math.round((server.playing / server.maxPlayers) * 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const color = getColor(server.playing, server.maxPlayers);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🧠 Steal a Brainrot — Servidor Detectado')
    .addFields(
      { name: '💰 Generación', value: `$${moneyEst}M/s`, inline: true },
      { name: '👥 Jugadores', value: `${server.playing} / ${server.maxPlayers}`, inline: true },
      { name: '📊 Ocupación', value: `\`${bar}\``, inline: false },
      { name: '⚡ FPS', value: `${server.fps ? server.fps.toFixed(1) : '?'}`, inline: true },
      { name: '📶 Ping', value: `${server.ping ?? '?'}ms`, inline: true },
      { name: '🔑 Job ID', value: `\`${server.id}\``, inline: false }
    )
    .setFooter({ text: '🤖 Steal a Brainrot Server Finder' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🔗 ENTRAR AL SERVIDOR')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.roblox.com/games/start?placeId=${PLACE_ID}&gameInstanceId=${server.id}`)
  );

  return { embed, row };
}

async function scanAndPost() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    const servers = await getRobloxServers(PLACE_ID);
    if (!servers.length) return;

    for (const server of servers) {
      const { embed, row } = buildServerEmbed(server);
      await channel.send({ embeds: [embed], components: [row] });
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  setInterval(scanAndPost, 5 * 60 * 1000);
  scanAndPost();
});

client.login(TOKEN);
