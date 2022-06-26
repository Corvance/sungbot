# SungBot

SungBot is a TWRP-themed general purpose bot created for the [Ladyworld Discord server](https://discord.gg/NZGZJ2C), originally to replace existing 3rd party bots that began working with NFTs, cryptocurrency and other blockchain technology. TWRP is a Canadian band most recongisable for their costumed personas, concealing their real identities. You should check them out!

The hosted instance of this bot uses cropped album artfor background images of commands. For copyright reasons, the images in the `res` directory in this repository are just blank white - replace them with your own in practice. Additionally, the bot fills out its sqlite3 database on startup if it's empty, but you must provide the empty db.sqlite3 file and fill out the leveled roles list yourself.

**NOTE**: Due to some other complications, the original repository had to be abandoned, so the initial commit of this one is monolithic. All changes after that are done properly.

## Features

- TWR-XP experience system, giving users XP per message with a cooldown.
    1 - Leveled roles awarded based on TWR-XP, with an optional custom message for each.
    2 - A leaderboard command to generate a nice-looking image of the top 10 (or 20, 30, 40 etc.).
    3 - Rank checking, with a generated image.
- Funk Points - similar to reputation points in other bots, where users can give one per 24 hours to another user. These are a global value, so persist across all servers a particular SungBot instance is in.
- TWRP Fandom Wiki searching with summary embeds.
- Timed polls, with a convenience command to auto-generate a poll of TWRP songs.
- Convenience and fun commands like avatar fetching, rating etc.

## Accessibility

Some commands generate images to show their content (leaderboard, user rank, etc.). To maintain accessibility for the blind or partially-sighted using screen readers, users can toggle a blanket setting forcing text-based versions of these commands. This is done with the command `s/textonly`. Feel free to open an issue for other accessibility improvements :)

## Usage

To run the bot, install the dependencies, compile the TypeScript to JavaScript with `tsc`, enter the `dist` directory and run `node bot.js` with the environment SUNGBOT_TOKEN set to your bot token.

```bash
git clone https://www.github.com/corvance/sungbot
cd sungbot

npm i --save-dev typescript dotenv discord.js canvas nodemw wikitext2plaintext sqlite3 @types/sqlite3

export SUNGBOT_TOKEN=1234567890_abcdefghijklmnopqrstuvwxyz.ABCDEFGHIJKLMNOPQRSTUVWXYZ_12345
npm run compile && npm run start
```

You can run a testing instance of the bot using a Discord application bot with a username ending in '-Testing', changing the prefix from s/ to st/.

## Dependencies

- `discord.js` - The Discord bot development library.
- `dotenv` - For loading the bot token from .env files in local development.
- `sqlite3` - Fro sqlite3 database usage.
- `nodemw` and `wikitext2plaintext` - For MediaWiki API use with the TWRP Fandom Wiki.
- `canvas` - For creating dynamic images.

## License

This repository is subject to the terms of the MIT License, available at the LICENSE file in the root directory.
