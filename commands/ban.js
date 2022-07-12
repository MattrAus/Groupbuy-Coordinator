const {
    SlashCommandBuilder
} = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v9');
const Discord = require("discord.js");
const auth = require('../config.json');

const Sequelize = require('sequelize');
const sequelize = new Sequelize('database', 'user', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    logging: false,
    // SQLite only
    storage: 'database.sqlite',
});

const Groupbuys = sequelize.define('groupbuy', {
    id: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true,
        unique: true,
    },
    guild_id: {
        type: Sequelize.STRING,
        unique: true,
    },
    title: Sequelize.STRING,
    artist: Sequelize.STRING,
    length: Sequelize.STRING,
    price: Sequelize.STRING,
    additional: Sequelize.STRING,
    message_groupbuy_information: Sequelize.STRING,
    message_payment_information: Sequelize.STRING,
    pledged: {
        type: Sequelize.DOUBLE,
        defaultValue: 0,
    },
    paid: {
        type: Sequelize.DOUBLE,
        defaultValue: 0,
    },
    threshold: Sequelize.DOUBLE,
    open_at_amount: Sequelize.DOUBLE,
    role_owner: Sequelize.STRING,
    role_coordinator: Sequelize.STRING,
    role_administrator: Sequelize.STRING,
    role_moderator: Sequelize.STRING,
    role_seller: Sequelize.STRING,
    role_middleman: Sequelize.STRING,
    role_collector: Sequelize.STRING,
    role_paid: Sequelize.STRING,
    role_pledged: Sequelize.STRING,
    role_nopledge: Sequelize.STRING,
    channel_membercount: Sequelize.STRING,
    category_info: Sequelize.STRING,
    channel_information: Sequelize.STRING,
    channel_announcements: Sequelize.STRING,
    category_payment: Sequelize.STRING,
    channel_paymentinfo: Sequelize.STRING,
    channel_paidscreenshot: Sequelize.STRING,
    channel_paidamount: Sequelize.STRING,
    category_pledge: Sequelize.STRING,
    channel_pledges: Sequelize.STRING,
    channel_pledgeamount: Sequelize.STRING,
    category_chat: Sequelize.STRING,
    channel_general: Sequelize.STRING,
    channel_paidchat: Sequelize.STRING,
    category_moderation: Sequelize.STRING,
    channel_modchat: Sequelize.STRING,
    channel_botchat: Sequelize.STRING,
    channel_connections: Sequelize.STRING,
    closedAt: Sequelize.DATE,

    // // Unused
    // role_muted: Sequelize.STRING,
    // channel_faq: Sequelize.STRING,
    // channel_snippet: Sequelize.STRING,
});
const Bans = sequelize.define('ban', {
    user_id: {
        primaryKey: true,
        type: Sequelize.STRING,
        unique: true,
    },
    banner_id: Sequelize.STRING,
    reason: Sequelize.STRING,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban-permanent')
        .setDescription(`Permanently ban users from future groupbuys.`)
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a user to the ban list.')
            .addUserOption(option => option.setName('user').setRequired(true).setDescription('The user to ban.'))
            .addStringOption(option => option.setName('delete_messages').setDescription('How much of their recent message history to delete').addChoices(
                { name: `Don't Delete Any`, value: '0' },
                { name: `Previous 24 Hours`, value: '1' },
                { name: 'Previous 7 Days', value: '7' },
            ))
            .addStringOption(option => option.setName('reason').setDescription('The reason for banning, if any')))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a user from the ban list.')
            .addUserOption(option => option.setName('user').setRequired(true).setDescription('The user to unban.')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const banner = interaction.member;
        const groupbuy = await Groupbuys.findOne({ where: { guild_id: interaction.member.guild.id } });
        if (!interaction.member.roles.cache.has(groupbuy.role_coordinator)) return interaction.reply(`You must be a coordinator to use this command.`);

        if (interaction.options.getSubcommand() === 'add') {

            const user = interaction.options.getUser('user');
            const days = interaction.options.getString('delete_messages');
            let reason = interaction.options.getString('reason');
            if (!reason) reason = 'No reason given';
            const embed = new Discord.MessageEmbed();

            interaction.guild.members.ban(user, { reason: `Permanent: ${reason} by ${banner.displayName}`, days: days });
            const isBanned = await Bans.findOne({ where: { user_id: user.id } });
            if (isBanned) {
                embed.setDescription(`${user.username} is already banned from future groupbuys.`).setColor('LIGHT_GREY');
                return interaction.reply({
                    embeds: [embed]
                });
            }
            const ban = await Bans.create({
                user_id: user.id,
                banner_id: banner.id,
                reason: reason,
            });
            if (ban) embed.setDescription(`Successfully banned ${user.toString()} from future groupbuys.`).setColor('GREEN');
            else embed.setDescription(`Failed to ban ${user.toString()} from future groupbuys.`).setColor('RED');

            return interaction.reply({
                embeds: [embed]
            });
        } 
        
        else if (interaction.options.getSubcommand() === 'remove') {

            const user = interaction.options.getUser('user');
            interaction.guild.members.unban(user, { reason: `Permanently unbanned by ${banner.displayName}` });
            const ban = await Bans.findOne({ where: { user_id: user.id } });
            const embed = new Discord.MessageEmbed()

            if (!ban) {
                embed.setDescription(`${user.toString()} wasn't permanently banned.`).setColor('LIGHT_GREY');
            }
            else {
                await ban.destroy();
                embed.setDescription(`Successfully unbanned ${user.toString()} from future groupbuys.`).setColor('GREEN');
            }
            return interaction.reply({
                embeds: [embed]
            });
        }
    }
};