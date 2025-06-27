const { Client, GatewayIntentBits, Events, EmbedBuilder, Collection } = require('discord.js');
require('dotenv').config(); // Load environment variables from .env file

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
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
        .setDescription(`${body}`)
        .setColor('#f04a4a')

        const reply = await interaction.reply({
            content: '<:ons:1388078229734035537>  <:taks:1388078418800934985>  <:ons:1388078229734035537>',
            embeds: [embed]
        })
        const sentMessage = await interaction.fetchReply();

        // Add reactions
        await reply.react('✅');
        await reply.react('❌');

        // Track votes
        const userVotes = new Collection();

        // Create collector for 24 hours
        const collector = reply.createReactionCollector({
            filter: (reaction,user) => !user.bot && ['✅', '❌'].includes(reaction.emoji.name),
            time: 24 * 60 * 60 * 1000
        });

        collector.on('collect', async (reaction,user) => {
            const emoji = reaction.emoji.name;

            // Remove other votes
            const prevVote = userVotes.get(user.id);
            if (prevVote && prevVote !== emoji) {
                const prevReaction = reply.reactions.cache.get(prevVote);
                await prevReaction.users.remove(user.id);
                
                console.log(`🧹 ${user.username} switched from ${prevVote} to ${emoji}`)
            } else {
                console.log(`✅ ${user.username} vote ${emoji}`)
            }

            userVotes.set(user.id, emoji);
        });

        collector.on('end', () => {
            const results = {
                '✅': 0,
                '❌': 0
            };

            for (let vote of userVotes.values()){
                if (results[vote] !== undefined) results[vote]++;
            }


        })

        // await interaction.reply({embeds: [embed] });
    }
});

client.login(process.env.BOT_TOKEN);