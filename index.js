process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

const express = require('express');
const app = express();
const BIN_URL = 'https://api.jsonbin.io/v3/b/681661b68960c979a592c679';
const BIN_API_KEY = '$2a$10$.PjJs7c4DYVfgejgvxfUb.PFw5ACT8mja/ZGjSooAUD2lvCLHJCxi'; // Replace with your X-Master-Key

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

// Use the port from the environment variable, or default to 10000 if not set
const port = process.env.PORT || 10000;

app.listen(port, () => {
  console.log(`Express server started on port ${port}`);
});

// Import necessary classes from discord.js
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Role ID for mods (who can use commands)
const MOD_ROLE_ID = '1235976846718402560';

// Channel IDs
const BIRTHDAY_CHANNEL_ID = '1226880047198113843';
const WELCOME_CHANNEL_ID = '1236679858332106782'; // Update this with your welcome channel ID
const GOODBYE_CHANNEL_ID = '1236686717294219275'; // Update this with your goodbye channel ID

// File to store birthdays
const BIRTHDAYS_FILE = 'birthdays.json';

// Load or initialize birthdays data
let birthdays = {};
try {
    if (fs.existsSync(BIRTHDAYS_FILE)) {
        const data = fs.readFileSync(BIRTHDAYS_FILE, 'utf8');
        birthdays = data ? JSON.parse(data) : {};
    } else {
        birthdays = {};
        fs.writeFileSync(BIRTHDAYS_FILE, JSON.stringify(birthdays, null, 2));
    }
} catch (error) {
    console.error('Error reading or initializing birthdays.json:', error);
    birthdays = {};
}

// Helper to save birthdays to file
function saveBirthdays() {
    try {
        fs.writeFileSync(BIRTHDAYS_FILE, JSON.stringify(birthdays, null, 2));
    } catch (error) {
        console.error('Error writing to birthdays.json:', error);
    }
}

// Validate MM/DD format
function isValidDate(input) {
    const regex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/;
    if (!regex.test(input)) return false;
    const [month, day] = input.split('/').map(Number);
    if (month === 2 && day > 29) return false;
    if ([4,6,9,11].includes(month) && day > 30) return false;
    return true;
}

// Create slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('setbirthday')
        .setDescription('Set a birthday for a user (MM/DD format).')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Birthday (MM/DD)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to set birthday for (default to yourself)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('editbirthday')
        .setDescription('Edit an existing birthday for a user.')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Birthday (MM/DD)')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to edit birthday for (default to yourself)')
                .setRequired(false)),
    new SlashCommandBuilder()
        .setName('allbirthdays')
        .setDescription('List all stored birthdays.'),
    new SlashCommandBuilder()
        .setName('deletecommands')
        .setDescription('Delete a specific slash command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Command name to delete')
                .setRequired(true))
].map(command => command.toJSON());

// When bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await client.application.commands.set(commands);
    checkBirthdays();
    // Check birthdays at midnight each day
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            checkBirthdays();
        }
    }, 60 * 1000); // Check every minute
});

// Function to check birthdays
async function checkBirthdays() {
    const today = new Date();
    const mm = today.getMonth() + 1;
    const dd = today.getDate();
    const dateKey = `${mm}/${dd}`;
    try {
        const channel = await client.channels.fetch(BIRTHDAY_CHANNEL_ID);
        if (!channel) {
            console.error('Birthday channel not found');
            return;
        }
        for (const [userId, birthday] of Object.entries(birthdays)) {
            if (birthday === dateKey) {
                channel.send(`🎉 Happy Birthday <@${userId}>! 🎂`);
            }
        }
    } catch (error) {
        console.error('Error fetching birthday channel:', error);
    }
}

// Handle slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.member.roles.cache.has(MOD_ROLE_ID)) {
        return interaction.reply({ content: 'You do not have permission to use this command.', flags: 64 });
    }

    const { commandName } = interaction;

 const { SlashCommandBuilder } = require('@discordjs/builders');

// Fetch data from JSONBin
async function fetchData() {
  try {
    const response = await axios.get(BIN_URL, {
      headers: {
        'X-Master-Key': BIN_API_KEY,
      },
    });
    return response.data.record; // Return the 'record' object from JSONBin
  } catch (error) {
    console.error('Error fetching data:', error.response ? error.response.data : error.message);
    throw error; // Throw the error to be caught in the command handler
  }
}

