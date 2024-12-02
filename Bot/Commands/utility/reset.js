const { SlashCommandBuilder } = require('discord.js');

var guild = null;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Delete Everything form the AI and all channels + roles'),
	async execute(interaction) {
		guild = interaction.guild;

		await interaction.reply('Setup process started. Creating roles and channels...');

		try {

			if(guild.ownerId === interaction.user.id) {
				
			} else {
				interaction.editReply("This Action can only performed by the Server Owner!");
			}

		} catch (error) {

		}
	},
};