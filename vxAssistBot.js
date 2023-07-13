const { spawn } = require('child_process');
const { extractJSON, sanitizeString, debugOut } = require('./vxAssistCommon.js');
const { Ent42TelegramBot } = require('ent42/telegramBot.js');
const fs = require('fs');
const path = require('path');
const fileType = require('file-type');
const { debug } = require('console');
const packageJson = require('./package.json');

class vxAssistBotBot extends Ent42TelegramBot {
  constructor() {
    super();

    const T = {
      CMD_ADDADMIN: 'addadmin',
      DESC_ADDADMIN: 'Grant admin privileges to a user',
      CMD_REMOVEADMIN: 'removeadmin',
      DESC_REMOVEADMIN: 'Revoke admin privileges for a user',
      CMD_ADDWHITELISTEDGROUP: 'addwhitelistedgroup',
      DESC_ADDWHITELISTEDGROUP: 'Grant access to a group',
      CMD_REMOVEWHITELISTEDGROUP: 'removewhitelistedgroup',
      DESC_REMOVEWHITELISTEDGROUP: 'Revoke access from a group',
      CMD_EXEC: 'exec',
      DESC_EXEC: 'Execute a command',
      CMD_HALT: 'halt',
      DESC_HALT: 'Exits the Bot process',
      CMD_START: 'start',
      DESC_START: 'Start the bot (does nothing really)',
      CMD_INTRO: 'intro',
      DESC_INTRO: 'Introduce the current AI role',
      CMD_GENIMG: 'genimg',
      DESC_GENIMG: 'Create an image using generative AI',
      CMD_GENVID: 'genvid',
      DESC_GENVID: 'Create a video using generative AI',
      CMD_SETPARAM: 'setparam',
      DESC_SETPARAM: 'Setup the AI\'s parameters',
      CMD_GETPARAM: 'getparam',
      DESC_GETPARAM: 'Get the AI\'s parameters',
      CMD_SETROLE: 'setrole',
      DESC_SETROLE: 'Set the AI\'s persona to a new role',
      CMD_GETROLE: 'getrole',
      DESC_GETROLE: 'Get the AI\'s persona',
      CMD_RESETROLE: 'resetrole',
      DESC_RESETROLE: 'Restore default AI persona',
      CMD_WIPECONTEXT: 'wipecontext',
      DESC_WIPECONTEXT: 'Removes all context from the current AI',
      CMD_WIPEMEMORY: 'wipememory',
      DESC_WIPEMEMORY: 'Removes all context and persona from the current AI',
      CMD_DOWNLOADMEMORY: 'downloadmemory',
      DESC_DOWNLOADMEMORY: 'Get a copy of the current context',
      CMD_VERSION: 'version',
      DESC_VERSION: 'Get the Bot version',
      CMD_ABOUT: 'about',
      DESC_ABOUT: 'Read the about information',
      CMD_HELP: 'help',
      DESC_HELP: 'Read the help documentation',
    };

    this.commands.addBotAdmin(T.CMD_ADDADMIN, this.handleAddAdmin.bind(this), T.DESC_ADDADMIN);
    this.commands.addBotAdmin(T.CMD_REMOVEADMIN, this.handleRemoveAdmin.bind(this), T.DESC_REMOVEADMIN);
    this.commands.addBotAdmin(T.CMD_ADDWHITELISTEDGROUP, this.handleAddWhiteListedGroup.bind(this), T.DESC_ADDWHITELISTEDGROUP);
    this.commands.addBotAdmin(T.CMD_REMOVEWHITELISTEDGROUP, this.handleRemoveWhiteListedGroup.bind(this), T.DESC_REMOVEWHITELISTEDGROUP);

    this.commands.addBotAdmin(T.CMD_VERSION, (msg) => {
      this.send(msg, `${packageJson.version}`).catch(ex => { debug(ex.message) });
    }, T.DESC_VERSION);

    this.commands.addBotAdmin(T.CMD_ABOUT, (msg) => {
      var about = '';

      about += 'Version: ' + packageJson.version + '\n';
      about += 'Author: ' + packageJson.author + '\n';
      about += 'Website: ' + packageJson.homepage;

      this.send(msg, about).catch(ex => { debug(ex.message) });
    }, T.DESC_ABOUT);

    this.commands.addBotAdmin(T.CMD_HELP, (msg) => {
      var helpText = '';

      this.commands.forEachUniqueCommand((trigger, command) => {

        if (command.adminOnly && !this.isBotAdmin(msg.from.id)) {          
        }else if(command.ownerOnly && !this.isBotOwner(msg.from.id)) {          
        }else {
          helpText += '`'; 
          helpText += '/' + trigger; 
          helpText += '`'; 
          helpText += '\n_' + this.escapeMarkupV2String(command.description) + '_\n\n';
        }        

      }).then(() => { 
        var markup = '';

        markup += '*Available Commands:*\n\n';
        markup += helpText;

        this.send(msg, markup, { parse_mode: 'MarkdownV2' }).catch(ex => { debugOut(ex.message) });
      });
    }, T.DESC_HELP);

    this.commands.addBotOwner(T.CMD_EXEC, this.handleExecuteCommand.bind(this), T.DESC_EXEC);
    this.commands.addBotOwner(T.CMD_HALT, this.handleHalt.bind(this), T.DESC_HALT);

    this.commands.addGroupAdmin(T.CMD_START, this.handleStart.bind(this), T.DESC_START);
    this.commands.addGroupAdmin(T.CMD_INTRO, this.handleIntroduce.bind(this), T.DESC_INTRO);
    this.commands.addGroupAdmin(T.CMD_GENIMG, this.handleGenerateImage.bind(this), T.DESC_GENIMG);
    this.commands.addGroupAdmin(T.CMD_GENVID, this.handleGenerateVideo.bind(this), T.DESC_GENVID);
    this.commands.addGroupAdmin(T.CMD_SETPARAM, this.handleSetParameter.bind(this), T.DESC_SETPARAM);
    this.commands.addGroupAdmin(T.CMD_GETPARAM, this.handleGetParameter.bind(this), T.DESC_GETPARAM);
    this.commands.addGroupAdmin(T.CMD_SETROLE, this.handleSetRole.bind(this), T.DESC_SETROLE);
    this.commands.addGroupAdmin(T.CMD_GETROLE, this.handleGetRole.bind(this), T.DESC_GETROLE);
    this.commands.addGroupAdmin(T.CMD_RESETROLE, this.handleResetRole.bind(this), T.DESC_RESETROLE);
    this.commands.addGroupAdmin(T.CMD_WIPECONTEXT, this.handleWipeContext.bind(this), T.DESC_WIPECONTEXT);
    this.commands.addGroupAdmin(T.CMD_WIPEMEMORY, this.handleWipeMemory.bind(this), T.DESC_WIPEMEMORY);
    this.commands.addGroupAdmin(T.CMD_DOWNLOADMEMORY, this.handleDownloadMemory.bind(this), T.DESC_DOWNLOADMEMORY);

    this.commands.addUser(T.CMD_START, this.handleStart.bind(this), T.DESC_START);
    this.commands.addUser(T.CMD_INTRO, this.handleIntroduce.bind(this), T.DESC_INTRO);
    this.commands.addUser(T.CMD_GENIMG, this.handleGenerateImage.bind(this), T.DESC_GENIMG);
    this.commands.addUser(T.CMD_GENVID, this.handleGenerateVideo.bind(this), T.DESC_GENVID);
    this.commands.addUser(T.CMD_SETPARAM, this.handleSetParameter.bind(this), T.DESC_SETPARAM);
    this.commands.addUser(T.CMD_GETPARAM, this.handleGetParameter.bind(this), T.DESC_GETPARAM);
    this.commands.addUser(T.CMD_SETROLE, this.handleSetRole.bind(this), T.DESC_SETROLE);
    this.commands.addUser(T.CMD_GETROLE, this.handleGetRole.bind(this), T.DESC_GETROLE);
    this.commands.addUser(T.CMD_RESETROLE, this.handleResetRole.bind(this), T.DESC_RESETROLE);
    this.commands.addUser(T.CMD_WIPECONTEXT, this.handleWipeContext.bind(this), T.DESC_WIPECONTEXT);
    this.commands.addUser(T.CMD_WIPEMEMORY, this.handleWipeMemory.bind(this), T.DESC_WIPEMEMORY);
    this.commands.addUser(T.CMD_DOWNLOADMEMORY, this.handleDownloadMemory.bind(this), T.DESC_DOWNLOADMEMORY);

    this.commands.addGroup(T.CMD_INTRO, this.handleIntroduce.bind(this), T.DESC_INTRO);
    this.commands.addGroup(T.CMD_GENIMG, this.handleGenerateImage.bind(this), T.DESC_GENIMG);
    this.commands.addGroup(T.CMD_GENVID, this.handleGenerateVideo.bind(this), T.DESC_GENVID);
  }

