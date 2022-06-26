import { Command } from '../command';
import { Message, MessageEmbed } from 'discord.js';
import { BOT_COLOR, ERROR_EMBED } from '../common';
import { db } from '../db';

module.exports = {
    name: "leveledroles",
    command: new Command(leveledroles, new MessageEmbed({
        color: BOT_COLOR,
        title: 'leveledroles',
        description: 'Fetch a list of the server TWR-XP leveled roles.',
        fields: [{ name: 'Example', value: '```bash\ns/leveledroles\n```' }]
    }))
}

export async function leveledroles(msg: Message): Promise<void> {
    let roles: any[] = await db.all(`SELECT role_id, xp FROM leveledroles ORDER BY xp ASC`)
    .catch(_ => { return Promise.reject(ERROR_EMBED.setDescription('❌ Error fetching leveled roles list!')); });

    if (!(roles instanceof Array) || !msg.guild)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Error fetching leveled roles list!'));

    let embed: MessageEmbed = new MessageEmbed({
        title: `TWR-XP Leveled Roles for ${msg.guild.name}`,
        thumbnail: { url: `${msg.guild.iconURL()}` },
        description: '**Chat to earn TWR-XP and be awarded these roles!**\n'
    });

    for (let i = 0; i < roles.length; i++)
        embed.description += `\n\`${(i + 1).toString().padStart(2, '0')}\` ● <@&${roles[i].role_id}> **(${roles[i].xp})**`;

    msg.channel.send({ embeds: [embed] });
}
