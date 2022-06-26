import { GuildMember, Message, Role } from 'discord.js';
import { db } from './db';

export async function giveMessageXP(msg: Message): Promise<void> {
    // Resolve rather than reject on errors as they would happen on every message.

    // Add anything not yet in the DB.
    try {
        await db.run(`INSERT OR IGNORE INTO guilds VALUES (${msg.guildId})`);
        await db.run(`INSERT OR IGNORE INTO users VALUES (${msg.author.id}, 0, False, False)`);
        await db.run(`INSERT OR IGNORE INTO userguildxp VALUES (${msg.author.id}, ${msg.guildId}, 0, false)`);
    }
    catch (e: any) {
        console.log('Failed to add user to DB.\n');
        Promise.resolve();
    }

    // Reward XP.
    try {
        let res: any = await db.get(`SELECT xp FROM userguildxp WHERE user_id = ${msg.author.id} AND guild_id = ${msg.guildId}`);
        if (typeof res === 'object' && res && res.hasOwnProperty('xp') && !msg.author.bot) {
            res['xp'] += Math.floor(Math.random() * (10 - 5 + 1) + 5);
            await db.run(`UPDATE userguildxp SET xp = ${res['xp']}, cooldown = True` +
                ` WHERE user_id = ${msg.author.id} AND guild_id = ${msg.guildId} AND cooldown = False`);

            // Can just use a timeout here as all cooldowns are cleared on starting the bot,
            // so no need for a periodic event in case it goes offline before the cooldown ends.
            setTimeout(_ => {
                db.run(`UPDATE userguildxp SET cooldown = False WHERE user_id = ${msg.author.id} AND guild_id = ${msg.guildId}`);
            }, 120000);
        }
    } catch (e) {
        console.log('Failed to reward XP');
    }
}

export async function updateLeveledRoles(msg: Message): Promise<void> {
    // Resolve rather than reject on errors as they would happen on every message.
    let xpObj: any = await db.get(`SELECT xp FROM userguildxp WHERE guild_id = ${msg.guildId} AND user_id = ${msg.author.id}`)
                        .catch(_ => { console.log('Failed to get user XP.'); return Promise.resolve() });

    // Get an array of all roles with XP requirements below the user's current XP.
    let roles: any[] = await db.all(`SELECT role_id, message FROM leveledroles WHERE guild_id = ${msg.guildId} AND xp < ${xpObj.xp}`)
                        .catch(_ => { console.log('Failed to fetched roles.'); return Promise.resolve(); })

    // Type guards.
    if (!(roles instanceof Array) || !msg.member || !msg.guild) return Promise.resolve();

    for (let i = 0; i < roles.length; i++) {
        if (!msg.member.roles.cache.has(roles[i].role_id)) {
            let role: Role | undefined = msg.guild.roles.cache.get(roles[i].role_id);
            if (role) {
                await msg.member.roles.add(role.id)
                    .catch(_ => { console.log(`Failed to add role to user ${msg.author.id}.`); return Promise.resolve(); });

                if (roles[i].message && msg.member.roles.cache.has(role.id))
                    msg.channel.send(`${roles[i].message.replaceAll('${USER_MENTION}', `${msg.author.toString()}`).replaceAll('${ROLE_MENTION}', `<@&${roles[i].role_id}>`)}`);
            }
        }
    }
}