  async completeResponseProbabilities(msg, uniqueAi) {
    const prompt = [
      'Rate a group chat messages probability in percent (0-100) and for each of the following statements:',
      '1. The message is directed to you',
      '2. The message is directed to somebody else',
      '3. The message is relevant',
      '4. You should respond to this message',
      '',
      'Reply with only a JSON object using the format: { directed_at_me: probability, directed_at_someone: probability, relevant: probability, should_respond: probability }',
      'If not enough information is available, set all probabilities to 0',
      '',
      'Message: {%message%}'
    ];

    return uniqueAi.createCompletion(prompt, { message: msg.text }).then(response => {
      uniqueAi.wipeMemory(prompt);

      return extractJSON(response.join('\n'));
    });
  }

  async completeMessageConditional(msg) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    if (!msg.text) { return }
    if (config.aiEnabled !== "YES") { return }
    if (
      msg.reply_to_message
      && this.aiIgnoreReply[msg.chat.id]
      && this.aiIgnoreReply[msg.chat.id][msg.reply_to_message.message_id]
      && (
        this.aiIgnoreReply[msg.chat.id][msg.reply_to_message.message_id] === msg.reply_to_message.message_id
        || (
          msg.reply_to_message.message_thread_id
          && this.aiIgnoreReply[msg.chat.id][msg.reply_to_message.message_id] === msg.reply_to_message.message_thread_id
        )
      )
    ) { return }

