const { channel } = require('diagnostics_channel');
const { SlashCommandBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder  } = require('discord.js');
const fs = require('fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Starts the automatic setup of the Discord Bot'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');

		try {
			// Call the helper functions for setup
			await createRoles(interaction);
			await createChannel(interaction);
			//await saveDatabase();

			await interaction.editReply('Setup completed successfully!');
		} catch (error) {
			console.error('Error during setup:', error);
			await interaction.editReply('An error occurred during the setup process. Please try again.');
		}
	},
};

// Function to create roles
async function createRoles(interaction) {
	const guild = interaction.guild;

	const roles = [
		{ 
			name: 'Supporter', 
			color: 'Blue', 
			permissions: [ 
				PermissionsBitField.Flags.ViewChannel, 
				PermissionsBitField.Flags.SendMessages] 
		},
	];

	for (const roleData of roles) {
		const existingRole = guild.roles.cache.find(role => role.name === roleData.name);
		if (!existingRole) {
			await guild.roles.create({
				name: roleData.name,
				color: roleData.color,
				permissions: roleData.permissions,
			});
			console.log(`${guild.id}: Created role: ${roleData.name}, ${roleData.id}`);
		} else {
			console.log(`${guild.id}: Role already exists: ${roleData.name}, ${roleData.id}`);
		}
	}
}

async function createChannel(interaction) {
    const guild = interaction.guild;

    const channelName = 'Ticket-System';
    let channel = guild.channels.cache.find(channel => channel.name === channelName);

    if (!channel) {
        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Willkommen Im Ticketsystem von ${guild.name}`,
        });
        console.log(`${guild.id}: Created channel: ${channel.id}`);
    } else {
        console.log(`${guild.id}: Channel already exists: ${channel.id}`);
    }

    // Load the embed data from JSON
    const embedData = JSON.parse(fs.readFileSync('./Design/Ticket_creation_message.json', 'utf-8'));

    // Prepare the embed payload
    const embeds = embedData.embeds.map(embed => ({
        ...embed,
        color: embed.color || 5763719, // Ensure a default color if not provided
    }));

	    // Create the dropdown menu
		const dropdown = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('Wählen Sie eine Kategorie aus...')
        .addOptions([
            {
                label: 'Technischer Support',
                description: 'Fragen zu technischen Problemen',
                value: 'technical_support',
            },
            {
                label: 'Allgemeine Fragen',
                description: 'Haben Sie allgemeine Fragen',
                value: 'general_questions',
            },
            {
                label: 'Verbesserungsvorschläge',
                description: 'Teilen Sie uns Ihre Vorschläge mit',
                value: 'suggestions',
            },
			{
                label: 'Bug Report',
                description: 'Haben Sie ein Fehler gefunden?',
                value: 'bug_report',
            },
        ]);

	const row = new ActionRowBuilder().addComponents(dropdown);

    try {
        // Send the embed to the channel
        await channel.send({
            content: embedData.content || '',
            embeds: embeds,
            username: embedData.username,
			components: [row],
        });
        console.log(`Embed sent to channel: ${channel.id}`);
    } catch (error) {
        console.error('Error sending embed:', error);
    }
}

// Function to simulate saving to a database
async function saveDatabase() {
	// Simulate saving data to a database
	console.log('Saving data to the database...');
	await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async DB operation
	console.log('Database saved successfully!');
}
