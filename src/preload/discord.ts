const e = require('electron');

e.ipcRenderer.on('sendMessage', (e, token, props, channel, message) => {
    // @ts-ignore
    const req = new XMLHttpRequest;
    req.open('POST', `https://discordapp.com/api/v6/channels/${channel}/messages`);
    req.setRequestHeader('authorization', token);
    req.setRequestHeader('x-super-properties', props);
    req.setRequestHeader('content-type', 'application/json');
    req.send(JSON.stringify({
        content: message,
        nonce: Math.floor(Math.random() * 100000000000000000 + 600000000000000000),
        tts: false
    }));
});