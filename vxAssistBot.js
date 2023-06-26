const TelegramBot = require('node-telegram-bot-api');
const { AIInterface } = require('./AIInterface.js');
const { extractJSON } = require('./vxAssistCommon.js');
const fs = require('fs');

class vxAssistBotBot {
  constructor() {
    this.bot = null;
    this.storageFile = 'botStorage.json';
    this.botToken = '';
    this.alwaysReply = 1;
    this.whiteListedGroups = new Set();
    this.adminUsers = [];
    this.commandCallbacks = {
      help: {
        adminOnly: false,
        callback: this.handleHelp.bind(this),
        description: 'List the available commands',
      },
      addadmin: {
        adminOnly: true,
        callback: this.handleAddAdmin.bind(this),
        description: 'Grant admin privileges to a user',
      },
      removeadmin: {
        adminOnly: true,
        callback: this.handleRemoveAdmin.bind(this),
        description: 'Revoke admin privileges for a user',
      },
      addwhitelistedgroup: {
        adminOnly: true,
        callback: this.handleAddWhiteListedGroup.bind(this),
        description: 'Grant access to a group',
      },
      removewhitelistedgroup: {
        adminOnly: true,
        callback: this.handleRemoveWhiteListedGroup.bind(this),
        description: 'Revoke access from a group',
      },
      setrole: {
        adminOnly: true,
        callback: this.handleSetRole.bind(this),
        description: 'Set the AIs persona to a new role',
      },
      resetrole: {
        adminOnly: true,
        callback: this.handleResetRole.bind(this),
        description: 'Restore default AI persona',
      },
      setparam: {
        adminOnly: true,
        callback: this.handleSetParameter.bind(this),
        description: 'Setup the AIs parameters',
      },
      getparam: {
        adminOnly: false,
        callback: this.handleGetParameter.bind(this),
        description: 'Get the AIs parameters',
      },
      genimg: {
        adminOnly: false,
        callback: this.handleGenerateImage.bind(this),
        description: 'Create an image using generative AI',
      },
    };
  }

  start() {
    this.loadStorage();

    if (!this.botToken) {
      this.saveStorage();
      console.error('No bot token available. Exiting...');
      process.exit(1);
    }

    const bot = new TelegramBot(this.botToken, { polling: true });

    bot.getMe().then((botInfo) => {
      this.bot = bot;
      this.botInfo = botInfo;
      this.bot.on('message', (msg) => this.handleMessage(msg));
      this.bot.on('polling_error', (error) => console.log(error));

      this.bot.setMyCommands(Object.keys(this.commandCallbacks).map(i => {
        return { command: i, description: this.commandCallbacks[i].description };
      }), { scope: TelegramBot.BotCommandScopeAllGroupChats });

      console.log('Bot is running...');
    });
  }

  loadStorage() {
    if (fs.existsSync(this.storageFile)) {
      const data = fs.readFileSync(this.storageFile, 'utf8');
      const storage = JSON.parse(data);
      this.botToken = storage.botToken;
      this.whiteListedGroups = new Set(storage.whiteListedGroups);
      this.adminUsers = storage.adminUsers;
    }
  }

  saveStorage() {
    const storage = {
      botToken: this.botToken,
      whiteListedGroups: Array.from(this.whiteListedGroups),
      adminUsers: this.adminUsers,
    };
    fs.writeFileSync(this.storageFile, JSON.stringify(storage), 'utf8');
  }

  isAdminUser(username) {
    return this.adminUsers.includes(username);
  }

  parseCommand(text) {
    if (text) {
      const regex = /^\/([^\s]+)\s?(.*)$/;
      const matches = text.match(regex);

      if (matches) {
        const commandName = matches[1].replace(`@${this.botInfo.username}`, '').toLowerCase();
        const params = matches[2] ? matches[2].split(' ') : [];
        return { commandName, params };
      }
    }

    return null;
  }

  async executeCommand(msg, commandName, params) {
    const command = this.commandCallbacks[commandName];

    if (command) {
      if (command.adminOnly && !this.isAdminUser(msg.from.username)) {
        return this.bot.sendMessage(msg.chat.id, 'You do not have permission to execute this command.', { message_thread_id: msg.message_thread_id });
      } else {
        return command.callback(msg, params);
      }
    }
  }

  createUniqueAiForChat(msg) {
    const aiId = msg.message_thread_id ? msg.message_thread_id : msg.chat.id;

    this.ai = this.ai ? this.ai : {};
    this.ai[msg.chat.id] = this.ai[msg.chat.id] ? this.ai[msg.chat.id] : {};
    this.ai[msg.chat.id][aiId] = this.ai[msg.chat.id][aiId]
      ? this.ai[msg.chat.id][aiId]
      : {
        uniqueAi: this.initializeUniqueAiRoleForChat(msg, new AIInterface()), config: {
          aiEnabled: 'YES',
          alwaysReply: "YES",
          Text2ImageAPI: "huggingFace",
          Text2ImageModel: "dreamlike-art/dreamlike-anime-1.0",
          Text2SpeechAPI: 'localSystem',
          // Text2SpeechAPI: 'huggingFace',
          Text2SpeechModel: 'Ava',
          // Text2SpeechModel: 'espnet/kan-bayashi_ljspeech_vits',
          VisualStyle: null,
          VisualStyleCharacters: null,
          VisualStyleNegative: null,
        }
      };

    return this.ai[msg.chat.id][aiId];
  }

