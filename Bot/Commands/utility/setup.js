const { SlashCommandBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder  } = require('discord.js');
const { saveServerInformation, chefIfServerExists } = require('../../Database/database.js')
const { channel } = require('diagnostics_channel');
const { gzip } = require('zlib');
const fs = require('fs');

var guildID = "";
var ticketChannelID = "";
var ticketCategoryID = "";
var supportRoleID = "";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setup')
		.setDescription('Starts the automatic setup of the Discord Bot'),
	async execute(interaction) {
		await interaction.reply('Setup process started. Creating roles and channels...');

		try {
			// Call the helper functions for setup

            guildID = interaction.guild.id;
            returnValue = await chefIfServerExists(guildID);

            if (returnValue) {
                await createRoles(interaction);
                await createChannel(interaction);
                await createCategories(interaction);
    
                await saveDatabase(guildID, ticketChannelID, ticketCategoryID, supportRoleID);
                await interaction.editReply('Setup completed successfully!');
            } else {
                await interaction.editReply('Setup already done!')
            }
			

			
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
			const supportRole = await guild.roles.create({
				name: roleData.name,
				color: roleData.color,
				permissions: roleData.permissions,
			});
            supportRoleID = supportRole.id;
			console.log(`${guild.name}: Created role: ${roleData.name}, ${roleData.id}`);
		} else {
			console.log(`${guild.name}: Role already exists: ${roleData.name}, ${roleData.id}`);
		}
	}
}

// Function to create Channels
async function createChannel(interaction) {
    const guild = interaction.guild;

    const channelName = 'Ticket-System';
    let channel = guild.channels.cache.find(channel => channel.name === channelName);

    if (!channel) {
        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Willkommen Im Ticketsystem von ${guild.name}`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [
                        PermissionsBitField.Flags.SendMessages
                    ],    
                },
            ],
        });
        ticketChannelID = channel.id;
        console.log(`${guild.name}: Created channel: ${channel.id}`);
    } else {
        console.log(`${guild.name}: Channel already exists: ${channel.id}`);
    }

    // Load the embed data from JSON
    const embedData = JSON.parse(fs.readFileSync('./Design/Ticket_creation_message.json', 'utf-8'));

    // Prepare the embed payload
    const embeds = embedData.embeds.map(embed => ({
        ...embed,
        color: embed.color || 7049073, // Ensure a default color if not provided
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
				emoji: '📺'
            },
            {
                label: 'Allgemeine Fragen',
                description: 'Haben Sie allgemeine Fragen',
                value: 'general_questions',
				emoji: '❓'
            },
            {
                label: 'Verbesserungsvorschläge',
                description: 'Teilen Sie uns Ihre Vorschläge mit',
                value: 'suggestions',
				emoji: '⭐'
            },
			{
                label: 'Bug Report',
                description: 'Haben Sie ein Fehler gefunden?',
                value: 'bug_report',
				emoji: '👾'
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
        console.log(`${guild.name} Embed sent to channel: ${channel.id}`);
    } catch (error) {
        console.error(`${guild.name} Error sending embed:`, error);
    }
}

// Function to create categories
async function createCategories(interaction) {
    const guild = interaction.guild;
    const categorieName = 'tickets';
    var categorie = null;

    if (!categorie) {
        categorie = await guild.channels.create({
            name: categorieName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [
                        PermissionsBitField.Flags.ViewChannel
                    ],
                    allow: [
                        PermissionsBitField.Flags.SendMessages
                    ]    
                },
            ],
        }); 
        console.log(`${guild.name}: Created categorie: ${categorie.id}`);
        ticketCategoryID = categorie.id;
    } else {
        console.log(`${guild.name}: categorie already exists: ${categorie.id}`);
    }
}

// Function to simulate saving to a database
async function saveDatabase(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID) {
	saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID);
}
