import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getCategories, deleteCategory, updateTicketCreationMessage } from '../../helper/ticketCategoryHelper.js';
import Logger from '../../helper/loggerHelper.js';
import { error, info, success } from '../../helper/embedHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('deletecategory')
    .setDescription('Löscht eine Ticket-Kategorie über ein Dropdown-Menü.'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has('ManageChannels')) {
      await interaction.editReply({ 
        embeds: [error('Error!', 'Du hast keine Berechtigung dafür!')],
        ephemeral: true 
      });
      return;
    }
    
    const categories = await getCategories(interaction.guild.id);
    if (!categories || categories.length === 0) {
      await interaction.editReply({ 
        embeds: [info('Info', 'Es gibt keine Kategorie zum Löschen.')],
        ephemeral: true 
      });
      return;
    }
    
    const options = categories.map(cat => ({
      label: cat.label,
      description: cat.description,
      value: cat.label // Hier wird der Label als Schlüssel genutzt
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('delete_ticket_category')
      .setPlaceholder('Wähle die Kategorie, die gelöscht werden soll')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.editReply({ 
      embeds: [info('Info', 'Wähle die Kategorie, die gelöscht werden soll:')],
      components: [row], 
      ephemeral: true 
    });
  },
};
