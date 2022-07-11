const {
    SlashCommandBuilder,
    codeBlock,
    inlineCode,
    time,
} = require('@discordjs/builders');
const currency = require('currency.js');
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
const Coordinators = sequelize.define('coordinator', {
    user_id: {
        primaryKey: true,
        type: Sequelize.STRING,
        unique: true,
    },
    type: Sequelize.ENUM(['coordinator', 'administrator', 'moderator']),
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('groupbuy')
        .setDescription(`Change groupbuy information.`)
        .addSubcommand(subcommand => subcommand
            .setName('update')
            .setDescription('Update groupbuy information.')
            .addStringOption(option => option.setName('type').setRequired(true).setDescription('Information to change').addChoices(
                { name: `Title`, value: 'title' },
                { name: `Artist`, value: 'artist' },
                { name: 'Length', value: 'length' },
                { name: 'Price', value: 'price' },
                { name: 'Additional', value: 'additional' },
            ))
            .addStringOption(option => option.setName('value').setRequired(true).setDescription('Value to change')))
        .addSubcommand(subcommand => subcommand
            .setName('status')
            .setDescription('Open or Close the groupbuy.')
            .addStringOption(option => option.setName('type').setRequired(true).setDescription('Whether to open or close the groupbuy').addChoices(
                { name: `Open`, value: 'open' },
                { name: `Close`, value: 'close' },
            )))
        .addSubcommand(subcommand => subcommand
            .setName('information')
            .setDescription('Get current groupbuy information.')
            .addStringOption(option => option.setName('type').setRequired(true).setDescription('Informationt to show').addChoices(
                { name: `Amount Pledged`, value: 'pledged' },
                { name: `Amount Paid`, value: 'paid' },
                { name: `Uptime`, value: 'uptime' },
            )))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const groupbuy = await Groupbuys.findOne({ where: { guild_id: interaction.member.guild.id } });
        const type = interaction.options.getString('type');
        if (interaction.options.getSubcommand() === 'update') {
            let value = interaction.options.getString('value');
            await Groupbuys.update({ [type]: value }, { where: { guild_id: interaction.member.guild.id } });

            const channel_information = await interaction.guild.channels.fetch(groupbuy.channel_information);
            const message_groupbuy_information = await channel_information.messages.fetch(groupbuy.message_groupbuy_information);
            const embed_groupbuy_information = new Discord.MessageEmbed(message_groupbuy_information.embeds[0]);

            if (type === 'title') {
                interaction.guild.setName(`${groupbuy.artist} - ${value} Groupbuy`);
                embed_groupbuy_information.setTitle(`${groupbuy.artist} - ${value}`);
            }
            if (type === 'artist') {
                interaction.guild.setName(`${value} - ${groupbuy.title} Groupbuy`);
                embed_groupbuy_information.setTitle(`${value} - ${groupbuy.title}`);
            }
            if (type === 'length') {
                if (!value.match(/(\d+:+\d+)/)) {
                    const error = new Discord.MessageEmbed().setDescription('The length needs to be in the format of `mm:ss`!').setColor('RED')
                    return interaction.reply({ embeds: [error], ephemeral: true });
                }
                embed_groupbuy_information.spliceFields(0, 1, { name: `Length:`, value: value, inline: true });
            }
            if (type === 'price') {
                if (value.startsWith('$')) value = value.substring(1);
                if (isNaN(value)) {
                    const error = new Discord.MessageEmbed().setDescription('The price needs to be a number!').setColor('RED')
                    return interaction.reply({ embeds: [error], ephemeral: true });
                }
                value = currency(value).format(true);
                embed_groupbuy_information.spliceFields(1, 1, { name: `Price:`, value: value, inline: true });
            }
            if (type === 'additional') embed_groupbuy_information.spliceFields(2, 1, { name: `Additional:`, value: value });

            message_groupbuy_information.edit({
                embeds: [embed_groupbuy_information]
            })

            const embed = new Discord.MessageEmbed().setColor('LIGHT_GREY').setDescription(`Updated ${inlineCode(type)} to ${codeBlock(value)}`);
            return interaction.reply({
                embeds: [embed],
            });
        }
        else if (interaction.options.getSubcommand() === 'status') {
            // channel name changes have a rate-limit of twice per 10 minutes, if you open/close quickly, the names won't change.
            const guild = await interaction.client.guilds.fetch(groupbuy.guild_id)
            const category_pledge = guild.channels.cache.get(groupbuy.category_pledge);
            const channel_pledges = guild.channels.cache.get(groupbuy.channel_pledges);
            const category_payment = guild.channels.cache.get(groupbuy.category_payment);
            const channel_paymentinfo = guild.channels.cache.get(groupbuy.channel_paymentinfo);
            const channel_paidscreenshot = guild.channels.cache.get(groupbuy.channel_paidscreenshot);
            const channel_announcements = guild.channels.cache.get(groupbuy.channel_announcements);

            const announcementEmbed = new Discord.MessageEmbed().setColor('LIGHT_GREY');

            if (type === 'open') {
                Groupbuys.update({ closedAt: null }, { where: { guild_id: interaction.member.guild.id } });
                announcementEmbed.setDescription(`Groupbuy has been opened by ${interaction.member.toString()}.`);

                if (groupbuy.pledged >= groupbuy.price) {
                    category_pledge.setName('pledge (closed)');
                    category_payment.setName('payment');

                    category_payment.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                    }]);
                    channel_paymentinfo.permissionOverwrites.set([ {
                        id: interaction.guild.roles.everyone,
                        deny: ['SEND_MESSAGES'],
                        allow: ['VIEW_CHANNEL'],
                    }]);
                    channel_paidscreenshot.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        allow: ['SEND_MESSAGES', 'ATTACH_FILES', 'VIEW_CHANNEL'],
                        deny: ['READ_MESSAGE_HISTORY'],
                    }]);
                    category_pledge.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        deny: ['SEND_MESSAGES'],
                    }]);
                    channel_pledges.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        deny: ['SEND_MESSAGES'],
                    }]);
                }
                else {
                    category_pledge.setName('pledge');
                    category_payment.setName('payment (closed)');

                    category_payment.permissionOverwrites.set([{
                        id: groupbuy.role_moderator,
                        allow: ['VIEW_CHANNEL'],
                    }, {
                        id: interaction.guild.roles.everyone,
                        deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                    }]);
                    channel_paymentinfo.permissionOverwrites.set([{
                        id: groupbuy.role_moderator,
                        allow: ['VIEW_CHANNEL'],
                    }, {
                        id: interaction.guild.roles.everyone,
                        deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                    }]);
                    channel_paidscreenshot.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        allow: ['SEND_MESSAGES', 'ATTACH_FILES'],
                        deny: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
                    }]);
                    category_pledge.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        deny: ['SEND_MESSAGES'],
                    }]);
                    channel_pledges.permissionOverwrites.set([{
                        id: interaction.guild.roles.everyone,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
                    }]);
                }                
            }
            else if (type === 'close') {
                Groupbuys.update({ closedAt: new Date() }, { where: { guild_id: interaction.member.guild.id } });
                category_payment.setName('payment (closed)');
                category_payment.permissionOverwrites.set([{
                    id: interaction.guild.roles.everyone,
                    deny: ['SEND_MESSAGES'],
                }]);
                channel_paymentinfo.permissionOverwrites.set([{
                    id: interaction.guild.roles.everyone,
                    deny: ['SEND_MESSAGES'],
                }]);
                channel_paidscreenshot.permissionOverwrites.set([{
                    id: interaction.guild.roles.everyone,
                    deny: ['SEND_MESSAGES'],
                }]);

                category_pledge.setName('pledge (closed)');
                category_pledge.permissionOverwrites.set([{
                    id: interaction.guild.roles.everyone,
                    deny: ['SEND_MESSAGES'],
                }]);
                channel_pledges.permissionOverwrites.set([{
                    id: interaction.guild.roles.everyone,
                    deny: ['SEND_MESSAGES'],
                }]);
                announcementEmbed.setDescription(`Groupbuy has been closed by ${interaction.member.toString()}.`);
            }
            const embed = new Discord.MessageEmbed().setColor('LIGHT_GREY').setDescription(`Groupbuy is set to ${inlineCode(type.toUpperCase())}.\nNotified ${channel_announcements.toString()}`);

            channel_announcements.send({
                embeds: [announcementEmbed]
            });
            return interaction.reply({
                embeds: [embed]
            })
        }
        else if (interaction.options.getSubcommand() === 'information') {
            const embed = new Discord.MessageEmbed()
            if (type === 'pledged') {
                embed.setDescription(`This groupbuy has ${inlineCode(currency(groupbuy.pledged).format(true))} pledged.`)
                .setColor('GOLD');
            }
            if (type === 'paid') {
                embed.setDescription(`This groupbuy has ${inlineCode(currency(groupbuy.paid).format(true))} paid.`)
                .setColor('GREEN');
            }
            if (type === 'uptime') {
                embed.setDescription(`Groupbuy created ${time(groupbuy.createdAt)} (${time(groupbuy.createdAt, 'R')})`)
                .setColor('LIGHT_GREY');
            }
            return interaction.reply({
                embeds: [embed]
            })
        }
    }
};