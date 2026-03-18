const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // ejemplo: lucyrued/roblox-bot
const GITHUB_FILE = 'servers.json';

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
        .setDescription(`> 💰 **Generación estimada: $${moneyEst}M/s**\n> ${bar}\n> 👤 **${server.playing} / ${server.maxPlayers}**`)
        .addFields(
            { name: '⚡ FPS', value: `\`${fps}\``, inline: true },
            { name: '📶 Ping', value: `\`${ping}ms\``, inline: true },
            { name: '🕐 Detectado', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            { name: '🔑 Server ID', value: `\`\`${server.id}\`\``, inline: false }
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

// GUARDAR EN GITHUB
async function saveToGitHub(servers) {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;

    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    // Obtener SHA del archivo actual si existe
    let sha = null;
    try {
        const res = await fetch(apiUrl, {
            headers: { Authorization: `token ${GITHUB_TOKEN}` }
        });
        if (res.ok) {
            const data = await res.json();
            sha = data.sha;
        }
    } catch (_) {}

    const content = Buffer.from(JSON.stringify(servers, null, 2)).toString('base64');

    const body = {
        message: 'update servers.json',
        content,
        ...(sha ? { sha } : {})
    };

    await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

async function scanAndPost() {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const servers = await getRobloxServers(PLACE_ID);
        if (!servers.length) return;

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

        // Guardar en GitHub
        await saveToGitHub(serverList);

    } catch (err) {
        console.error('Error:', err);
    }
}

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    scanAndPost();
    setInterval(scanAndPost, 5 * 60 * 1000);
});

client.login(TOKEN);
