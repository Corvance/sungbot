import { Command } from '../command'
import { Message, MessageEmbed } from "discord.js";
import { BOT_COLOR, ERROR_EMBED } from '../common';
import { db } from '../db';

module.exports = {
    name: "rate",
    command: new Command(rate, new MessageEmbed({
        color: BOT_COLOR,
        title: 'rate',
        description: 'Get SungBot to rate something.',
        fields: [
            { name: 'things', value: 'The thing to rate.' },
            { name: 'Example', value: '```bash\ns/rate Fuckthrust\n```' }
        ]
    }))
}

async function rate(msg: Message, args: string): Promise<void> {
    // Create the rating.
    let rating = Math.floor(Math.random() * (11));

    // Get the closest rating message at or below this rating value.
    let message = await db.get(`SELECT message FROM ratemessages ` +
        `WHERE guild_id = ${msg.guildId} AND rating <= ${rating} ORDER BY rating DESC`)
        .catch(_ => { return Promise.reject(ERROR_EMBED.setDescription('❌ Rating database error!')); });

    // Possibly no rating messages in the database for this guild.
    if (!message)
        return Promise.reject(ERROR_EMBED.setDescription('❌ I don\'t know enough to rate things!'));

    // Send the rating message.
    msg.channel.send(message.message.replace(/\${RATING}/g, rating).replace(/\${THING}/g, args));
}