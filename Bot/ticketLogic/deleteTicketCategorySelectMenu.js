const { getCategories, saveCategories, updateTicketCreationMessage } = require('../helper/ticketCategoryHelper');
const Logger = require('../helper/loggerHelper');
const { error, success } = require('../helper/embedHelper');

module.exports = {
  data: {
    customId: 'delete_ticket_category'
  },
  async execute(interaction) {
    // Für Message-Component-Interaktionen verwenden wir deferUpdate(), um die Interaktion zu bestätigen.
    await interaction.deferUpdate();

    if (!interaction.member.permissions.has('ManageChannels')) {
      // Da wir bereits deferred haben, können wir hier eine FollowUp-Nachricht senden.
      return interaction.followUp({ 
        embeds: [error('Error!', 'Du hast keine Berechtigung dafür.')],
        ephemeral: true 
      });
    }
    
    // Da es sich um ein Single-Select handelt, nehmen wir das erste Element.
    const selectedValues = interaction.values;
    const labelToDelete = selectedValues[0];

    const guildId = interaction.guild.id;
    let categories = getCategories(guildId);
    
    // Suche nach der Kategorie anhand des Labels (case-insensitive)
    const category = categories.find(cat => cat.label.trim().toLowerCase() === labelToDelete.trim().toLowerCase());
    if (!category) {
      return interaction.followUp({ 
        embeds: [error('Error!', `Kategorie \`${labelToDelete}\` wurde nicht gefunden.`)],
        ephemeral: true 
      });
    }
    
    // Entferne die gefundene Kategorie
    categories = categories.filter(cat => cat.label.trim().toLowerCase() !== labelToDelete.trim().toLowerCase());
    saveCategories(guildId, categories);
    
    // Aktualisiere das Dropdown-Menü im Ticket-System-Channel
    updateTicketCreationMessage(interaction.guild).catch(err => {
      Logger.error(`Fehler beim Aktualisieren des Dropdown-Menüs: ${err.message}`);
    });
    
    // Aktualisiere die ursprüngliche Nachricht der Interaktion
    await interaction.editReply({ 
      embeds: [success('Erfolg!', `Kategorie \`${labelToDelete}\` wurde erfolgreich gelöscht.`)],
      components: [] 
    });
  }
};
