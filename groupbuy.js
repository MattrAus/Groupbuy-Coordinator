const fs = require('fs');
const {
	Client,
	Collection,
	Intents,
	MessageActionRow,
	Modal,
	TextInputComponent
} = require('discord.js');
const {
	userMention, codeBlock, inlineCode, bold, time
} = require('@discordjs/builders');
const Discord = require('discord.js');

const wait = require('node:timers/promises').setTimeout;
const auth = require('./config.json');
const currency = require('currency.js');

let temp_title = {};
let temp_artist = {};
let temp_length = {};
let temp_price = {};
let temp_additional = {};

process.on('uncaughtException', error => {
	console.error(error);
});

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

const Users = sequelize.define('user', {
	user_id: {
		primaryKey: true,
		type: Sequelize.STRING,
		unique: true,
	},
	joined: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	left: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	banned: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	pledged: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	pledged_amount: {
		type: Sequelize.DOUBLE,
		defaultValue: 0,
	},
	paid: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	paid_amount: {
		type: Sequelize.DOUBLE,
		defaultValue: 0,
	},
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

const Coordinators = sequelize.define('coordinator', {
	user_id: {
		primaryKey: true,
		type: Sequelize.STRING,
		unique: true,
	},
	type: Sequelize.ENUM(['coordinator', 'administrator', 'moderator']),
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

const client = new Client({
	intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS],
	partials: ['MESSAGE', 'USER', 'GUILD_MEMBER', 'CHANNEL', 'REACTION'],
	presence: {
		status: 'online',
		activities: [{
			name: 'Groupbuys',
			type: 'WATCHING'
		}]
	},
});
client.commands = new Collection();


const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.once('ready', async () => {
	console.log("Ready!");
	sequelize.sync();
});

client.on('guildCreate', async guild => {
	// Leave groupbuy if the owner isn't a coordinator or bot owner
	const coordinator = await Coordinators.findOne({ where: { user_id: guild.ownerId, type: 'coordinator' } });
	if (!coordinator && guild.ownerId != auth.bot_owner_id) return guild.leave();

});

client.on('guildMemberRemove', async member => {
	if (member.id == client.user.id) return;

	const groupbuy = await Groupbuys.findOne({
		where: {
			guild_id: member.guild.id
		}
	});

	if (member.partial || member.roles.cache.has(groupbuy.role_pledged) || member.roles.cache.has(groupbuy.role_paid)) {
		let amount = currency(0);

		if (member.partial || member.roles.cache.has(groupbuy.role_paid)) {
			const channel = await client.channels.fetch(groupbuy.channel_paidscreenshot);
			let lastMessageId = channel.lastMessageId;
			let messages;

			do {
				messages = await channel.messages.fetch({
					limit: 100,
					before: lastMessageId,
				});
				messages = messages.filter(message => message.author.id === member.id);
				for (let message_fetched of messages.values()) {
					amount = amount.add(currency(message_fetched.content.split(' ')[0]));
					lastMessageId = message_fetched.id;
					await message_fetched.delete();
				}
			} while (messages.size == 100);

			const channel_botchat = await client.channels.fetch(groupbuy.channel_botchat);
			const embed = new Discord.MessageEmbed().setDescription(`${member.toString()}'s payment of ${currency(groupbuy.pledged).subtract(amount).format(true)} has been removed as they left the server.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });


			Groupbuys.update({ paid: amount.value }, { where: { guild_id: message.guildId } });
			const channel_paidamount = await client.channels.fetch(groupbuy.channel_paidamount);
			channel_paidamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);
		}
		if (member.partial || member.roles.cache.has(groupbuy.role_pledged)) {
			const channel = await client.channels.fetch(groupbuy.channel_pledges);
			let lastMessageId = channel.lastMessageId;
			let messages;

			do {
				messages = await channel.messages.fetch({
					limit: 100,
					before: lastMessageId,
				});
				messages = messages.filter(message => message.author.id === member.id);
				for (let message_fetched of messages.values()) {
					amount = amount.add(currency(message_fetched.content.split(' ')[0]));
					lastMessageId = message_fetched.id;
					await message_fetched.delete();
				}
			} while (messages.size == 100);

			const channel_botchat = await client.channels.fetch(groupbuy.channel_botchat);
			const embed = new Discord.MessageEmbed().setDescription(`${member.toString()}'s pledge of ${currency(groupbuy.pledged).subtract(amount).format(true)} has been removed as they left the server.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });


			Groupbuys.update({ pledged: amount.value }, { where: { guild_id: member.guild.id } });
			const channel_pledgeamount = await member.guild.channels.fetch(groupbuy.channel_pledgeamount);
			channel_pledgeamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);
		}
	}

	await increment_user(member, 'left');

	const channel_membercount = await member.guild.channels.fetch(groupbuy.channel_membercount);
	channel_membercount.setName(`Member Count: ${member.guild.memberCount}`);

	const channel_connections = await member.guild.channels.fetch(groupbuy.channel_connections);
	const embed = new Discord.MessageEmbed().setDescription(`${member.toString()} has left the groupbuy.`).setColor('RED')
	channel_connections.send({ embeds: [embed] });
});

client.on('guildMemberAdd', async member => {
	await checkBan(member);
	await checkCoordinators(member);
	const groupbuy = await Groupbuys.findOne({
		where: {
			guild_id: member.guild.id
		}
	});

	await increment_user(member, 'joined');

	const channel_membercount = await member.guild.channels.fetch(groupbuy.channel_membercount);
	channel_membercount.setName(`Member Count: ${member.guild.memberCount}`);

	const channel_connections = await member.guild.channels.fetch(groupbuy.channel_connections);
	const embed = new Discord.MessageEmbed().setDescription(`${member.toString()} has joined the server.`).setColor('GREEN')
	channel_connections.send({ embeds: [embed] });

	await member.roles.add(groupbuy.role_nopledge);

});

client.on('guildBanAdd', async (ban) => {
	const groupbuy = await Groupbuys.findOne({
		where: {
			guild_id: ban.guild.id
		}
	});
	ban = await ban.fetch();

	await increment_user(ban.user, 'banned');

	const channel_connections = await ban.guild.channels.fetch(groupbuy.channel_connections);
	const embed = new Discord.MessageEmbed().setDescription(`${ban.user.toString()} has been banned from the groupbuy. ${codeBlock(ban.reason)}`).setColor('DARK_RED')
	channel_connections.send({ embeds: [embed] });
});

client.on('guildBanRemove', async (unban) => {
	const groupbuy = await Groupbuys.findOne({
		where: {
			guild_id: unban.guild.id
		}
	})

	await increment_user(unban.user, 'banned', -1);

	const channel_connections = await unban.guild.channels.fetch(groupbuy.channel_connections);
	const embed = new Discord.MessageEmbed().setDescription(`${unban.user.toString()} has been unbanned from the groupbuy.`).setColor('DARK_GREEN')
	channel_connections.send({ embeds: [embed] });
});

client.on('guildMemberUpdate', async (_oldMember, newMember) => {

	const groupbuy = await Groupbuys.findOne({ where: { guild_id: newMember.guild.id } });
	if (!groupbuy) return;
	if (newMember.roles.cache.has(groupbuy.role_coordinator)) await checkCoordinators(newMember);
});

client.on('messageReactionAdd', async (reaction, user) => {
	if (user.bot) return;

	const groupbuy = await Groupbuys.findOne({ where: { guild_id: reaction.message.guild.id } });
	const member = await reaction.message.guild.members.fetch(user.id);
	const channel_botchat = await reaction.message.guild.channels.fetch(groupbuy.channel_botchat);

	if (reaction.emoji.name == '✅' && reaction.me && member.roles.cache.hasAny(groupbuy.role_coordinator, groupbuy.role_administrator, groupbuy.role_moderator, groupbuy.role_collector)) {
		const amount = currency(reaction.message.content.split(' ')[0]).value;
		await reaction.message.reactions.resolve(reaction).remove();
		let embed;
		if (reaction.message.channel.id == groupbuy.channel_pledges) {
			embed = new Discord.MessageEmbed().setDescription(`${reaction.message.member.toString()}'s pledge of ${currency(amount).format(true)} has been approved by ${member.toString()}.`).setColor('#16C60C');

			set_channel_pledgeamount(groupbuy, amount);
			await increment_user(member, 'pledged_amount', amount);
			await increment_user(member, 'pledged');

			await member.roles.add(groupbuy.role_pledged);
			await member.roles.remove(groupbuy.role_nopledge);
		}
		if (reaction.message.channel.id == groupbuy.channel_paidscreenshot) {
			embed = new Discord.MessageEmbed().setDescription(`${reaction.message.member.toString()}'s payment of ${currency(amount).format(true)} has been approved by ${member.toString}.`).setColor('#16C60C');

			set_channel_paidamount(groupbuy, amount);
			await increment_user(message.member, 'paid_amount', amount);
			await increment_user(message.member, 'paid');

			await member.roles.remove([groupbuy.role_nopledge, groupbuy.role_pledged]);
			await member.roles.add(groupbuy.role_paid);
		}

		channel_botchat.send({ embeds: [embed] });

		if (amount >= (groupbuy.price * 0.1)) await reaction.message.react('🐐');
		if (amount >= 50) await reaction.message.react('⭐');
	}
});

client.on('messageDelete', async message => {
	if (!message.guild) return;
	const groupbuy = await Groupbuys.findOne({ where: { guild_id: message.guildId } });
	const channel_botchat = await client.channels.fetch(groupbuy.channel_botchat);

	if (message.partial) {
		let amount = currency(0);

		if (message.channelId == groupbuy.channel_pledges || message.channelId == groupbuy.channel_paidscreenshot) {
			const fetchedLogs = await message.guild.fetchAuditLogs({ limit: 1, type: 'MESSAGE_DELETE', });
			const deletionLog = fetchedLogs.entries.first();

			// When we can't get message contents, we just have to check all messages.
			if (!deletionLog) {
				let embed = new Discord.MessageEmbed();
				if (message.channelId == groupbuy.channel_pledges) {
					amount = await recountChannel(groupbuy.channel_pledges);

					embed = new Discord.MessageEmbed().setDescription(`Unknown message was deleted, Verifed pledged amount as ${currency(amount).format(true)}`).setColor('GOLD');

					Groupbuys.update({ paid: amount.value }, { where: { guild_id: message.guildId } });
					const channel_pledgeamount = await client.channels.fetch(groupbuy.channel_pledgeamount);
					channel_pledgeamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);
				}
				if (message.channelId == groupbuy.channel_paidscreenshot) {
					amount = await recountChannel(groupbuy.channel_pledges);

					embed = new Discord.MessageEmbed().setDescription(`Unknown message was deleted, Verifed paid amount as ${currency(amount).format(true)}`).setColor('GREEN');

					Groupbuys.update({ paid: amount.value }, { where: { guild_id: message.guildId } });
					const channel_paidamount = await client.channels.fetch(groupbuy.channel_paidamount);
					channel_paidamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);
				}
				return channel_botchat.send({ embeds: [embed] });
			}
			// Check if Bot deleted the message - we've probably already handled it elsewhere.
			if (target.id === client.user.id) return;
		}

		// return; // if you've restarted the bot, older messages aren't stored in cache anymore.

		if (message.channelId == groupbuy.channel_pledges) {
			let amount = await recountChannel(groupbuy.channel_pledges);

			const embed = new Discord.MessageEmbed().setDescription(`Unknown pledge of ${currency(groupbuy.pledged).subtract(amount).format(true)} has been removed.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });

			Groupbuys.update({ pledged: amount.value }, { where: { guild_id: message.guildId } });
			const channel_pledgeamount = await message.guild.channels.fetch(groupbuy.channel_pledgeamount);
			channel_pledgeamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);
		}
		if (message.channelId == groupbuy.channel_paidscreenshot) {
			let amount = await recountChannel(groupbuy.channel_paidscreenshot);

			const embed = new Discord.MessageEmbed().setDescription(`Unknown payment of ${currency(groupbuy.paid).subtract(amount).format(true)} has been removed.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });

			Groupbuys.update({ paid: amount.value }, { where: { guild_id: message.guildId } });
			const channel_paidamount = await client.channels.fetch(groupbuy.channel_paidamount);
			channel_paidamount.setName(`${amount.format(true)}/${currency(groupbuy.price).format(true)}`);

		}
		return;
	}
	if (message.author.bot || message.channel.type == 'DM') return;

	if (message.channel.id == groupbuy.channel_pledges || message.channel.id == groupbuy.channel_paidscreenshot) {
		const amount = currency(message.content.split(' ')[0]).value;
		if (amount < currency(groupbuy.threshold).value) return;
		if (message.reactions.cache.has('✅') && message.reactions.resolve('✅').me) return;

		if (message.channel.id == groupbuy.channel_pledges) {
			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()}'s pledge of ${currency(amount).format(true)} has been removed.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });
			set_channel_pledgeamount(groupbuy, -amount);
			await increment_user(message.member, 'pledged_amount', -amount);
			await increment_user(message.member, 'pledged', -1);

			await message.member.roles.remove(groupbuy.role_pledged);
			await message.member.roles.add(groupbuy.role_nopledge);
		}
		if (message.channel.id == groupbuy.channel_paidscreenshot) {
			if (message.attachments.size == 0) return;

			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()}'s payment of ${currency(amount).format(true)} has been removed.`).setColor('RED');
			channel_botchat.send({ embeds: [embed] });
			set_channel_paidamount(groupbuy, -amount);
			await increment_user(message.member, 'paid_amount', -amount);
			await increment_user(message.member, 'paid', -1);

			await message.member.roles.remove(groupbuy.role_paid);
			if (!message.member.roles.cache.has(groupbuy.role_pledged)) await message.member.roles.add(groupbuy.role_nopledge);
		}
	}


});

