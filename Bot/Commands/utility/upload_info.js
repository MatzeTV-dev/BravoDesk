const { SlashCommandBuilder } = require('discord.js');
const { upload } = require('../../Database/qdrant.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('upload')
		.setDescription('Upload the Information to your AI')
		.addStringOption(option =>
            option.setName('data')
                .setDescription('A simple sentence to give information to the ai.')
                .setRequired(true),
			),

	async execute(interaction) {
		//await interaction.reply('Setup process started. Creating roles and channels...');

		const roleName = 'KI-Admin';
		const member = interaction.member || message.member;

		const role = member.roles.cache.find(role => role.name === roleName);

		if (role) {
			//await interaction.editReply("Daten werden hochgeladen, dies dauert einen kurzen Moment...");

			upload(interaction.guildId, interaction.options.getString('data'));

			await interaction.editReply("Daten erfolgreich hochgeladen!");
		} else {
			await interaction.reply('Whoops! Looks like you do not have the permisson for that. A Administrator was informed!');
		}

	},
};