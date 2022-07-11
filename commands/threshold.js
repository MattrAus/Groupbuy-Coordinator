const {
    SlashCommandBuilder,
    inlineCode,
    codeBlock,
} = require('@discordjs/builders');
const { PermissionFlagsBits } = require('discord-api-types/v10');
const Discord = require("discord.js");
const currency = require('currency.js');
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
    role_muted: Sequelize.STRING,
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
    // channel_faq: Sequelize.STRING,
    // channel_snippet: Sequelize.STRING,
});


module.exports = {
    data: new SlashCommandBuilder()
        .setName('threshold')
        .setDescription(`Change the pledge/donation threshold.`)
        .addIntegerOption(option => option.setName('set').setDescription('Set a new threshold.').setMinValue(0))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const groupbuy = await Groupbuys.findOne({ where: { guild_id: interaction.member.guild.id } });
        const threshold = interaction.options.getInteger('set');

        if (!threshold) {
            const embed = new Discord.MessageEmbed()
                .setColor('LIGHT_GREY')
                .setDescription(`The current threshold is ${codeBlock(currency(groupbuy.threshold).format(true))}`);

            return interaction.reply({ embeds: [embed] });
        }

        const newThreshold = await Groupbuys.update({ threshold: threshold }, { where: { guild_id: interaction.member.guild.id } });

        if (newThreshold) {
            const embed = new Discord.MessageEmbed()
                .setColor('LIGHT_GREY')
                .setDescription(`The threshold changed ${codeBlock(`${currency(groupbuy.threshold).format(true)} → ${currency(threshold).format(true)}`)}`);

            return interaction.reply({ embeds: [embed] });
        }
    }
};