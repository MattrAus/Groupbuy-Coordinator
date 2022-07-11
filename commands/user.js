const { ContextMenuCommandBuilder } = require('@discordjs/builders');
const { ApplicationCommandType, PermissionFlagsBits } = require('discord-api-types/v9');


module.exports = {
        data: new ContextMenuCommandBuilder()
        .setName('Groupbuy Statistics')
        .setType(ApplicationCommandType.User)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
};