// Update data to JSONBin
async function updateData(newData) {
  try {
    const response = await axios.put(
      BIN_URL,
      { record: newData },
      {
        headers: {
          'X-Master-Key': BIN_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('JSONBin updated:', response.data);
  } catch (error) {
    console.error('Error updating data:', error.response ? error.response.data : error.message);
    throw error; // Throw the error to be caught in the command handler
  }
}

// Example slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('setbirthday')
    .setDescription('Set a birthday for a user (MM/DD format).')
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Birthday (MM/DD)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to set birthday for (default to yourself)')
        .setRequired(false)),

  new SlashCommandBuilder()
    .setName('editbirthday')
    .setDescription('Edit a birthday for a user (MM/DD format).')
    .addStringOption(option =>
      option.setName('date')
        .setDescription('New birthday (MM/DD)')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to edit birthday for (default to yourself)')
        .setRequired(false)),
];

async function executeCommand(interaction) {
  const commandName = interaction.commandName;

  if (commandName === 'setbirthday') {
    const user = interaction.options.getUser('user') || interaction.user;
    const date = interaction.options.getString('date');

    if (!isValidDate(date)) {
      return interaction.reply({ content: 'Invalid date format. Please use MM/DD.', flags: 64 });
    }

    try {
      // Fetch existing data from JSONBin
      const birthdays = await fetchData(); 
      // Set the birthday for the user
      birthdays[user.id] = date; 

      // Update the data to JSONBin
      await updateData(birthdays); 

      return interaction.reply({ content: `Birthday for <@${user.id}> set to ${date}.` });
    } catch (error) {
      console.error('Error saving birthday:', error);
      return interaction.reply({ content: 'Failed to save birthday.', flags: 64 });
    }
  } 
  else if (commandName === 'editbirthday') {
    const user = interaction.options.getUser('user') || interaction.user;
    const date = interaction.options.getString('date');

    if (!isValidDate(date)) {
      return interaction.reply({ content: 'Invalid date format. Please use MM/DD.', flags: 64 });
    }

    try {
      // Fetch existing data from JSONBin
      const birthdays = await fetchData(); 

      if (!birthdays[user.id]) {
        return interaction.reply({ content: `No existing birthday for <@${user.id}>. Use /setbirthday first.`, flags: 64 });
      }

      // Update the birthday for the user
      birthdays[user.id] = date; 

      // Update the data to JSONBin
      await updateData(birthdays); 

      return interaction.reply({ content: `Birthday for <@${user.id}> updated to ${date}.` });
    } catch (error) {
      console.error('Error updating birthday:', error);
      return interaction.reply({ content: 'Failed to update birthday.', flags: 64 });
    }
  }
     else if (commandName === 'allbirthdays') {
        if (Object.keys(birthdays).length === 0) {
            return interaction.reply('No birthdays have been set yet.');
        }
        const embed = new EmbedBuilder()
            .setTitle('All Birthdays')
            .setColor(0x00AE86);
            
        for (const [userId, birthday] of Object.entries(birthdays)) {
            const member = await interaction.guild.members.fetch(userId);
            const username = member ? member.user.username : 'Unknown User';
            embed.addFields({ name: username, value: birthday, inline: true });
        }
        return interaction.reply({ embeds: [embed] });
    }
} 

        // Pronouns menu
        const pronounSelect = new StringSelectMenuBuilder()
            .setCustomId('pronouns_select')
            .setPlaceholder('Choose your pronouns')
            .addOptions([
                { label: 'She/Her', value: 'she/her' },
                { label: 'He/Him', value: 'he/him' },
                { label: 'They/Them', value: 'they/them' },
                { label: 'Other', value: 'other' }
            ]);
        const pronounRow = new ActionRowBuilder().addComponents(pronounSelect);
        const pronounEmbed = new EmbedBuilder()
            .setTitle('**Pronouns -֯⠀ ͚֯  𝅘ྀི𝅥**')
            .setDescription('Choose your pronouns.  ')
            .setColor(0xffffff);

        // Age menu
        const ageSelect = new StringSelectMenuBuilder()
            .setCustomId('age_select')
            .setPlaceholder('Select your age range')
            .addOptions([
                { label: '-17', value: '-17' },
                { label: '18+', value: '18+' }
            ]);
        const ageRow = new ActionRowBuilder().addComponents(ageSelect);
        const ageEmbed = new EmbedBuilder()
            .setTitle('**Age Range 𑇓𝆬   ͙࿐𓈒ْ **')
            .setDescription('Choose your age range.  ')
            .setColor(0xffffff);

        // Pings menu
        const pingSelect = new StringSelectMenuBuilder()
            .setCustomId('pings_select')
            .setPlaceholder('Select ping notifications')
            .addOptions([
                { label: 'Shame', value: 'shame' },
                { label: 'Announcements', value: 'announcements' },
                { label: 'Games', value: 'games' }
            ]);
        const pingRow = new ActionRowBuilder().addComponents(pingSelect);
        const pingEmbed = new EmbedBuilder()
            .setTitle('**Pings *˚⁺‧͙˚◌**')
            .setDescription('Choose recieved ping.  ')
            .setColor(0xffffff);

        // DM Status menu
        const dmSelect = new StringSelectMenuBuilder()
            .setCustomId('dm_select')
            .setPlaceholder('Select DM preference')
            .addOptions([
                { label: 'Ask First', value: 'ask' },
                { label: 'Open to DMs', value: 'open' },
                { label: 'Closed to DMs', value: 'closed' }
            ]);
        const dmRow = new ActionRowBuilder().addComponents(dmSelect);
        const dmEmbed = new EmbedBuilder()
            .setTitle('**DM Status  ೃ❀𓈒**')
            .setDescription('Choose your DM status.')
            .setColor(0xffffff);

        await message.channel.send({ embeds: [pronounEmbed], components: [pronounRow] });
        await message.channel.send({ embeds: [ageEmbed], components: [ageRow] });
        await message.channel.send({ embeds: [pingEmbed], components: [pingRow] });
        await message.channel.send({ embeds: [dmEmbed], components: [dmRow] });
    }
);

