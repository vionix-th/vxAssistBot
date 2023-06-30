const { spawn } = require('child_process');
const { extractJSON, sanitizeString } = require('./vxAssistCommon.js');
const { Ent42TelegramBot } = require('ent42/telegramBot.js');
const fs = require('fs');
const path = require('path');
const fileType = require('file-type');

class vxAssistBotBot extends Ent42TelegramBot {
  constructor() {
    super();

    this.registerAdminCommand('addadmin', this.handleAddAdmin.bind(this), 'Grant admin privileges to a user');
    this.registerAdminCommand('removeadmin', this.handleRemoveAdmin.bind(this), 'Revoke admin privileges for a user');
    this.registerAdminCommand('addwhitelistedgroup', this.handleAddWhiteListedGroup.bind(this), 'Grant access to a group');
    this.registerAdminCommand('removewhitelistedgroup', this.handleRemoveWhiteListedGroup.bind(this), 'Revoke access from a group');
    this.registerAdminCommand('exec', this.handleExecuteCommand.bind(this), 'Execute a command');
    
    this.registerGroupAdminCommand('setparam', this.handleSetParameter.bind(this), 'Setup the AI\'s parameters');
    this.registerGroupAdminCommand('getparam', this.handleGetParameter.bind(this), 'Get the AI\'s parameters');
    
    this.registerGroupAdminCommand('setrole', this.handleSetRole.bind(this), 'Set the AI\'s persona to a new role');
    this.registerGroupAdminCommand('resetrole', this.handleResetRole.bind(this), 'Restore default AI persona');
    this.registerGroupAdminCommand('wipecontext', this.handleWipeContext.bind(this), 'Removes all context from the current AI');
    this.registerGroupAdminCommand('wipememory', this.handleWipeMemory.bind(this), 'Removes all context and persona from the current AI');
    
    this.registerGroupCommand('start', this.handleStart.bind(this), 'Start the bot (does nothing really)');
    this.registerGroupCommand('help', this.handleHelp.bind(this), 'List the available commands');
    this.registerGroupCommand('genimg', this.handleGenerateImage.bind(this), 'Create an image using generative AI');
    this.registerGroupCommand('genvid', this.handleGenerateVideo.bind(this), 'Create a video using generative AI');
  }

  async completeResponseProbabilities(msg, uniqueAi) {
    const prompt = [
      'Rate a group chat messages probability in percent (0-100) and for each of the following statements:',
      '1. The message is directed to you',
      '2. The message is directed to someboy else',
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

    if (config.alwaysReply === "YES" || msg.text.includes(`@${this.botInfo.username}`)
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
    try {
      switch (msg.chat.type) {
        case 'supergroup':
        case 'group':

          if (this.whiteListedGroups.has(msg.chat.title)) {
            const command = this.parseCommand(msg.text);

            if (command) {
              const { commandName, params } = command;
              return this.executeCommand(msg, commandName, params).catch(error => {
                return this.send(msg, error.message);
              });
            } else {
              const keepActionAliveTimer = setInterval(() => {
                this.bot.sendChatAction(msg.chat.id, 'typing', { message_thread_id: msg.message_thread_id });
              }, 5000);

              return this.completeMessageConditional(msg).then(response => {
                if (response) {
                  return this.send(msg, response.join('\n'));
                }
              }).catch(error => {
                return this.send(msg, error.message);
              }).finally(() => {
                clearInterval(keepActionAliveTimer);
                this.saveStorage();
              });
            }
          } else {
            this.send(msg, 'Forbidden');
            this.bot.leaveChat(msg.chat.id).catch(error => {
              // I don't care 
            });
          }

          break;

        case 'private':
          if (this.isAdminUser(msg.from.username)) {
            const command = this.parseCommand(msg.text);
            if (command) {
              const { commandName, params } = command;
              this.executeCommand(msg, commandName, params).catch(error => {
                this.send(msg, error.message);
              });
            }
          }

        default:
          console.log(msg);
          break;
      }
    } catch (error) {
      console.log(error.message);
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

  handleExecuteCommand(msg, params) {

    if (args.length === 0) {
      return this.send(msg, 'Missing argument. e.g. /exec ls -lah');
    }

    const p = spawn(params[0], params.slice(1));

    var bStdout = '';
    var bStderr = '';

    p.stderr.on('data', data => { bStderr += data; });
    p.stdout.on('data', data => { bStdout += data; });

    p.on('exit', code => {
      const promises = [];

      if (bStdout.length > 0) {
        var buff = Buffer.from(bStdout)
        var type = fileType(buff);
        type = type ? type : { ext: 'txt', mime: 'text/plain' };

        promises.push(
          this.bot.sendDocument(msg.chat.id, buff,
            { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the output for command: ${params.join(' ')}` },
            { filename: `stdout.${type.ext}`, contentType: `${type.mime}` }
          )
        );
      }

      if (bStderr.length > 0) {
        var buff = Buffer.from(bStderr)
        var type = fileType(buff);
        type = type ? type : { ext: 'txt', mime: 'text/plain' };

        promises.push(
          this.bot.sendDocument(msg.chat.id, buff,
            { message_thread_id: msg.message_thread_id, reply_to_message_id: msg.message_id, caption: `Here is the output for command: ${params.join(' ')}` },
            { filename: `stderr.${type.ext}`, contentType: `${type.mime}` })
        );
      }
    });

    return Promise.all(promises);
  }

  handleWipeMemory(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    uniqueAi.wipeMemory();
  }

  handleWipeContext(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    uniqueAi.wipeContext();
  }

  handleResetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    this.initializeUniqueAiRoleForChat(msg, uniqueAi);
    return this.send(msg, 'AI persona reset to default');
  }

  handleSetRole(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    uniqueAi.assignRole([params.join('\n')], {});

    return this.send(msg, 'Assign a new persona to the AI');
  }

  handleSetParameter(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);

    if (config.hasOwnProperty(params[0])) {
      config[params[0]] = params.splice(1).join(' ');
      this.saveStorage();
      return this.send(msg, `${params[0]} was set to ${config[params[0]]}`);
    } else {
      return this.send(msg, `${params[0]} is not a valid option`);
    }
  }

  handleGetParameter(msg, params) {
    const { uniqueAi, config } = this.uniqueAiForChat(msg);
    const reply = [];

    Object.keys(config).forEach(key => {
      reply.push(`${key}: ${config[key]}`);
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

  handleStart(msg, params){  
    return this.bot.sendMessage(msg.chat.id, 'By the Power of Grayskull ⚔️💪');
  }

  handleHelp(msg, params) {
    let reply = 'Available commands:\n\n';
    for (const command of Object.keys(this.commandCallbacks)) {
      reply += `/${command}\n`;
    }

    return this.send(reply, 'Assign a new persona to the AI');
  }

  handleAddAdmin(msg, params) {
    const username = params[0];

    if (!this.adminUsers.includes(username)) {
      this.adminUsers.push(username);
      this.saveStorage();
      return this.send(msg, `@${username} has been added as an admin user.`);
    } else {
      return this.send(msg, `@${username} is already an admin user.`);
    }
  }

  handleRemoveAdmin(msg, params) {
    const username = params[0];

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
bot.start();
