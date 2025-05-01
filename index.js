const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(3000, () => {
  console.log('Express server started');
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
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Get role assignment menus for Pronouns, Age, Pings, and DM status.')
].map(command => command.toJSON());

// When bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await client.application.commands.set(commands);
    checkBirthdays();
    setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
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
        return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    }

    const { commandName } = interaction;

    if (commandName === 'setbirthday') {
        const user = interaction.options.getUser('user') || interaction.user;
        const date = interaction.options.getString('date');
        if (!isValidDate(date)) {
            return interaction.reply({ content: 'Invalid date format. Please use MM/DD.', ephemeral: true });
        }
        birthdays[user.id] = date;
        saveBirthdays();
        return interaction.reply({ content: `Birthday for <@${user.id}> set to ${date}.` });
    } 
    else if (commandName === 'editbirthday') {
        const user = interaction.options.getUser('user') || interaction.user;
        const date = interaction.options.getString('date');
        if (!isValidDate(date)) {
            return interaction.reply({ content: 'Invalid date format. Please use MM/DD.', ephemeral: true });
        }
        if (!birthdays[user.id]) {
            return interaction.reply({ content: `No existing birthday for <@${user.id}>. Use /setbirthday first.`, ephemeral: true });
        }
        birthdays[user.id] = date;
        saveBirthdays();
        return interaction.reply({ content: `Birthday for <@${user.id}> updated to ${date}.` });
    } 
    
    else if (commandName === 'deletecommands') {
        const commandToDelete = interaction.options.getString('command');
        const commands = await client.application.commands.fetch();
        const command = commands.find(cmd => cmd.name === commandToDelete);
        
        if (!command) {
            return interaction.reply({ content: `Command "${commandToDelete}" not found.`, ephemeral: true });
        }

        await client.application.commands.delete(command.id);
        return interaction.reply({ content: `Command "${commandToDelete}" has been deleted.`, ephemeral: true });
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
}); 

// Message command handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!roles') {
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
            .setTitle('Select Pronouns')
            .setDescription('Choose your pronouns from the menu below.')
            .setColor(0x00AE86);

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
            .setTitle('Select Age Range')
            .setDescription('Choose your age range from the menu below.')
            .setColor(0x00AE86);

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
            .setTitle('Select Pings')
            .setDescription('Choose which pings you want to receive.')
            .setColor(0x00AE86);

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
            .setTitle('Select DM Preference')
            .setDescription('Choose your DM preference.')
            .setColor(0x00AE86);

        await message.channel.send({ embeds: [pronounEmbed], components: [pronounRow] });
        await message.channel.send({ embeds: [ageEmbed], components: [ageRow] });
        await message.channel.send({ embeds: [pingEmbed], components: [pingRow] });
        await message.channel.send({ embeds: [dmEmbed], components: [dmRow] });
    }
});

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
            return interaction.reply({ content: 'Pronoun role updated.', ephemeral: true });
        } 
        else if (customId === 'age_select') {
            await handleRoleUpdate(ageRoles, values[0]);
            return interaction.reply({ content: 'Age role updated.', ephemeral: true });
        }
        else if (customId === 'pings_select') {
            await handleRoleUpdate(pingRoles, values[0]);
            return interaction.reply({ content: 'Ping role updated.', ephemeral: true });
        }
        else if (customId === 'dm_select') {
            await handleRoleUpdate(dmRoles, values[0]);
            return interaction.reply({ content: 'DM preference updated.', ephemeral: true });
        }
    } catch (error) {
        console.error('Error updating roles:', error);
        return interaction.reply({ content: 'There was an error updating your roles.', ephemeral: true });
    }
});

// Welcome message
// Rules command
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    if (message.content === '!rules') {
        const rulesEmbed = new EmbedBuilder()
            .setTitle('Server Rules')
            .setColor(0xec635d)
            .setDescription('Please follow these rules to maintain a friendly environment:')
            .addFields(
                { name: '1. Be Respectful', value: 'Treat all members with respect and kindness.' },
                { name: '2. No Slurs', value: ' No discrimination, slurs or hate speech.' },
                { name: '3. No NSFW Content', value: 'Keep all content family-friendly, this includes gore.' },
                { name: '4. Use Appropriate Channels', value: 'Post content in relevant channels.' },
                { name: '5. No Insensitive Jokes', value: 'no rape, touching, or etc. jokes' }
            )
            .setImage('https://i.ibb.co/QSmLh9k/2025-05-01-0t0-Kleki-1.png') // Replace with your image URL
            .setTimestamp();
            
        message.channel.send({ embeds: [rulesEmbed] });
    }
});

client.on('guildMemberAdd', member => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;
    const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome!')
        .setDescription(`Welcome to the server, <@${member.id}>!`)
        .setColor(0x00AE86)
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
        .setColor(0xFF0000)
        .setTimestamp();
    channel.send({ embeds: [goodbyeEmbed] });
});

// Login to Discord
client.login(process.env.token);
