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
        .setName('coordination')
        .setDescription(`Set permanent coordination/moderation roles.`)
        .addSubcommand(subcommand => subcommand
            .setName('add')
            .setDescription('Add a user to the coordination/moderation list.')
            .addUserOption(option => option.setName('user').setRequired(true).setDescription('The user to add to the coordination/moderation list.'))
            .addStringOption(option => option.setName('type').setRequired(true).setDescription('Type of coordination/moderation').addChoices(
                { name: `Moderator`, value: 'moderator' },
                { name: `Administrator`, value: 'administrator' },
                { name: 'Coordinator', value: 'coordinator' },
            )))
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Remove a user from the coordination/moderation list.')
            .addUserOption(option => option.setName('user').setRequired(true).setDescription('The user to remove from the coordination/moderation list.')))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(true),
    async execute(interaction) {
        let groupbuy;
        if (interaction.member) {
            groupbuy = await Groupbuys.findOne({ where: { guild_id: interaction.member.guild.id } });
        }
        const user = interaction.options.getUser('user');
        const coordination = await Coordinators.findOne({ where: { user_id: user.id } });
        if (interaction.options.getSubcommand() === 'add') {
            const type = interaction.options.getString('type');
            if (!coordination) {
                const embed = new Discord.MessageEmbed().setColor('DARK_GREY').setDescription(`You cannot set coordinators if you're not the bot owner`);
                if (interaction.user.id != auth.bot_owner_id) {
                    return interaction.reply({ embeds: [embed] });
                }
                await Coordinators.create({
                    user_id: user.id,
                    type: type,
                });
                if (type == 'coordinator') embed.setColor('DARK_GREY');
                if (type == 'administrator') embed.setColor('DARK_RED');
                if (type == 'moderator') embed.setColor('BLUE');
                embed.setDescription(`${user.toString()} is now ${type == 'administrator' ? 'an' : 'a'} ${type}`);
                interaction.reply({ embeds: [embed] });
            }
            else {
                const embed = new Discord.MessageEmbed()

                if (type == 'coordinator') {
                    if (interaction.user.id != auth.bot_owner_id) return interaction.reply(`You cannot set coordinators if you're not the bot owner.`);
                    embed.setColor('DARK_GREY')
                    if (coordination.type == 'coordinator') {
                        embed.setDescription(`${user.toString()} is already a coordinator.`);
                    }
                    else {
                        Coordinators.update({ type: 'coordinator' }, { where: { user_id: user.id } });
                        embed.setDescription(`${user.toString()} is now a coordinator.`);
                    }
                }
                if (type == 'administrator') {
                    embed.setColor('DARK_RED')
                    if (coordination.type == 'administrator') {
                        embed.setDescription(`${user.toString()} is already an administrator.`);
                    }
                    else {
                        Coordinators.update({ type: 'administrator' }, { where: { user_id: user.id } });
                        embed.setDescription(`${user.toString()} is now an administrator.`);
                    }
                }
                if (type == 'moderator') {
                    embed.setColor('BLUE')
                    if (coordination.type == 'moderator') {
                        embed.setDescription(`${user.toString()} is already a moderator.`);
                    }
                    else {
                        Coordinators.update({ type: 'moderator' }, { where: { user_id: user.id } });
                        embed.setDescription(`${user.toString()} is now a moderator.`);
                    }
                }

                interaction.reply({
                    embeds: [embed],
                });

            }
            if (groupbuy) {
                const role = `role_${type}`;
                const member = await interaction.guild.members.fetch(user.id);
                await member.roles.remove([groupbuy.role_coordinator, groupbuy.role_administrator, groupbuy.role_moderator]);
                await member.roles.add(groupbuy[role]);
            }
        }

        else if (interaction.options.getSubcommand() === 'remove') {
            const embed = new Discord.MessageEmbed().setColor('DARK_GREY')

            if (!coordination) {
                embed.setDescription(`${user.toString()} is not a coordinator.`);
                return interaction.reply({
                    embeds: [embed],
                });
            }
            if (coordination.type == 'coordinator' && interaction.user.id != auth.bot_owner_id) {
                embed.setDescription(`You cannot remove coordinators if you're not the bot owner.`);
                return interaction.reply({
                    embeds: [embed],
                });
            }
            await Coordinators.destroy({ where: { user_id: user.id } });
            if (coordination.type == 'coordinator') embed.setColor('DARK_GREY');
            if (coordination.type == 'administrator') embed.setColor('DARK_RED');
            if (coordination.type == 'moderator') embed.setColor('BLUE');
            embed.setDescription(`${user.toString()} is no longer ${coordination.type == 'administrator' ? 'an' : 'a'} ${coordination.type}.`);
            interaction.reply({
                embeds: [embed],
            });
            if (groupbuy) {
                const member = await interaction.guild.members.fetch(user.id);
                await member.roles.remove([groupbuy.role_coordinator, groupbuy.role_administrator, groupbuy.role_moderator]);
            }
        }
    }
};