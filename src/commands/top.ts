import { Command } from '../command';
import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import { BOT_COLOR, ERROR_EMBED, getNumFromParam } from '../common';
import { db } from '../db';
import { Canvas, CanvasRenderingContext2D, createCanvas, Image, loadImage } from 'canvas';
import { roundedRect, PODIUM_COLORS } from '../drawing';

module.exports = {
    name: "top",
    command: new Command(top, new MessageEmbed({
        color: BOT_COLOR,
        title: 'top',
        description: 'Fetch a top 10 leaderboard of TWR-XP.',
        fields: [
            { name: 'page', value: 'Number referring to the leaderboard page to view.' },
            { name: 'Examples', value: '```bash\ns/top\ns/top 3\n```' }
        ]
    }))
}

export async function top(msg: Message, args: string): Promise<void> {
    let numRanks = await db.get(`SELECT COUNT() FROM userguildxp WHERE guild_id = ${msg.guildId}`)
        .catch(_ => { return Promise.reject(ERROR_EMBED.setDescription('❌ Error fetching leaderboard data!')) });
    let userRank = await db.get(`SELECT res.user_id, res.rank FROM (SELECT user_id, xp, ROW_NUMBER() OVER (ORDER BY xp DESC) rank FROM userguildxp) res WHERE user_id = ${msg.author.id}`)

    // let userRank = await db.get(`SELECT user_id, ROW_NUMBER() OVER (ORDER BY xp) rank FROM userguildxp WHERE user_id = ${msg.author.id}`)
        .catch(_ => { return Promise.reject(ERROR_EMBED.setDescription('❌ Error determining rank!')) });

    let page: number = getNumFromParam(args.split(' ')[0]);
    let lastPage: number = Math.floor(numRanks['COUNT()'] / 10) + 1;
    if (page < 1 || isNaN(page)) page = 1;
    if (page > Math.floor(numRanks['COUNT()'] / 10) + 1) {
        page = Math.floor(numRanks['COUNT()'] / 10) + 1;
    }

    let topTen: any[] = await db.all(`SELECT user_id, xp FROM userguildxp WHERE guild_id = ${msg.guildId} ORDER BY xp DESC LIMIT ${(page - 1) * 10}, 10`)
        .catch(_ => { return Promise.reject(ERROR_EMBED.setDescription('❌ Error fetching page members!')) });

    if (!(topTen instanceof Array) || !msg.guild)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Unknown Guild error!'));

    let list: string[][] = [];
    for (let i = 0; i < 10; i++) {
        let position = i + 1 + (10 * (page - 1));
        // Default to no user at this position.
        list[i] = [`#${position}`, ' -', '0'];
        if (topTen[i]) {
            let user = msg.guild.client.users.cache.get(topTen[i].user_id);
            if (user) {
                list[i] = [`#${position}`, `${user.username}`, topTen[i].xp];
            }
        }
    }

    // Text-only version.
    let textOnly: boolean;
    try {
        let res = await db.get(`SELECT text_only FROM users WHERE user_id = ${msg.author.id}`);
        textOnly = res.text_only;
    }
    catch {
        textOnly = false;
    }

    if (textOnly) {
        let topText: string = '';

        // Podium.
        for (let i = 0; i < list.length; i++) {
            topText += `${list[i][0]} ${list[i][1]} - \`${list[i][2]}\``;
            if (page === 1 && i < 3)
                topText += ['🥇', '🥈', '🥉'][i];
            topText += '\n';
        }

        msg.channel.send({
            embeds: [new MessageEmbed({
                color: BOT_COLOR,
                title: `TWR-XP Leaderboard for ${msg.guild.name}`,
                description: `You are rank \`#${userRank.rank}\`!\n\n${topText}`,
                thumbnail: { url: `${msg.guild.iconURL()}` },
                footer: { text: `Page ${page} of ${lastPage} - use s/top ${page + 1} to see page ${page + 1}` }
            })],
        });

        return Promise.resolve();
    }

    const canvas: Canvas = createCanvas(600, 530);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

    await loadImage('../res/leaderboard_bg.png').then(img => ctx.drawImage(img, 0, 0, 600, 530)).catch();

    for (let i = 0; i < list.length; i++) {
        ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
        roundedRect(ctx, 20, 20 + (i * 50), 560, 40, 15);

        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';

        // Podium colours.
        if (page === 1 && i < 3)
            ctx.fillStyle = PODIUM_COLORS[i];

        ctx.textDrawingMode = 'path';
        ctx.font = '24px "Montserrat ExtraBold"';
        ctx.fillText(list[i][0] + ' ', 30, 48 + (i * 50), 100);

        ctx.beginPath();
        ctx.arc(30 + ctx.measureText(list[i][0] + '  ').width, 40 + (i * 50), 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = '22px "Montserrat Medium"';
        ctx.fillText(list[i][1], 30 + ctx.measureText(list[i][0] + '     ').width, 48 + (i * 50), 360);

        // Always draw TWR-XP in white.
        ctx.font = '24px "Montserrat Bold"';
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillText(list[i][2], 555 - ctx.measureText(list[i][2]).width, 48 + (i * 50), 100);
    }

    msg.channel.send({
        embeds: [new MessageEmbed({
            color: BOT_COLOR,
            title: `TWR-XP Leaderboard for ${msg.guild.name}`,
            description: `You are rank #${userRank.rank}!`,
            image: { url: `attachment://top.png` },
            thumbnail: { url: `${msg.guild.iconURL()}` },
            footer: { text: `Page ${page} of ${lastPage} - use s/top ${page + 1} to see page ${page + 1}` }
        })],
        files: [new MessageAttachment(canvas.toBuffer(), 'top.png')]
    });
}
