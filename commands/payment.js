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
const Payments = sequelize.define('payment', {
    id: {
        primaryKey: true,
        type: Sequelize.INTEGER,
        autoIncrement: true,
        unique: true,
    },
    guild_id: {
        type: Sequelize.STRING,
        references: {
            model: Groupbuys,
            key: 'guild_id',
        },
    },
    service: Sequelize.STRING,
    address: Sequelize.STRING,
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('payment')
        .setDescription(`Payment Information.`)
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a new payment option.')
            .addStringOption(option => option.setName('service').setRequired(true).setDescription('Payment service name'))
            .addStringOption(option => option.setName('address').setRequired(true).setDescription('Address of the payment service')))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a payment option.')
            .addStringOption(option => option.setName('address').setAutocomplete(true).setRequired(true).setDescription('Address to remove')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),
    async execute(interaction) {
        const groupbuy = await Groupbuys.findOne({ where: { guild_id: interaction.member.guild.id } });
        const channel_paymentinfo = await interaction.guild.channels.fetch(groupbuy.channel_paymentinfo);
        const address = interaction.options.getString('address');

        if (interaction.options.getSubcommand() === 'add') {
            const service = interaction.options.getString('service');

            const payment = await Payments.create({
                guild_id: interaction.guild.id,
                service: service,
                address: address,
            });

            if (payment) {
                const message_payment_information = await channel_paymentinfo.messages.fetch(groupbuy.message_payment_information);
                const embed_payment_information = new Discord.MessageEmbed(message_payment_information.embeds[0]);

                embed_payment_information.addField(`${service}`, `${address}`);
                if (embed_payment_information.description) embed_payment_information.setDescription('');

                message_payment_information.edit({
                    embeds: [embed_payment_information]
                })
                const embed = new Discord.MessageEmbed().setDescription(`Added ${channel_paymentinfo.toString()} ${codeBlock(`${service}: ${address}`)}`).setColor('LIGHT_GREY')
                interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                });
            }
        }
        else if (interaction.options.getSubcommand() === 'remove') {
            const split = address.split(':');
            const embed = new Discord.MessageEmbed()

            if (split.length != 2) {
                embed.setDescription(`Please select a valid payment option`).setColor('RED');
                return interaction.reply({
                    ephemeral: true,
                    embeds: [embed],
                })
            }
            const split_service = split[0].trim();
            const split_address = split[1].trim();

            const payment = await Payments.findOne({ where: { guild_id: interaction.guild.id, address: split_address, service: split_service } });
            if (payment) {
                payment.destroy();

                const message_payment_information = await channel_paymentinfo.messages.fetch(groupbuy.message_payment_information);
                const embed_payment_information = new Discord.MessageEmbed(message_payment_information.embeds[0]);

                embed_payment_information.spliceFields(embed_payment_information.fields.findIndex(field => field.name === split_service && field.value === split_address), 1);

                if (embed_payment_information.fields.length === 0) embed_payment_information.setDescription(`No payment options available.`);
                
                message_payment_information.edit({
                    embeds: [embed_payment_information]
                });
                embed.setDescription(`Removed ${channel_paymentinfo.toString()} ${codeBlock(`${split_service}: ${split_address}`)}`).setColor('LIGHT_GREY');
            }
            else {
                embed.setDescription(`No payment found for ${split_service}: ${split_address}`).setColor('RED');
            }

            return interaction.reply({
                ephemeral: true,
                embeds: [embed]
            })
        }

    }
};