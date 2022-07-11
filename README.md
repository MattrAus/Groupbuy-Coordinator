# Groupbuy Coordinator
 Discord Bot to assist in multi-user donations for a singular item.

---

## Installation

```
git clone https://github.com/MattrAus/Groupbuy-Coordinator.git
cd .\Groupbuy-Coordinator\
npm install
```

---

## Configuration

In order to run the Groupbuy Coordinator on your own bot, you'll have to edit the **`config.json`** to include your own Token and IDs.

```json
{
    "token": "TOKEN",
    "bot_owner_id": "OWNER_ID",
    "bot_id": "BOT_ID"
}
```
**Token:** is available at https://discord.com/developers/applications/XXX/bot
*Replace `XXX` with your Bot's ID*

*To get User IDs, you must enable Developer Mode in `Settings -> Advanced -> Developer Mode`* 
**Owner ID:** Right-click your own name in Discord -> `Copy ID`
**Bot ID:** This is the same as `XXX` from above - Right-click your bot in Discord -> `Copy ID`

---

## Running

To enable */commands*, run 
```javascript
node .\register.js
```

Then to bring the bot to life, run
```javascript
node .\groupbuy.js
```

This command will need to remain running for the bot to function.
*I'd recommend installing a process manager like [PM2](https://discordjs.guide/improving-dev-environment/pm2.html#installation)*

---

## Development

##### TODO:
* Add */command* to change `groupbuy.open_at_amount`
