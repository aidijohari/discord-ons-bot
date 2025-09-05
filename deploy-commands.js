const { REST, Routes, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config(); // loads .env file

const commands = [
  new SlashCommandBuilder()
    .setName('ons')
    .setDescription('Replies with ons!')
    .addStringOption(opt => 
      opt.setName('game')
      .setDescription('Name of steam game (optional)')
      .setRequired(true)
    )
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