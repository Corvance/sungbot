import { Command } from '../command'
import { Message, MessageEmbed } from "discord.js";
import { getNumFromParam, BOT_COLOR, ERROR_EMBED } from '../common';
import { command as pollCommand } from './poll';
import { db } from '../db';

module.exports = {
    name: 'sungshowdown',
    command: new Command(sungshowdown, new MessageEmbed({
        color: 0xffb900,
        title: 'sungshowdown',
        description: 'Automatically generates a Sung Showdown™.',
        fields: [
            {
                name: '`numsongs`',
                value: 'The number of songs.'
            },
            {
                name: "`duration`",
                value: "The duration before voting closes."
            },
            {
                name: '**Examples**',
                value: '```bash\n'
                    + 's/sungshowdown 2 30sm\n'
                    + 's/sungshowdown 4 5h\n'
                    + 's/sungshowdown 12 7d\n'
                    + '```'
            }
        ]
    }))
}

async function sungshowdown(msg: Message, args: string): Promise<void> {
    let argsSplit: string[] = args.split(' ');
    if (argsSplit.length < 2)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Missing arguments!'));

    let numSongs: number = getNumFromParam(argsSplit[0]);
    if (isNaN(numSongs) || numSongs < 2 || numSongs > 20)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Invalid number of songs! Please use a number of songs between 2 and 20 inclusive.'));

    let songs: object[];

    songs = await db.all(`SELECT name, emoji FROM songs ORDER BY RANDOM() LIMIT ${numSongs}`).catch();

    // Songs will be < 2 if it hasn't been populated.
    if (songs.length < 2)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Requested more songs than there are registered in the database!'));

    let pollArgs: string = '"It\'s Sung Showdown time! Vote for your ***favourite*** song!" ' +
        `["${songs.map((song: any) => song.name).join('", "')}"] ` +
        `["${songs.map((song: any) => song.emoji).join('", "')}"] ` +
        argsSplit[1];

    return await pollCommand.fn(msg, pollArgs);
}