import { Command } from '../command';
import { Message, MessageAttachment, MessageEmbed } from 'discord.js';
import { BOT_COLOR, ERROR_EMBED } from '../common';
import { db } from '../db';
import { Canvas, CanvasRenderingContext2D, createCanvas, Image, loadImage } from 'canvas';
import { roundedRect, roundedImage, PANEL_COLOR, TEXT_COLOR, PODIUM_COLORS } from '../drawing';

module.exports = {
    name: "rank",
    command: new Command(rank, new MessageEmbed({
        color: BOT_COLOR,
        title: 'rank',
        description: 'Show your server rank, TWR-XP and Funk Points.',
        fields: [{ name: 'Examples', value: '```bash\ns/rank\n```' }]
    }))
}

export async function rank(msg: Message, args: string): Promise<void> {
    // Get your rank, TWR-XP and Funk Points.
    let userxp: any;
    let user: any;
    let nextRole: any;
    try {
        userxp = await db.get(`SELECT res.xp, res.rank FROM (SELECT user_id, xp, ROW_NUMBER() OVER (ORDER BY xp DESC) rank FROM userguildxp) res WHERE user_id = ${msg.author.id}`)
        user = await db.get(`SELECT reputation FROM users WHERE user_id = ${msg.author.id}`);
        nextRole = await db.get(`SELECT role_id, xp FROM leveledroles WHERE (xp > ${userxp.xp} AND guild_id = ${msg.guildId}) ORDER BY xp ASC`);
    }
    catch {
        return Promise.reject(ERROR_EMBED.setDescription('❌ Error fetching your rank details!'));
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

    if (!msg.guild)
        return Promise.reject(ERROR_EMBED.setDescription('❌ Unknown Guild error!'));

    if (textOnly) {
        let fields = [{ name: 'Rank', value: `#${userxp.rank}` },
        { name: 'TWRP-XP', value: `\`${userxp.xp}\`` },
        { name: 'Funk Points', value: `${user.reputation}` },
        { name: 'Next Role', value: `${(nextRole) ? msg.guild.roles.cache.get(nextRole.role_id) : 'None'} - **(${userxp.xp}/${nextRole.xp})**` }];

        msg.channel.send({
            embeds: [new MessageEmbed({
                color: BOT_COLOR,
                title: `Rank card for ${msg.author.username}`,
                fields: fields,
                thumbnail: { url: `${msg.author.avatarURL()}` },
            })],
        });

        return Promise.resolve();
    }

    const canvas: Canvas = createCanvas(560, 256);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    // Stores text that needs to be both measured and drawn to avoid duplicate strings.
    let text: string;

    // Background image.
    await loadImage('../res/rank_bg.png').then(img => { ctx.drawImage(img, 0, 0, 560, 256); }).catch();

    // Panel for the user's avatar and Funk Points.
    ctx.fillStyle = PANEL_COLOR;
    roundedRect(ctx, 14, 14, 188, 228, 20);

    // Fetch and draw the user's avatar PNG.
    await loadImage(msg.author.displayAvatarURL({ format: 'png' }))
    .then(pfp => { roundedImage(ctx, pfp, 28, 28, 160, 160, 20); }).catch();

    ctx.font = '30px "Montserrat Black"';
    ctx.fillStyle = TEXT_COLOR;
    text = `${user.reputation} FP`;
    ctx.fillText(text, 105 - (ctx.measureText(text).width / 2), 225, 160);

    // Panel for the user's username and rank.
    ctx.fillStyle = PANEL_COLOR;
    roundedRect(ctx, 216, 14, 330, 50, 20);

    // Draw their username and rank.
    ctx.font = '25px "Montserrat ExtraBold"';
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(`${msg.author.username}`, 230, 47, 250);

    // Top 3 gold, silver and bronze.
    if (userxp.rank < 4)
        ctx.fillStyle = PODIUM_COLORS[userxp.rank - 1];
    ctx.font = '25px "Montserrat Black"';
    ctx.fillText(`#${userxp.rank}`, 532 - ctx.measureText(`#${userxp.rank}`).width, 47, 200);

    // Panel for XP progress bar and next leveled role.
    ctx.fillStyle = PANEL_COLOR;
    roundedRect(ctx, 216, 78, 330, 164, 20);
    // Progress bar background.
    ctx.fillStyle = 'rgba(80, 80, 80, 0.75)';
    roundedRect(ctx, 230, 92, 302, 40, 22);
    // Progress bar progress foreground.
    ctx.fillStyle = 'rgba(140, 140, 140, 0.75)';
    roundedRect(ctx, 230, 92, 302 * (userxp.xp / nextRole.xp), 40, 22);

    ctx.font = '20px "Montserrat ExtraBold"';
    ctx.fillStyle = TEXT_COLOR;
    text = `${userxp.xp}/${nextRole.xp}`;
    ctx.fillText(text, 381 - (ctx.measureText(text).width / 2), 120, 302);

    ctx.font = '22px "Montserrat Black"';
    text  = 'Next Role';
    ctx.fillText(text, 381 - (ctx.measureText(text).width / 2), 170, 302);

    ctx.font = '30px "Montserrat Black"';
    text = 'None';

    let role = msg.guild.roles.cache.get(nextRole.role_id);
    if (role)
        text = role.name;

    ctx.fillText(text, 381 - (ctx.measureText(text).width / 2), 210, 302);

    msg.channel.send({ files: [new MessageAttachment(canvas.toBuffer(), 'rank.png')] });
}