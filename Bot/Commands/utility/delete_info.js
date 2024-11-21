const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete')
		.setDescription('Delete Information from the AI'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');
	},
};