// Handle role selections
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    const { customId, values, member } = interaction;
    if (!member || member.user.bot) return;

    const pronounRoles = {
        'she/her': '1243103055956803645',
        'he/him': '1243103190258286624',
        'they/them': '1243103426070446091',
        'other': '1243103632493117522'
    };
    const ageRoles = {
        '-17': '1243117148449275915',
        '18+': '1243117205516849173'
    };
    const pingRoles = {
        'shame': '1243179816115638302',
        'announcements': '1243683983733297182',
        'games': '1243683801369018368'
    };
    const dmRoles = {
        'ask': '1243683324128395297',
        'open': '1243683467762470984',
        'closed': '1243683499748233238'
    };

    const handleRoleUpdate = async (roles, selectedValue) => {
        for (const roleId of Object.values(roles)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
        const selectedRoleId = roles[selectedValue];
        if (selectedRoleId) await member.roles.add(selectedRoleId);
    };

    try {
        if (customId === 'pronouns_select') {
            await handleRoleUpdate(pronounRoles, values[0]);
            return interaction.reply({ content: 'Pronoun role updated.', flags: 64 });
        } 
        else if (customId === 'age_select') {
            await handleRoleUpdate(ageRoles, values[0]);
            return interaction.reply({ content: 'Age role updated.', flags: 64 });
        }
        else if (customId === 'pings_select') {
            await handleRoleUpdate(pingRoles, values[0]);
            return interaction.reply({ content: 'Ping role updated.', flags: 64 });
        }
        else if (customId === 'dm_select') {
            await handleRoleUpdate(dmRoles, values[0]);
            return interaction.reply({ content: 'DM preference updated.', flags: 64 });
        }
    } catch (error) {
        console.error('Error updating roles:', error);
        return interaction.reply({ content: 'There was an error updating your roles.', flags: 64 });
    }
});

// Rules command
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!rules') {
        // Check if the user has the Mod role
        if (!message.member.roles.cache.has(MOD_ROLE_ID)) {
            return message.reply('You do not have permission to use this command.');
        }

        const rulesEmbed = new EmbedBuilder()
            .setTitle('Server Rules')
            .setColor(0xffffff)
            .setDescription('Please follow these rules to maintain a friendly environment:')
            .addFields(
                { name: '1. Be Respectful', value: 'Treat all members with respect and kindness.' },
                { name: '2. No Slurs', value: 'No discrimination, slurs or hate speech.' },
                { name: '3. No NSFW Content', value: 'Keep all content family-friendly, this includes gore.' },
                { name: '4. Use Appropriate Channels', value: 'Post content in relevant channels.' },
                { name: '5. No Insensitive Jokes', value: 'No rape, touching, or etc. jokes.' }
            )
            .setImage('https://i.ibb.co/ccPgdM2K/2025-05-02-0qy-Kleki-1.png');

        message.channel.send({ embeds: [rulesEmbed] });
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;
    const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome!')
        .setDescription(`Welcome to the server, <@${member.id}>!`)
        .setImage('https://i.ibb.co/LhPMG51v/image-2.png')
        .setColor(0xffffff)
        .setTimestamp();
    channel.send({ embeds: [welcomeEmbed] });
});