client.on('messageUpdate', async (oldMessage, message) => {
	if (message.author.bot || message.channel.type == 'DM') return;
	if (oldMessage.content == message.content) return;

	if (message.partial) await message.fetch();

	const groupbuy = await Groupbuys.findOne({ where: { guild_id: message.guild.id } });

	if (message.channel.id == groupbuy.channel_pledges || message.channel.id == groupbuy.channel_paidscreenshot) {
		if (message.content.startsWith('$')) message.content = message.content.substring(1);
		if (message.content.length == 0) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include the donated amount in your message.`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}

		const oldAmount = currency(oldMessage.content.split(' ')[0]).value;
		const amount = currency(message.content.split(' ')[0]).value;

		if (oldAmount == amount) return;

		if (amount < currency(groupbuy.threshold).value) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include a donation amount of at least ${currency(groupbuy.threshold).format(true)}`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}
		if (!isPositiveFloat(amount)) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include a valid donation amount.`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}

		if (message.channel.id == groupbuy.channel_paidscreenshot) {
			if (message.attachments.size == 0) {
				const embed = new Discord.MessageEmbed().setDescription(`Please include a screenshot of the payment.`).setColor('RED');
				await message.reply({
					embeds: [embed]
				}).then(msg => { setTimeout(() => msg.delete(), 5000); });
				return message.delete();
			}

			await set_channel_paidamount(groupbuy, amount);
			await increment_user(message.member, 'paid_amount', amount);

			if (amount >= 100) {
				const goat = await message.guild.roles.create({
					name: `Goat - ${message.member.nickname}`,
					color: '#FF1493',
					hoist: true,
				});
				message.member.roles.add(goat);
			}

			await message.member.roles.remove([groupbuy.role_nopledge, groupbuy.role_pledged]);
			await message.member.roles.add(groupbuy.role_paid);

			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()} has edited their payment of ${currency(oldAmount).format(true)} to ${currency(amount).format(true)}!`).setColor('GREEN')
			channel_botchat.send({
				embeds: [embed]
			});

			if (groupbuy.paid >= groupbuy.price) {
				groupbuy.update({ closedAt: new Date() });

				// Paid amount has been reached.
			}

		}
		if (message.channel.id == groupbuy.channel_pledges) {
			if (amount >= 100) return message.react('✅');

			await set_channel_pledgeamount(groupbuy, amount);
			await increment_user(message.member, 'pledged_amount', amount);
			await increment_user(message.member, 'pledged');

			const test = await await increment_user(message.member, 'pledge_amount', amount);
			await await increment_user(message.member, 'pledge');
			console.log(test);

			message.member.roles.add(groupbuy.role_pledged);
			message.member.roles.remove(groupbuy.role_nopledge);

			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()} has edited their pledged of ${currency(oldAmount).format(true)} to ${currency(amount).format(true)}!`).setColor('GOLD')
			channel_botchat.send({
				embeds: [embed]
			});


			if (currency(groupbuy.pledged).value >= currency(groupbuy.price).value || currency(groupbuy.pledged).value >= currency(groupbuy.open_at_amount).value) {
				const guild = await client.guilds.fetch(groupbuy.guild_id);
				const category_pledge = await guild.channels.fetch(groupbuy.category_pledge);
				const channel_pledges = guild.channels.cache.get(groupbuy.channel_pledges);
				const category_payment = await guild.channels.fetch(groupbuy.category_payment);
				const channel_paymentinfo = guild.channels.cache.get(groupbuy.channel_paymentinfo);
				const channel_paidscreenshot = guild.channels.cache.get(groupbuy.channel_paidscreenshot);
				const channel_announcements = guild.channels.cache.get(groupbuy.channel_announcements);

				category_payment.setName('payment');
				await category_payment.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['VIEW_CHANNEL'],
				}]);
				channel_paymentinfo.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['VIEW_CHANNEL'],
					deny: ['SEND_MESSAGES'],
				}]);
				channel_paidscreenshot.lockPermissions();
				channel_paidscreenshot.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['SEND_MESSAGES', 'ATTACH_FILES', 'VIEW_CHANNEL'],
					deny: ['READ_MESSAGE_HISTORY'],
				}]);

				category_pledge.setName('pledge (closed)');
				await category_pledge.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					deny: ['SEND_MESSAGES'],
				}]);
				channel_pledges.lockPermissions();

				const embed_announcement = new Discord.MessageEmbed().setDescription(`${channel_paymentinfo.toString()} is open. *Start paying!*`).setColor('GREEN')
				channel_announcements.send({
					content: guild.roles.everyone.toString(),
					embeds: [embed_announcement]
				});
			}

		}

		if (amount >= (groupbuy.price * 0.1)) await message.react('🐐');
		if (amount >= 50) await message.react('⭐');

	}
});

client.on('messageCreate', async message => {
	if (message.author.bot || message.channel.type == 'DM') return;

	if (message.partial) await message.fetch();

	const groupbuy = await Groupbuys.findOne({
		where: {
			guild_id: message.guild.id
		}
	});

	const channel_botchat = await message.guild.channels.fetch(groupbuy.channel_botchat);

	if (message.channel.id == groupbuy.channel_pledges || message.channel.id == groupbuy.channel_paidscreenshot) {
		if (message.content.startsWith('$')) message.content = message.content.substring(1);
		if (message.content.length == 0) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include the donated amount in your message.`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}
		const amount = currency(message.content.split(' ')[0]).value;
		if (amount < currency(groupbuy.threshold).value) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include a donation amount of at least ${currency(groupbuy.threshold).format(true)}`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}
		if (!isPositiveFloat(amount)) {
			const embed = new Discord.MessageEmbed().setDescription(`Please include a valid donation amount.`).setColor('RED');
			await message.reply({
				embeds: [embed]
			}).then(msg => { setTimeout(() => msg.delete(), 5000); });
			return message.delete();
		}

		if (message.channel.id == groupbuy.channel_paidscreenshot) {
			if (message.attachments.size == 0) {
				const embed = new Discord.MessageEmbed().setDescription(`Please include a screenshot of the payment.`).setColor('RED');
				await message.reply({
					embeds: [embed]
				}).then(msg => { setTimeout(() => msg.delete(), 5000); });
				return message.delete();
			}

			await set_channel_paidamount(groupbuy, amount);
			await increment_user(message.member, 'paid_amount', amount);
			await increment_user(message.member, 'paid');

			if (amount >= 100) {
				const goat = await message.guild.roles.create({
					name: `Goat - ${message.member.nickname}`,
					color: '#FF1493',
					hoist: true,
				});
				message.member.roles.add(goat);
			}

			await message.member.roles.remove([groupbuy.role_nopledge, groupbuy.role_pledged]);
			await message.member.roles.add(groupbuy.role_paid);

			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()} has paid ${currency(amount).format(true)}!`).setColor('GREEN')
			channel_botchat.send({
				embeds: [embed]
			});

			if (groupbuy.paid >= groupbuy.price) {
				groupbuy.update({ closedAt: new Date() });

				// Paid amount has been reached.
			}

		}
		if (message.channel.id == groupbuy.channel_pledges) {
			if (amount >= 100) return message.react('✅');

			await set_channel_pledgeamount(groupbuy, amount);
			await increment_user(message.member, 'pledged_amount', amount);
			await increment_user(message.member, 'pledged');

			message.member.roles.add(groupbuy.role_pledged);
			message.member.roles.remove(groupbuy.role_nopledge);

			const embed = new Discord.MessageEmbed().setDescription(`${message.member.toString()} has pledged ${currency(amount).format(true)}!`).setColor('GOLD')
			channel_botchat.send({
				embeds: [embed]
			});


			if (currency(groupbuy.pledged).value >= currency(groupbuy.price).value || currency(groupbuy.pledged).value >= currency(groupbuy.open_at_amount).value) {
				const guild = await client.guilds.fetch(groupbuy.guild_id);
				const category_pledge = await guild.channels.fetch(groupbuy.category_pledge);
				const channel_pledges = guild.channels.cache.get(groupbuy.channel_pledges);
				const category_payment = await guild.channels.fetch(groupbuy.category_payment);
				const channel_paymentinfo = guild.channels.cache.get(groupbuy.channel_paymentinfo);
				const channel_paidscreenshot = guild.channels.cache.get(groupbuy.channel_paidscreenshot);
				const channel_announcements = guild.channels.cache.get(groupbuy.channel_announcements);

				category_payment.setName('payment');
				await category_payment.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['VIEW_CHANNEL'],
				}]);
				channel_paymentinfo.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['VIEW_CHANNEL'],
					deny: ['SEND_MESSAGES'],
				}]);
				channel_paidscreenshot.lockPermissions();
				channel_paidscreenshot.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					allow: ['SEND_MESSAGES', 'ATTACH_FILES', 'VIEW_CHANNEL'],
					deny: ['READ_MESSAGE_HISTORY'],
				}]);

				category_pledge.setName('pledge (closed)');
				await category_pledge.permissionOverwrites.set([{
					id: message.guild.roles.everyone,
					deny: ['SEND_MESSAGES'],
				}]);
				channel_pledges.lockPermissions();


				const embed_announcement = new Discord.MessageEmbed().setDescription(`${channel_paymentinfo.toString()} is open. *Start paying!*`).setColor('GREEN')
				channel_announcements.send({
					content: guild.roles.everyone.toString(),
					embeds: [embed_announcement]
				});
			}

		}

		if (amount >= (groupbuy.price * 0.1)) await message.react('🐐');
		if (amount >= 50) await message.react('⭐');

	}
});

