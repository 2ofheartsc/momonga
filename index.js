// Import necessary classes from discord.js
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Role ID for mods (who can use commands)
const MOD_ROLE_ID = '1235976846718402560';

// Channel IDs
const BIRTHDAY_CHANNEL_ID = '1226880047198113843';
const WELCOME_CHANNEL_ID = '1236679858332106782';
const GOODBYE_CHANNEL_ID = '1236686717294219275';

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
    // Regex for MM/DD, 1 or 2 digits for month/day
    const regex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/;
    if (!regex.test(input)) return false;
    const [month, day] = input.split('/').map(Number);
    if (month === 2 && day > 29) return false;
    if ([4,6,9,11].includes(month) && day > 30) return false;
    return true;
}

// Create slash commands using SlashCommandBuilder
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
        .setDescription('Delete all slash commands (use with caution).'),
    new SlashCommandBuilder()
        .setName('roles')
        .setDescription('Get role assignment menus for Pronouns, Age, Pings, and DM status.')
].map(command => command.toJSON());

// When bot is ready
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    // Register slash commands globally
    await client.application.commands.set(commands);

    // Check birthdays now and then every 24h
    checkBirthdays();
    setInterval(checkBirthdays, 24 * 60 * 60 * 1000);
});

// Function to check birthdays and send birthday message
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

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // Restrict to mods
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
    else if (commandName === 'allbirthdays') {
        if (Object.keys(birthdays).length === 0) {
            return interaction.reply('No birthdays have been set yet.');
        }
        const embed = new EmbedBuilder()
            .setTitle('All Birthdays')
            .setColor(0x00AE86);
        for (const [userId, birthday] of Object.entries(birthdays)) {
            embed.addFields({ name: `<@${userId}>`, value: birthday, inline: true });
        }
        return interaction.reply({ embeds: [embed] });
    } 
    else if (commandName === 'deletecommands') {
        await client.application.commands.set([]);
        return interaction.reply('All slash commands have been deleted.');
    } 
    else if (commandName === 'roles') {
        // Define role IDs for each option (replace with your actual role IDs)
        const pronounRoles = {
            he_him: 'ROLE_ID_HE_HIM',
            she_her: 'ROLE_ID_SHE_HER',
            they_them: 'ROLE_ID_THEY_THEM'
        };
        const ageRoles = {
            '13-17': 'ROLE_ID_13_17',
            '18-24': 'ROLE_ID_18_24',
            '25+': 'ROLE_ID_25_PLUS'
        };
        const pingRoles = {
            events: 'ROLE_ID_EVENTS',
            announcements: 'ROLE_ID_ANNOUNCEMENTS',
            off: 'ROLE_ID_PINGS_OFF'
        };
        const dmRoles = {
            open: 'ROLE_ID_DM_OPEN',
            closed: 'ROLE_ID_DM_CLOSED'
        };

        // Pronouns menu
        const pronounSelect = new StringSelectMenuBuilder()
            .setCustomId('pronouns_select')
            .setPlaceholder('Choose your pronouns')
            .addOptions([
                { label: 'He/Him', description: 'Assign yourself He/Him role', value: 'he_him' },
                { label: 'She/Her', description: 'Assign yourself She/Her role', value: 'she_her' },
                { label: 'They/Them', description: 'Assign yourself They/Them role', value: 'they_them' }
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
                { label: '13-17', description: 'Assign age 13-17 role', value: '13-17' },
                { label: '18-24', description: 'Assign age 18-24 role', value: '18-24' },
                { label: '25+', description: 'Assign age 25+ role', value: '25+' }
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
                { label: 'Events', description: 'Get event pings', value: 'events' },
                { label: 'Announcements', description: 'Get announcement pings', value: 'announcements' },
                { label: 'Off', description: 'Disable pings', value: 'off' }
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
                { label: 'Open to DMs', description: 'Allow direct messages from members', value: 'open' },
                { label: 'Closed to DMs', description: 'Do not allow direct messages', value: 'closed' }
            ]);
        const dmRow = new ActionRowBuilder().addComponents(dmSelect);
        const dmEmbed = new EmbedBuilder()
            .setTitle('Select DM Preference')
            .setDescription('Choose whether you are open to direct messages.')
            .setColor(0x00AE86);

        // Send embeds with the corresponding select menus
        await interaction.reply({ embeds: [pronounEmbed], components: [pronounRow] });
        await interaction.followUp({ embeds: [ageEmbed], components: [ageRow] });
        await interaction.followUp({ embeds: [pingEmbed], components: [pingRow] });
        await interaction.followUp({ embeds: [dmEmbed], components: [dmRow] });
    }
});

// Handle select menu interactions for role assignment
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    const { customId, values, member } = interaction;
    if (!member || member.user.bot) return;

    // Define role mappings (same IDs as above, replace with actual role IDs)
    const pronounRoles = {
        he_him: 'ROLE_ID_HE_HIM',
        she_her: 'ROLE_ID_SHE_HER',
        they_them: 'ROLE_ID_THEY_THEM'
    };
    const ageRoles = {
        '13-17': 'ROLE_ID_13_17',
        '18-24': 'ROLE_ID_18_24',
        '25+': 'ROLE_ID_25_PLUS'
    };
    const pingRoles = {
        events: 'ROLE_ID_EVENTS',
        announcements: 'ROLE_ID_ANNOUNCEMENTS',
        off: 'ROLE_ID_PINGS_OFF'
    };
    const dmRoles = {
        open: 'ROLE_ID_DM_OPEN',
        closed: 'ROLE_ID_DM_CLOSED'
    };

    if (customId === 'pronouns_select') {
        // Remove all pronoun roles then add the new one
        for (const roleId of Object.values(pronounRoles)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
        const selectedRoleId = pronounRoles[values[0]];
        if (selectedRoleId) await member.roles.add(selectedRoleId);
        return interaction.reply({ content: 'Pronoun role updated.', ephemeral: true });
    } 
    else if (customId === 'age_select') {
        for (const roleId of Object.values(ageRoles)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
        const selectedAgeRoleId = ageRoles[values[0]];
        if (selectedAgeRoleId) await member.roles.add(selectedAgeRoleId);
        return interaction.reply({ content: 'Age role updated.', ephemeral: true });
    } 
    else if (customId === 'pings_select') {
        for (const roleId of Object.values(pingRoles)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
        const selectedPingRoleId = pingRoles[values[0]];
        if (selectedPingRoleId) await member.roles.add(selectedPingRoleId);
        return interaction.reply({ content: 'Ping roles updated.', ephemeral: true });
    } 
    else if (customId === 'dm_select') {
        for (const roleId of Object.values(dmRoles)) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId);
            }
        }
        const selectedDmRoleId = dmRoles[values[0]];
        if (selectedDmRoleId) await member.roles.add(selectedDmRoleId);
        return interaction.reply({ content: 'DM preference updated.', ephemeral: true });
    }
});

// Welcome new members
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

// Goodbye members
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

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
