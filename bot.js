const { Client, GatewayIntentBits, Events, EmbedBuilder } = require("discord.js");
const { DateTime } = require('luxon'); // for time zones and conversions
const { gameEmbed, buildVoteEmbed, searchSteamGame } = require("./utils");
const { ONS_EMOJI, TAKS_EMOJI, EMBED_COLOR, CUSTOM_ICONS } = require("./constants")
require("dotenv").config();

// === Client setup ===
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
        activities: [{ name: ", Eating, Loving" }],
        status: "online",
    });
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "ons") {
        await interaction.deferReply();
        
        const userKeys = ['user1', 'user2', 'user3', 'user4']
        const users = userKeys.map(key => interaction.options.getUser(key)).filter(Boolean);
        const mentions = users.map(x => x.toString());
        const mentionsVoteList = mentions.map((u) => `${TAKS_EMOJI} ${u}`).join("\n");

        // Time calculations
        const day = interaction.options.getString('day'); // e.g., 'today' or 'tomorrow'
        const time = interaction.options.getString('time'); // e.g., '14:30'
        const nowDate = DateTime.now().setZone('Asia/Kuala_Lumpur');
        const dayDate = day === 'today' ? nowDate : nowDate.plus({ days: 1 }); // Assume 'day' is either 'today' or 'tomorrow'
        const [hour, minute] = time.split(':').map(Number);
        const fullDateTime = dayDate.set({ hour, minute, second: 0 });
        const timestamp = Math.floor(fullDateTime.toSeconds()); // Get Discord timestamp
        const formattedDate = fullDateTime.toFormat("d MMM yyyy, h:mm a ZZZZ"); // e.g. "6 Sep 2025, 2:30 PM GMT+8"
        const scheduledTime = [formattedDate, timestamp]

        const gameName = interaction.options.getString('game');
        let game = null;
        if (gameName) {
            try{
                game = await searchSteamGame(gameName);
            } catch(err) {
                console.error("Steam search failed");
            }
        }

        // ******** //
        // TODO:    
        //  - embed is set multiple times, needs cleanup
        //  - scheduleTime is also set multiple times
        //  - embed ideally should be set once, buildVoteEmbed should just update user/mention/votes fields
        // ******** //
        let embed = new EmbedBuilder()
            .addFields({
                name: '🕒 Scheduled Time',
                value: `${formattedDate} - <t:${timestamp}:R>`,
                inline: false
            })
            .setDescription(`\n\n ${mentionsVoteList} \n\n`)
            .setColor(EMBED_COLOR);
        gameEmbed(embed, game);

        await interaction.editReply({
            content: `${CUSTOM_ICONS.ONS} ${CUSTOM_ICONS.TAKS} ${CUSTOM_ICONS.ONS}`,
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

        setTimeout(async () => {
            try {
                await sentMessage.react(ONS_EMOJI.normalize());
                await sentMessage.react(TAKS_EMOJI.normalize());
                await interaction.channel.send(`${mentions.join(" ")}`);
            } catch (err) {
                console.log("send reaction error: ", err);
            }
        }, 500);

        // Initialize votes
        const userVotes = new Map();
        users.forEach(user => {
            userVotes.set(user.id, {
                voteEmoji: TAKS_EMOJI,
                username: user.toString()
            });
        });

        embed = buildVoteEmbed(userVotes, game, scheduledTime);

        const collector = sentMessage.createReactionCollector({
            filter: (reaction, user) =>
                !user.bot && [ONS_EMOJI, TAKS_EMOJI].includes(reaction.emoji.name),
                time: 24 * 60 * 60 * 1000,
        });

        collector.on("collect", async (reaction, user) => {
            // console.log("collector on");
            const emoji = reaction.emoji.name;
            const prevVote = userVotes.get(user.id);
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
            const updatedEmbed = buildVoteEmbed(userVotes, game, scheduledTime);
            await sentMessage.edit({ embeds: [updatedEmbed] });
        });

        collector.on("end", () => {
            const results = { [ONS_EMOJI]: 0, [TAKS_EMOJI]: 0 };
            for (const { voteEmoji } of userVotes.values()) {
                if (results[voteEmoji] !== undefined) results[voteEmoji]++;
            }
            console.log(`📊 Voting complete. Post: ${postUrl} \nTally:`);
            console.log(`${ONS_EMOJI} Yes: ${results[ONS_EMOJI]}`);
            console.log(`${TAKS_EMOJI} No:  ${results[TAKS_EMOJI]}`);
        });
    }
});

client.login(process.env.BOT_TOKEN);
