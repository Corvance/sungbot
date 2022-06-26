import { Command } from '../command'
import { Guild, Message, MessageEmbed, MessageReaction } from "discord.js";
import { BOT_COLOR, convertTimeTextToSeconds, getEmoji, dateToUNIXTimestamp, ERROR_EMBED } from '../common';
import { db } from '../db';
import { client } from '../bot';

export let command = new Command(poll, new MessageEmbed({
    color: BOT_COLOR,
    title: 'poll',
    description: 'Creates a timed poll, which automatically announces the winner upon ending.',
    fields: [
        {
            name: '`message`',
            value: 'Double-quoted string of body text.'
        },
        {
            name: '`options`',
            value: 'Square-bracketed array of double-quoted poll options.'
        },
        {
            name: '`reactions`',
            value: 'Square-bracketed array of double-quoted reaction emojis. Default emojis should be the unicode (e.g. "👍")'
                + 'and custom emojis should be the ID (e.g. "812799441164566528"). If this is empty or there are fewer emojis than poll options (up to 10),'
                + 'the emojis are automatically filled with number emojis.'
        },
        {
            name: '`duration`',
            value: 'Duration in millseconds, after which the poll automatically ends.'
        },
        {
            name: '**Examples**',
            value: '```bash\n'
                + 's/poll "Thumbs up or thumbs down?" ["Thumbs Up!", "Thumbs down."] ["👍", "👎"] 10m\n'
                + 's/poll "Which custom emoji?" ["The first!", "The second!"] ["812799441164566528", "215799448166564528"] 2.5h\n'
                + '```'
        }
    ]
}));

module.exports = {
    name: 'poll',
    command: command
}

async function poll(msg: Message, args: string): Promise<void> {
    // Split on all spaces except within "", '' and [].
    let regex: RegExp = /(?:(["'])(\\.|(?!\1)[^\\])*\1|\[(?:(["'])(\\.|(?!\2)[^\\])*\2|[^\]])*\]|\((?:(["'])(\\.|(?!\3)[^\\])*\3|[^)])*\)|[^\s])+/g;
    let parsedArgs: RegExpMatchArray | null = args.match(regex);

    if (!parsedArgs || parsedArgs.length < 4)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Missing arguments!'));
    if (parsedArgs.length > 4)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Too many arguments!'));

    if (parsedArgs[0].charAt(0) !== '"' || parsedArgs[0].charAt(parsedArgs[0].length - 1) !== '"')
        return Promise.reject(ERROR_EMBED.setDescription('❌ Invalid message! Please make the first argument a message enclosed in "".'));

    let message: string = parsedArgs[0].substring(1, parsedArgs[0].length - 1);

    // Attempt to parse arrays.
    let options: string[] = JSON.parse(parsedArgs[1]);
    let emojis: string[] = JSON.parse(parsedArgs[2]);

    let duration: number | undefined = convertTimeTextToSeconds(parsedArgs[3]);
    if (!duration || isNaN(duration))
        return Promise.reject(ERROR_EMBED.setDescription('❌ Invalid duration! Please provide a valid duration e.g., 50s, 2m, 5.5h, 7d, etc.'));

    emojis = emojis.concat(['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']);
    if (emojis.length <= options.length)
        return Promise.reject(ERROR_EMBED.setDescription('❌ You didn\'t provide enough emojis to match your poll options,' +
            ' but you have more than 10 options; autofill only works up to 10. Please try again!'));

    emojis = emojis.slice(0, options.length);

    let endTime: Date = new Date(Date.now() + duration * 1000);

    await msg.delete().catch(_ => console.log('Error deleting poll command message.'));

    let pollMsg: string = createPollMessage(msg, message, options, emojis, endTime);
    let sent: Message = await msg.channel.send(pollMsg).catch(_ => {
        return Promise.reject(ERROR_EMBED.setDescription('❌ Failed sending the poll message!'));
    });

    try {
        for (let i = 0; i < emojis.length; i++) {
            await sent.react(getEmoji(msg.client, emojis[i]));
        }

        // Complete success, so add the poll to the database to be checked periodically
        // and ended once its end time is reached.
        await db.run(`INSERT INTO polls VALUES (${sent.id}, ${sent.guildId}, ${sent.channelId}, "${message}", '["${options.join('", "').replace(/'/g, "''")}"]',` +
            ` '${parsedArgs[2]}', ${Math.floor(endTime.getTime() / 1000)})`);
    }
    catch {
        await sent.delete().catch();
        return Promise.reject(ERROR_EMBED.setDescription('❌ Failed adding reactions to poll message! Probably an invalid emoji.'));
    }
}

