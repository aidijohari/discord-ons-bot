const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder,
    Collection,
} = require("discord.js");
require("dotenv").config(); // Load environment variables from .env file

const express = require("express");
const app = express();

const fetch = require('node-fetch');

app.get("/", (req, res) => {
    res.send("Bot is online");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{ name: "👀 Watching over the server" }],
        status: "online",
    });
});

function buildVoteEmbed(userVotes, game = null) {
    const lines = [];

    for (const { username, voteEmoji } of userVotes.values()) {
        lines.push(`${voteEmoji} ${username}`);
    }

    const embed = new EmbedBuilder()
        .setDescription(`\n\n${lines.join("\n")}\n\n`)
        .setColor("#f04a4a");

    gameEmbed(embed, game);

    return embed;
}

function gameEmbed(embed, game) {
    if (game) {
        embed.setTitle(`<:gamecontr:1390295965054796060> ${game.name}`)
            .setURL(game.url)
            .setThumbnail(game.image)
            .addFields({
                name: "Steam Page",
                value: `[Click here to view ${game.name}](${game.url})`
            });
    }

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
            image: top.tiny_image
        };
    }

    return null;
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ons") {
        const mentions = [];
        const gameName = interaction.options.getString('game');
        let game = null;

        if (gameName) {
            game = await searchSteamGame(gameName);
        }

        ["user1", "user2", "user3"].forEach((key) => {
            const u = interaction.options.getUser(key);
            if (u) mentions.push(u.toString());
        });

        const body = mentions.map((u) => `❌ ${u}`).join("\n");

        let embed = new EmbedBuilder()
            .setDescription(`\n\n${body}\n\n`)
            .setColor("#f04a4a");

        gameEmbed(embed, game);

        // AFTER replying with the message and embed
        const reply = await interaction.reply({
            content:
                "<:ons:1388078229734035537> <:taks:1388078418800934985> <:ons:1388078229734035537>",
            embeds: [embed],
        });

        const sentMessage = await interaction.fetchReply();
        const postUrl = `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${sentMessage.id}`;

        await sentMessage.react("✅");
        await sentMessage.react("❌");
        await interaction.channel.send(`${mentions.join(" ")}`);

        const userVotes = new Map();

        mentions.forEach((u) => {
            // Extract username from mention string
            const mentionMatch = u.match(/^<@!?(\d+)>$/);
            const userId = mentionMatch ? mentionMatch[1] : null;

            if (userId) {
                userVotes.set(userId, {
                    voteEmoji: "❌",
                    username: u.replace(`/^<@!?`, "@").replace(`/>$/`, ""),
                });
            }
        });

        embed = buildVoteEmbed(userVotes);

        const collector = sentMessage.createReactionCollector({
            filter: (reaction, user) =>
                !user.bot && ["✅", "❌"].includes(reaction.emoji.name),
            time: 24 * 60 * 60 * 1000,
        });

        collector.on("collect", async (reaction, user) => {
            console.log("collector on");
            const emoji = reaction.emoji.name;
            const prevVote = userVotes.get(user.id);
            console.log(prevVote);

            // If user already voted with the other emoji, remove their previous reaction
            if (prevVote && prevVote.voteEmoji !== emoji) {
                const prevReaction = sentMessage.reactions.cache.get(
                    prevVote.voteEmoji,
                );
                // console.log(prevReaction)
                if (prevReaction) {
                    await prevReaction.users.remove(user.id);
                    console.log(
                        `🧹 ${user.username} switched from ${prevVote} to ${emoji}`,
                    );
                }
            } else if (!prevVote) {
                console.log(`✅ ${user.username} voted ${emoji}`);
            }

            userVotes.set(user.id, {
                voteEmoji: emoji,
                username: user.toString(),
            });

            const updatedEmbed = buildVoteEmbed(userVotes, game);
            await sentMessage.edit({ embeds: [updatedEmbed] });
        });

        collector.on("end", () => {
            const results = { "✅": 0, "❌": 0 };
            for (const { voteEmoji } of userVotes.values()) {
                if (results[voteEmoji] !== undefined) results[voteEmoji]++;
            }

            console.log(`📊 Voting complete. Post: ${postUrl} \n\nTally:`);
            console.log(`✅ Yes: ${results["✅"]}`);
            console.log(`❌ No:  ${results["❌"]}`);
        });
    }
});

client.login(process.env.BOT_TOKEN);
