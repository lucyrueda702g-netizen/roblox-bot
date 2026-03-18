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
  if (ratio >= 0.9) return 0xFF4444;
  if (ratio >= 0.5) return 0xFF8C00;
  return 0x00FF7F;
}

function buildServerEmbed(server) {
  const moneyEst = (Math.random() * 950 + 50).toFixed(0);
  const filled = Math.round((server.playing / server.maxPlayers) * 10);
  const bar = '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
  const color = getColor(server.playing, server.maxPlayers);
  const fps = server.fps ? server.fps.toFixed(1) : '?';
  const ping = server.ping ?? '?';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: '🧠 STEAL A BRAINROT', iconURL: 'https://tr.rbxcdn.com/180DAY-placeholder/150/150/Image/Png/noFilter' })
    .setTitle('⚡ Servidor Detectado!')
    .setDescription(`> 💰 **Generación estimada: $${moneyEst}M/s**\n> ${bar}\n> 👥 **${server.playing} / ${server.maxPlayers} jugadores**`)
    .addFields(
      { name: '⚡ FPS', value: `\`${fps}\``, inline: true },
      { name: '📶 Ping', value: `\`${ping}ms\``, inline: true },
      { name: '🕐 Detectado', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
      { name: '🔑 Server ID', value: `\`\`\`${server.id}\`\`\``, inline: false }
    )
    .setFooter({ text: '🤖 Brainrot Server Finder • Actualiza cada 5 min' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🚀 ENTRAR AL SERVIDOR')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.roblox.com/games/start?placeId=${PLACE_ID}&gameInstanceId=${server.id}`),
    new ButtonBuilder()
      .setLabel('🎮 Ver Juego')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://www.roblox.com/games/${PLACE_ID}`)
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
