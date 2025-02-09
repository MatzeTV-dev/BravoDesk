const fs = require('fs');
const PDFDocument = require('pdfkit');
const { info } = require('../helper/embedHelper.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
// Ersetze den alten Datenbankaufruf:
const { getServerInformation } = require('../handler/discordDataHandler.js');
const Logger = require('../helper/loggerHelper.js');

module.exports = {
  data: {
    name: 'close_ticket_button',
  },
  async execute(interaction) {
    const channel = interaction.channel;
    const guild = interaction.guild;
    const guild_id = guild.id;

    try {
      // Abrufen der Serverinformationen aus der JSON-Datei
      const data = getServerInformation(guild_id);
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Keine Serverinformationen gefunden.');
      }

      // Schritt 1: Button deaktivieren und Nachricht aktualisieren
      await disableCloseButton(interaction);

      // Schritt 2: Nachrichten abrufen
      const messages = await fetchChannelMessages(channel);

      // Schritt 3: Transcript als PDF erstellen
      const transcriptPath = await createPDFTranscript(channel, interaction, messages);

      // Schritt 4: PDF an den Benutzer senden und löschen
      await sendTranscriptToUser(interaction, transcriptPath);

      // Schritt 5: Kanalrechte anpassen
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

// Funktion: Button deaktivieren
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

// Funktion: Nachrichten abrufen
async function fetchChannelMessages(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

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
  const totalPages = Math.ceil(messagesArray.length / 10); // Geschätzte Seitenanzahl
  let currentPage = 1;

  // Funktion: Kopf- und Fußzeilen hinzufügen
  const addHeaderFooter = (pageNumber) => {
    // Kopfzeile: (Optional) z. B. Servername
    // Fußzeile: Datum, Seitenzahl, Ticketname (optional)
  };

  // Titel und Kopfzeile für die erste Seite hinzufügen
  addHeaderFooter(currentPage);

  // Füge den Titel hinzu und bewege den Cursor nach unten
  doc.fontSize(16).fillColor('black').text(`Transcript für Ticket: ${channel.name}`, { align: 'center', underline: true });
  doc.moveDown();

  // Nachrichten hinzufügen
  for (let index = 0; index < messagesArray.length; index++) {
    const message = messagesArray[index];
    const time = new Date(message.createdTimestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const author = `${message.author.tag}`;
    const content = message.content || '[Embed]';

    // Nachricht hinzufügen
    doc.fontSize(10).fillColor('black').text(`[${time}] ${author}: ${content}`);
    doc.moveDown();

    // Seitenwechsel, falls kein Platz mehr vorhanden
    if (doc.y > doc.page.height - 80) {
      currentPage++;
      doc.addPage();
      addHeaderFooter(currentPage);
    }
  }

  // Dokument beenden
  doc.end();

  // Warte, bis das Schreiben abgeschlossen ist
  await new Promise((resolve) => stream.on('finish', resolve));
  return pdfPath;
}

// Funktion: Transcript an den Benutzer senden und löschen
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

// Funktion: Kanalrechte anpassen
async function updateChannelPermissions(channel, data) {
  // Supporter-Rolle und allgemeine Benutzerrechte entziehen
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

  // Kanal in die Archiv-Kategorie verschieben
  const archiveCategory = channel.guild.channels.cache.find(
    c => c.id === data.ticket_archiv_category_id && c.type === ChannelType.GuildCategory
  );
  if (archiveCategory) {
    await channel.setParent(archiveCategory.id);
    Logger.info(`Channel "${channel.name}" wurde in die Kategorie "${archiveCategory.name}" verschoben.`);
  } else {
    Logger.warn('Archiv-Kategorie nicht gefunden. Überspringe das Verschieben des Kanals.');
  }
}
