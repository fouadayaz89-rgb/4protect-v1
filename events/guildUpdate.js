const Discord = require('discord.js');
const config = require('../config');
const db = require("quick.db");
const cl = new db.table("Color");
const owner = new db.table("Owner");
const rlog = new db.table("raidlog");
const punish = new db.table("Punition");
const agu = new db.table("Guildupdate");

module.exports = {
    name: 'guildUpdate',
    once: false,

    async execute(client, oldGuild, newGuild) {
        if (oldGuild === newGuild) return;
        let guild = newGuild;

        let color = cl.fetch(`color_${guild.id}`);
        if (!color) color = config.app.color;

        if (agu.get(`guildupdate_${guild.id}`) !== true) return;

        const action = await guild.fetchAuditLogs({ type: "GUILD_UPDATE" }).then(a => a.entries.first());
        if (!action || !action.executor) return;
        if (action.executor.id === client.user.id) return;

        let isOwner = false;

        if (Array.isArray(config.app.owners) && config.app.owners.includes(action.executor.id)) isOwner = true;
        if (Array.isArray(config.app.funny) && config.app.funny.includes(action.executor.id)) isOwner = true;
        if (typeof config.app.funny === 'string' && config.app.funny === action.executor.id) isOwner = true;
        if (owner.get(`owners.${action.executor.id}`) === true) isOwner = true;

        if (isOwner) return;

        const sanction = punish.get(`sanction_${guild.id}`);
        const member = await guild.members.fetch(action.executor.id).catch(() => null);
        if (!member) return;

        if (sanction === "ban") {
            guild.members.ban(action.executor.id, { reason: `Anti Guild Update` }).catch(console.error);
        } else if (sanction === "derank") {
            member.roles.cache.forEach(role => {
                if (role.name !== '@everyone') {
                    member.roles.remove(role).catch(() => {});
                }
            });
        } else if (sanction === "kick") {
            guild.members.kick(action.executor.id, { reason: `Anti Guild Update` }).catch(console.error);
        }

        const embed = new Discord.MessageEmbed()
            .setDescription(`${action.executor} a apporté des \`modifications au serveur\`, **il a été sanctionné**`)
            .setColor(color);

        const logChannelId = rlog.fetch(`${guild.id}.raidlog`);
        if (logChannelId) {
            const logChannel = client.channels.cache.get(logChannelId);
            if (logChannel) logChannel.send({ embeds: [embed] }).catch(console.error);
        }

        try {
            if (oldGuild.name !== newGuild.name) await newGuild.setName(oldGuild.name);
            if (oldGuild.iconURL({ dynamic: true }) !== newGuild.iconURL({ dynamic: true })) await newGuild.setIcon(oldGuild.iconURL({ dynamic: true }));
            if (oldGuild.bannerURL() !== newGuild.bannerURL()) await newGuild.setBanner(oldGuild.bannerURL());
            if (oldGuild.systemChannel !== newGuild.systemChannel) await newGuild.setSystemChannel(oldGuild.systemChannel);
            if (oldGuild.systemChannelFlags.bitfield !== newGuild.systemChannelFlags.bitfield) await newGuild.setSystemChannelFlags(oldGuild.systemChannelFlags);
            if (oldGuild.verificationLevel !== newGuild.verificationLevel) await newGuild.setVerificationLevel(oldGuild.verificationLevel);
            if (oldGuild.rulesChannel !== newGuild.rulesChannel) await newGuild.setRulesChannel(oldGuild.rulesChannel);
            if (oldGuild.publicUpdatesChannel !== newGuild.publicUpdatesChannel) await newGuild.setPublicUpdatesChannel(oldGuild.publicUpdatesChannel);
            if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) await newGuild.setDefaultMessageNotifications(oldGuild.defaultMessageNotifications);
            if (oldGuild.afkChannel !== newGuild.afkChannel) await newGuild.setAFKChannel(oldGuild.afkChannel);
            if (oldGuild.afkTimeout !== newGuild.afkTimeout) await newGuild.setAFKTimeout(oldGuild.afkTimeout);
            if (oldGuild.splashURL() !== newGuild.splashURL()) await newGuild.setSplash(oldGuild.splashURL());
            if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
                await guild.fetchVanityData().then(data => {
                    if (data.code !== oldGuild.vanityURLCode) {
                        // await newGuild.setVanityURL(oldGuild.vanityURLCode);
                    }
                }).catch(() => {});
            }
        } catch (err) {
            console.error(err);
        }
    }
};