  initializeUniqueAiRoleForChat(msg, uniqueAi) {
    let topic = "General Discussion";

    if (msg.reply_to_message && msg.reply_to_message.forum_topic_created) {
      topic = msg.reply_to_message.forum_topic_created.name;
    }

    uniqueAi.assignRole([
      `Your name is ${this.botInfo.first_name} ${this.botInfo.last_name}, Nickname ${this.botInfo.username}.`,
      'You provide professional and concise advice to your audience and express yourself in an academic and formal manner.',
      `You are an expert on ${topic} and related topics.`
    ], {});

    return uniqueAi;
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
      uniqueAi.forget(prompt);

      return extractJSON(response.join('\n'));
    });
  }

  async completeMessageConditional(msg) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);

    if (!msg.text) { return }
    if (config.aiEnabled !== "YES") { return }

    if (config.alwaysReply === "YES" || msg.text.includes(`@${this.botInfo.username}`)) {
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
    switch (msg.chat.type) {
      case 'supergroup':
      case 'group':

        if (this.whiteListedGroups.has(msg.chat.title)) {
          const command = this.parseCommand(msg.text);

          if (command) {
            const { commandName, params } = command;
            this.executeCommand(msg, commandName, params).catch(error => {
              this.bot.sendMessage(msg.chat.id, error.message, { message_thread_id: msg.message_thread_id });
            });
          } else {
            this.completeMessageConditional(msg).then(response => {
              if (response) {
                this.bot.sendMessage(msg.chat.id, response.join('\n'), { message_thread_id: msg.message_thread_id });
              }
            }).catch(error => {
              this.bot.sendMessage(msg.chat.id, error.message, { message_thread_id: msg.message_thread_id });
            });
          }
        } else {
          this.bot.sendMessage(msg.chat.id, 'Not allowed', { message_thread_id: msg.message_thread_id });
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
              this.bot.sendMessage(msg.chat.id, error.message, { message_thread_id: msg.message_thread_id });
            });
          }
        }

      default:
        console.log(msg);
        break;
    }
  }

  handleResetRole(msg, params) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);
    this.initializeUniqueAiRoleForChat(msg, uniqueAi);
    this.bot.sendMessage(msg.chat.id, 'AI persona reset to default', { message_thread_id: msg.message_thread_id });
  }

  handleSetRole(msg, params) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);

    uniqueAi.assignRole([params.join('\n')], {});
    this.bot.sendMessage(msg.chat.id, 'Assign a new persona to the AI', { message_thread_id: msg.message_thread_id });
  }

  handleSetParameter(msg, params) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);

    if (!config[params[0]]) {
      this.bot.sendMessage(msg.chat.id, `${params[0]} is not a valid option`, { message_thread_id: msg.message_thread_id });
    } else {
      config[params[0]] = params[1];
      this.bot.sendMessage(msg.chat.id, `${params[0]} was set to ${params[1]}`, { message_thread_id: msg.message_thread_id });
    }
  }

  handleGetParameter(msg, params) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);
    const reply = [];
    Object.keys(config).forEach(key => {
      reply.push(`${key}: ${config[key]}`);
    })
    this.bot.sendMessage(msg.chat.id, reply.join('\n'), { message_thread_id: msg.message_thread_id });
  }

  handleGenerateImage(msg, params) {
    const { uniqueAi, config } = this.createUniqueAiForChat(msg);

    this.bot.sendMessage(msg.chat.id, `ok, give it a minute...`, { message_thread_id: msg.message_thread_id });

    return uniqueAi.createImage(params.join(' '), { Text2ImageAPI: config.Text2ImageAPI, Text2ImageModel: config.Text2ImageModel }).then((image) => {
      return this.bot.sendPhoto(msg.chat.id, image, { message_thread_id: msg.message_thread_id });
    }).catch(error => {
      if (error.response) {
        this.bot.sendMessage(msg.chat.id, error.response.status, { message_thread_id: msg.message_thread_id });
        this.bot.sendMessage(msg.chat.id, error.response.data, { message_thread_id: msg.message_thread_id });
      } else {
        this.bot.sendMessage(msg.chat.id, error.message, { message_thread_id: msg.message_thread_id });
      }
    });
  }

  handleHelp(msg, params) {
    let reply = 'Available commands:\n\n';
    for (const command of Object.keys(this.commandCallbacks)) {
      reply += `/${command}\n`;
    }
    this.bot.sendMessage(msg.chat.id, reply, { message_thread_id: msg.message_thread_id });
  }

  handleAddAdmin(msg, params) {
    const username = params[0];

    if (!this.adminUsers.includes(username)) {
      this.adminUsers.push(username);
      this.saveStorage();
      this.bot.sendMessage(msg.chat.id, `@${username} has been added as an admin user.`);
    } else {
      this.bot.sendMessage(msg.chat.id, `@${username} is already an admin user.`);
    }
  }

  handleRemoveAdmin(msg, params) {
    const username = params[0];

    const index = this.adminUsers.indexOf(username);
    if (index !== -1) {
      this.adminUsers.splice(index, 1);
      this.saveStorage();
      this.bot.sendMessage(msg.chat.id, `@${username} has been removed from admin users.`);
    } else {
      this.bot.sendMessage(msg.chat.id, `@${username} is not an admin user.`);
    }
  }

  handleAddWhiteListedGroup(msg, params) {
    const groupName = params[0];

    this.whiteListedGroups.add(groupName);
    this.saveStorage();
    this.bot.sendMessage(msg.chat.id, `Group ${groupName} has been whitelisted.`);
  }

  handleRemoveWhiteListedGroup(msg, params) {
    const groupName = params[0];

    if (this.whiteListedGroups.has(groupName)) {
      this.whiteListedGroups.delete(groupName);
      this.saveStorage();
      this.bot.sendMessage(msg.chat.id, `Group ${groupName} has been removed from the whitelist.`);
    } else {
      this.bot.sendMessage(msg.chat.id, `Group ${groupName} is not whitelisted.`);
    }
  }
}

const bot = new vxAssistBotBot();
bot.start();
