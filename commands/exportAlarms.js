"use strict";

const fs = require('fs');
const alarm_db = require('./data_access/alarm_index');

const logging = require('../Utils/logging');

module.exports = {
  name: 'export',
  description: 'Export alarms to JSON file',
  usage: 'export <filename>',
  execute(msg, args, client, cron, cron_list, mongoose) {
    
    // TODO
    // logging, catch any possible exceptions
    // missing validations e.g. are we in a channel, valid filename... ?
    // if in DM should this work? if yes: specify guild or download all the alarms user can see or something else?
    if (args.length < 1) { // TODO should it be required, or just give a static name if filename not passed as arg?
        msg.channel.send('Filename required.'); 
        return;
    } 
    
    let filename = args[0];
    // get all alarms for this guild and transform them to json
    let guild_alarms_json = await alarm_db.get_all_alarms_from_guild(guild_id)
        .map((alarm) => alarm.toJSON());

    // build json string and write to file then send it to channel
    fs.writeFile(`${filename}.json`, JSON.stringify(guild_alarms_json), () => {  
      message.channel.send('Here you go...', { files: [`${filename}.json`] });
    });
  },
};

