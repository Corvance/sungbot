import { Command } from '../command'
import { Message, MessageEmbed, User } from "discord.js";
import { BOT_COLOR, ERROR_EMBED } from '../common';

module.exports = {
    name: 'avatar',
    command: new Command(avatar, new MessageEmbed({
        color: BOT_COLOR,
        title: 'avatar',
        description: 'Retrieves you or another user\'s\' profile picture.',
        fields: [
            {
                name: '`users`',
                value: 'A mention of a user to fetch the avatars of.'
            },
            {
                name: '**Examples**',
                value: '```bash\n'
                + 's/avatar\n'
                + 's/avatar @lazerhorse\n'
                + 's/avatar lazerhorse\n'
                + 's/avatar 975476375987310682\n'
                + '```'
            }
        ]
    }))
}

async function avatar(msg: Message, args: string) : Promise<void> {
    let username: string = 'User';
    let url: string = '';

    let user: User | undefined;
    if (msg.mentions.users.size > 0) {
        user = msg.mentions.users.first();
    }
    else if (args.length > 0) {
        user = msg.client.users.cache.find(user => user.id === args);
        if (!user)
            user = msg.client.users.cache.find(user => user.username === args);
    }
    else {
        user = msg.author;
    }

    if (user) {
        username = user.username;
        url = user.displayAvatarURL();
    }
    else {
        return Promise.reject(ERROR_EMBED.setDescription('❌ Invalid user!'));
    }

    msg.channel.send(
        {embeds: [new MessageEmbed({
            color: BOT_COLOR,
            title: `${username}'s Avatar`,
            image: {url: url}
        })]}
    );
}