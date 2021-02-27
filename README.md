# fishgod  

I made this tool to automate a discord bot called Virtual Fisher ([link](https://virtualfisher.com/)) shortly after it has been released.  

It uses an electron window that opens the discord web client with some preloads to send requests to discord and avoid user-bot detection.
Furthermore it also uses the discord.js library and a Bot Account that can read messages in the server this tool is playing in.  

## Notes  

1. This was never designed to be released or anything and the code is very hacky compared to what I would usually produce, just thought it was an interesting project to work on.  

2. Discords frontend is able to detect if its being ran in electron by checking for nodejs integration so I had to disable that. 

3. The discord auth token and client properties (props are probably not needed but I sent them for good measures) are currently supplied by the user before starting the tool but could be read out of the electron window after discord is logged in.  

