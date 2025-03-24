import { SlashCommandBuilder, PermissionsBitField, ChannelType, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { activateKey, checkKeyActivated, checkKeyValidity, checkKeyExists, CheckDiscordIDWithKey } from '../../helper/keyHelper.js';
import { saveServerInformation, chefIfServerExists } from '../../Database/database.js';
import { error, success, warning, info } from '../../helper/embedHelper.js';
import { generateCollection } from '../../Database/qdrant.js';
import Logger from '../../helper/loggerHelper.js';
import fs from 'fs';
  
// Globale Variablen, um IDs während des Setups zu speichern
let guild = null;
let guildID = '';
let ticketChannelID = '';
let ticketCategoryID = '';
let supportRoleID = '';
let ticketArchivCategoryID = '';
let kiadminRoleID = '';
  
  export default {
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
        if (guild.ownerId !== interaction.user.id) {
          await interaction.editReply({
            embeds: [error('Error!', 'This Action is only allowed by the Server Owner!')]
          });
  
          const adminChannel = guild.channels.cache.find((channel) => channel.name === 'admin-log');
          if (adminChannel) {
            await adminChannel.send(
              `⚠️ Benutzer ${interaction.user.tag} hat versucht, den Befehl \`/setup\` ohne Berechtigung auszuführen.`
            );
          }
          return;
        }
  
        let result = await checkKeyExists(interaction.options.getString('key'));
        if (!result.exists_in_keys) {
          await interaction.editReply({
            embeds: [error('Key existence', 'The key does not exist.')]
          });
          return;
        }
  
        result = await checkKeyActivated(interaction.options.getString('key'));
        if (!result.is_activated) {
          await activateKey(interaction.options.getString('key'), guild.id);
          await interaction.editReply({
            embeds: [success('Key activated', 'The key has been activated.')]
          });
        }
  
        result = await checkKeyValidity(interaction.options.getString('key'));
        if (!result.is_valid) {
          await interaction.editReply({
            embeds: [error('Key Expired', 'The key has expired.')]
          });
          return;
        }
  
        // ─── AGBs & Datenschutzerklärung Abfrage ─────────────────────────────
        const agbsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('accept_agbs')
            .setLabel('AGBs & Datenschutz akzeptieren')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('decline_agbs')
            .setLabel('Ablehnen')
            .setStyle(ButtonStyle.Secondary)
        );
  
        await interaction.editReply({
          embeds: [info("Datenschutzerklärung & AGB", 'Bevor das Setup gestartet wird, müssen Sie unsere AGBs und Datenschutzerklärung akzeptieren. Mit klicken des Buttons unten akzeptieren Sie diese!')],
          components: [agbsRow],
        });
  
        const replyMessage = await interaction.fetchReply();
  
        try {
          // Warten auf die Button-Interaktion (max. 60 Sekunden)
          const confirmation = await replyMessage.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            time: 60000,
          });
          if (confirmation.customId === 'accept_agbs') {
            await confirmation.update({
              embeds: [success("Akzeptiert", "AGBs und Datenschutzerklärung akzeptiert. Setup wird fortgesetzt...")],
              components: []
            });
          } else {
            await confirmation.update({
              embeds: [error("Abgelehnt", "Setup abgebrochen. Sie müssen die AGBs und Datenschutzerklärung akzeptieren, um den Bot nutzen zu können.")],
              components: []
            });
            return;
          }
        } catch (err) {
          await interaction.editReply({
            embeds: [error("Error", "Zeitüberschreitung: Setup abgebrochen.")],
            components: []
          });
          Logger.error(err);
          return;
        }
        // ────────────────────────────────────────────────────────────────────────
  
        const isMatch = await CheckDiscordIDWithKey(interaction.options.getString('key'), guild.id);
        if (!isMatch.IsMatch) {
          await interaction.editReply({
            embeds: [error('Key mismatch!', 'The key does not match the server it was activated originally.')]
          });
          return;
        }
  
        await interaction.editReply({
          embeds: [info('Setup Process!', 'Setup process started. Creating roles and channels...')]
        });
  
        guildID = guild.id;
        const returnValue = await chefIfServerExists(guildID);
  
        if (returnValue) {
          // Erstelle Rollen, Kanäle und Kategorien
          await createRoles(interaction);
          await createChannel(interaction);
          await createCategories(interaction);
          await generateCollection("guild_" + guildID);
  
          // Speichere in der Datenbank
          await saveDatabase(guildID, ticketChannelID, ticketCategoryID, supportRoleID, kiadminRoleID, ticketArchivCategoryID);
  
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
        await interaction.editReply({
          embeds: [error('Setup Process!', 'An error occurred during the setup process. Please try again.')]
        });
        await rollbackSetup(interaction);
      }
    },
  };
  
  // ─── FUNKTIONEN ─────────────────────────────────────────────────────────────
  
  // Rollen erstellen
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
        Logger.success(`${guild.name}: Created role: ${roleData.name}`);
        if (roleData.name === 'Supporter') {
          supportRoleID = createdRole.id;
        } else if (roleData.name === 'KI-Admin') {
          kiadminRoleID = createdRole.id;
        }
      } else {
        Logger.info(`${guild.name}: Role already exists: ${roleData.name}`);
        if (roleData.name === 'Supporter') {
          supportRoleID = existingRole.id;
        } else if (roleData.name === 'KI-Admin') {
          kiadminRoleID = existingRole.id;
        }
      }
    }
  }
  
  // Kanäle erstellen
  async function createChannel(interaction) {
    const guild = interaction.guild;
    const channelName = 'Ticket-System';
    let channel = guild.channels.cache.find((ch) => ch.name === channelName);
  
    if (!channel) {
      channel = await guild.channels.create({
        name: channelName,
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
      ticketChannelID = channel.id;
      Logger.success(`${guild.name}: Created channel: ${channel.id}`);
    } else {
      Logger.info(`${guild.name}: Channel already exists: ${channel.id}`);
    }
  
    // Embed-Daten aus JSON laden
    const embedData = JSON.parse(fs.readFileSync('./Design/Ticket_creation_message.json', 'utf-8'));
    const embeds = embedData.embeds.map((embed) => ({
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
  
  // Kategorien erstellen
  async function createCategories(interaction) {
    const guild = interaction.guild;
    const categoryName = 'tickets';
    let category = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && ch.name === categoryName
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
      ticketCategoryID = category.id;
      Logger.success(`${guild.name}: Created category: ${category.id}`);
    } else {
      Logger.info(`${guild.name}: Category already exists: ${category.id}`);
    }
  
    const categoryArchivName = 'archiv';
    let categoryArchiv = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && ch.name === categoryArchivName
    );
  
    if (!categoryArchiv) {
      categoryArchiv = await guild.channels.create({
        name: categoryArchivName,
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
      ticketArchivCategoryID = categoryArchiv.id;
      Logger.success(`${guild.name}: Created category: ${categoryArchiv.id}`);
    } else {
      Logger.info(`${guild.name}: Category already exists: ${categoryArchiv.id}`);
    }
  }
  
  // Rollback bei Fehlern
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
  
      // Löschen der Archiv-Kategorie
      if (ticketArchivCategoryID) {
        const categoryArchiv = guild.channels.cache.get(ticketArchivCategoryID);
        if (categoryArchiv) await categoryArchiv.delete();
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
  
      Logger.info('Rollback completed successfully.');
    } catch (error) {
      Logger.error(`Error during rollback: ${error.message}\n${error.stack}`);
    }
  }
  
  // Datenbank speichern
  async function saveDatabase(server_id, ticket_system_channel_id, ticket_category_id, support_role_id, kiadmin_role_id, ticket_archiv_category_id) {
    try {
      await saveServerInformation(
        server_id,
        ticket_system_channel_id,
        ticket_category_id,
        support_role_id,
        kiadmin_role_id,
        ticket_archiv_category_id
      );
      Logger.success(`Database saved for server ID: ${server_id}`);
    } catch (error) {
      Logger.error(`Error saving to database: ${error.message}\n${error.stack}`);
    }
  }
  