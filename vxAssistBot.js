const { spawn } = require('child_process');
const { escapeMarkupV2String, sanitizeString, debugOut, } = require('./vxAssistCommon.js');
const { CuteAiTelegramBot } = require('ent42/telegramBot.js');
const { Licensing } = require("ent42/license.js");
const { parseEntities } = require('./AIInterface.js');
const fs = require('fs');
const path = require('path');
const fileType = require('file-type');

class vxAssistBotBot extends CuteAiTelegramBot {
  constructor() {
    super();

    this.packageJson = require('./package.json');
    this.T.MSG_ACCESS_DENIED = `Access denied 🥺\n\nPlease visit ${this.packageJson.homepage} for more information 🫶`;
    this.T.MSG_GROUP_ACCESS_DENIED = `Group access denied 🥺\n\nPlease visit ${this.packageJson.homepage} for more information 🫶`;
  }

  async SetupContextCommands() {
    const T = JSON.parse(fs.readFileSync('strings.en_US.json'));

    /**
     * Bot Owner
     * Those commands might compromise system security and should be used with caution
     */
    this.commands.addBotOwner(T.CMD_HALT, this.handleHalt.bind(this), T.DESC_HALT);
    this.commands.addBotOwner(T.CMD_UPDATE, this.handleUpdate.bind(this), T.DESC_UPDATE);
    this.commands.addBotOwner(T.CMD_EXEC, this.handleExecuteCommand.bind(this), T.DESC_EXEC);
    this.commands.addBotOwner(T.CMD_ISSUELIC, this.handleIssueLicense.bind(this), T.DESC_ISSUELIC);
    this.commands.addBotOwner(T.CMD_REVOKELIC, this.handleRevokeLicense.bind(this), T.DESC_REVOKELIC);

    /* Bot Admin */
    this.commands.addBotAdmin(T.CMD_HELP, this.handleHelp.bind(this), T.DESC_HELP);
    this.commands.addBotAdmin(T.CMD_ADDADMIN, this.handleAddAdmin.bind(this), T.DESC_ADDADMIN);
    this.commands.addBotAdmin(T.CMD_REMOVEADMIN, this.handleRemoveAdmin.bind(this), T.DESC_REMOVEADMIN);
    this.commands.addBotAdmin(T.CMD_SETPARAM, this.handleSetParameter.bind(this), T.DESC_SETPARAM);
    this.commands.addBotAdmin(T.CMD_GETPARAM, this.handleGetParameter.bind(this), T.DESC_GETPARAM);

    /* Group Admin, Group & User */
    this.commands.addUser(
      this.commands.addGroup(
        this.commands.addGroupAdmin(T.CMD_INTRO, this.handleIntroduce.bind(this), T.DESC_INTRO)
      ));
    this.commands.addUser(
      this.commands.addGroup(
        this.commands.addGroupAdmin(T.CMD_GENIMG, this.handleGenerateImage.bind(this), T.DESC_GENIMG)
      ));
    this.commands.addUser(
      this.commands.addGroup(
        this.commands.addGroupAdmin(T.CMD_GENVID, this.handleGenerateVideo.bind(this), T.DESC_GENVID)
      ));
    this.commands.addUser(
      this.commands.addGroup(
        this.commands.addGroupAdmin(T.CMD_USERINFO, this.handleUserInfo.bind(this), T.DESC_USERINFO)
      ));
    this.commands.addUser(
      this.commands.addGroup(
        this.commands.addGroupAdmin(T.CMD_ABOUT, this.handleAbout.bind(this), T.DESC_ABOUT)
      ));

    /* Group Admin & User */
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_SETROLE, this.handleSetRole.bind(this), T.DESC_SETROLE)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_GETROLE, this.handleGetRole.bind(this), T.DESC_GETROLE)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_RESETROLE, this.handleResetRole.bind(this), T.DESC_RESETROLE)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_WIPECONTEXT, this.handleWipeContext.bind(this), T.DESC_WIPECONTEXT)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_WIPEMEMORY, this.handleWipeMemory.bind(this), T.DESC_WIPEMEMORY)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_DOWNLOADMEMORY, this.handleDownloadMemory.bind(this), T.DESC_DOWNLOADMEMORY)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_REDUCE, this.handleReduce.bind(this), T.DESC_REDUCE)
    );
    this.commands.addUser(
      this.commands.addGroupAdmin(T.CMD_POPDIALOG, this.handlePopDialog.bind(this), T.DESC_POPDIALOG)
    );

    /* User */
    this.commands.addUser(T.CMD_START, this.handleStart.bind(this), T.DESC_START)
    this.commands.addUser(T.CMD_CLAIMLIC, this.handleClaimLicense.bind(this), T.DESC_CLAIMLIC)

    await super.SetupContextCommands();
  }

  async handleCommandOrComplete(msg) {
    const command = this.parseCommand(msg.text);

    if (command) {
      return this.executeCommand(msg, command.commandName, command.params)
        .then(response => {
          if (response) {
            return this.reply(msg, response);
          }
        });
    }

    return this.completeMessageConditional(msg).then(response => {
      if (response && response.length > 0) {
        const entities = parseEntities(response.join('\n)'));
        return this.send(msg, entities.join(''), { parse_mode: 'MarkdownV2' });
      }
      return response;
    });
  }

  async handleMessage(msg, params) {
    if (this.isAuthorized(msg)) {
      this.updateCacheFromMessage(msg);

      var keepActionAliveTimer = setInterval(() => {
        this.bot.sendChatAction(msg.chat.id, 'typing', { message_thread_id: msg.message_thread_id });
      }, 3000);

      return this.handleCommandOrComplete(msg).catch(error => {
        debugOut(error.message + "\n" + JSON.stringify(msg, null, 2));
        return this.reply(msg, error.message + "\n" + JSON.stringify(msg, null, 2));
      })
        .finally(() => {
          clearInterval(keepActionAliveTimer);
          this.saveToStorage();
        });
    } else {
      return this.reply(msg, this.T.MSG_ACCESS_DENIED);
    }
  }

  handleEditedMessage(msg, params) {
    this.handleMessage(msg);
  }

  handleUserInfo(msg, params) {
    var licence = Licensing.getByConsumer(msg.from.id);

    if (!licence) {
      licence = { licId: 'UNLICENSED' };
    }

    const licenceValid = Licensing.validate(licence);     

    if (msg.chat.type === 'private') {
      return `User ID: ${msg.from.id}\nLicense ID: ${licence.licId}\nLicense valid: ${licenceValid}`;
    } else {
      return `User ID: ${msg.from.id}\nGroup ID: ${msg.chat.id}\nLicense ID: ${licence.licId}\nLicense valid: ${licenceValid}`;
    }
  }

  handleAbout(msg, params) {
    var about = '';

    about += 'Version: ' + this.packageJson.version + '\n';
    about += 'Author: ' + this.packageJson.author + '\n';
    about += 'Website: ' + this.packageJson.homepage;

    this.send(msg, about).catch(ex => { debugOut(ex.message) });
  }

  handleHelp(msg, params) {
    var helpText = '';

    this.commands.forEachUniqueCommand((trigger, command) => {

      if (command.adminOnly && !this.isBotAdmin(msg.from.id)) {
        // Do nothing, effectively hiding admin commands to regular users
        // Warning! The commands are still callable and need to be secured elsewhere
      } else if (command.ownerOnly && !this.isBotOwner(msg.from.id)) {
        // Do nothing, effectively hiding owner commands everyone else
        // Warning! The commands are still callable and need to be secured elsewhere
      } else {
        helpText += '`';
        helpText += '/' + trigger;
        helpText += '`';
        helpText += '\n_' + escapeMarkupV2String(command.description) + '_\n';
      }

    }).then(() => {
      var markup = '';

      markup += '*Available Commands:*\n\n';
      markup += helpText;

      this.send(msg, markup, { parse_mode: 'MarkdownV2' }).catch(ex => { debugOut(ex.message) });
    });
  }

  handleReduce(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    var n = Math.min(Math.abs(parseInt(params[0] ?? 0), uniqueAi.persona.maxToken));

    uniqueAi.reduceContext(n);
    this.saveToStorage();

    this.send(msg, `Current context successfully reduced to ${n} token 🧠`).catch(ex => {
      debugOut(ex.message)
    });
  }

  handlePopDialog(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    var dlg = uniqueAi.popDialog();
    this.saveToStorage();

    debugOut('context removed > ' + dlg.message.content.substring(0, 20) + '...');
    debugOut('context removed > ' + dlg.response.content.substring(0, 20) + '...');

    this.send(msg, `Ok, the previous dialog never happened 🧠`).catch(ex => {
      debugOut(ex.message)
    });
  }

  handleGenerateVideo(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    const args = params.join(' ');

    if (args.length === 0) {
      return this.send(msg, 'You must provide a title for the story. e.g. /genvid Ruth fighting for freedom');
    }

    var basename = path.basename(sanitizeString(args)).substring(0, 32);
    var filePath = './build/' + basename + `.txt`;
    var videoPath = './build/' + basename + `.Portrait.mp4`;

    const p = spawn('zsh', [config.VideoScript, filePath, args]);

    var state = 'record_video';
    const keepActionAliveTimer = setInterval(() => {
      this.bot.sendChatAction(msg.chat.id, state, { message_thread_id: msg.message_thread_id });
    }, 5000);

    p.stderr.on('data', data => { console.log(data.toString()); });
    p.stdout.on('data', data => { console.log(data.toString()); });

    p.on('exit', code => {
      if (fs.existsSync(videoPath)) {
        state = 'upload_video';
        return this.bot.sendVideo(msg.chat.id, videoPath,
          { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the video for: ${params.join(' ')}` },
          { filename: basename }).finally(() => {
            clearInterval(keepActionAliveTimer);
          });
      } else {
        return this.send(msg, `Failed to create video for: ${args}`).finally(() => {
          clearInterval(keepActionAliveTimer);
        });
      }
    });
  }

  handleHalt(msg, params) {
    setTimeout(() => {
      this.shutdown();
    }, 3000);
    
    return 'Shutdown will be triggered in 3 seconds...';
  }

  handleExecuteCommand(msg, params) {

    if (params.length === 0) {
      return this.send(msg, 'Missing argument. e.g. /exec ls -lah');
    }

    var inline = false;

    if (params[0].toLowerCase() == '-i') {
      inline = true;
      params.shift();
    }

    const rootPromise = new Promise((resolve, reject) => {
      const p = spawn(params[0], params.slice(1));

      var bStdout = '';
      var bStderr = '';

      p.stderr.on('data', data => { bStderr += data; });
      p.stdout.on('data', data => { bStdout += data; });

      const promises = [];

      p.on('exit', code => {
        if (bStdout.length > 0) {
          var buff = Buffer.from(bStdout)
          var type = fileType(buff);
          type = type ? type : { ext: 'txt', mime: 'text/plain' };


          if (type.ext === 'txt' && inline) {
            promises.push(this.send(msg, buff.toString()));
          } else {
            promises.push(
              this.bot.sendDocument(msg.chat.id, buff,
                { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the output for command: ${params.join(' ')}` },
                { filename: `stdout.${type.ext}`, contentType: `${type.mime}` }
              )
            );
          }
        }

        if (bStderr.length > 0) {
          var buff = Buffer.from(bStderr)
          var type = fileType(buff);
          type = type ? type : { ext: 'txt', mime: 'text/plain' };

          if (type.ext === 'txt' && inline) {
            promises.push(this.send(msg, buff.toString()));
          } else {
            promises.push(
              this.bot.sendDocument(msg.chat.id, buff,
                { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the output for command: ${params.join(' ')}` },
                { filename: `stderr.${type.ext}`, contentType: `${type.mime}` })
            );
          }
        }
        resolve(promises);
      });
    });

    return rootPromise.then((promises) => {
      return Promise.all(promises);
    });
  }

  handleUpdate(msg, params) {
    return this.handleExecuteCommand(msg, ['-i', 'git', 'pull']).then(() => {
      return this.handleHalt(msg);
    });
  }

  handleIssueLicense(msg, params) {
    var licence = Licensing.issue();
    return this.send(msg, `${JSON.stringify(licence, null, 2)}`);
  }

  handleRevokeLicense(msg, params) {
    const args = params.join(' ');

    if (args.length < 1) {
      return this.send(msg, 'usage: /revokelicense [license]');
    }

    var licence = Licensing.getById(params[0])

    if (!licence) {
      return this.send(msg, 'Invalid license 🤷‍♂️');
    }

    Licensing.revoke(licence);

    return this.send(msg, `License ${licence.licId} revoked successfully 🚫`);
  }

  handleClaimLicense(msg, params) {
    const args = params.join(' ');

    if (args.length < 1) {
      return this.send(msg, 'usage: /claimlicense [license]');
    }

    if (!Licensing.claim(params[0], msg.from.id)) {
      return this.send(msg, `License claim unsuccessfully 😢`);
    }

    return this.send(msg, `License claimed successfully 🥳`);
  }

  handleDownloadMemory(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    var buff = Buffer.from(JSON.stringify(uniqueAi.messages, null, 2));

    return this.bot.sendDocument(msg.chat.id, buff,
      { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Enjoy the memory` },
      { filename: `${msg.from.username}-${msg.chat.title}-Memory.txt`, contentType: 'text/plain' })
  }

  handleWipeMemory(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    uniqueAi.wipeMemory();
    this.saveToStorage();
  }

  handleWipeContext(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    uniqueAi.wipeContext();
    this.saveToStorage();
  }

  handleResetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    this.initializeUniqueAiRoleForChat(msg, uniqueAi);
    this.saveToStorage();

    return this.send(msg, 'AI persona reset to default');
  }

  handleSetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    uniqueAi.assignRole([params.join(' ')], {});
    this.saveToStorage();

    return this.send(msg, 'New role was assigned to the AI!');
  }

  handleGetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    return this.send(msg, uniqueAi.role().join('\n'));
  }

  handleSetParameter(msg, params) {
    if (!params?.length) {
      return this.send(msg, 'Missing parameter');
    }

    const selectedConfigs = [];

    if (params[0].toLowerCase() == 'all') {
      Object.keys(this.ai).forEach(i => {
        Object.keys(this.ai[i]).forEach(j => {
          selectedConfigs.push(this.ai[i][j].config);
        })
      });
      Object.keys(this.aiParams).forEach(i => {
        Object.keys(this.aiParams[i]).forEach(j => {
          selectedConfigs.push(this.aiParams[i][j]);
        })
      });

      params.shift();
    } else {
      const { uniqueAi, config } = this.uniqueAiForChat(msg);
      selectedConfigs.push(config);
    }

    var anyChange = false;

    selectedConfigs.forEach(config => {
      if (config.hasOwnProperty(params[0])) {
        config[params[0]] = params[1];
        anyChange = true;
      }
    });
    
    if(anyChange){
      this.saveToStorage();
      return `${params[0]} successfully set to: ${params[1]}`;
    }else{
      return `Parameter ${params[0]} doesn't exist!`;
    }
  }

  handleGetParameter(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    const reply = [];

    Object.keys(config).forEach(key => {
      if (typeof config[key] === 'string') {
        reply.push(`${key}: ${config[key]}`);
      }
    })

    return reply.join('\n');
  }

  handleGenerateImage(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    if (params.join(' ').length === 0) {
      return this.send(msg, 'You must provide a title for the story. e.g. /getimg Hello World. Use the reply function to provide a title or issue a new /getimg command')
        .then((nextMsg) => {
          if (!this.aiIgnoreReply[nextMsg.chat.id]) { this.aiIgnoreReply[nextMsg.chat.id] = {} }
          this.aiIgnoreReply[nextMsg.chat.id][nextMsg.message_id] = nextMsg.message_thread_id ? nextMsg.message_thread_id : nextMsg.message_id;
          const replyId = this.bot.onReplyToMessage(nextMsg.chat.id, nextMsg.message_id, replyMsg => {
            this.bot.removeReplyListener(replyId);
            delete this.aiIgnoreReply[msg.chat.id][msg.message_id];
            return this.handleGenerateImage(msg, [replyMsg.text]);
          });
          setTimeout(() => {
            this.bot.removeReplyListener(replyId);
            delete this.aiIgnoreReply[msg.chat.id][msg.message_id];
          }, 180000);
        });
    }

    const keepActionAliveTimer = setInterval(() => {
      this.bot.sendChatAction(msg.chat.id, 'record_video', { message_thread_id: msg.message_thread_id });
    }, 5000);

    return uniqueAi.createImage(params.join(' '), { Text2ImageAPI: config.Text2ImageAPI, Text2ImageModel: config.Text2ImageModel }).then((image) => {
      return this.bot.sendPhoto(msg.chat.id, image, { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the image for: ${params.join(' ')}` });
    }).catch(error => {
      return this.send(msg, error.message);
    }).finally(() => {
      clearInterval(keepActionAliveTimer);
    });
  }

  handleStart(msg, params) {
    var welcome = `Welcome to ${this.packageJson.name} 👋\n\n${this.packageJson.description}`;
    var licence = Licensing.getByConsumer(msg.from.id);

    if (licence && Licensing.validate(licence)) {
      welcome = `${welcome}\n\nHow can I serve you today?`;
    } else {
      welcome = `${welcome}\n\nPlease visit ${this.packageJson.homepage} to obtain a license 🙏`;
      welcome = `${welcome}\n\nYou can activate your license key using the /claimlicense [key] command.`;
      welcome = `${welcome}\n\nFor example:`;
      welcome = `${welcome}` + '\n\n/claimlicense 111-1111-1111-1111111';
    }

    return this.bot.sendMessage(msg.chat.id, welcome);
  }

  handleIntroduce(msg, params) {
    return this.send(msg, `By the Power of Grayskull ⚔️ @${this.botInfo.username} 💪`)
      .then(msg => {
        const { uniqueAi, config } = this.uniqueAiForChat(msg);
        return uniqueAi.createCompletion(["Please introduce yourself"], {}).then((completion) => {
          return this.send(msg, completion.join('\n'));
        })
      });
  }

  handleAddAdmin(msg, params) {
    const username = params[0];
    const user = this.getCachedUserByName(username);

    if (!user) {
      return this.send(msg, `${username} is unknown to this bot. Please have the user interact at least once first!`);
    }

    if (!this.adminUsers.includes(user.id)) {
      this.adminUsers.push(user.id);
      this.saveToStorage();
      return this.send(msg, `${username} has been added as an admin user.`);
    } else {
      return this.send(msg, `${username} is already an admin user.`);
    }
  }

  handleRemoveAdmin(msg, params) {
    const username = params[0];
    const user = this.getCachedUserByName(username);

    if (!user) {
      return this.send(msg, `@${username} is unknown to this bot. Please have the user interact at least once first!`);
    }

    const index = this.adminUsers.indexOf(username);
    if (index !== -1) {
      this.adminUsers.splice(index, 1);
      this.saveToStorage();
      return this.send(msg, `@${username} has been removed from admin users.`);
    } else {
      return this.send(msg, `@${username} is not an admin user.`);
    }
  }
}

const bot = new vxAssistBotBot();

bot.run().catch(error => {
  debugOut(error.message);
  bot.shutdown();
});
