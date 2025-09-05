const { REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config(); // loads .env file

//for timezone
const offsetMs = 8 * 60 * 60 * 1000; // GMT+8 offset in milliseconds
const now = new Date(Date.now() + offsetMs);
const tomorrow = new Date(Date.now() + offsetMs + 86400000);

const commands = [
  new SlashCommandBuilder()
    .setName('ons')
    .setDescription('Replies with ons!')
    .addStringOption(opt =>
      opt.setName('game')
        .setDescription('Name of steam game (optional)')
        .setRequired(true)
    )
    //datetime
    .addStringOption(option =>
      option.setName('day')
        .setDescription('Today/Tomorrow')
        .setRequired(true)
        .addChoices(
          { name: 'Today', value: now.toISOString().split('T')[0] },
          { name: 'Tomorrow', value: tomorrow.toISOString().split('T')[0] }
        ))
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Enter time in HH:mm format (24h)')
        .setRequired(true)
    )
    //users
    .addUserOption(opt =>
      opt.setName('user1')
        .setDescription(`Who's onboard? @1`)
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('user2')
        .setDescription(`Who's onboard? @2`)
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('user3')
        .setDescription(`Who's onboard? @3`)
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('user4')
        .setDescription(`Who's onboard? @4`)
        .setRequired(false)
    )
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('⚙️ Registering slash command...');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID), // or Routes.applicationGuildCommands() for local testing
      { body: commands }
    );
    console.log('✅ Slash command registered');
  } catch (error) {
    console.error(error);
  }
})();