const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Delete Everything form the AI and all channels + roles'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');
	},
};