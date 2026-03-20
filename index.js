const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SAB_CHANNEL_ID = process.env.SAB_CHANNEL_ID;
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

async function extractServerID(message) {
    if (message.components && message.components.length > 0) {
        for (const row of message.components) {
            for (const component of row.components) {
                if (component.url) {
                    const match = component.url.match(/gameInstanceId=([a-f0-9-]+)/i);
                    if (match) return match[1];
                    try {
                        const res = await fetch(component.url, { method: 'GET', redirect: 'follow' });
                        const finalUrl = res.url;
                        const match2 = finalUrl.match(/gameInstanceId=([a-f0-9-]+)/i);
                        if (match2) return match2[1];
                        const text = await res.text();
                        const match3 = text.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
                        if (match3) return match3[1];
                    } catch(e) {
                        console.log('Fetch error:', e.message);
                    }
                }
            }
        }
    }
    if (message.embeds && message.embeds.length > 0) {
        for (const embed of message.embeds) {
            const text = (embed.description || '') + JSON.stringify(embed.fields || []) + (embed.title || '');
            const match = text.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (match) return match[1];
        }
    }
    return null;
}

function extractBrainrot(message) {
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];
        const desc = embed.description || embed.title || '';
        const lines = desc.split('\n');
        if (lines.length > 0) {
            const match = lines[0].match(/^(.+?)\s*—/);
            if (match) return match[1].trim();
        }
    }
    return "Brainrot detectado";
}

function extractCash(message) {
    if (message.embeds && message.embeds.length > 0) {
        const embed = message.embeds[0];
        const desc = embed.description || '';
        const match = desc.match(/\$([0-9,.]+[MBKTQmbtq]?)\/s/i);
        if (match) return match[1];
    }
    return "?";
}

async function sendToMyChannel(serverID, brainrot, cash) {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const joinURL = `https://liphyrdev.github.io/notifier/?placeld=${PLACE_ID}&gameInstanceId=${serverID}`;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const embed = new EmbedBuilder()
            .setColor(0x00CC44)
            .setTitle(`🎯 SAB: ${brainrot} [$${cash}/s]`)
            .addFields(
                { name: 'ENTRAR AL SERVIDOR', value: `[UNIRSE](${joinURL})`, inline: false },
                { name: 'Estado base', value: '```\nSeguro\n```', inline: false },
                { name: 'BOT', value: '```\nH7K NOT\n```', inline: false },
                { name: '🔑 Server ID', value: `\`${serverID}\``, inline: false },
            )
            .setFooter({ text: `H7K NOT | SAB Finder • Hoy a las ${timeStr}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 ENTRAR AL SERVIDOR')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/games/start?placeId=${PLACE_ID}&gameInstanceId=${serverID}`),
            new ButtonBuilder()
                .setLabel('👾 Ver Juego')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/games/${PLACE_ID}`)
        );

        await channel.send({ embeds: [embed], components: [row] });
        console.log('Sent to my channel:', brainrot, serverID);
    } catch (err) {
        console.error('Error sending to channel:', err.message);
    }
}

client.on('messageCreate', async (message) => {
    if (message.channelId !== SAB_CHANNEL_ID) return;
    if (!message.author.bot) return;

    console.log('SAB message received from:', message.author.username);

    const serverID = await extractServerID(message);
    if (!serverID) {
        console.log('No server ID found in message');
        return;
    }

    const brainrot = extractBrainrot(message);
    const cash = extractCash(message);

    console.log('Found:', brainrot, cash, serverID);

    await saveToJsonbin([{
        id: serverID,
        brainrot: brainrot,
        cash: cash,
        players: "?/?",
        fps: "?",
        ping: "?",
        timestamp: Date.now()
    }]);

    await sendToMyChannel(serverID, brainrot, cash);
});

async function scanAndPost() {
    console.log('=== scanAndPost started ===');
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        const servers = await getRobloxServers(PLACE_ID);
        if (!servers.length) return;

        const sorted = servers
            .map(s => ({ ...s, cashEst: parseFloat(calcCash(s)) }))
            .sort((a, b) => b.cashEst - a.cashEst);

        const top = sorted[0];
        const joinURL = `https://liphyrdev.github.io/notifier/?placeld=${PLACE_ID}&gameInstanceId=${top.id}`;
        const rarity = getRarity(top.playing, top.maxPlayers);
        const now = new Date();
        const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        let othersList = '';
        sorted.slice(1, 5).forEach((s, i) => {
            othersList += `${i + 1}. $${calcCash(s)}M/s — ${getRarity(s.playing, s.maxPlayers)}\n`;
        });
        if (!othersList) othersList = 'Ninguno';

        const embed = new EmbedBuilder()
            .setColor(getColor(top.playing, top.maxPlayers))
            .setTitle(`⚡ Servidor Detectado! [$${top.cashEst}M/s]`)
            .addFields(
                { name: '\u200b', value: rarity, inline: false },
                { name: '**Otros Servidores** 🍀', value: othersList, inline: false },
                { name: 'ENTRAR AL SERVIDOR', value: `[UNIRSE](${joinURL})`, inline: false },
                { name: 'Estado base', value: '```\nSeguro\n```', inline: false },
                { name: 'BOT', value: `\`\`\`\n${client.user?.username || 'H7K NOT'}\n\`\`\``, inline: false },
                { name: '👤 Players', value: `\`\`\`\n${top.playing} / ${top.maxPlayers}\n\`\`\``, inline: false },
            )
            .setFooter({ text: `H7K NOT | Hoy a las ${timeStr}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('🚀 ENTRAR AL SERVIDOR')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/games/start?placeId=${PLACE_ID}&gameInstanceId=${top.id}`),
            new ButtonBuilder()
                .setLabel('👾 Ver Juego')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.roblox.com/games/${PLACE_ID}`)
        );

        await channel.send({ embeds: [embed], components: [row] });
        await saveToJsonbin(sorted.slice(0, 3).map(s => ({
            id: s.id,
            brainrot: "Detectando...",
            cash: calcCash(s),
            players: `${s.playing}/${s.maxPlayers}`,
            fps: s.fps ? s.fps.toFixed(1) : '?',
            ping: s.ping ?? '?',
            timestamp: Date.now()
        })));

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
