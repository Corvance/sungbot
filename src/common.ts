import { Client, GuildEmoji, MessageEmbed } from "discord.js";

export const BOT_COLOR: number = 0xffb900;
export const ERROR_EMBED: MessageEmbed = new MessageEmbed({
    color: BOT_COLOR,
    title: 'Action Failed',
    description: '❌ Error!'
});

export function getNumFromParam(param : number | string | boolean | undefined) : number {
    let num: number = NaN;

    if (typeof param === "string") {
        if (param[0] === '"' && param[param.length - 1] === '"')
            param = param.slice(1, -1);

        num = parseInt(param);
    }
    else if (param !== undefined && typeof param !== "boolean")
        num = param;

    return num;
}

export function getFloatFromParam(param: number | string | boolean | undefined): number {
    let num: number = NaN;

    if (typeof param === "string") {
        if (param[0] === '"' && param[param.length - 1] === '"')
            param = param.slice(1, -1);

        num = parseFloat(param);
    }
    else if (param !== undefined && typeof param !== "boolean")
        num = param;

    return num;
}

export function getEmoji(client: Client, emojiNameID: string) : GuildEmoji | string {
    let emoji: GuildEmoji | undefined = client.emojis.cache.get(emojiNameID);
    return (emoji) ? emoji : emojiNameID;
}

export function dateToUNIXTimestamp(date: Date) : string {
    return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function splitOnSpaceExceptQuotedBracketed(splitstr: string) : string[] {
    let arr: RegExpMatchArray | null =
        splitstr.match(/(?:(["'])(\\.|(?!\1)[^\\])*\1|\[(?:(["'])(\\.|(?!\2)[^\\])*\2|[^\]])*\]|\((?:(["'])(\\.|(?!\3)[^\\])*\3|[^)])*\)|[^ ])+/g);
    return (arr === null) ? [] : arr;
}

export function formatStringArg(arg: string) : string {
    if (arg[0] === '"' && arg[arg.length - 1] === '"')
        arg = arg.slice(1, -1);

    // Replace the text "\n" with newline characters.
    arg = arg.replace(/\\n/g, '\n');

    return arg;
}

export function convertTimeTextToSeconds(timeText: string): number | undefined {
    // Separate number from the text i.e. 2m -> 2, 4d -> 4, 16h -> 16.
    let time: number | undefined = getFloatFromParam(timeText);

    // Isolate the text timescale modifier i.e. h, d, m.
    let scale: string = timeText.replace(/[0-9]/g, '').replace(/\./g, '');

    switch (scale) {
        case 's': time *= 1; break;
        case 'm': time *= 60; break;
        case 'h': time *= 3600; break;
        case 'd': time *= 86400; break;
        case 'w': time *= 604800; break;
        case 'mo': time *= 2419200; break;
        case 'y': time *= 29030400; break;
        default: time = undefined;
    }

    if (time)
        // Cap at 1000 years.
        if (time > 29030400000)
            time = 29030400000;

    return time;
}

export function setTimeoutSeconds(callback: Function, seconds: number) : void {
    // 1000 ms in a second.
    let msInSecond = 1000;

    let secondCount = 0;
    let timer = setInterval(function() {
        secondCount++;  // A second has passed.

        if (secondCount === seconds) {
           clearInterval(timer);
           // @ts-ignore
           callback.apply(this, []);
        }
    }, msInSecond);
}