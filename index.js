const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;
const JSONBIN_ID = process.env.JSONBIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;

async function getRobloxServers(placeId) {
    let all = [];
    let cursor = null;
    while (all.length < 50) {
        let url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=25`;
        if (cursor) url += `&cursor=${cursor}`;
        const res = await fetch(url);
        const data = await res.json();
        const servers = data.data || [];
        all = all.concat(servers);
        cursor = data.nextPageCursor;
        if (!cursor || servers.length === 0) break;
    }
    console.log('Servers fetched:', all.length);
    return all.slice(0, 50);
}

function getColor(playing, max) {
    const ratio = playing / max;
    if (ratio >= 0.9) return 0xFF4444;
    if (ratio >= 0.5) return 0x00CC44;
    return 0x00FF7F;
}

function calcCash(server) {
    const base = Math.random() * 200 + 800;
    const bonus = (server.playing / server.maxPlayers) * 500;
    return (base + bonus).toFixed(1);
}

function getRarity(playing, max) {
    const ratio = playing / max;
    if (ratio >= 0.8) return '🪬`Diamond`';
    if (ratio >= 0.5) return '🪬`Gold`';
    return '`None`';
}

function buildServerEmbed(server, others) {
    const moneyEst = calcCash(server);
    const playing = Math.min(server.playing, server.maxPlayers);
    const color = getColor(playing, server.maxPlayers);
    const fps = server.fps ? server.fps.toFixed(1) : '?';
    const ping = server.ping ?? '?';
    const rarity = getRarity(playing, server.maxPlayers);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const joinURL = `https://liphyrdev.github.io/notifier/?placeld=${PLACE_ID}&gameInstanceId=${server.id}`;

    let othersList = '';
    others.slice(0, 5).forEach((s, i) => {
        const rar = getRarity(s.playing, s.maxPlayers);
        const c = calcCash(s);
        othersList += `${i + 1}.  $${c}M/s — FPS: ${s.fps ? s.fps.toFixed(1) : '?'}\n    ${rar}\n`;
    });
    if (!othersList) othersList = 'Ninguno';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⚡ Servidor Detectado! [$${moneyEst}M/s]`)
        .addFields(
            { name: '\u200b', value: rarity, inline: false },
            { name: '**Otros Servidores Detectados** 🍀', value: othersList, inline: false },
            { name: 'ENTRAR AL SERVIDOR', value: `[UNIRSE](${joinURL})`, inline: false },
            { name: 'Estado base', value: '```\nSeguro\n```', inline: false },
            { name: 'BOT', value: `\`\`\`\n${client.user?.username || 'H7K NOT'}\n\`\`\``, inline: false },
            { name: '👤 Players', value: `\`\`\`\n${server.playing} / ${server.maxPlayers}\n\`\`\``, inline: false },
        )
        .setFooter({ text: `H7K NOT | Hoy a las ${timeStr}` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('🚀 ENTRAR AL SERVIDOR')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://www.roblox.com/games/start?placeId=${PLACE_ID}&gameInstanceId=${server.id}`),
        new ButtonBuilder()
            .setLabel('👾 Ver Juego')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://www.roblox.com/games/${PLACE_ID}`)
    );

    return { embed, row, moneyEst };
}

async function saveToJsonbin(serverList) {
    const url = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
        body: JSON.stringify({ servers: serverList })
    });
    const data = await res.json();
    console.log('Jsonbin save:', res.status, data.metadata ? 'OK' : JSON.stringify(data));
}

async function scanAndPost() {
    console.log('=== scanAndPost started ===');
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const servers = await getRobloxServers(PLACE_ID);
        if (!servers.length) {
            console.log('No servers found');
            return;
        }

        const sorted = servers
            .map(s => ({ ...s, cashEst: parseFloat(calcCash(s)) }))
            .sort((a, b) => b.cashEst - a.cashEst);

        const top = sorted[0];
        const others = sorted.slice(1);

        const { embed, row, moneyEst } = buildServerEmbed(top, others);
        await channel.send({ embeds: [embed], components: [row] });

        const serverList = sorted.slice(0, 3).map(s => ({
            id: s.id,
            cash: calcCash(s),
            players: `${s.playing}/${s.maxPlayers}`,
            fps: s.fps ? s.fps.toFixed(1) : '?',
            ping: s.ping ?? '?',
            brainrot: "Detectando...",
            timestamp: Date.now()
        }));

        await saveToJsonbin(serverList);
        console.log('Top cash:', moneyEst + 'M/s');
        console.log('=== scanAndPost done ===');

    } catch (err) {
        console.error('scanAndPost error:', err.message);
    }
}

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    scanAndPost();
    setInterval(scanAndPost, 1 * 60 * 1000);
});

client.login(TOKEN);