client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()) {
		if (interaction.commandName === 'create') {
			// Create the modal
			const modal = new Modal()
				.setCustomId('createGroupbuy')
				.setTitle('Create a Groupbuy');
			// Add components to modal
			// Create the text input components
			const title = new TextInputComponent()
				.setCustomId('title')
				.setLabel("Title of the song/s")
				.setStyle('SHORT')
				.setValue(temp_title[interaction.guild.id] ? temp_title[interaction.guild.id] : '');
			const artist = new TextInputComponent()
				.setCustomId('artist')
				.setLabel("Name of the artist/s")
				.setStyle('SHORT')
				.setValue(temp_artist[interaction.guild.id] ? temp_artist[interaction.guild.id] : '');
			const length = new TextInputComponent()
				.setCustomId('length')
				.setLabel("Length of the song/s")
				.setStyle('SHORT')
				.setValue(temp_length[interaction.guild.id] ? temp_length[interaction.guild.id] : '');
			const price = new TextInputComponent()
				.setCustomId('price')
				.setLabel("Price of the groupbuy")
				.setStyle('SHORT')
				.setValue(temp_price[interaction.guild.id] ? temp_price[interaction.guild.id] : '');
			const additional = new TextInputComponent()
				.setCustomId('additional')
				.setLabel("Any additional information?")
				.setStyle('PARAGRAPH')
				.setValue(temp_additional[interaction.guild.id] ? temp_additional[interaction.guild.id] : '');
			// An action row only holds one text input,
			// so you need one action row per text input.
			const actionRow1 = new MessageActionRow().addComponents(title);
			const actionRow2 = new MessageActionRow().addComponents(artist);
			const actionRow3 = new MessageActionRow().addComponents(length);
			const actionRow4 = new MessageActionRow().addComponents(price);
			const actionRow5 = new MessageActionRow().addComponents(additional);
			// Add inputs to the modal
			modal.addComponents(actionRow1, actionRow2, actionRow3, actionRow4, actionRow5);
			// Show the modal to the user
			return interaction.showModal(modal);
		}
		const {
			commandName
		} = interaction;
		if (!client.commands.has(commandName)) return;

		try {
			await client.commands.get(commandName).execute(interaction);
		} catch (error) {
			console.error(error);
			const embed = new Discord.MessageEmbed().setDescription('There was an error while executing this command!').setColor('RED');
			return interaction.reply({
				embeds: [embed],
				ephemeral: true
			});

		}
	}
	if (interaction.isModalSubmit()) {
		if (interaction.customId === 'createGroupbuy') {
			const title = interaction.fields.getTextInputValue('title').trim();
			const artist = interaction.fields.getTextInputValue('artist').trim();
			let length = interaction.fields.getTextInputValue('length').trim();
			let price = interaction.fields.getTextInputValue('price').trim();
			const additional = interaction.fields.getTextInputValue('additional').trim();

			// Tempory storage to be placed back in the Modal if needed.
			temp_title[interaction.guild.id] = title;
			temp_artist[interaction.guild.id] = artist;
			temp_length[interaction.guild.id] = length;
			temp_price[interaction.guild.id] = price;
			temp_additional[interaction.guild.id] = additional;

			const embed_error = new Discord.MessageEmbed().setColor('RED');
			if (!title || !artist || !price) {
				embed_error.setDescription(`You need to enter ${inlineCode('title')}, ${inlineCode('artist')}, ${inlineCode('price')} for the groupbuy!`);
				return interaction.reply({
					embeds: [embed_error],
					ephemeral: true
				});
			}

			if (price) {
				if (price.startsWith('$')) price = price.substring(1);
				if (isNaN(price)) {
					embed_error.setDescription('The price needs to be a number!');
					return interaction.reply({
						embeds: [embed_error],
						ephemeral: true
					});
				}
				price = currency(price).value;
			}

			if (length) {
				if (!length.match(/(\d+:+\d+)/)) {
					embed_error.setDescription('The length needs to be in the format of `mm:ss`!');
					return interaction.reply({
						embeds: [embed_error],
						ephemeral: true
					});
				}
			}
			else {
				length = "N/A";
			}

			let groupbuy = await Groupbuys.findOne({
				where: {
					guild_id: interaction.guild.id,
				}
			})
			if (groupbuy) await Groupbuys.destroy({ where: { guild_id: interaction.guild.id } });

			groupbuy = await Groupbuys.create({
				guild_id: interaction.guild.id,
				title: title,
				artist: artist,
				length: length,
				price: price,
				additional: additional,
				threshold: 5.00,
				open_at_amount: price,
			});

			const embed_creating = new Discord.MessageEmbed().setColor('GREEN').setDescription(`Creating groupbuy now...`);

			// We have to reply to interaction else it causes an "Error" on the Modal - wait so the user can see this reply.
			interaction.reply({
				embeds: [embed_creating],
			})
			await wait(3000);

			interaction.guild.setName(`${artist} - ${title} Groupbuy`);
			interaction.guild.setVerificationLevel('LOW', 'Reduce Alts and Trolls');
			interaction.guild.setDefaultMessageNotifications('ONLY_MENTIONS');

			// remove all roles 
			const roles = await interaction.guild.roles.fetch()
			roles.forEach(role => {
				if (role.name == '@everyone' || role.managed) return;
				role.delete()
			});

			// remove all channels
			const channels = await interaction.guild.channels.fetch()
			channels.forEach(async channel => channel.delete());

			// create new roles
			let role_owner;
			await interaction.guild.roles.create({
				name: 'Owner',
				color: 'PURPLE',
				hoist: true,
				permissions: ['ADMINISTRATOR']
			}).then(async role => {
				role_owner = role;
				interaction.member.roles.add(role);
				groupbuy.update({ role_owner: role.id }, { where: { guild_id: interaction.guild.id } });
			})
			let role_coordinator;
			await interaction.guild.roles.create({
				name: 'Coordinator',
				color: 'DARK_GREY',
				hoist: true,
				permissions: ['ADMINISTRATOR']
			}).then(async role => {
				role_coordinator = role;
				groupbuy.update({ role_coordinator: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_administrator;
			await interaction.guild.roles.create({
				name: 'Administrator',
				color: 'DARK_RED',
				hoist: true,
				permissions: ['ADMINISTRATOR']
			}).then(async role => {
				role_administrator = role;
				groupbuy.update({ role_administrator: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_moderator;
			await interaction.guild.roles.create({
				name: 'Moderator',
				color: 'BLUE',
				hoist: true,
				permissions: ['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES']
			}).then(async role => {
				role_moderator = role;
				groupbuy.update({ role_moderator: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_seller;
			await interaction.guild.roles.create({
				name: 'Seller',
				color: 'LUMINOUS_VIVID_PINK',
				hoist: true,
			}).then(async role => {
				role_seller = role;
				groupbuy.update({ role_seller: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_middleman;
			await interaction.guild.roles.create({
				name: 'Middleman',
				color: 'DARK_GREEN',
				permissions: ['ADMINISTRATOR']
			}).then(async role => {
				role_middleman = role;
				groupbuy.update({ role_middleman: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_collector;
			await interaction.guild.roles.create({
				name: 'Collector',
				color: 'ORANGE',
				hoist: true,
			}).then(async role => {
				role_collector = role;
				groupbuy.update({ role_collector: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_paid;
			await interaction.guild.roles.create({
				name: 'Paid',
				color: 'GREEN',
				hoist: true,
			}).then(async role => {
				role_paid = role;
				groupbuy.update({ role_paid: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_pledged;
			await interaction.guild.roles.create({
				name: 'Pledged',
				color: 'GOLD',
				hoist: true,
				mentionable: true
			}).then(async role => {
				role_pledged = role;
				groupbuy.update({ role_pledged: role.id }, { where: { guild_id: interaction.guild.id } });
			});
			let role_nopledge;
			await interaction.guild.roles.create({
				name: 'No Pledge',
				color: 'RED',
				hoist: true,
				mentionable: true
			}).then(async role => {
				role_nopledge = role;
				groupbuy.update({ role_nopledge: role.id }, { where: { guild_id: interaction.guild.id } });
				interaction.guild.members.cache.forEach(member => {
					if (member.permissions.has('ADMINISTRATOR')) return;
					member.roles.add(role_nopledge);
				});
			});

			// // Use the built-in timeout feature
			// let role_muted;
			// await interaction.guild.roles.create({
			// 	name: 'Muted',
			// 	color: 'BLACK',
			// }).then(async role => {
			// 	role_muted = role;
			// 	groupbuy.update({ role_muted: role.id }, { where: { guild_id: interaction.guild.id } });
			// });

			interaction.guild.roles.everyone.setPermissions(['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'EMBED_LINKS', 'ATTACH_FILES', 'USE_APPLICATION_COMMANDS']);

			// create new channels
			let channel_membercount;
			await interaction.guild.channels.create(`Member Count: ${interaction.guild.memberCount}`, {
				type: 'GUILD_VOICE',
				position: 0,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone.id,
					allow: ['VIEW_CHANNEL'],
					deny: ['CONNECT']
				}]
			}).then(async channel => {
				channel_membercount = channel;
				groupbuy.update({ channel_membercount: channel.id }, { where: { guild_id: interaction.guild.id } });
			})

			let category_info;
			await interaction.guild.channels.create('info', {
				type: 'GUILD_CATEGORY',
				position: 1,
			}).then(async channel => {
				category_info = channel;
				groupbuy.update({ category_info: channel.id }, { where: { guild_id: interaction.guild.id } });
			})

			let channel_information;
			await interaction.guild.channels.create(`information`, {
				type: 'GUILD_TEXT',
				topic: 'Groupbuy Information',
				position: 2,
				parent: category_info,
				permissionOverwrites: [{
					id: interaction.guild.roles.cache.find(r => r.permissions.has('ADMINISTRATOR')),
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
				}, {
					id: interaction.guild.roles.everyone,
					allow: ['VIEW_CHANNEL'],
					deny: ['SEND_MESSAGES']
				}],
			}).then(async channel => {
				channel_information = channel;
				groupbuy.update({ channel_information: channel.id }, { where: { guild_id: interaction.guild.id } });
				const embed = new Discord.MessageEmbed()
					.setColor('BLURPLE')
					.setAuthor({
						name: 'Groupbuy Information',
					})
					.setTitle(`${artist} - ${title}`)
					.addFields([
						{ name: 'Length', value: length, inline: true },
						{ name: 'Price', value: currency(price).format(true), inline: true },
					])

				if (additional) embed.addField('Additional Information', additional);

				const message = await channel.send({
					embeds: [embed]
				});
				groupbuy.update({ message_groupbuy_information: message.id }, { where: { guild_id: interaction.guild.id } });
			})

			// Uncomment if you wish to have an FAQ channel
			// Will only be shown to Non-Pledgers

			// let channel_faq;
			// await interaction.guild.channels.create(`faq`, {
			// 	type: 'GUILD_TEXT',
			// 	topic: 'Frequently Asked Questions',
			// 	position: 3,
			// 	parent: category_info,
			// 	permissionOverwrites: [{
			// 		id: interaction.guild.roles.cache.find(r => r.name === 'No Pledge'),
			// 		allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
			// 	}, {
			// 		id: interaction.guild.roles.everyone,
			// 		deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
			// 	}],
			// }).then(async channel => {
			// 	channel_faq = channel;
			// 	groupbuy.update({ channel_faq: channel.id }, { where: { guild_id: interaction.guild.id } });

			// 	const embed = new Discord.MessageEmbed()
			// 		.setColor('#FFFFFF')
			// 		.setTitle('FAQ')
			// 		.addFields([
			// 			{ name: 'Common Question Title', value: 'Common Answer Description' },
			// 			{ name: 'Common Question Title', value: 'Common Answer Description' },
			// 		])
			// 	channel_faq.send({
			// 		embeds: [embed]
			// 	});
			// })



			// if you want a seperate snippet channel, uncomment this
			// recommendation: place snippet in #information

			// let channel_snippet;
			// await interaction.guild.channels.create('snippet', {
			// 	type: 'GUILD_TEXT',
			// 	topic: 'The song snippet is provided here.',
			// 	position: 4,
			// 	parent: category_info,
			// 	permissionOverwrites: [{
			// 		id: interaction.guild.roles.cache.find(r => r.permissions.has('ADMINISTRATOR')),
			// 		allow: ['SEND_MESSAGES']
			// 	},
			// 	{
			// 		id: interaction.guild.roles.everyone,
			// 		deny: ['SEND_MESSAGES'],
			// 	}],
			// }).then(async channel => {
			// 	channel_snippet = channel;
			// 	groupbuy.update({ channel_snippet: channel.id }, { where: { guild_id: interaction.guild.id } });
			// })

			let channel_announcements
			await interaction.guild.channels.create('announcements', {
				type: 'GUILD_TEXT',
				position: 5,
				topic: 'Any announcements from Administrators or Moderators will be here.',
				parent: category_info,
				permissionOverwrites: [{
					id: interaction.guild.roles.cache.find(r => r.permissions.has('ADMINISTRATOR')),
					allow: ['SEND_MESSAGES']
				}, {
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: role_collector,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: interaction.guild.roles.everyone,
					deny: ['SEND_MESSAGES'],
				},
				],
			}).then(async channel => {
				channel_announcements = channel;
				groupbuy.update({ channel_announcements: channel.id }, { where: { guild_id: interaction.guild.id } });
			})

			let category_payment;
			await interaction.guild.channels.create('payment (closed)', {
				type: 'GUILD_CATEGORY',
				position: 8,
				permissionOverwrites: [{
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
				}],
			}).then(async channel => {
				groupbuy.update({ category_payment: channel.id }, { where: { guild_id: interaction.guild.id } });
				category_payment = channel.id;
			})

			let channel_paymentinfo;
			await interaction.guild.channels.create('payment-info', {
				type: 'GUILD_TEXT',
				position: 9,
				topic: 'Payment information is available here.',
				parent: category_payment,
				permissionOverwrites: [{
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
				}],
			}).then(async channel => {
				channel_paymentinfo = channel;
				groupbuy.update({ channel_paymentinfo: channel.id }, { where: { guild_id: interaction.guild.id } });

				const embed = new Discord.MessageEmbed()
					.setColor('BLURPLE')
					.setAuthor({
						name: 'Payment Information',
					})
					.setDescription(`${inlineCode('/payment add')} to add a payment service.`)

				const message = await channel.send({
					embeds: [embed]
				});
				groupbuy.update({ message_payment_information: message.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_paidscreenshot;
			await interaction.guild.channels.create('paid-screenshot', {
				type: 'GUILD_TEXT',
				position: 10,
				parent: category_payment,
				rateLimitPerUser: 10,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					allow: ['SEND_MESSAGES', 'ATTACH_FILES'],
					deny: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
				}],
			}).then(async channel => {
				channel_paidscreenshot = channel;
				groupbuy.update({ channel_paidscreenshot: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_paidamount;
			await interaction.guild.channels.create(`$0.00/${currency(price).format(true)}`, {
				type: 'GUILD_VOICE',
				position: 11,
				parent: category_payment,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					deny: ['CONNECT'],
					allow: ['VIEW_CHANNEL'],
				}],
			}).then(async channel => {
				channel_paidamount = channel;
				groupbuy.update({ channel_paidamount: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let category_pledge;
			await interaction.guild.channels.create('pledge', {
				type: 'GUILD_CATEGORY',
				position: 12,
			}).then(async channel => {
				groupbuy.update({ category_pledge: channel.id }, { where: { guild_id: interaction.guild.id } });
				category_pledge = channel.id;
			});

			let channel_pledges;
			await interaction.guild.channels.create('pledges', {
				type: 'GUILD_TEXT',
				position: 13,
				parent: category_pledge,
				rateLimitPerUser: 10,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
				}],
			}).then(async channel => {
				channel_pledges = channel;
				groupbuy.update({ channel_pledges: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_pledgeamount;
			await interaction.guild.channels.create(`$0.00/${currency(price).format(true)}`, {
				type: 'GUILD_VOICE',
				position: 14,
				parent: category_pledge,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					deny: ['CONNECT'],
				}],
			}).then(async channel => {
				channel_pledgeamount = channel;
				groupbuy.update({ channel_pledgeamount: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let category_chat;
			await interaction.guild.channels.create('chat', {
				type: 'GUILD_CATEGORY',
				position: 15,
			}).then(async channel => {
				groupbuy.update({ category_chat: channel.id }, { where: { guild_id: interaction.guild.id } });
				category_chat = channel.id;
			});

			let channel_general;
			await interaction.guild.channels.create('general', {
				type: 'GUILD_TEXT',
				position: 16,
				parent: category_chat,
			}).then(async channel => {
				channel_general = channel;
				groupbuy.update({ channel_general: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_paidchat;
			await interaction.guild.channels.create('paid-chat', {
				type: 'GUILD_TEXT',
				position: 17,
				parent: category_chat,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL']
				},
				{
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				},
				{
					id: role_collector,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: role_paid,
					allow: ['VIEW_CHANNEL'],
				}],
			}).then(async channel => {
				channel_paidchat = channel;
				groupbuy.update({ channel_paidchat: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let category_moderation;
			await interaction.guild.channels.create('moderation', {
				type: 'GUILD_CATEGORY',
				position: 18,
			}).then(async channel => {
				groupbuy.update({ category_moderation: channel.id }, { where: { guild_id: interaction.guild.id } });
				category_moderation = channel.id;
			});

			let channel_modchat;
			await interaction.guild.channels.create('mod-chat', {
				type: 'GUILD_TEXT',
				position: 18,
				parent: category_moderation,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL']
				},
				{
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				},
				{
					id: role_collector,
					allow: ['VIEW_CHANNEL'],
				}],
			}).then(async channel => {
				channel_modchat = channel;
				groupbuy.update({ channel_modchat: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_botchat;
			await interaction.guild.channels.create('bot-chat', {
				type: 'GUILD_TEXT',
				position: 19,
				parent: category_moderation,
				permissionOverwrites: [{
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL']
				},
				{
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				},
				{
					id: role_collector,
					allow: ['VIEW_CHANNEL'],
				}]
			}).then(async channel => {
				channel_botchat = channel;
				groupbuy.update({ channel_botchat: channel.id }, { where: { guild_id: interaction.guild.id } });
			});

			let channel_connections;
			await interaction.guild.channels.create('connections', {
				type: 'GUILD_TEXT',
				position: 20,
				parent: category_moderation,
				permissionOverwrites: [{
					id: interaction.guild.roles.cache.find(r => r.permissions.has('ADMINISTRATOR')),
					allow: ['VIEW_CHANNEL']
				}, {
					id: role_moderator,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: role_collector,
					allow: ['VIEW_CHANNEL'],
				}, {
					id: interaction.guild.roles.everyone,
					deny: ['VIEW_CHANNEL'],
				}],
			}).then(async channel => {
				channel_connections = channel;
				groupbuy.update({ channel_connections: channel.id }, { where: { guild_id: interaction.guild.id } });
			})

			const embed = new Discord.MessageEmbed().setColor('LIGHT_GREY').setDescription(`${interaction.member.toString()} has created a groupbuy!`);
			return channel_botchat.send({
				embeds: [embed]
			});
		}
	}
	if (interaction.isAutocomplete()) {
		if (interaction.commandName === 'payment') {
			const payments = await Payments.findAll({ where: { guild_id: interaction.guild.id } });

			console.log(payments);
			const focusedValue = interaction.options.getFocused();
			const choices = payments.map(payment => `${payment.service}: ${payment.address}`);
			const filtered = choices.filter(choice => choice.startsWith(focusedValue));
			await interaction.respond(
				filtered.map(choice => ({ name: choice, value: choice })),
			);
		}
	}
	if (interaction.isUserContextMenu()) {
		if (interaction.commandName === 'Groupbuy Statistics') {
			const member = await Users.findOne({ where: { user_id: interaction.targetUser.id } });
			console.log(member);
			const embed = new Discord.MessageEmbed().setColor('GREYPLE').setAuthor({ name: interaction.targetUser.username, iconURL: interaction.targetUser.avatarURL() });
			if (member) {
				embed.setTitle(`Groupbuy Statistics`);
				Object.entries(member.dataValues).forEach(([key, value]) => {
					switch (key) {
						case 'joined':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `${bold('Joined')}: ${value} `);
							break;
						case 'left':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `\n${bold('Left')}: ${value} `);
							break;
						case 'banned':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `\n${bold('Banned')}: ${value} `);
							break;
						case 'pledged':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `\n${bold('Pledged')}: ${value} `);
							break;
						case 'pledged_amount':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `${inlineCode(`(${currency(value).format(true)})`)}`);
							break;
						case 'paid':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `\n${bold('Paid')}: ${value} `);
							break;
						case 'paid_amount':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `${inlineCode(`(${currency(value).format(true)})`)}`);
							break;
						case 'createdAt':
							embed.setDescription(`${embed.description ? embed.description : ''}` + `\n${bold('Created')}: ${time(new Date(value))} `);
							break;
						default:
							break;
					}
				});
			}
			else {
				embed.setDescription(`${interaction.targetUser.toString()} has not joined a groupbuy but somehow you're using this command on them... hmmm.`);
			}
			return interaction.reply({
				ephemeral: true,
				embeds: [embed]
			})
		}
	}
});

client.login(auth.token);

async function recountChannel(channelId) {
	let amount = currency(0);
	const channel = await client.channels.fetch(channelId);
	let lastMessageId = channel.lastMessageId;
	let messages;

	do {
		messages = await channel.messages.fetch({
			limit: 100,
			before: lastMessageId,
		});
		for (let message_fetched of messages.values()) {
			amount = amount.add(currency(message_fetched.content.split(' ')[0]));
			lastMessageId = message_fetched.id;
		}
		console.log(messages.size);
	} while (messages.size == 100);
	return currency(amount);
}

async function increment_user(member, type, amount) {
	if (!amount) amount = 1;
	let user = await Users.findOne({ where: { user_id: member.id } });
	if (!user) { return Users.create({ user_id: member.id, joined: 1, [type]: amount, }); }
	else { user.increment([type], { by: amount }); }
	return user;
}

// TODO: set amount to negative if deleted message
async function set_channel_paidamount(groupbuy, amount) {

	let paid = currency(groupbuy.paid).value;
	const price = currency(groupbuy.price).value;

	paid = currency(paid).add(amount);
	groupbuy.update({ paid: paid });

	const guild = await client.guilds.fetch(groupbuy.guild_id);
	const channel_paidamount = guild.channels.cache.get(groupbuy.channel_paidamount);
	channel_paidamount.setName(`${currency(paid).format(true)}/${currency(price).format(true)}`);
}

async function set_channel_pledgeamount(groupbuy, amount) {

	let pledged = currency(groupbuy.pledged).value;
	const price = currency(groupbuy.price).value;

	pledged = currency(pledged).add(amount);
	groupbuy.update({ pledged: pledged });

	const guild = await client.guilds.fetch(groupbuy.guild_id);
	const channel_pledgeamount = guild.channels.cache.get(groupbuy.channel_pledgeamount);
	channel_pledgeamount.setName(`${currency(pledged).format(true)}/${currency(price).format(true)}`);
}

// check if member is perm banned
async function checkBan(member) {

	const banned = await Bans.findOne({ where: { user_id: member.id } });
	if (banned) member.ban({
		reason: `This user was permanently banned from groupbuys by ${userMention(banned.banner_id)}`,
	})
}

async function checkCoordinators(member) {

	const coordinator = await Coordinators.findOne({ where: { user_id: member.id } });
	const groupbuy = await Groupbuys.findOne({ where: { guild_id: member.guild.id } });
	if (coordinator) {
		await member.roles.remove(groupbuy.role_nopledge);
		switch (coordinator.type) {
			case 'moderator':
				await member.roles.add(groupbuy.role_moderator);
				break;
			case 'administrator':
				await member.roles.add(groupbuy.role_administrator);
				break;
			case 'coordinator':
				await member.roles.add(groupbuy.role_coordinator);
				break;
			default:
				break;
		}
	}
	else if (member.roles.cache.has(groupbuy.role_coordinator)) await member.roles.remove(groupbuy.role_coordinator);
}

function isPositiveFloat(s) {
	return !isNaN(s) && Number(s) > 0;
}