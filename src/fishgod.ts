import { app, BrowserWindow, ipcMain } from 'electron';
import { join, dirname } from 'path';
import { Client, Message } from 'discord.js';
import { parse } from 'url';

const settings = require('../settings.json');

const discordBotToken = "";

app.once('ready', () => {
    let stopped = false;
    let halted = false;
    let locked = false;
    let autofish5m = true;
    let autotreasure20m = true;
    let autoauto10m = true;
    let lastverify;
    let fishTimeout: NodeJS.Timeout;
    setTimeout(() => (halted = true), 300 * 60 * 1000);
    const commands = {};
    const discordWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            preload: join(__dirname, './preload/discord.js')
        },
        minHeight: 700,
        minWidth: 1100
    });
    const uiWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    });
    uiWindow.loadURL(join(__dirname, '../html/ui.html'))
    discordWindow.loadURL('https://discordapp.com/channels/@me');
    const discordbot = new Client();
    discordbot.login(discordBotToken).then(() => {
        uiWindow.webContents.send('addServerOptions', discordbot.guilds.map(guild => [guild.id, guild.name]));
    });
    const sendMessage = (channel, content) => {
        if (!halted && !locked) discordWindow.webContents.send('sendMessage', settings.token, settings.props, channel, content);
    }
    ipcMain.on('selectServer', (e, id) => {
        console.log('selected server', id);
        const guild = discordbot.guilds.get(id);
        uiWindow.webContents.send('addUserOptions', guild.members.filter(member => !member.user.bot).map(member => [member.id, member.displayName]));
        ipcMain.on('selectUser', (e, id) => {
            console.log('selected user', id);
            const user = guild.members.get(id);
            uiWindow.webContents.send('addChannelOptions', guild.channels.filter(channel => channel.type === 'text').map(channel => [channel.id, channel.name]));
            ipcMain.on('selectChannel', (e, id) => {
                console.log('selected channel', id);
                discordWindow.loadURL('https://discordapp.com/channels/' + guild.id + '/' + id);
                const channel = guild.channels.get(id);
                uiWindow.webContents.send('addBotOptions', guild.members.filter(member => member.user.bot).map(member => [member.id, member.displayName]));
                ipcMain.on('selectBot', (e, id) => {
                    const fishbot = guild.members.get(id);
                    uiWindow.webContents.send('done');
                    discordbot.on('message', (message) => {
                        if (message.author === fishbot.user && message.channel === channel) {
                            const classification = parseMessage(message);
                            console.log('found message(s) from the bot:', ...classification);
                            if (classification.length === 0 || classification.includes('nonematch')) {
                                console.log(message.content || message.embeds);
                                halted = true;
                            } 
                        }
                    });
                    const fish = () => {
                        sendMessage(channel.id, '.f')
                        if (!stopped) fishTimeout = setTimeout(fish, settings.cd);
                    }
                    const verify = code => {
                        if (lastverify && Date.now() < lastverify + 15000) return;
                        console.log('verifying: ', code);
                        locked = true;
                        setTimeout(() => {
                            discordWindow.webContents.send('sendMessage', settings.token, settings.props, channel.id, `.verify ${code}`);
                            setTimeout(() => {
                                locked = false;
                                lastverify = Date.now();
                            }, 500);
                        }, 1500 + Math.floor(Math.random() * 3500));
                    }
                    const parseMessage = (message: Message) => {
                        if (message.content) {
                            if (message.content.startsWith('You must wait before fishing again (')) return ['fishingcd'];
                            else if (message.content.startsWith('You now own the ')) return ['boatpurchase'];
                            else if (message.content.startsWith('You sold your entire inventory for **')) return ['sell'];
                            else if (message.content === 'Not a valid item name.') return ['novaliditem'];
                            else if (message.content.startsWith('You must be level ')) return ['leveltoolow'];
                            else if (message.content === 'You may now continue.') return ['captchaverify'];
                            else if (message.content.startsWith(`${user.displayName}, Please verify by adding the following 2 numbers and subtracting the third number:`)) {
                                const [ n1, n2, n3 ] = message.content.split('and subtracting the third number: ')[1].split('.')[0].split(' : ');
                                verify((parseInt(n1) + parseInt(n2) - parseInt(n3)).toString());
                                return ['captchamathcombo'];
                            } else if (message.content.startsWith('Your bar is now ')) return ['barcolor'];
                            else if (message.content.startsWith('You just bought ')) return ['upgradepurchase'];
                            else if (message.content.includes(`${user.displayName}, Please type in this code: `)) {
                                verify(message.content.split('Please type in this code: ')[1]);
                                return ['captchacode'];
                            } else if (message.content.startsWith('To continue, please subtract the following 2 numbers:')) {
                                const [ n1, n2 ] = message.content.split('following 2 numbers: ')[1].split(', ');
                                verify((parseInt(n1) - parseInt(n2)).toString());
                                return ['captchamathsub'];
                            } else if (message.content.startsWith('You are already boosting that! Time left: ')) return ['alreadyboosting'];
                            else if (message.content.startsWith('Command on cooldown!')) return ['commandcooldown'];
                            else if (message.content === "You can't afford that upgrade.") return ['cantafford'];
                            else if (message.content.startsWith('You will now catch more fish for the next')) return ['fishboostpurchase'];
                            else if (message.content.startsWith('You will now find more treasure for the next')) return ['treasureboostpurchase'];
                            else if (message.content.startsWith('You hired a worker for the next')) return ['workerpurchase'];
                            else if (message.content.startsWith('You already have a worker working. Time left: ')) return ['alredyworking'];
                            else if (message.content.startsWith('Your worker has stopped working. he caught a total of ') || message.content.startsWith('Your worker fished ')) {
                                if (autoauto10m) sendMessage(channel.id, '.buy auto10m');
                                return ['workerdone'];
                            } else if (message.content.startsWith('You joined the clan ')) return ['clanjoin'];
                            else if (message.content.startsWith('You are now using ')) return ['baitswitch'];
                            else if (message.content.startsWith('You are fishing in the ')) return ['biomeinfo'];
                            else if (message.content.startsWith('You are now fishing in the')) return ['biomeswitch'];
                            else if (message.content === 'Reminder: Vote with %vote for rewards!') return ['voteremind'];
                        } else {
                            const res = [];
                            for (const embed of message.embeds) {
                                if (embed.author && embed.author.name === user.displayName) {
                                    if (embed.title === 'You caught:') {
                                        // automatically refresh fishing and treasure boosts
                                        if (embed.description.includes('Your fishing boost ended!')) {
                                            if (autofish5m) sendMessage(channel.id, '.buy fish5m');
                                        }
                                        if (embed.description.includes('Your treasure boost ended!')) {
                                            if (autotreasure20m) sendMessage(channel.id, '.buy treasure20m');
                                        }
                                        res.push('catch');
                                    } 
                                    if (embed.title.startsWith('Anti-bot')) {
                                        // embed based anti bot
                                        if (embed.description.startsWith('Please subtract the following 2 numbers: ')) {
                                            res.push('captchaembedsub');
                                            const [ n1, n2 ] = embed.description.split('following 2 numbers: ')[1].split('.')[0].split(', ');
                                            verify((parseInt(n1) - parseInt(n2)).toString());
                                        } else if (embed.description.startsWith('Please enter the following code to continue:')) {
                                            res.push('captchaembedcode');
                                            const code = embed.description.split('``')[1];
                                            verify(code);
                                        } else if (embed.description.startsWith('Please enter the answering to the following problem: ')) {
                                            res.push('captchaembedadd');
                                            const [ n1, n2 ] = embed.description.split('to the following problem: ')[1].split('.')[0].split(' + ');
                                            verify((parseInt(n1) + parseInt(n2)).toString());
                                        }
                                    }
                                } else if (embed.title === 'Quest Complete!') res.push('questcomplete');
                                else if (embed.title.includes('You are now level')) res.push('levelup');
                                if (embed.title.startsWith('Please include one of the following categories')) res.push('shop');
                                else if (embed.title.startsWith('**.bait <bait type>** to use bait.\n.bait none is valid.')) res.push('baitmenu');
                                else if (embed.title === 'Fishing Rod Shop') res.push('rodshop');
                                else if (embed.title.startsWith('All boats are permanent and decrease fishing cooldown and increase fish count slightly.')) res.push('boatshop');
                                else if (embed.title === 'Bait is consumed **PER CAST** so make sure to stock up.') res.push('baitshop');
                                else if (embed.title === 'Temporary Boosts') res.push('boostshop');
                                else if (embed.title.startsWith('All upgrades are **PERMANENT** and can be leveled up.')) res.push('upgradeshop');
                                else if (embed.title === 'Ocean Shop') res.push('oceanshop');
                                else if (embed.title.includes('Use .color <color name> to select color.')) res.push('colormenu');
                                else if (embed.title === 'Bait purchase') res.push('baitpurchase');
                                else if (embed.title === 'Charms are found in high tier crates. Try to get them all!') res.push('charmsmenu');
                                else if (embed.title === 'Clan Commands') res.push('clancommands');
                                else if (embed.title === 'Your fishing rods') res.push('rodmenu');
                                else if (embed.title.startsWith('Inventory of ')) res.push('inventory');
                                else if (embed.title === 'Active Boosts') res.push('boostlist');
                                else if (embed.title === 'Thank you for your vote.') res.push('registeredvote');
                            }
                            return res;
                        }
                        return ['nonematch'];
                    }
                    ipcMain.on('startFishing', (e, cd) => {
                        clearTimeout(fishTimeout);
                        settings.cd = cd * 1000;
                        stopped = false;
                        console.log('Started fishing');
                        fish();
                    });
                    const stop = () => {
                        clearTimeout(fishTimeout);
                        stopped = true;
                        console.log('Stopped fishing');
                    }
                    ipcMain.on('stopFishing', (e) => {
                        stop();
                    });
                    const updateCommands = () => {
                        uiWindow.webContents.send('updateCommands', Object.keys(commands).map(cmd =>{ return { command: cmd, cd: commands[cmd].cd, running: commands[cmd].interval ? true : false}}))
                    }
                    ipcMain.on('addCommand', (e, cmd, cd)  => {
                        cd = parseFloat(cd) * 1000;
                        if (commands[cmd] && commands[cmd].interval) clearInterval(commands[cmd].interval);
                        commands[cmd] = {
                            command: cmd,
                            cd,
                            interval: setInterval(() => {
                                sendMessage(channel.id, cmd);
                            }, cd)
                        }
                        sendMessage(channel.id, cmd);
                        updateCommands();
                    });
                    ipcMain.on('toggleCommand', (e, cmd, on)  => {
                        if (on) {
                            const command = commands[cmd];
                            command.interval = setInterval(() => {
                                sendMessage(channel.id, command.command);
                            }, command.cd);
                            sendMessage(channel.id, command.command);
                        } else {
                            if (commands[cmd] && commands[cmd].interval) {
                                clearInterval(commands[cmd].interval);
                                commands[cmd].interval = undefined;
                            } 
                        }
                        updateCommands();
                    });
                    ipcMain.on('halt!', () => {
                        halted = true;
                    });
                    ipcMain.on('resume', () => {
                        halted = false;
                    });
                });
            });
        });
    });
});