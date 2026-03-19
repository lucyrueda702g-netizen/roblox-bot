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
    const color = getColor(playing, server.maxPlayers);
    const fps = server.fps ? server.fps.toFixed(1) : '?';
    const ping = server.ping ?? '?';
    const rarity = playing / server.maxPlayers >= 0.8 ? '🪬`Diamond`' : playing / server.maxPlayers >= 0.5 ? '🪬`Gold`' : '`None`';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
    const joinURL = `https://liphyrdev.github.io/notifier/?placeld=${PLACE_ID}&gameInstanceId=${server.id}`;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`⚡ Servidor Detectado! [$${moneyEst}M/s]`)
        .addFields(
            { name: '\u200b', value: rarity, inline: false },
            { name: '**Otros Servidores Detectados** 🍀', value: `FPS: \`${fps}\` | Ping: \`${ping}ms\``, inline: false },
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

    return { embed, row, moneyEst, fps, ping };
