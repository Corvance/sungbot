import { Command } from '../command';
import { Message, MessageEmbed } from "discord.js";
import { BOT_COLOR } from '../common';
let mw = require('nodemw');
const wt = require('wikitext2plaintext');

module.exports = {
    name: 'wiki',
    command: new Command(wiki, new MessageEmbed({
        color: BOT_COLOR,
        title: 'wiki',
        description: 'Searches the TWRP Fandom Wiki for an article matching your search term.',
        fields: [
            {
                name: '`search`',
                value: 'The search term.'
            },
            {
                name: '**Examples**',
                value: '```bash\n'
                    + 's/wiki Doctor Sung\n'
                    + '```'
            }
        ]
    }))
}

let wclient = new mw({
    protocol: 'https',
    server: 'twrp.fandom.com',
    path: '',
    debug: false
});
let parser = new wt();


async function wiki(msg: Message, args: string): Promise<void> {
    if (!args || args === '')
        args = 'TWRP';

    let title: string = await wikiSearchTitle(args).catch(_ => {
        return Promise.reject(new MessageEmbed({
            color: BOT_COLOR,
            title: '❌ No Match Found'
        }));
    });

    let imageName, imageUrl: string;

    try {
        imageName = await wikiGetTopArticleImageName(title);
        imageUrl = await wikiGetImageUrl(imageName);
    }
    catch {
        imageName = '';
        imageUrl = '';
    }

    let summary: string;
    try { summary = await wikiGetArticleSummary(title) }
    catch { summary = 'No text found for this page.' };

    if (!msg.channel.isVoice()) {
        msg.channel.send({
            embeds: [
                {
                    color: BOT_COLOR,
                    title: title,
                    description: summary,
                    url: `http://twrp.fandom.com/${title.replace(/ /g, '_')}`,
                    thumbnail: { url: imageUrl }
                }
            ]
        });
    }
}

// Promisifications

function wikiSearchTitle(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
        wclient.search(key, (err: any, data: any) => {
            if (err || !(data instanceof Array) || data.length === 0)
                reject();
            else
                resolve(data[0].title);
        });
    });
}

function wikiGetTopArticleImageName(title: string): Promise<string> {
    return new Promise((resolve, reject) => {
        wclient.getImagesFromArticle(title, (err: any, images: any) => {
            if (err || !(images instanceof Array) || images.length === 0) {
                reject();
            }
            else
                resolve(images[0].title);
        });
    });
}

function wikiGetImageUrl(name: string): Promise<string> {
    return new Promise((resolve, reject) => {
        wclient.getImageInfo(name, (err: any, data: any) => {
            err ? reject() : resolve(data.url);
        });
    });
}

function wikiGetArticleSummary(title: string): Promise<string> {
    return new Promise((resolve, reject) => {
        wclient.api.call({ action: "parse", page: `${title}`, format: "json", prop: "wikitext", section: "0" }, (err: any, info: any, next: any, data: any) => {
            err ? reject() : resolve(parser.parse(data.parse.wikitext['*']));
        })
    });
}