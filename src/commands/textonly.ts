import { Command } from '../command';
import { Message, MessageEmbed } from 'discord.js';
import { BOT_COLOR, ERROR_EMBED } from '../common';
import { db } from '../db';

module.exports = {
    name: "textonly",
    command: new Command(textonly, new MessageEmbed({
        color: BOT_COLOR,
        title: 'textonly',
        description: 'Toggle your text only flag so that all commands with images in their output use 100% text instead. This is useful for screen readers.', 
        fields: [{ name: 'Example', value: '```bash\ns/textonly\n```' }] }))
}

async function textonly(msg: Message) : Promise<void> {
    try {
        await db.run(`UPDATE users SET text_only = NOT text_only WHERE user_id = ${msg.author.id}`);
        let newRes: any = await db.get(`SELECT text_only FROM users WHERE user_id = ${msg.author.id}`);
        let newVal: boolean = newRes.text_only;

        msg.channel.send({embeds: [new MessageEmbed({
            color: BOT_COLOR,
            title: 'Success!',
            description: `${newVal ? '📝' : '🖼️'} Text-only output has been ${newVal ? 'enabled' : 'disabled'}.` +
            ` To ${newVal ? 'disable' : 're-enable'} it, just use this command again.`
        })]});
    }
    catch {
        Promise.reject(ERROR_EMBED.setDescription('❌ Something went wrong updating your Text Only flag - try again!'));
    }
}