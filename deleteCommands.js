const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Make sure your .env has token and clientId

const rest = new REST({ version: '10' }).setToken(process.env.token);

async function deleteRolesCommand() {
  try {
    console.log('Fetching all application commands...');
    const commands = await rest.get(
      Routes.applicationCommands(process.env.clientId)
    );

    const rolesCommands = commands.filter(cmd => cmd.name === 'roles');

    if (rolesCommands.length === 0) {
      console.log('No /roles command found.');
      return;
    }

    for (const command of rolesCommands) {
      console.log(`Deleting "/roles" (ID: ${command.id})...`);
      await rest.delete(
        Routes.applicationCommand(process.env.clientId, command.id)
      );
    }

    console.log('Deleted all "/roles" commands!');
  } catch (error) {
    console.error(error);
  }
}

deleteRolesCommand();
