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

function buildServerEmbed(server) {
  const moneyEst = (Math.random() * 20 + 5).toFixed(1);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`📍 Servidor Detectado — $${moneyEst}M/s`)
    .addFields(
      { name: '👥 Jugadores', value: `${server.playing} / ${server.maxPlayers}`, inline: true },
      { name: '🔑 ID', value: `\`${server.id}\``, inline: false }
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('🔗 CLIQUE PARA ENTRAR NO SERVIDOR')
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
