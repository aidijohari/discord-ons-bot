const { EmbedBuilder } = require("discord.js");
const { CUSTOM_ICONS, EMBED_COLOR } = require("./constants");

// === Utility functions ===
function gameEmbed(embed, game) {
    embed.setTitle(`${CUSTOM_ICONS.GAMEPAD} ${game?.name ?? `${game.notfound} <steam game not found>`}`)
        .setURL(game?.url)
        .setThumbnail(game?.image)
        .setImage(game?.hero);
    if (game?.name && game?.url) {
        embed.addFields({
            name: "Steam Page",
            value: `[Click here to view ${game?.name}](${game?.url})`
        });
    }
    return embed;
}

function buildVoteEmbed(userVotes, game, scheduledTime) {
    const lines = [];
    for (const { username, voteEmoji } of userVotes.values()) {
        lines.push(`${voteEmoji} ${username}`);
    }
    
    // Generate random RGB values, then average with 255 for pastel effect
    function randomPastelColor() { 
        const r = Math.floor((Math.random() * 127) + 127);
        const g = Math.floor((Math.random() * 127) + 127);
        const b = Math.floor((Math.random() * 127) + 127);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    let color = `${randomPastelColor()}`;
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { color = EMBED_COLOR; } // Simple hex color validation: must be 7 chars and match hex pattern

    const embed = new EmbedBuilder()
        .addFields({
            name: '🕒 Scheduled Time',
            value: `${scheduledTime[0]} - <t:${scheduledTime[1]}:R>`,
            inline: false
        })
        .setDescription(`\n\n${lines.join("\n")}\n\n`)
        .setColor(color);

    gameEmbed(embed, game);
    return embed;
}

async function searchSteamGame(gameName) {
    const query = encodeURIComponent(gameName);
    const url = `https://store.steampowered.com/api/storesearch/?term=${query}&cc=us&l=en`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
        const top = data.items[0];
        return {
            name: top.name,
            url: `https://store.steampowered.com/app/${top.id}`,
            image: top.tiny_image,
            hero: `https://cdn.cloudflare.steamstatic.com/steam/apps/${top.id}/header.jpg`,
        };
    }
    return { notfound: gameName };
}

module.exports = {
    buildVoteEmbed,
    searchSteamGame,
    gameEmbed
};