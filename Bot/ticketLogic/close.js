import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getServerInformation } from '../Database/database.js';
import { info } from '../helper/embedHelper.js';
import Logger from '../helper/loggerHelper.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';

export default {
  data: {
    name: 'close_ticket_button',
  },
  /**
   * Schließt ein Ticket, indem der Schließen-Button deaktiviert, ein Transcript als PDF erstellt, an den Benutzer gesendet
   * und anschließend Kanalberechtigungen angepasst werden.
   *
   * @param {CommandInteraction} interaction - Die Discord-Interaktion.
   * @returns {Promise<void>}
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const guild = interaction.guild;
    const guild_id = guild.id;

    try {
      const rawData = await getServerInformation(guild_id);
      const data = rawData[0][0];

      await disableCloseButton(interaction);
      const messages = await fetchChannelMessages(channel);
      const transcriptPath = await createPDFTranscript(channel, interaction, messages);
      await sendTranscriptToUser(interaction, transcriptPath);
      await updateChannelPermissions(channel, data);

      Logger.success(`Ticket "${channel.name}" wurde erfolgreich geschlossen.`);
    } catch (error) {
      Logger.error(`Fehler beim Schließen des Tickets: ${error.message}\n${error.stack}`);
      await interaction.followUp({
        content: 'Ein Fehler ist beim Schließen des Tickets aufgetreten. Bitte versuche es später erneut.',
        ephemeral: true,
      });
    }
  },
};

/**
 * Deaktiviert den "close ticket" Button und aktualisiert die Nachricht.
 *
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @returns {Promise<void>}
 */
async function disableCloseButton(interaction) {
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket_button')
      .setLabel('Geschlossen')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true)
  );

  await interaction.update({ components: [buttonRow] });
}

/**
 * Ruft die letzten 100 Nachrichten eines Channels ab und sortiert sie chronologisch.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @returns {Promise<Collection<string, Message>>} Eine Sammlung der sortierten Nachrichten.
 */
async function fetchChannelMessages(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

/**
 * Erstellt ein PDF-Transcript aus den abgerufenen Nachrichten eines Channels.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @param {Collection<string, Message>} messages - Die gesammelten Nachrichten.
 * @returns {Promise<string>} Der Pfad zur erstellten PDF-Datei.
 */
async function createPDFTranscript(channel, interaction, messages) {
  const transcriptFolder = './transcripts_tmp';
  if (!fs.existsSync(transcriptFolder)) {
    fs.mkdirSync(transcriptFolder);
  }

  const pdfPath = `${transcriptFolder}/Ticket-${channel.id}.pdf`;
  const doc = new PDFDocument({ margin: 40 });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  const messagesArray = Array.from(messages.values());
  const totalPages = Math.ceil(messagesArray.length / 10);
  let currentPage = 1;

  // Fügt optional Kopf- und Fußzeilen hinzu.
  const addHeaderFooter = (pageNumber) => {
    // Hier können Kopf- und Fußzeile eingefügt werden.
  };

  addHeaderFooter(currentPage);
  doc.fontSize(16).fillColor('black').text(`Transcript für Ticket: ${channel.name}`, { align: 'center', underline: true });
  doc.moveDown();

  for (let index = 0; index < messagesArray.length; index++) {
    const message = messagesArray[index];
    const time = new Date(message.createdTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const author = `${message.author.tag}`;
    const content = message.content || '[Embed]';

    doc.fontSize(10).fillColor('black').text(`[${time}] ${author}: ${content}`);
    doc.moveDown();

    if (doc.y > doc.page.height - 80) {
      currentPage++;
      doc.addPage();
      addHeaderFooter(currentPage);
    }
  }

  doc.end();
  await new Promise((resolve) => stream.on('finish', resolve));
  return pdfPath;
}

/**
 * Sendet das PDF-Transcript als private Nachricht an den Benutzer und löscht anschließend die Datei.
 *
 * @param {CommandInteraction} interaction - Die Discord-Interaktion.
 * @param {string} pdfPath - Der Pfad zur PDF-Datei.
 * @returns {Promise<void>}
 */
async function sendTranscriptToUser(interaction, pdfPath) {
  try {
    if (!pdfPath) {
      throw new Error('PDF-Pfad ist nicht definiert.');
    }

    await interaction.user.send({
      embeds: [info("Ticket System", "Hey, hier ist ein Transcript von dem Ticket, das gerade geschlossen worden ist!")],
      files: [pdfPath],
    });

    Logger.success(`Transcript wurde privat an ${interaction.user.tag} gesendet.`);
  } catch (error) {
    Logger.error(`Konnte Transcript nicht an ${interaction.user.tag} senden: ${error.message}`);
  } finally {
    try {
      if (pdfPath && fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        Logger.info(`Transcript-Datei wurde gelöscht: ${pdfPath}`);
      }
    } catch (unlinkError) {
      Logger.error(`Fehler beim Löschen der Datei: ${unlinkError.message}`);
    }
  }
}

/**
 * Aktualisiert die Kanalberechtigungen, um Support-Rechte zu entziehen, und verschiebt den Kanal in die Archiv-Kategorie.
 *
 * @param {TextChannel} channel - Der Discord-Channel.
 * @param {Object} data - Serverinformationen, die unter anderem die Support-Rolle und Archiv-Kategorie enthalten.
 * @returns {Promise<void>}
 */
async function updateChannelPermissions(channel, data) {
  const supporterRole = channel.guild.roles.cache.find(role => role.id === data.support_role_id);
  if (supporterRole) {
    await channel.permissionOverwrites.edit(supporterRole, {
      SendMessages: false,
      ViewChannel: false,
    });
  }

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
    SendMessages: false,
    ViewChannel: false,
  });

  const archiveCategory = channel.guild.channels.cache.find(
    c => c.id === data.ticket_archiv_category_id && c.type === 4
  );
  if (archiveCategory) {
    await channel.setParent(archiveCategory.id);
    Logger.info(`Channel "${channel.name}" wurde in die Kategorie "${archiveCategory.name}" verschoben.`);
  } else {
    Logger.warn('Archiv-Kategorie nicht gefunden. Überspringe das Verschieben des Kanals.');
  }
}
