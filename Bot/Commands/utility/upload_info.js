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

			const string = interaction.options.getString('data');
			const checkArray = string.split(" ");

			if (checkArray.length > 10) {
				interaction.reply("Das Maximale Wort Limit ist 10");
			} else {
				await interaction.reply("Daten werden hochgeladen, dies dauert einen kurzen Moment...");

				await upload(interaction.guildId, interaction.options.getString('data'));
	
				await interaction.editReply("Daten erfolgreich hochgeladen!");
			}
		} else {
			await interaction.reply({
				content: 'Whoops! Looks like you do not have the permisson for that. A Administrator was informed!',
				ephemeral: true,
			});
		}

	},
};