const { getServerInformation, Delete } = require('../../Database/database.js');
const { SlashCommandBuilder } = require('discord.js');
const { deleteAll } = require('../../Database/qdrant.js');

var guild = null;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('reset')
		.setDescription('Delete Everything form the AI and all channels + roles'),
	async execute(interaction) {
		guild = interaction.guild;

		await interaction.reply('Deleting everything in progress...');

		try {

			if(guild.ownerId === interaction.user.id) {
				const rawData = await getServerInformation(guild.id);
				const data = rawData[0][0][0];

				const category = guild.channels.cache.get(data.ticket_category_id);
				const channel = guild.channels.cache.get(data.ticket_system_channel_id);
				let role = guild.roles.cache.get(data.support_role_id);

				if (channel) {
					await channel.delete();
					console.log(`Deleted channel with ID: ${data.ticket_system_channel_id}`);
				} else {
					console.log(`Channel with ID ${data.ticket_system_channel_id} not found.`);
				}
				
				if (category) {
					await category.delete();
					console.log(`Deleted category with ID: ${data.ticket_category_id}`);
				} else {
					console.log(`Category with ID ${data.ticket_category_id} not found or is not a category.`);
				}
	
				if (role) {
					await role.delete();
					console.log(`Deleted role with ID: ${data.support_role_id}`);
				} else {
					console.log(`Role with ID ${data.support_role_id} not found.`);
				}
	
				role = guild.roles.cache.get(data.kiadmin_role_id);
				if (role) {
					await role.delete();
					console.log(`Deleted role with ID: ${data.kiadmin_role_id}`);
				} else {
					console.log(`Role with ID ${data.kiadmin_role_id} not found.`);
				}
				interaction.editReply("Deleting Database Information");
				await Delete("CALL Delete_Server_Information(?)", guild.id);

				interaction.editReply("Deleting AI Knowledge.");
				await deleteAll("guild_" + guild.id);

				interaction.editReply("Everything got deleted!");
			} else {
				await interaction.reply({
					content: 'This Action can only performed by the Server Owner! A Administrator was informed about your Actions.',
					ephemeral: true,
				});
			}

		} catch (error) {
			console.log("error:", error)
		}
	},
};