const { SlashCommandBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { activateKey, checkKeyActivated, checkKeyValidity, checkKeyExists, CheckDiscordIDWithKey, } = require('../../helper/keyHelper.js');
const { saveServerInformation, chefIfServerExists } = require('../../Database/database.js');
const { error, success, warning, info } = require('../../helper/embedHelper.js');
const { generateCollection } = require('../../Database/qdrant.js');
const Logger = require('../../helper/loggerHelper.js');
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
        .setDescription('Startet den automatischen setup Prozess.')
        .addStringOption((option) =>
            option
                .setName('key')
                .setDescription('Fügen Sie Ihren Aktivierungsschlüssel ein.')
                .setRequired(true)
        ),
    async execute(interaction) {

        await interaction.deferReply({ ephemeral: true });

        guild = interaction.guild;

        try {

            if(guild.ownerId !== interaction.user.id) {
                await interaction.editReply({
                    embeds: [error('Error!', 'This Action is only allowed by the Server Owner!')]
                });

                // Optional: Benachrichtigung an Administratoren
                const adminChannel = guild.channels.cache.find((channel) => channel.name === 'admin-log');
                if(adminChannel) {
                    await adminChannel.send(
                        `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/setup\` ohne Berechtigung auszuführen.`
                    );
                }
                return;
            }

            var result = await checkKeyExists(interaction.options.getString('key'));
            if(!result.exists_in_keys) {

                await interaction.editReply({
                    embeds: [error('Key existence', 'The key does not exists.')]
                });

                return;
            }

            var result = await checkKeyActivated(interaction.options.getString('key'));

            if(!result.is_activated) {
                await activateKey(interaction.options.getString('key'), guild.id);

                await interaction.editReply({
                    embeds: [success('Key activated', 'The key has been activated.')]
                });
            }

            var result = await checkKeyValidity(interaction.options.getString('key'));

            if(!result.is_valid) {
                await interaction.editReply({
                    embeds: [error('Key Expired', 'The key has expired.')]
                });

                return;
            }

            const isMatch = await CheckDiscordIDWithKey(interaction.options.getString('key'), guild.id);

            if(!isMatch.IsMatch) {
                await interaction.editReply({
                    embeds: [error('Key mismatch!', 'The Key does not match the server it was activated originally.')]
                });

                return;
            }

            await interaction.editReply({
                embeds: [info('Setup Process!', 'Setup process started. Creating roles and channels...')]
            });

            guildID = guild.id;
            const returnValue = await chefIfServerExists(guildID);

            if(returnValue) {
                // Erstelle Rollen, Kanäle und Kategorien
                await createRoles(interaction);
                await createChannel(interaction);
                await createCategories(interaction);
                await generateCollection("guild_" + interaction.guild.id);
                
                // Speichere in der Datenbank
                await saveDatabase(guildID, ticketChannelID, ticketCategoryID, supportRoleID, kiadminRoleID);

                await interaction.editReply({
                    embeds: [info('Setup Process!', 'Setup completed successfully!')]
                });
            } else {
                await interaction.editReply({
                    embeds: [warning('Setup Process!', 'Setup already completed!')]
                });
            }
        } catch (error) {
            Logger.error(`Error during setup: ${error.message}\n${error.stack}`);

            // Rollback bei Fehlern
            await rollbackSetup(interaction);

            await interaction.editReply({
                embeds: [error('Setup Process!', 'An error occurred during the setup process. Please try again.')]
            });
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
        if(!existingRole) {
            const createdRole = await guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                permissions: roleData.permissions,
            });

            Logger.success(`${guild.name}: Created role: ${roleData.name}`);

            if(roleData.name === 'Supporter') {
                supportRoleID = createdRole.id;
            } else if(roleData.name === 'KI-Admin') {
                kiadminRoleID = createdRole.id;
            }
        } else {
            Logger.info(`${guild.name}: Role already exists: ${roleData.name}`);
            if(roleData.name === 'Supporter') {
                supportRoleID = existingRole.id;
            } else if(roleData.name === 'KI-Admin') {
                kiadminRoleID = existingRole.id;
            }
        }
    }
}

// Funktion: Kanäle erstellen
async function createChannel(interaction) {
    const channelName = 'Ticket-System';
    let channel = guild.channels.cache.find((channel) => channel.name === channelName);

    if(!channel) {
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
        Logger.success(`${guild.name}: Created channel: ${channel.id}`);
    } else {
        Logger.info(`${guild.name}: Channel already exists: ${channel.id}`);
    }

    // Lese Embed-Daten aus JSON
    embedData = JSON.parse(fs.readFileSync('./Design/Ticket_creation_message.json', 'utf-8'));

    embeds = embedData.embeds.map((embed) => ({
        ...embed,
        color: embed.color || 7049073,
    }));

    // Dropdown-Menü erstellen
    const dropdown = new StringSelectMenuBuilder()
        .setCustomId('create_ticket_ticket_category')
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
        Logger.success(`${guild.name}: Embed sent to channel: ${channel.id}`);
    } catch (error) {
        Logger.error(`${guild.name}: Error sending embed: ${error.message}\n${error.stack}`);
    }
}

// Funktion: Kategorien erstellen
async function createCategories(interaction) {
    const guild = interaction.guild;
    const categoryName = 'tickets';
    let category = guild.channels.cache.find(
        (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
    );

    if(!category) {
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
        Logger.success(`${guild.name}: Created category: ${category.id}`);
    } else {
        Logger.info(`${guild.name}: Category already exists: ${category.id}`);
    }
}

// Funktion: Rollback bei Fehlern
async function rollbackSetup(interaction) {
    try {
        const guild = interaction.guild;

        // Löschen des Ticket-Kanals
        if(ticketChannelID) {
            const channel = guild.channels.cache.get(ticketChannelID);
            if(channel) await channel.delete();
        }

        // Löschen der Ticket-Kategorie
        if(ticketCategoryID) {
            const category = guild.channels.cache.get(ticketCategoryID);
            if(category) await category.delete();
        }

        // Löschen der Rollen
        if(supportRoleID) {
            const role = guild.roles.cache.get(supportRoleID);
            if(role) await role.delete();
        }

        if(kiadminRoleID) {
            const role = guild.roles.cache.get(kiadminRoleID);
            if(role) await role.delete();
        }

        Logger.info('Rollback completed successfully.');
    } catch (error) {
        Logger.error(`Error during rollback: ${error.message}\n${error.stack}`);
    }
}

// Funktion: Datenbank speichern
async function saveDatabase(server_id, ticket_system_channel_id, ticket_category_id, support_role_id, kiadmin_role_id) {
    try {
        await saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_id, kiadmin_role_id);
        Logger.success(`Database saved for server ID: ${server_id}`);
    } catch (error) {
        Logger.error(`Error saving to database: ${error.message}\n${error.stack}`);
    }
}
