"use strict";

const fs = require('fs');
const alarm_db = require('./data_access/alarm_index');

const logging = require('../Utils/logging');

module.exports = {
  name: 'import',
  description: 'Import alarms via JSON file. File must be attached to message.',
  usage: 'import',
  execute(msg, args, client, cron, cron_list, mongoose) {
    // TODO what behaviour should it have? channel only, file attached, etc 
    // logging, catch any possible exceptions
    var attachment = (msg.attachments)
    if (!attachment) {
      logging.logger.info('No attached file to import.');
      msg.channel.send('Alarms file must be attached.');
      return;
    }

    fs.readFile(attachment.file, (err, data) => {
      if (err) {
        logging.logger.info('Error importing alarms file.');
        logging.logger.error(err);
        msg.channel.send('Alarms file must be attached.');
        return;
      }
      let alarms = JSON.parse(data);

      // save each alarm to db
      alarms.forEach((alarm) => {
        // TODO
      });

      msg.channel.send('Alarms imported successfully');
    });


  },
};