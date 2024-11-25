module.exports = async (client, interaction) => {
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    } else if (interaction.isStringSelectMenu()) {
        const selectMenu = client.selectMenus.get(interaction.customId);

        if (!selectMenu) {
            console.error(`No select menu matching ${interaction.customId} was found.`);
            return;
        }

        try {
            await selectMenu.execute(interaction);
        } catch (error) {
            console.error(`Error executing select menu ${interaction.customId}:`, error);
            await interaction.reply({ content: 'There was an error while processing your selection!', ephemeral: true });
        }
    } else {
        return;
    }
};
