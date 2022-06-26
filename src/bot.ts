import { config } from 'dotenv'; config();
import { Client, GuildBasedChannel, GuildMember, Intents, MessageEmbed, PartialGuildMember, Role } from 'discord.js';
import * as fs from 'fs';
import { Command } from './command';
import { BOT_COLOR } from './common';
import { db } from './db';
import { giveMessageXP, updateLeveledRoles } from './xp';
import { loadFonts } from './drawing';

export const client: Client = new Client(
    {
        intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_PRESENCES]
    }
);

client.on('ready', async e => {
    console.log(`SungBot connected!`);
});

db.initialiser.on('complete', async _ => {
    loadFonts();
    client.login(process.env.SUNGBOT_TOKEN).catch(err => {
        console.error(err);
        process.exit()
    });
});

// Facilitate uptime monitors.
import { createServer, IncomingMessage, ServerResponse } from 'http';
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200);
    res.end('ok');
});
server.listen(3000);

// Fill a commands object with commands accessible
// by key via their command name/prefix.
let commands: Map<string, Command | undefined> = new Map<string, Command>();

// Populate commands map.
const jsFiles: string[] = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
jsFiles.forEach(commandFile => {
    const commandModule = require(`./commands/${commandFile}`);
    if (commandModule.name && commandModule.command)
        commands.set(commandModule.name, commandModule.command);
});

let helpEmbed: MessageEmbed = new MessageEmbed({
    color: BOT_COLOR,
    title: 'SungBot - A TWRP-themed bot for the Ladyworld Discord server.',
    description: 'Use s/help [command] for more detailed help.\n\nTip! Use `s/textonly` to force commands that output images to use 100% text instead, handy if you use a screen reader.',
    fields: [{ name: 'Commands', value: '`' + Array.from(commands.keys()).join('`\n`') + '`', inline: false }]
});

// React to messages.
client.on('messageCreate',
    async function (msg) {
        if (!msg.author.bot) {
            await giveMessageXP(msg).catch();
            await updateLeveledRoles(msg).catch();
        }

        const prefixedCommand: string = msg.content.split(' ')[0];
        let commandName: string = prefixedCommand.toLowerCase().split('s/')[1];

        // If this is a testing instance
        if (client.user && client.user.username.endsWith('-Testing'))
            commandName = prefixedCommand.toLowerCase().split('st/')[1];

        // Everything following the first space.
        let args: string = msg.content.split(/ (.*)/s)[1];
        args = (args === undefined) ? '' : args;

        if (commandName === 'help') {
            // No argument - main help.
            if (!args) {
                msg.channel.send({ embeds: [helpEmbed] });
            }
            else {
                const command: Command | undefined = commands.get(args);
                if (command !== undefined)
                    msg.channel.send({ embeds: [command.help] });
            }

            return;
        }

        const command: Command | undefined = commands.get(commandName);

        // Filter out invalid commands and bot senders.
        if (command && !msg.author.bot) {
            try {
                await command.fn(msg, args);
            }
            catch (errEmbed) {
                if (errEmbed instanceof MessageEmbed)
                    msg.channel.send({ embeds: [errEmbed] });
            }
        }
    });

client.on('guildMemberAdd', async function (member: GuildMember) {
    // Get the join event for this guild.
    let joinEvent: any = await db.get(`SELECT guild_id, channel_id, message, role_id FROM joinevents WHERE guild_id = ${member.guild.id}`)
        .catch(_ => { console.log('Failed to get guild join event!'); return Promise.resolve(); });

    // If this join event has a welcome message.
    if (joinEvent.channel_id && joinEvent.message) {
        let channel: GuildBasedChannel | undefined = member.guild.channels.cache.get(joinEvent.channel_id);

        if (channel && channel.isText()) {
            let message: string = joinEvent.message.replaceAll('${USER_MENTION}', `${member.user.toString()}`);
            channel.send(message);
        }
    }

    // If this join event has a role assignment.
    if (joinEvent.role_id) {
        let role: Role | undefined = member.guild.roles.cache.get(joinEvent.role_id);
        if (role) {
            try {
                await member.roles.add(role.id);
            }
            catch {
                console.log(`Failed to add role ${role.id} to user ${member.id}.`);
                return Promise.resolve();
            }
        }
    }
});

client.on('guildMemberRemove', async function (member: GuildMember | PartialGuildMember) {
    // Get the join event for this guild.
    let leaveEvent: any = await db.get(`SELECT guild_id, channel_id, message FROM leaveevents WHERE guild_id = ${member.guild.id}`);

    // If this join event has a leave message.
    if (leaveEvent.channel_id && leaveEvent.message) {
        let channel: GuildBasedChannel | undefined = member.guild.channels.cache.get(leaveEvent.channel_id);

        if (channel && channel.isText()) {
            let message: string = leaveEvent.message.replaceAll('${USER_NAME}', `${member.user.username}`);
            channel.send(message);
        }
    }
});