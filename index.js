const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PLACE_ID = process.env.PLACE_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILE = 'servers.json';

async function saveToGitHub(servers) {
    console.log('GITHUB_TOKEN starts with:', GITHUB_TOKEN ? GITHUB_TOKEN.substring(0, 10) : 'UNDEFINED');
    console.log('GITHUB_REPO:', GITHUB_REPO);
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
    console.log('API URL:', apiUrl);

    let sha = null;
    try {
        const res = await fetch(apiUrl, {
            headers: { 
                Authorization: `token ${GITHUB_TOKEN}`,
                'User-Agent': 'roblox-bot'
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
            Authorization: `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'roblox-bot'
        },
        body: JSON.stringify(body)
    });

    console.log('PUT status:', res.status);
    const result = await res.json();
    console.log('PUT result:', JSON.stringify(result));
                                              }
async function scanAndPost() {
    console.log('=== scanAndPost started ===');
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        console.log('Channel found:', channel.name);
        const servers = await getRobloxServers(PLACE_ID);
        if (!servers.length) {
            console.log('No servers found, skipping');
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
        console.error('scanAndPost error:', err);
    }
}

client.once('ready', () => {
    console.log(`Bot listo: ${client.user.tag}`);
    scanAndPost();
    setInterval(scanAndPost, 5 * 60 * 1000);
});

client.login(TOKEN);
