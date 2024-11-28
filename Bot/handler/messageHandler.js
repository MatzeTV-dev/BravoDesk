module.exports = async (client, message) => {
    if (message.author.bot) {
        // Ignore messages from all bots, including this bot
        return;
    }

    if (isTicketChannel(message.channel)) {
        try {
            const messages = await collectMessagesFromChannel(message.channel, client, message);

            if (!messages.includes("Alles klar, ein Menschlicher Supporter wird das Ticket übernehmen!")) {
                const aiResponse = await sendMessagesToAI(messages);
                await message.channel.send(aiResponse);
            }           
        } catch (error) {
            console.error('Error handling ticket message:', error);
            await message.channel.send('There was an error processing your request.');
        }
    }
};

function isTicketChannel(channel) {
    return channel.name.endsWith('s-ticket');
}

async function collectMessagesFromChannel(channel, client, triggeringMessage) {
    let collectedMessages = '';
    const allMessages = new Map();

    const aiBotUserId = client.user.id; // The AI bot's user ID

    // Manually add the triggering message
    allMessages.set(triggeringMessage.id, triggeringMessage);

    let lastMessageId = null;
    let totalFetchedMessages = 0;
    const maxMessages = 100; // Limit to prevent excessive API calls

    while (true) {
        const options = { limit: 100 };
        if (lastMessageId) {
            options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) {
            break;
        }

        for (const [id, message] of messages) {
            allMessages.set(id, message);
        }

        totalFetchedMessages += messages.size;
        if (totalFetchedMessages >= maxMessages) {
            break;
        }

        lastMessageId = messages.last().id;

        // Optional: Delay between fetches to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Sort messages by timestamp in ascending order
    const messageArray = Array.from(allMessages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    // Remove the first two elements from the array
    messageArray.splice(0, 2);

    for (const message of messageArray) {
        const member = await channel.guild.members.fetch(message.author.id).catch(() => null);

        let prefix = '';

        if (message.author.id === aiBotUserId) {
            // Message is from the AI bot
            prefix = 'AI - Support: ';
        } else if (member && member.roles.cache.some(role => role.name === 'Supporter')) {
            // Message is from a human support member
            prefix = 'Support: ';
        } else if (!message.author.bot) {
            // Message is from a user
            prefix = 'User: ';
        } else {
            // Message is from another bot; skip it
            continue;
        }

        // Ensure message content is properly accessed
        const content = message.content || '';

        collectedMessages += `${prefix}${content}\n`;
    }

    console.log("Collected messages:\n", collectedMessages);
    return collectedMessages.trim();
}



async function sendMessagesToAI(messages) {
    return `test`;
}
