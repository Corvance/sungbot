import * as sql from 'sqlite3';
import { EventEmitter } from 'events';

export class BotDatabase {
    db: sql.Database;
    initialiser: EventEmitter;

    constructor(dbFilePath: string) {
        this.db = new sql.Database(dbFilePath, (err) => {
            if (err) {
                console.log('Could not connect to DB.');
            }
            else {
                console.log('Connected to DB.');
            }
        });

        this.initialiser = new EventEmitter();
    }

    run(sql: string, params = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function (err) {
                if (err) {
                    console.log('Error running sql ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve({ id: this.lastID })
                }
            });
        });
    }

    get(sql: string, params = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, result) => {
                if (err) {
                    console.log('Error running sql: ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve(result)
                }
            });
        });
    }

    all(sql: string, params = []): Promise<any> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.log('Error running sql: ' + sql)
                    console.log(err)
                    reject(err)
                } else {
                    resolve(rows)
                }
            });
        });
    }
}

export const db: BotDatabase = new BotDatabase('../db.sqlite3');

async function initDatabase(): Promise<void> {
    try {
        // Setup DB.
        await db.run('CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, reputation INTEGER, reputation_cooldown BOOLEAN, text_only BOOLEAN)');
        await db.run('CREATE TABLE IF NOT EXISTS guilds (guild_id TEXT PRIMARY KEY)');
        await db.run('CREATE TABLE IF NOT EXISTS userguildxp (user_id TEXT NOT NULL, guild_id TEXT NOT NULL,' +
            ' xp INTEGER, cooldown BOOLEAN, PRIMARY KEY (user_id, guild_id), FOREIGN KEY (user_id) REFERENCES users(user_id),' +
            ' FOREIGN KEY (guild_id) REFERENCES guilds(guild_id))');
        // Reset all cooldowns that may be left on from a crash.
        await db.run('UPDATE userguildxp SET cooldown = False');
        await db.run('CREATE TABLE IF NOT EXISTS leveledroles (guild_id TEXT NOT NULL,' +
            ' role_id TEXT NOT NULL, xp INTEGER NOT NULL, message  TEXT, PRIMARY KEY(guild_id, role_id ))');
        await db.run('CREATE TABLE IF NOT EXISTS albums (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name TEXT, emoji TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS songs (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, emoji TEXT NOT NULL, album INTEGER NOT NULL, FOREIGN KEY (album) REFERENCES albums(id))');
        await db.run('CREATE TABLE IF NOT EXISTS polls (msg_id TEXT NOT NULL, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, message TEXT, options TEXT, emojis TEXT, end_time BIGINT, PRIMARY KEY (msg_id, guild_id, channel_id))');
        await db.run('CREATE TABLE IF NOT EXISTS joinevents (guild_id TEXT NOT NULL PRIMARY KEY, channel_id TEXT NOT NULL, message TEXT, role_id TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS leaveevents (guild_id TEXT NOT NULL PRIMARY KEY, channel_id TEXT NOT NULL, message TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS ratemessages (guild_id TEXT NOT NULL, rating INTEGER NOT NULL, message TEXT NOT NULL, PRIMARY KEY (guild_id, rating))')
    }
    catch (e: any) {
        return Promise.reject('Database setup failed.');
    }
}
initDatabase().then(_ => db.initialiser.emit('complete')).catch(err => {
    console.error(err);
    process.exit()
});
