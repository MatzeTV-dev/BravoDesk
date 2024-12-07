const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('commands')
		.setDescription('Delete Information from the AI'),
	async execute(interaction) {

		const roleName = 'KI-Admin';
		const member = interaction.member || message.member;

		const role = member.roles.cache.find(role => role.name === roleName);

		if (role) {
			await interaction.deferReply();

			const embed = await new EmbedBuilder()
                    .setTitle('**Command List**')
                    .addFields(
                        { name: '**/list**', value: "Anzeigen aller Daten im AI Wissens speicher" },
                        { name: '**/reset**', value: "Alles wird gelöscht und auf anfang Gesetzt" },
						{ name: '**/setup**', value: "Initialer Setup" },
						{ name: '**/upload**', value: "Daten in das AI wissen eintragen" },
                    )
                    .setColor(0x00AE86);

			await interaction.followUp({
				embeds: [embed]
			});

		} else {
			await interaction.reply({
				content: 'Whoops! Looks like you do not have the permisson for that. A Administrator was informed!',
				ephemeral: true,
			});
		}
	},
};