function createPollMessage(msg: Message, message: string, options: string[], emojis: string[], endTime: Date) {
    let pollMsg = message + '\n\n';
    for (let i = 0; i < options.length; i++)
        pollMsg += `${getEmoji(msg.client, emojis[i])} ${options[i]}\n`;

    pollMsg += `\nVoting ${(new Date() > endTime) ? 'closed' : 'closes'} ${dateToUNIXTimestamp(endTime)}.`;
    return pollMsg;
}

db.initialiser.on('complete', async _ => {
    setInterval(async function (): Promise<void> {
        let current = Math.floor(new Date().getTime() / 1000);

        let polls = await db.all(`SELECT msg_id, guild_id, channel_id, message, options, emojis, end_time FROM polls WHERE end_time < ${current}`)
            .catch(_ => { return Promise.resolve() });
        if (!(polls instanceof Array))
            return Promise.resolve();

        polls.forEach(async function (poll): Promise<void> {
            let options = JSON.parse(poll.options);
            let emojis = JSON.parse(poll.emojis);

            // Always remove it even if the announcement etc. fails.
            await db.run(`DELETE FROM polls WHERE guild_id = ${poll.guild_id} AND channel_id = ${poll.channel_id} AND msg_id = ${poll.msg_id}`).catch();

            let guild: Guild | void = await client.guilds.fetch(poll.guild_id).catch(_ => { return Promise.resolve() });

            if (!guild) return Promise.resolve();

            let channel = await guild.channels.fetch(poll.channel_id).catch(_ => { return Promise.resolve() });

            if (!channel || !channel.isText()) return Promise.resolve();

            let msg = await channel.messages.fetch(poll.msg_id);

            let reactCounts: number[] = [];
            emojis.forEach(function (emoji: string) {
                let fetchedReact: MessageReaction | undefined = msg.reactions.cache.get(emoji);
                reactCounts.push((fetchedReact) ? fetchedReact.count : 0);
            });

            let maxes: number[] = [0];
            for (let i = 1; i < reactCounts.length; i++) {
                if (reactCounts[i] > reactCounts[maxes[0]]) {
                    maxes = [i];
                }
                else if (reactCounts[i] === reactCounts[maxes[0]])
                    maxes.push(i);
            }

            // Edit to refer to voting as having closed, past tense.
            await msg.edit(createPollMessage(msg, poll.message, JSON.parse(poll.options),
                    JSON.parse(poll.emojis), new Date(poll.end_time * 1000))).catch();


            // Send the winner announcement.
            if (maxes.length === 1)
                msg.channel.send(`The winner is ${getEmoji(msg.client, emojis[maxes[0]])} ${options[maxes[0]]}!`);
            else {
                // Build array of winner names.
                let winners: string = `${getEmoji(msg.client, emojis[maxes[0]])} ${options[maxes[0]]}`;
                for (let i = 1; i < maxes.length; i++) {
                    // 'and' before final winner.
                    winners += (i < maxes.length - 1) ? ', ' : ' and ';
                    winners += `${getEmoji(msg.client, emojis[maxes[i]])} ${options[maxes[i]]}`;
                }
                msg.channel.send(`It's a draw! ${winners} came out on top!`);
            }
        });
    }, 2000);
});