const {
    SlashCommandBuilder
} = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v9');
const Discord = require("discord.js");


module.exports = {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription(`Create a groupbuy`)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
};