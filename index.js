const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILE = 'servers.json';

async function getRobloxServers(placeId) {
    const url = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Desc&limit=10`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('Servers found:', data.data ? data.data.length : 0);
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
    const playing = Math.min(server.playing, server.maxPlayers);
    const filled = Math.max(0, Math.min(10, Math.round((playing / server.maxPlayers) * 10)));
    const bar = '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
    const color = getColor(playing, server.maxPlayers);
    const fps = server.fps ? server.fps.toFixed(1) : '?';
    const ping = server.ping ?? '?';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: '🧠 STEAL A BRAINROT', iconURL: 'https://tr.rbxcdn.com/180DAY-placeholder/150/150/Image/Png/noFilter' })
        .setTitle('⚡ Servidor Detectado!')
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

async function saveToGitHub(servers) {
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    let sha = null;
    try {
        const res = await fetch(apiUrl, {
            headers: {
                Authorization: `Bearer ${GITHUB_TOKEN}`,
                'User-Agent': 'roblox-bot',
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        console.log('GET status:', res.status);
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
            console.log('SHA found:', sha);
        } else {
            const err = await res.json();
            console.log('GET error:', JSON.stringify(err));
        }
    } catch (e) {
        console.log('GET exception:', e.message);
    }

    const content = Buffer.from(JSON.stringify(servers, null, 2)).toString('base64');
    const body = {
        message: 'update servers.json',
        content,
        ...(sha ? { sha } : {})
    };

    const res = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'roblox-bot',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify(body)
    });

    console.log('PUT status:', res.status);
    const result = await res.json();
    console.log('PUT result:', JSON.stringify(result).substring(0, 200));
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

        const serverList = [];
        for (const server of servers) {
            const { embed, row, moneyEst, fps, ping } = buildServerEmbed(server);
            await channel.send({ embeds: [embed], components: [row] });
            await new Promise(r => setTimeout(r, 500));
            serverList.push({
                id: server.id,
                cash: moneyEst,
                players: `${server.playing}/${server.maxPlayers}`,
                fps: fps,
                ping: ping,
                timestamp: Date.now()
            });
        }

        await saveToGitHub(serverList);
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
