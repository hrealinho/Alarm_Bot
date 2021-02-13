"use strict";

const Alarm_model = require('../models/alarm_model');
const Private_alarm_model = require('../models/private_alarm_model');

const auth = require('./../auth.json');
const private_flag = auth.private_prefix;
const temp_flag = auth.one_time_prefix;
const logging = require('../Utils/logging');

const utility_functions = require('../Utils/utility_functions');

function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}

function parseDate(date_args) {
    let date_tokens = date_args.split('/');
    if (date_tokens.length === 2 || date_tokens.length === 3) {
        let day = date_tokens[0];
        let month = date_tokens[1];
        let year = new Date().getFullYear();

        if (date_tokens.length === 3) {
            year = date_tokens[2];
        }

        let date_stg = `${year}-${month}-${day}`;
        let d = new Date(date_stg);
        return d;
    }
    return undefined;
}

async function silenceAlarmWithID(alarm_to_silence, activate) {
    if (alarm_to_silence.includes(private_flag)) {
        await Private_alarm_model.updateOne(
            { alarm_id: alarm_to_silence },
            {
                isActive: activate
            }
        );
    } else if (!alarm_to_silence.includes(temp_flag)) {
        await Alarm_model.updateOne(
            { alarm_id: alarm_to_silence },
            {
                isActive: activate
            }
        );
    }
}

module.exports = {
    name: 'silenceAlarm',
    description: 'Silences the alarm with a given id. If you also pass a date it will activate automatically once that day arrives otherwise it will be silenced until you turn it back on using activateAlarm <id>',
    usage: auth.prefix + 'silenceAlarm <id> <date_to_active_again>',
    async execute(msg, args, client, cron, cron_list, mongoose) {
        if (args.length >= 1) {

            var alarm_to_silence = args[0];
            if(alarm_to_silence.includes(auth.one_time_prefix)){
                msg.channel.send('Silence feature is not available for oneTimeAlarms, if you wish to silence a oneTimeAlarm just delete it with `$deleteAlarm ' + alarm_to_silence + '`');
                return;
            }
            let timeout = undefined;
            if (args.length >= 2) {
                timeout = args[1];
            }
            if (!utility_functions.can_change_alarm(msg, alarm_to_silence)) {
                msg.channel.send(`The alarm you selected isn't yours or you aren't administrator on this server therefore you cannot silence it!`)
            }
            else {
                if (cron_list[alarm_to_silence] !== undefined) {
                    if (cron_list[alarm_to_silence].running) {
                        if (timeout !== undefined) {
                            let timeout_date = parseDate(timeout);
                            if (isValidDate(timeout_date)) {
                                let current_date = new Date();
                                if (timeout_date > current_date) {
                                    let c = new cron(timeout_date, async () => {
                                        if (!cron_list[alarm_to_silence].running) {
                                            cron_list[alarm_to_silence].start();
                                            await silenceAlarmWithID(alarm_to_silence, true);
                                            msg.channel.send(`Alarm with id ${alarm_to_silence} is now active again!`);
                                        }
                                    });
                                    c.start();
                                    msg.channel.send(`Alarm will be activated again in ${timeout}`);
                                }
                                else {
                                    msg.channel.send('The date you have provided has already happened...');
                                    return;
                                }
                            } else {
                                msg.channel.send('The date you entered is invalid');
                                return;
                            }
                        }
                        try {
                            await silenceAlarmWithID(alarm_to_silence, false);
                            cron_list[alarm_to_silence].stop();
                            msg.channel.send(`${alarm_to_silence} is now silent.`);
                        } catch (e) {
                            logging.logger.info(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                            logging.logger.error(e);
                            msg.channel.send(`Error silencing alarm with id:${alarm_to_silence}... Please try again later!`);
                        }
                    } else {
                        msg.channel.send(`Alarm with id ${alarm_to_silence} has already been silenced.\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
                    }
                }
                else {
                    var myalarms_command_stg = "`myAlarms`";
                    msg.channel.send(`Impossible to silence alarm with id ${alarm_to_silence}.\nPlease check if you entered the id of the alarm correctly!\nTo see your alarms, type: ${auth.prefix}${myalarms_command_stg}`);
                }
            }
        } else {
            msg.channel.send(`No arguments were passed to execute this command.\n`
                + 'Usage: ' + this.usage);
        }

    }
};
