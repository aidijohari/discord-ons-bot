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

function buildVoteEmbed(userVotes) {
    const lines = [];

    for (const { username, voteEmoji } of userVotes.values()) {
        lines.push(`${voteEmoji} ${username}`);
    }

    return new EmbedBuilder()
        .setDescription(`\n\n${lines.join("\n")}\n\n`)
        .setColor("#f04a4a");
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ons") {
        const mentions = [];

        ["user1", "user2", "user3"].forEach((key) => {
            const u = interaction.options.getUser(key);
            if (u) mentions.push(u.toString());
        });

        const body = mentions.map((u) => `❌ ${u}`).join("\n");

        let embed = new EmbedBuilder()
            .setDescription(`\n\n${body}\n\n`)
            .setColor("#f04a4a");

        // AFTER replying with the message and embed
        const reply = await interaction.reply({
            content:
                "<:ons:1388078229734035537>  <:taks:1388078418800934985> <:ons:1388078229734035537>",
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
            // const prevEmoji = userVotes.get(user.id);
            const prevVote = userVotes.get(user.id);
            console.log(prevVote);

            // If user already voted with the other emoji, remove their previous reaction
            if (prevVote && prevVote.voteEmoji !== emoji) {
                console.log("1");
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
                console.log("2");
                console.log(`✅ ${user.username} voted ${emoji}`);
            }

            // const display = user.username; // tag = full name#0000

            userVotes.set(user.id, {
                voteEmoji: emoji,
                username: user.toString(),
            });

            const updatedEmbed = buildVoteEmbed(userVotes);
            await sentMessage.edit({ embeds: [updatedEmbed] });

            // userVotes.set(user.id, emoji);
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

        // await interaction.reply({embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN);