// Goodbye message
client.on('guildMemberRemove', member => {
    const channel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
    if (!channel) return;
    const goodbyeEmbed = new EmbedBuilder()
        .setTitle('Goodbye!')
        .setDescription(`${member.user.tag} has left the server.`)
        .setImage('https://i.ibb.co/kg4SvLfn/image-3.png')
        .setColor(0xffffff)
        .setTimestamp();
    channel.send({ embeds: [goodbyeEmbed] });
});

// Login to Discord
console.log("TOKEN:", process.env.TOKEN);
client.login(process.env.token);

// birthday stuff
const axios = require('axios');


// Fetch data from JSONBin
async function fetchData() {
  try {
    const response = await axios.get(BIN_URL, {
      headers: {
        'X-Master-Key': BIN_API_KEY
      }
    });
    const data = response.data.record;
    console.log('Fetched data:', data);
  } catch (error) {
    console.error('Error fetching data:', error.response?.data || error.message);
  }
}

// Update data to JSONBin
async function updateData(newData) {
  try {
    const response = await axios.put(
      BIN_URL,
      { record: newData },
      {
        headers: {
          'X-Master-Key': BIN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('JSONBin updated:', response.data);
  } catch (error) {
    console.error('Error updating data:', error.response?.data || error.message);
  }
}

// Example usage
fetchData();

const newBirthdayData = {
  "user1": "2005-09-10",
  "user2": "2004-12-25"
};
updateData(newBirthdayData);
updateData({});
 

// Color role data
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Command for !colorroles
  if (message.content === '!colorroles') {
    // Array of color roles (customize the role names and IDs as needed)
    const colorRoles = [
      { name: 'Red', id: 'role_id_1' },
      { name: 'Green', id: 'role_id_2' },
      { name: 'Blue', id: 'role_id_3' }
      // Add more colors and their role IDs here
    ];

    // Create the embed message
    const embed = new EmbedBuilder()
      .setTitle('🎨 Pick Your Color Role')
      .setDescription(
        colorRoles
          .map((role, i) => `**${i + 1}.** \`\`\`${role.name}\`\`\``)
          .join('\n')
      )
      .setColor('#ffffff');

    // Create buttons for each color role
    const buttons = new ActionRowBuilder().addComponents(
      colorRoles.map((_, i) =>
        new ButtonBuilder()
          .setCustomId(`color_${i}`)
          .setLabel(`${i + 1}`)
          .setStyle(ButtonStyle.Primary)
      )
    );

    // Send the message with buttons
    const msg = await message.channel.send({
      embeds: [embed],
      components: [buttons],
    });

    // Collector to handle button interaction
    const collector = msg.createMessageComponentCollector({
      time: 60000, // Collector time (in ms)
      componentType: 2, // Button type
    });

    // Handle button click events
    collector.on('collect', async (interaction) => {
      // Make sure the interaction is from the message author
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'Only the command user can select a role.',
          ephemeral: true,
        });
      }

      // Extract the color role index from the custom ID
      const index = parseInt(interaction.customId.split('_')[1]);
      const selectedRole = colorRoles[index];

      const member = interaction.member;

      // Remove all color roles the user already has
      const rolesToRemove = colorRoles
        .filter((r) => member.roles.cache.has(r.id))
        .map((r) => r.id);

      try {
        // Remove the old color roles and add the new selected role
        await member.roles.remove(rolesToRemove);
        await member.roles.add(selectedRole.id);
        await interaction.reply({
          content: `You now have the **${selectedRole.name}** role!`,
          ephemeral: true,
        });
      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: 'I couldn’t update your role. Make sure my role is above the color roles!',
          ephemeral: true,
        });
      }
    });

    // Handle the collector timeout event (after 1 minute)
    collector.on('end', () => {
      msg.edit({ components: [] }); // Disable buttons after timeout
    });
  }
});
