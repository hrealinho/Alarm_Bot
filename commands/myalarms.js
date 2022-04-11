"use strict";

const auth = require('./../auth.json');
const utility = require('./../Utils/utility_functions');
const utility_functions = require('./../Utils/utility_functions');
const db_alarms = require('../data_access/alarm_index');
const { SlashCommandBuilder } = require('@discordjs/builders');

const optionFlag = 'id-only';

module.exports = {
    name: 'myAlarms',
    description: 'Fetches all of your alarms.\n`myAlarms -id` sends a non embed message with the ids for easier copy/pasting on phone.',
    usage: auth.prefix + 'myAlarms',
    data: new SlashCommandBuilder()
        .setName("myalarms")
        .setDescription("Fetches all alarms")
        .addStringOption(option => option.setName(optionFlag).setDescription('The message only contains the id of the alarms when assigning yes to this field')),
    async execute(interaction) {
        let flag = interaction.options.getString('id-only');
        let guild_id = interaction.channel.type === 'dm' ? "" : interaction.guild?.id;

        let results_pub = await db_alarms.get_all_alarms_from_user_and_guild(interaction.user.id, guild_id);
        let results_priv = await db_alarms.get_all_privAlarms_from_user(interaction.user.id);
        let results_ota_pub = await db_alarms.get_all_oneTimeAlarm_from_user(interaction.user.id, false, interaction.guild?.id);
        let results_ota_priv = await db_alarms.get_all_oneTimeAlarm_from_user(interaction.user.id, true, interaction.guild?.id);
        let results_tts = await db_alarms.get_all_ttsalarms_from_user_and_guild(interaction.user.id, guild_id);

        if (flag && flag !== "" && utility_functions.compareIgnoringCase(flag, 'yes')) {
            let id_stg = '**Public Alarms**:\n';
            results_pub.forEach(alarm => {
                id_stg += `${alarm.alarm_id}\n`;
            });
            results_ota_pub.forEach(ota => {
                id_stg += `${ota.alarm_id}\n`;
            });
            results_tts.forEach(ta => {
                id_stg += `${ta.alarm_id}\n`;
            });
            let chunks = utility_functions.chunkArray(id_stg, 2000);


            for (let chunk of chunks) {
                await interaction.reply(chunk);
            }

            id_stg = '**Private Alarms**:\n';
            results_priv.forEach(p_alarm => {
                id_stg += `${p_alarm.alarm_id}\n`;
            });

            id_stg += '**Private One Time Alarms:**\n';

            results_ota_priv.forEach(ota => {
                id_stg += `${ota.alarm_id}\n`
            })

            chunks = utility_functions.chunkArray(id_stg, 2000);

            try {
                for (let chunk of chunks) {
                    interaction.user.send(chunk);
                }
            } catch (err) {
                logging.logger.info(`Can't send reply to \`myalarms\` ${flag} message from user ${interaction.user.id}.`);
                logging.logger.error(err);
                if (interaction.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(interaction, interaction.channel)) {
                    await interaction.reply('Unable to send you the private alarms via DM. Check your permissions!');
                }
            }
            return;
        }

        // create alarm messages
        let general_alarms = createMessageWithEntries(results_pub);
        let private_alarms = createMessageWithEntries(results_priv);
        let tts_alarms = createMessageWithEntries(results_tts);

        // ota message
        let general_otas = createMessageWithOTAEntries(results_ota_pub);
        let priv_otas = createMessageWithOTAEntries(results_ota_priv);


        // chunk it because of the max size for discord messages
        let public_chunks = utility.chunkArray(general_alarms, 20);
        let private_chunks = utility.chunkArray(private_alarms, 20);

        let public_chunks2 = utility.chunkArray(general_otas, 20);
        let private_chunks2 = utility.chunkArray(priv_otas, 20);

        let tts_chunks = utility.chunkArray(tts_alarms, 20);

        if (general_alarms.length <= 0 && tts_alarms.length <= 0) {
            await interaction.reply('You do not have alarms in this server!');
        }

        // send public alarms
        sendChunksAsPublicMsg(public_chunks, interaction, "Your public alarms in this server are:");
        sendChunksAsPublicMsg(public_chunks2, interaction, "Your public one time alarms in this server are:");
        sendChunksAsPublicMsg(tts_chunks, interaction, "Your TTS alarms for this server are:");

        // send private alarms
        for (let chunk of private_chunks) {
            interaction.user.send({
                embeds: [{
                    color: 0x5CFF5C,
                    title: "Your private alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }]
            }).catch(async (err) => {
                logging.logger.info(`Can't send reply to myalarms message from user ${interaction.user.id}.`);
                logging.logger.error(err);
                if (interaction.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(interaction, interaction.channel)) {
                    await interaction.reply('Unable to send you the private alarms via DM. Check your permissions!');
                }
            });
        }

        for (let chunk of private_chunks2) {
            interaction.user.send({
                embeds: [{
                    color: 0xcc1100,
                    title: "Your private one time alarms alarms are:",
                    fields: chunk,
                    timestamp: new Date()
                }]
            }).catch(async _ => {
                if (interaction.channel.type !== 'dm' && utility_functions.can_send_messages_to_ch(interaction, interaction.channel)) {
                    await interaction.reply('Unable to send you the private alarms via DM. Check your permissions!');
                }
            });
        }

    }
}

async function sendChunksAsPublicMsg(public_chunks, interaction, title_message) {
    for (let chunk of public_chunks) {
        if (utility_functions.can_send_embeded(interaction)) {
            await interaction.reply({
                embeds: [{
                    color: 0xff80d5,
                    title: title_message,
                    fields: chunk,
                    timestamp: new Date()
                }]
            });
        } else {
            await interaction.reply('Embeded messages are disallowed for this server. Try turning them on or use `$myalarms -id`.');
        }
    }
}

function createMessageWithEntries(msgs) {
    let general_alarms = [];
    for (let alarm of msgs) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_args;
        let alarm_preview = alarm.message.substring(0, 30);
        let active_alarm = alarm.isActive ? "Active" : "Silenced";
        let server = (alarm.server_name ?? alarm.guild) ?? "N/A";
        let field = {
            name: `ID: ${alarm_id}`,
            value: `\tWith params: ${alarm_params}\nMessage: ${alarm_preview}\n${active_alarm}\nIn server: ${server}`
        };
        general_alarms.push(field);
    }
    return general_alarms;
}

function createMessageWithOTAEntries(results) {
    let general_alarms = [];
    for (let alarm of results) {
        let alarm_id = alarm.alarm_id;
        let alarm_params = alarm.alarm_date;
        let alarm_preview = alarm.message.substring(0, 30);
        if (!alarm.isPrivate) {
            let server = alarm.server_name ?? alarm.guild;
            let field = {
                name: `ID: ${alarm_id}`,
                value: `\tFor date: ${alarm_params}\nMessage: ${alarm_preview}\nIn server: ${server}`
            };
            general_alarms.push(field);
        } else {
            let field = {
                name: `ID: ${alarm_id} (Private)`,
                value: `\tFor date: ${alarm_params}\nMessage: ${alarm_preview}`
            };
            general_alarms.push(field);
        }
    }
    return general_alarms;
}