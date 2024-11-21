const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upload')
		.setDescription('Upload the Information to AI'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');
	},
};