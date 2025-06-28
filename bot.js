const { Client, GatewayIntentBits, Events, EmbedBuilder, Collection } = require('discord.js');
require('dotenv').config(); // Load environment variables from .env file

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{ name: '👀 Watching over the server' }],
        status: 'online'
    });
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ons') {
        const mentions = [];

        ['user1', 'user2', 'user3'].forEach(key => {
            const u = interaction.options.getUser(key);
            if (u) mentions.push(u.toString());
        })

        const body = mentions.map(u => `❌ ${u}`).join('\n');

        const embed = new EmbedBuilder()
            .setDescription(`\n\n${body}\n\n`)
            .setColor('#f04a4a')

        // AFTER replying with the message and embed
        const reply = await interaction.reply({
            content: '<:ons:1388078229734035537>  <:taks:1388078418800934985> <:ons:1388078229734035537>',
            embeds: [embed]
        });
        const sentMessage = await interaction.fetchReply(); // use this to avoid the deprecation warning

        await sentMessage.react('✅');
        await sentMessage.react('❌');

        const userVotes = new Map();

        const collector = sentMessage.createReactionCollector({
            filter: (reaction, user) =>
                !user.bot && ['✅', '❌'].includes(reaction.emoji.name),
            time: 2 * 60 * 1000
        });

        collector.on('collect', async (reaction, user) => {
            console.log('collector on');
            const emoji = reaction.emoji.name;
            const prevEmoji = userVotes.get(user.id);

            // If user already voted with the other emoji, remove their previous reaction
            if (prevEmoji && prevEmoji !== emoji) {
                const prevReaction = sentMessage.reactions.cache.get(prevEmoji);
                if (prevReaction) {
                    await prevReaction.users.remove(user.id);
                    console.log(`🧹 ${user.username} switched from ${prevEmoji} to ${emoji}`);
                }
            } else if (!prevEmoji) {
                console.log(`✅ ${user.username} voted ${emoji}`);
            }

            userVotes.set(user.id, emoji);
        });

        collector.on('end', () => {
            const results = { '✅': 0, '❌': 0 };
            for (const vote of userVotes.values()) {
                if (results[vote] !== undefined) results[vote]++;
            }

            console.log('📊 Voting complete. Tally:');
            console.log(`✅ Yes: ${results['✅']}`);
            console.log(`❌ No:  ${results['❌']}`);
        });

        // await interaction.reply({embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN);