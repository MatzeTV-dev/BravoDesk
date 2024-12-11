const { SlashCommandBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { saveServerInformation, chefIfServerExists } = require('../../Database/database.js');
const { activateKey, CheckKeyStatus} = require('../../helper/activationHelper.js');
const fs = require('fs');

var guild = null;
var guildID = '';
var ticketChannelID = '';
var ticketCategoryID = '';
var supportRoleID = '';
var kiadminRoleID = '';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Starts the automatic setup of the Discord Bot')
        .addStringOption((option) =>
            option
                .setName('key')
                .setDescription('Fügen Sie Ihren Aktivierungsschlüssel ein.')
                .setRequired(true)
        ),
    async execute(interaction) {

        await interaction.deferReply();

        guild = interaction.guild;

        try {
            var result = await CheckKeyStatus(interaction.options.getString('key'));

            if(!result.exists_in_keys) {

                await interaction.editReply({
                    content: 'The Key is not valid.',
                    ephemeral: true,
                });
                return;
            } 
            
            if(!result.is_valid) {

                await interaction.editReply({
                    content: 'The Key is no longer active.',
                    ephemeral: true,
                })
            }

            if(!result.is_activated) {
                await activateKey(interaction.options.getString('key'), guild.id);
            }

            if (guild.ownerId !== interaction.user.id) {
                await interaction.editReply({
                    content: 'This action can only be performed by the server owner! An administrator has been informed.',
                    ephemeral: true,
                });

                // Optional: Benachrichtigung an Administratoren
                const adminChannel = guild.channels.cache.find((channel) => channel.name === 'admin-log');
                if (adminChannel) {
                    await adminChannel.send(
                        `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/setup\` ohne Berechtigung auszuführen.`
                    );
                }
                return;
            }

            await interaction.editReply({
                content: 'Setup process started. Creating roles and channels...',
                ephemeral: true,
            });

            guildID = guild.id;
            const returnValue = await chefIfServerExists(guildID);

            if (returnValue) {
                // Erstelle Rollen, Kanäle und Kategorien
                await createRoles(interaction);
                await createChannel(interaction);
                await createCategories(interaction);

                // Speichere in der Datenbank
                await saveDatabase(guildID, ticketChannelID, ticketCategoryID, supportRoleID, kiadminRoleID);
                await interaction.editReply('Setup completed successfully!');
            } else {
                await interaction.editReply('Setup already completed!');
            }
        } catch (error) {
            console.error('Error during setup:', error);

            // Rollback bei Fehlern
            await rollbackSetup(interaction);

            await interaction.editReply('An error occurred during the setup process. Please try again.');
        }
    },
};

// Funktion: Rollen erstellen
async function createRoles(interaction) {
    const guild = interaction.guild;
    const roles = [
        {
            name: 'Supporter',
            color: 'Blue',
            permissions: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
            ],
        },
        {
            name: 'KI-Admin',
            color: 'Grey',
        },
    ];

    for (const roleData of roles) {
        const existingRole = guild.roles.cache.find((role) => role.name === roleData.name);
        if (!existingRole) {
            const createdRole = await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
            });

            console.log(`${guild.name}: Created role: ${roleData.name}`);

            if (roleData.name === 'Supporter') {
                supportRoleID = createdRole.id;
            } else if (roleData.name === 'KI-Admin') {
                kiadminRoleID = createdRole.id;
            }
        } else {
            console.log(`${guild.name}: Role already exists: ${roleData.name}`);
            if (roleData.name === 'Supporter') {
                supportRoleID = existingRole.id;
            } else if (roleData.name === 'KI-Admin') {
                kiadminRoleID = existingRole.id;
            }
        }
    }
}

// Funktion: Kanäle erstellen
async function createChannel(interaction) {
    const channelName = 'Ticket-System';
    let channel = guild.channels.cache.find((channel) => channel.name === channelName);

    if (!channel) {
        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            topic: `Willkommen im Ticketsystem von ${guild.name}`,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
        ticketChannelID = channel.id;
        console.log(`${guild.name}: Created channel: ${channel.id}`);
    } else {
        console.log(`${guild.name}: Channel already exists: ${channel.id}`);
    }

    // Lese Embed-Daten aus JSON
    const embedData = JSON.parse(fs.readFileSync('./Design/Ticket_creation_message.json', 'utf-8'));

    const embeds = embedData.embeds.map((embed) => ({
        ...embed,
        color: embed.color || 7049073,
    }));

    // Dropdown-Menü erstellen
    const dropdown = new StringSelectMenuBuilder()
        .setCustomId('ticket_category')
        .setPlaceholder('Wählen Sie eine Kategorie aus...')
        .addOptions([
            {
                label: 'Technischer Support',
                description: 'Fragen zu technischen Problemen',
                value: 'technical_support',
                emoji: '📺',
            },
            {
                label: 'Allgemeine Fragen',
                description: 'Haben Sie allgemeine Fragen?',
                value: 'general_questions',
                emoji: '❓',
            },
            {
                label: 'Verbesserungsvorschläge',
                description: 'Teilen Sie uns Ihre Vorschläge mit',
                value: 'suggestions',
                emoji: '⭐',
            },
            {
                label: 'Bug Report',
                description: 'Haben Sie einen Fehler gefunden?',
                value: 'bug_report',
                emoji: '👾',
            },
        ]);

    const row = new ActionRowBuilder().addComponents(dropdown);

    try {
        await channel.send({
            content: embedData.content || '',
            embeds,
            components: [row],
        });
        console.log(`${guild.name}: Embed sent to channel: ${channel.id}`);
    } catch (error) {
        console.error(`${guild.name}: Error sending embed:`, error);
    }
}

// Funktion: Kategorien erstellen
async function createCategories(interaction) {
    const guild = interaction.guild;
    const categoryName = 'tickets';
    let category = guild.channels.cache.find(
        (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    );

    if (!category) {
        category = await guild.channels.create({
            name: categoryName,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });
        ticketCategoryID = category.id;
        console.log(`${guild.name}: Created category: ${category.id}`);
    } else {
        console.log(`${guild.name}: Category already exists: ${category.id}`);
    }
}

// Funktion: Rollback bei Fehlern
async function rollbackSetup(interaction) {
    try {
        const guild = interaction.guild;

        // Löschen des Ticket-Kanals
        if (ticketChannelID) {
            const channel = guild.channels.cache.get(ticketChannelID);
            if (channel) await channel.delete();
        }

        // Löschen der Ticket-Kategorie
        if (ticketCategoryID) {
            const category = guild.channels.cache.get(ticketCategoryID);
            if (category) await category.delete();
        }

        // Löschen der Rollen
        if (supportRoleID) {
            const role = guild.roles.cache.get(supportRoleID);
            if (role) await role.delete();
        }

        if (kiadminRoleID) {
            const role = guild.roles.cache.get(kiadminRoleID);
            if (role) await role.delete();
        }

        console.log('Rollback completed successfully.');
    } catch (error) {
        console.error('Error during rollback:', error);
    }
}

// Funktion: Datenbank speichern
async function saveDatabase(server_id, ticket_system_channel_id, ticket_category_id, support_role_id, kiadmin_role_id) {
    try {
        await saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_id, kiadmin_role_id);
        console.log(`Database saved for server ID: ${server_id}`);
    } catch (error) {
        console.error('Error saving to database:', error);
    }
}
