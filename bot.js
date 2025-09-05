const {
    Client,
    GatewayIntentBits,
    Events,
    EmbedBuilder
} = require("discord.js");
require("dotenv").config(); // Load environment variables from .env file
 
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
        activities: [{ name: "watcher for all those that are ons 🤲" }],
        status: "online",
    });
});

function buildVoteEmbed(userVotes, game) {
    const lines = [];

    for (const { username, voteEmoji } of userVotes.values()) {
        lines.push(`${voteEmoji} ${username}`);
    }

    const embed = new EmbedBuilder()
        .setDescription(`\n\n${lines.join("\n")}\n\n`)
        .setColor("#f04a4a");

    gameEmbed(embed, game);
    // console.log(game);

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
    return {notfound: gameName};
}

function gameEmbed(embed, game) {
    // if (game) {
    embed.setTitle(`<:gamecontr:1390295965054796060> ${game?.name ?? `${game.notfound} <steam game not found>`}`)
        .setURL(game?.url)
        .setThumbnail(game?.image)
        .setImage(game?.hero);
        if(game?.name && game?.url){
            embed.addFields({
                name: "Steam Page",
                value: `[Click here to view ${game?.name}](${game?.url})`
            })
        }
    // }
    return embed;
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ons") {
        const mentions = [];
        const users = [
            interaction.options.getUser('user1'),
            interaction.options.getUser('user2'),
            interaction.options.getUser('user3'),
            interaction.options.getUser('user4')
        ].filter(Boolean)
        const gameName = interaction.options.getString('game');
        let game = null;

        if (gameName) {
            game = await searchSteamGame(gameName);
        }

        ["user1", "user2", "user3", "user4"].forEach((key) => {
            const u = interaction.options.getUser(key);
            if (u) mentions.push(u.toString());
        });

        const body = mentions.map((u) => `❌ ${u}`).join("\n");

        const day = interaction.options.getString('day'); // e.g., '2025-09-05'
        const time = interaction.options.getString('time'); // e.g., '14:30'
        const dateTimeString = `${day}T${time}:00`
        const timestamp = Math.floor(new Date(dateTimeString).getTime() / 1000);
        const discordTime = `<t:${timestamp}:R>`;

        console.log(day)
        console.log(time)
        console.log(dateTimeString)
        console.log(timestamp)
        console.log(discordTime)

        let embed = new EmbedBuilder()
            .setDescription(`\n\n Time: ${discordTime} \n\n ${body} \n\n`)
            .setColor("#f04a4a");

        gameEmbed(embed, game);

        // AFTER replying with the message and embed
        const reply = await interaction.reply({
            content:
                "<:ons:1388078229734035537> <:taks:1388078418800934985> <:ons:1388078229734035537>",
            embeds: [embed],
        });

        /* General Logging */
        console.log(`---------------------`);
        console.log(`🔛 started`);
        console.log(`Game: ${game.name}`);
        console.log(`Users: ${users.map(u => u.username).join(", ")}`)
        console.log(`---------------------`);
        /* *** */

        const sentMessage = await interaction.fetchReply();
        const postUrl = `https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${sentMessage.id}`;

        setTimeout(async () => { //timeout for discord android blank emoji (does not fix issue)
            try {
                const emojiOns = "✅"; //previously ✅
                const emojiTaks = "❌"; //previously ❌
                await sentMessage.react(emojiOns.normalize()); //normalize for discord android blank emoji (does not fix issue)
                await sentMessage.react(emojiTaks.normalize());
                await interaction.channel.send(`${mentions.join(" ")}`);
            } catch(err) {
                console.log("send reaction error: ", err);
            }
        }, 500);

        const userVotes = new Map();

        mentions.forEach((u) => {
            // Extract username from mention string
            const mentionMatch = u.match(/^<@!?(\d+)>$/);
            const userId = mentionMatch ? mentionMatch[1] : null;

            if (userId) {
                userVotes.set(userId, {
                    voteEmoji: "❌",
                    username: u.replace(`/^<@!?`, "@").replace(`/>$/`, "")
                });
            }
        });

        embed = buildVoteEmbed(userVotes, game);

        const collector = sentMessage.createReactionCollector({
            filter: (reaction, user) =>
                !user.bot && ["✅", "❌"].includes(reaction.emoji.name),
            time: 24 * 60 * 60 * 1000,
        });

        collector.on("collect", async (reaction, user) => {
            // console.log("collector on");
            const emoji = reaction.emoji.name;
            const prevVote = userVotes.get(user.id);
            // console.log(`➡️  ${user.username} prevVote:`, prevVote?.voteEmoji ?? 'none');

            // If user already voted with the other emoji, remove their previous reaction
            console.log(`➡️  ${user.username} voted ${emoji}`);
            if (prevVote && prevVote.voteEmoji !== emoji) {
                const prevReaction = sentMessage.reactions.cache.get(
                    prevVote.voteEmoji,
                );
                // console.log(prevReaction)
                if (prevReaction) {
                    await prevReaction.users.remove(user.id);
                    console.log(
                        `🧹 ${user.username} switched from ${prevVote.voteEmoji} to ${emoji}`,
                    );
                }
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

            console.log(`📊 Voting complete. Post: ${postUrl} \nTally:`);
            console.log(`✅ Yes: ${results["✅"]}`);
            console.log(`❌ No:  ${results["❌"]}`);
        });
    }
});

client.login(process.env.BOT_TOKEN);
