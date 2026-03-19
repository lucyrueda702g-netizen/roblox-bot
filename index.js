const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;
const JSONBIN_ID = process.env.JSONBIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;

async function getRobloxServers(placeId) {
    let allServers = [];
    let cursor = null;
    while (allServers.length < 50) {
        let url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=25`;
        if (cursor) url += `&cursor=${cursor}`;
        const res = await fetch(url);
        const data = await res.json();
        const servers = data.data || [];
        allServers = allServers.concat(servers);
        cursor = data.nextPageCursor;
        if (!cursor || servers.length === 0) break;
    }
    console.log('Total servers fetched:', allServers.length);
    return allServers.slice(0, 50);
}

function getColor(playing, max) {
    const ratio = playing / max;
    if (ratio >= 0.9) return 0xFF4444;
    if (ratio >= 0.5) return 0xFF8C00;
    return 0x00FF7F;
}

function calcCash(server) {
    const base = (Math.random() * 200 + 800);
    const playerBonus = (server.playing / server.maxPlayers) * 500;
    return Math.floor(base + playerBonus);
}

function buildServerEmbed(server, rank) {
    const moneyEst = calcCash(server);
    const playing = Math.min(server.playing, server.maxPlayers);
    const filled = Math.max(0, Math.min(10, Math.round((playing / server.maxPlayers) * 10)));
    const bar = '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
    const color = getColor(playing, server.maxPlayers);
    const fps = server.fps ? server.fps.toFixed(1) : '?';
    const ping = server.ping ?? '?';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: '🧠 STEAL A BRAINROT', iconURL: 'https://tr.rbxcdn.com/180DAY-placeholder/150/150/Image/Png/noFilter' })
        .setTitle(`⚡ #${rank} Servidor Detectado!`)
        .setDescription(`> 💰 **Generación estimada: $${moneyEst}M/s**\n> ${bar}\n> 👤 **${server.playing} / ${server.maxPlayers}**`)
        .addFields(
            { name: '⚡ FPS', value: `\`${fps}\``, inline: true },
            { name: '📶 Ping', value: `\`${ping}ms\``, inline: true },
            { name: '🕐 Detectado', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '🔑 Server ID', value: `\`${server.id}\``, inline: false }
        )
        .setFooter({ text: '🤖 Brainrot Server Finder • Actualiza cada 5 min' })
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

    return { embed, row, moneyEst, fps, ping };
}

async function saveToJsonbin(serverList) {
    const url = `https://api.jsonbin.io/v3/b/${JSONBIN_ID}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_KEY
        },
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

        const serversWithCash = servers.map(s => ({
            ...s,
            cashEst: calcCash(s)
        }));

        serversWithCash.sort((a, b) => b.cashEst - a.cashEst);
        const top3 = serversWithCash.slice(0, 3);
        const serverList = [];

        for (let i = 0; i < top3.length; i++) {
            const server = top3[i];
            const { embed, row, fps, ping } = buildServerEmbed(server, i + 1);
            await channel.send({ embeds: [embed], components: [row] });
            await new Promise(r => setTimeout(r, 500));
            serverList.push({
                id: server.id,
                cash: server.cashEst,
                players: `${server.playing}/${server.maxPlayers}`,
                fps: fps,
                ping: ping,
                brainrot: "Detectando...",
                timestamp: Date.now()
            });
        }

        await saveToJsonbin(serverList);
        console.log('Top server cash:', serverList[0]?.cash + 'M/s');
        console.log('=== scanAndPost done ===');

    } catch (err) {
        console.error('scanAndPost error:', err.message);
    }
}

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    scanAndPost();
    setInterval(scanAndPost, 5 * 60 * 1000);
});

client.login(TOKEN);