    if (config.aiAlwaysReply === "YES" || msg.text.includes(`@${this.botInfo.username}`)
      || (msg.reply_to_message && msg.reply_to_message.from.id === this.botInfo.id)) {
      return uniqueAi.createCompletion([msg.text], {});
    } else {
      return this.completeResponseProbabilities(msg, uniqueAi).then(rating => {
        if (rating.directed_at_me >= rating.directed_at_someone && rating.relevant >= 50) {
          return uniqueAi.createCompletion([msg.text], {});
        }
      });
    }
  }

  handleMessage(msg) {

    this.updateCacheFromMessage(msg);

    const parseEntities = (content) => {
      let entities = [];

      let lPos = 0;
      let rPos = content.indexOf('```', 0);

      while (rPos !== -1) {
        let entity = content.substring(lPos, rPos);

        if (entity.startsWith('```')) {
          rPos += 3;
          entity = content.substring(lPos, rPos);
          entities.push({ entity, type: entity.substring(3, entity.indexOf('\n')) });
        } else {
          entities.push({ entity: this.escapeMarkupV2String(entity), type: 'plain' });
        }
        lPos = rPos;
        rPos = content.indexOf('```', rPos + 3);
      }

      if (lPos < content.length) {
        let entity = content.substring(lPos);
        entities.push({ entity: this.escapeMarkupV2String(entity), type: 'plain' })
      }

      return entities.map((i) => i.entity);;
    }

    const handleCommandOrComplete = async (msg) => {
      const command = this.parseCommand(msg.text);

      if (command) {
        const { commandName, params } = command;
        return this.executeCommand(msg, commandName, params);
      }

      return this.completeMessageConditional(msg).then(response => {
        if (response) {
          const entities = parseEntities(response.join('\n)'));
          return this.send(msg, entities.join(''), { parse_mode: 'MarkdownV2' });
        }
      });
    }

    try {
      let allowed = false;

      switch (msg.chat.type) {
        case 'supergroup':
        case 'group':
          allowed = this.whiteListedGroups.has(msg.chat.title);
          break;

        case 'private':
          allowed = this.isBotAdmin(msg.from.id) || this.isBotOwner(msg.from.id);
          break;

        default:
          debugOut(msg);
      }

      if (!allowed) {
        this.bot.leaveChat(msg.chat.id).catch(error => { /* IGNORE */ });
        throw new Error("ACCESS DENIED");
      }

      var keepActionAliveTimer = setInterval(() => {
        this.bot.sendChatAction(msg.chat.id, 'typing', { message_thread_id: msg.message_thread_id });
      }, 3000);

      return handleCommandOrComplete(msg).catch(error => {
        return this.send(msg, error.message);
      }).finally(() => {
        clearInterval(keepActionAliveTimer);
        this.saveStorage();
      });
    } catch (error) {
      clearInterval(keepActionAliveTimer);
      debugOut(error.message);
      throw error;
    }
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
    return this.send(msg, 'Halted').finally(() => {
      this.saveStorage();
      process.exit();
    });
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
    });

    return Promise.all(promises);
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
  }

  handleWipeContext(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    uniqueAi.wipeContext();
    this.saveStorage();
  }

  handleResetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    this.initializeUniqueAiRoleForChat(msg, uniqueAi);
    this.saveStorage();

    return this.send(msg, 'AI persona reset to default');
  }

  handleSetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    uniqueAi.assignRole([params.join(' ')], {});
    this.saveStorage();

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

    selectedConfigs.forEach(config => {
      if (config.hasOwnProperty(params[0])) {
        config[params[0]] = params[1];
      }
    });

    this.saveStorage();
  }

  handleGetParameter(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    const reply = [];

    Object.keys(config).forEach(key => {
      if (typeof config[key] === 'string') {
        reply.push(`${key}: ${config[key]}`);
      }
    })

    return this.send(msg, reply.join('\n'));
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
    return this.bot.sendMessage(msg.chat.id, 'By the Power of Grayskull ⚔️💪');
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
      this.saveStorage();
      return this.send(msg, `${user.username} has been added as an admin user.`);
    } else {
      return this.send(msg, `${user.username} is already an admin user.`);
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
      this.saveStorage();
      return this.send(msg, `@${username} has been removed from admin users.`);
    } else {
      return this.send(msg, `@${username} is not an admin user.`);
    }
  }

  handleAddWhiteListedGroup(msg, params) {
    const groupName = params[0];

    this.whiteListedGroups.add(groupName);
    this.saveStorage();
    return this.send(msg, `Group ${groupName} has been whitelisted.`);
  }

  handleRemoveWhiteListedGroup(msg, params) {
    const groupName = params[0];

    if (this.whiteListedGroups.has(groupName)) {
      this.whiteListedGroups.delete(groupName);
      this.saveStorage();
      return this.send(msg, `Group ${groupName} has been removed from the whitelist.`);
    } else {
      return this.send(msg, `Group ${groupName} is not whitelisted.`);
    }
  }
}

const bot = new vxAssistBotBot();
bot.main();
