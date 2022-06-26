import { Command } from '../command';
import { Message, MessageEmbed, User } from 'discord.js';
import { BOT_COLOR, ERROR_EMBED } from '../common';
import { db } from '../db';

module.exports = {
    name: "funk",
    command: new Command(funk, new MessageEmbed({
        color: BOT_COLOR,
        title: 'funk',
        description: 'Give a Funk Point to another user. They\'re nice for when someone\'s done or said something nice,' +
        'like a measure of reputation, and you can only give 1 per day', 
        fields: [{ name: 'Example', value: '```bash\ns/funk @FuckThrust\n```' }]
    }))
}

async function funk(msg: Message): Promise<void> {
    let userId: string;
    let username: string;
    if (msg.mentions.users.size > 0) {
        let user: User | undefined = msg.mentions.users.first();
        let msgUser: User | undefined = msg.client.users.cache.get(msg.author.id);
        if (user && msgUser && user !== msgUser) {
            userId = user.id;
            username = user.username;

            // Command relies on someone else who may not have sent a message yet being in the DB,
            // so ensure they are here.
            await db.run(`INSERT OR IGNORE INTO users VALUES (${userId}, 0, False, False)`).catch(_ => {
                return Promise.reject(ERROR_EMBED.setDescription('❌ User doesn\'t exist in database and can\'t be added!'));
            });
        }
        else {
            return Promise.reject(ERROR_EMBED.setDescription('❌ You can\'t funk yourself!'));
        }
    }
    else {
        return Promise.reject(ERROR_EMBED.setDescription('❌ You forgot to mention a user to funk!'));
    }

    try {
        let cooldown = await db.get(`SELECT reputation_cooldown FROM users WHERE user_id = ${msg.author.id}`);
        if (cooldown.reputation_cooldown === 1)
            return Promise.reject(ERROR_EMBED.setDescription('❌ You\'ve already funked a user today!'));

        let before = await db.get(`SELECT reputation FROM users WHERE user_id = ${userId}`);
        await db.run(`UPDATE users SET reputation = reputation + 1 WHERE user_id = ${userId} AND reputation < 999`);
        let after = await db.get(`SELECT reputation FROM users WHERE user_id = ${userId}`);

        msg.channel.send({
            embeds: [
                new MessageEmbed({
                    color: BOT_COLOR,
                    title: '<:fuckthrust:914544341022814228> Success! <:fuckthrust:914544341022814228> ',
                    description: `You gave a Funk Point to ${username}!`
                })
            ]
        });

        if (before.reputation === after.reputation)
            return Promise.reject(ERROR_EMBED.setDescription('❌ That user\'s Funk Points are maxed out!'));

        await db.run(`UPDATE users SET reputation_cooldown = True WHERE user_id = ${msg.author.id}`);
    }
    catch {
        return Promise.reject(ERROR_EMBED.setDescription('❌ Unknown error updating Funk Points!'));
    }
}

function daysIntoYear(date: Date): number {
    return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
}

let currentDay: number = daysIntoYear(new Date());

db.initialiser.on('complete', async _ => {
    setInterval(async function () {
        let dayNow = daysIntoYear(new Date());
        if (dayNow !== currentDay) {
            try {
                await db.run('UPDATE users SET reputation_cooldown = False');
                currentDay = dayNow;
            }
            catch {
                console.log('Failed to reset reputation point cooldown.')
            }
        }
    }, 300000);
});