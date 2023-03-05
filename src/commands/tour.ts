import { Command } from '../command';
import { Message, MessageAttachment, MessageEmbed } from "discord.js";
import { BOT_COLOR, getNumFromParam } from '../common';
import { JSDOM } from 'jsdom';
import { db } from '../db';
import { Canvas, CanvasRenderingContext2D, createCanvas, Image, loadImage } from 'canvas';
import { roundedRect } from '../drawing';

module.exports = {
    name: 'tour',
    command: new Command(tour, new MessageEmbed({
        color: BOT_COLOR,
        title: 'tour',
        description: 'Returns upcoming TWRP tour dates.',
        fields: [
            {
                name: '**Example**',
                value: '```bash\n'
                    + 's/tour\n'
                    + 's/tour 2\n'
                    + '```'
            }
        ]
    }))
}

async function tour(msg: Message, args: string): Promise<void> {
    let dom = await JSDOM.fromURL('https://tix.to/TWRP').catch(_ => {
        return Promise.reject(new MessageEmbed({
            color: BOT_COLOR,
            title: '❌ Failed to load tour dates site!'
        }));
    });

    let tourDatesResponse = dom.window.document.getElementsByClassName('music-service-list__link');
    let tourDates: string[][] = [];
    for (let i = 0; i < tourDatesResponse.length; i++) {
        let text: string | null = tourDatesResponse[i].textContent;
        if (text) {
            let items = text.trim().split('\n');
            tourDates.push([`${items[0].trim()}`, `${items[1].trim()}`, `${items[4].trim()}`]);
        }
    }

    let page: number = getNumFromParam(args.split(' ')[0]);
    let lastPage: number = Math.floor(tourDates.length / 10) + 1;
    if (page < 1 || isNaN(page)) page = 1;
    if (page > lastPage)
        page = lastPage;
    tourDates.splice(0, (page - 1) * 10);

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
        let description: string = '';
        for (let i = 0; i < Math.min(10, tourDates.length); i++) {
            description += '**' + tourDates[i][0] + ' ' + tourDates[i][1] + '** ● ' + tourDates[i][2] + '\n';
        }

        msg.channel.send({
            embeds: [new MessageEmbed({
                color: BOT_COLOR,
                title: 'Upcoming Tour Dates for TWRP',
                description: description,
                footer: { text: `Page ${page} of ${lastPage} - use s/tour ${page + 1} to see page ${page + 1}` }
            })]
        });

        return Promise.resolve();
    }

    const canvas: Canvas = createCanvas(600, 530);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

    await loadImage('../res/leaderboard_bg.png').then(img => ctx.drawImage(img, 0, 0, 600, 530)).catch();

    for (let i = 0; i < Math.min(10, tourDates.length); i++) {
        ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
        roundedRect(ctx, 20, 20 + (i * 50), 560, 40, 15);

        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';

        ctx.textDrawingMode = 'path';
        ctx.font = '24px "Montserrat ExtraBold"';
        ctx.fillText(tourDates[i][0] + ' ' + tourDates[i][1] + ' ', 30, 48 + (i * 50), 100);

        ctx.beginPath();
        ctx.arc(30 + ctx.measureText(tourDates[i][0] + ' ' + tourDates[i][1] + '  ').width, 40 + (i * 50), 5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = '22px "Montserrat Medium"';
        ctx.fillText(tourDates[i][2], 30 + ctx.measureText(tourDates[i][0] + ' ' + tourDates[i][1] + '       ').width, 48 + (i * 50), 360);
    }

    msg.channel.send({
        embeds: [new MessageEmbed({
            color: BOT_COLOR,
            title: `Upcoming Tour Dates for TWRP`,
            image: { url: `attachment://top.png` },
            footer: { text: `Page ${page} of ${lastPage} - use s/tour ${page + 1} to see page ${page + 1}` }
        })],
        files: [new MessageAttachment(canvas.toBuffer(), 'top.png')]
    });
}
