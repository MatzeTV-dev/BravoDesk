import { PermissionsBitField, ChannelType } from 'discord.js';
import { executeQuery } from '../Database/database.js';
import Logger from '../helper/loggerHelper.js';

/**
 * Aktualisiert oder erstellt die Support-Rolle für eine Guild.
 * Wenn die Rolle nicht existiert, wird sie erstellt und die ID in der Datenbank gespeichert.
 * @async
 * @param {import('discord.js').Guild} guild - Das Guild-Objekt.
 * @returns {Promise<import('discord.js').Role|undefined>} Die erstellte oder gefundene Rolle, oder undefined bei einem Fehler.
 */
async function updateSupportRoleID(guild) {
    try {
        Logger.error('Support-Rolle nicht gefunden.');

        const supporterRole = await guild.roles.create({
            name: "Supporter",
            color: "Blue",
            permissions: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            ],
        });
        
        try {
            await executeQuery("UPDATE server_information SET support_role_id = ? WHERE discord_server_id = ?;", [supporterRole.id, guild.id]);
        } catch (error) {
            Logger.error(`Error beim aktualisieren von der supporter rollen ID ${error.message, error.stack}`);
        }
        Logger.success(`Supporter Rolle für Server ID ${guild.id} aktualisiert`);

        return supporterRole;
    } catch ( error ) {
        Logger.error(`Error beim aktualisieren vom aktualisieren der Support Rolle im Server mit der ID ${guild.id, error, error.stack}`)
    }
}

/**
 * Aktualisiert oder erstellt die KI-Admin-Rolle für eine Guild.
 * Wenn die Rolle nicht existiert, wird sie erstellt und die ID in der Datenbank gespeichert.
 * @async
 * @param {import('discord.js').Guild} guild - Das Guild-Objekt.
 * @returns {Promise<import('discord.js').Role|undefined>} Die erstellte oder gefundene Rolle, oder undefined bei einem Fehler.
 */
async function updateKiAdminID(guild) {
    Logger.error('KI-Admin Rolle nicht gefunden.');

    const adminRole = await guild.roles.create({
        name: "KI-Admin",
        color: "Grey",
    });
        
    try {
        await executeQuery("UPDATE server_information SET kiadmin_role_id = ? WHERE discord_server_id = ?;", [adminRole.id, guild.id]);
    } catch (error) {
        Logger.error(`Error beim aktualisieren von der KI Admin rollen ID ${error.message, error.stack}`);
    }
    Logger.success(`KI Admin Rolle für Server ID ${guild.id} aktualisiert`);
    return adminRole;
}

/**
 * Aktualisiert oder erstellt die Ticket-Kategorie (Channel-Kategorie) für eine Guild.
 * Wenn die Kategorie nicht existiert, wird sie erstellt und die ID in der Datenbank gespeichert.
 * @async
 * @param {import('discord.js').Guild} guild - Das Guild-Objekt.
 * @returns {Promise<import('discord.js').CategoryChannel|undefined>} Die erstellte oder gefundene Kategorie, oder undefined bei einem Fehler.
 */
async function updateTicketCategoryID(guild) {
    Logger.error('Ticket Kategorie nicht gefunden.');

    const category = await guild.channels.create({
        name: "tickets",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: guild.members.me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ],
      });
        
    try {
        await executeQuery("UPDATE server_information SET ticket_category_id = ? WHERE discord_server_id = ?;", [category.id, guild.id]);
    } catch (error) {
        Logger.error(`Error beim aktualisieren von der Ticket Category ID ${error.message, error.stack}`);
    }
    Logger.success(`Ticket Category ID für Server ID ${guild.id} aktualisiert`);
    return category;
}

/**
 * Aktualisiert oder erstellt die Archiv-Kategorie (Channel-Kategorie) für eine Guild.
 * Wenn die Kategorie nicht existiert, wird sie erstellt und die ID in der Datenbank gespeichert.
 * @async
 * @param {import('discord.js').Guild} guild - Das Guild-Objekt.
 * @returns {Promise<import('discord.js').CategoryChannel|undefined>} Die erstellte oder gefundene Kategorie, oder undefined bei einem Fehler.
 */
async function updateArchivCategoryID(guild) {
    Logger.error('Archiv Kategorie nicht gefunden.');
    let archiv = null;
    try {    
        archiv = await guild.channels.create({
        name: "archiv",
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
            },
                {
                    id: guild.members.me.id,
                    allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.EmbedLinks,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    ],
                },
            ],
        });
    } catch (error) {
        Logger.error(`Error beim aktualisieren von der Archiv Cateogry ID beim erstellen der Kategorie ${error.message, error.stack}`)
    }

    try {
        await executeQuery("UPDATE server_information SET ticket_archiv_category_id = ? WHERE discord_server_id = ?;", [archiv.id, guild.id]);
    } catch (error) {
        Logger.error(`Error beim aktualisieren von der Archiv Cateogry ID ${error.message, error.stack}`);
    }
    Logger.success(`Archiv Category ID Rolle für Server ID ${guild.id} aktualisiert`);
    return archiv;
}

/**
 * Aktualisiert oder erstellt den Ticket-System-Kanal für eine Guild.
 * Wenn der Kanal nicht existiert, wird er erstellt und die ID in der Datenbank gespeichert.
 * @async
 * @param {import('discord.js').Guild} guild - Das Guild-Objekt.
 * @returns {Promise<import('discord.js').TextChannel|undefined>} Der erstellte oder gefundene Kanal, oder undefined bei einem Fehler.
 */
async function updateTicketSystemChannelID(guild) {
    Logger.error('Ticket System Channel nicht gefunden.');

    channel = await guild.channels.create({
        name: "ticket-system",
        type: ChannelType.GuildText,
        topic: `Willkommen im Ticketsystem von ${guild.name}`,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.SendMessages],
          },
          {
            id: guild.members.me.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.EmbedLinks,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
        ],
      });

    try {
        await executeQuery("UPDATE server_information SET ticket_system_channel_id = ? WHERE discord_server_id = ?;", [archiv.id, guild.id]);
    } catch (error) {
        Logger.error(`Error beim aktualisieren von der Ticket System Channel ID ${error.message, error.stack}`);
    }
    Logger.success(`Ticket System Channel ID Rolle für Server ID ${guild.id} aktualisiert`);
    return channel; // Korrigiert: sollte channel zurückgeben, nicht category
}

export { updateSupportRoleID, updateKiAdminID, updateTicketCategoryID, updateTicketSystemChannelID, updateArchivCategoryID}