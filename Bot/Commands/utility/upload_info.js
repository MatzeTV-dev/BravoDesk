const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upload')
		.setDescription('Upload the Information to AI'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');

		const roleName = 'KI-Admin';
		const member = interaction.member || message.member;

		const role = member.roles.cache.find(role => role.name === roleName);

		if (role) {
			console.log(`The user has the role: ${roleName}`);
		} else {
			interaction.reply('Whoops! Looks like you do not have the permisson for that. A Administrator was informed!');
		}

	},
};