import { Canvas, CanvasRenderingContext2D, Image, registerFont } from 'canvas';

export const TEXT_COLOR: string = 'rgba(255, 255, 255, 1.0)';
export const PANEL_COLOR: string = 'rgba(40, 40, 40, 0.5)';

export const PODIUM_COLORS = ['rgba(238, 185, 52, 1.0)', 'rgba(202, 202, 202, 1.0)', 'rgb(180, 115, 49, 1.0)'];

export function loadFonts() {
    registerFont('../res/montserrat/Montserrat-Light.ttf', {family: 'Montserrat', weight: 'bold'});
    registerFont('../res/montserrat/Montserrat-Medium.ttf', {family: 'Montserrat', weight: 'bold'});
    registerFont('../res/montserrat/Montserrat-SemiBold.ttf', {family: 'Montserrat', weight: 'bold'});
    registerFont('../res/montserrat/Montserrat-ExtraBold.ttf', {family: 'Montserrat', weight: 'bold'});
    registerFont('../res/montserrat/Montserrat-Black.ttf', {family: 'Montserrat', weight: 'bold'});
}

export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    if (!radius) {
        radius = 5;
    }

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
    ctx.closePath();
}

export function roundedImage(ctx: CanvasRenderingContext2D, img: Image, x: number, y: number, width: number, height: number, radius: number) {
    if (!radius) {
        radius = 5;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
}