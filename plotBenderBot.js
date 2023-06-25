const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

class vxAssistBotBot {
  constructor() {
    this.bot = null;
    this.storageFile = 'botStorage.json';
    this.botToken = '';
    this.whiteListedGroups = new Set();
    this.adminUsers = [];
    this.commandCallbacks = {
      addadmin: {
        adminOnly: true,
        callback: this.handleAddAdmin.bind(this),
      },
      removeadmin: {
        adminOnly: true,
        callback: this.handleRemoveAdmin.bind(this),
      },
      addwhitelistedgroup: {
        adminOnly: true,
        callback: this.handleAddWhiteListedGroup.bind(this),
      },
      removewhitelistedgroup: {
        adminOnly: true,
        callback: this.handleRemoveWhiteListedGroup.bind(this),
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

  handleMessage(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    // Check if the message is from an admin user
    if (this.isAdminUser(userId)) {
      const command = this.parseCommand(msg.text);
      if (command) {
        const { commandName, params } = command;
        this.executeCommand(msg, commandName, params);
        return;
      }
    }

    // Check if the message is from a whitelisted group
    if (this.whiteListedGroups.has(chatId.toString())) {
      if (msg.from && msg.from.id !== chatId) {
        const command = this.parseCommand(msg.text);
        if (command) {
          const { commandName, params } = command;
          this.executeCommand(msg, commandName, params);
        }
      }
    } else {
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        this.bot.sendMessage(chatId, 'This bot is not allowed in this group.');
        this.bot.leaveChat(chatId);
      }
    }
  }

  isAdminUser(userId) {
    return this.adminUsers.includes(userId.toString());
  }

  parseCommand(text) {
    const regex = /^\/([^\s]+)\s?(.*)$/;
    const matches = text.match(regex);
    if (matches) {
      const commandName = matches[1].toLowerCase();
      const params = matches[2] ? matches[2].split(' ') : [];
      return { commandName, params };
    }
    return null;
  }

  executeCommand(msg, commandName, params) {
    const command = this.commandCallbacks[commandName];
    if (command) {
      if (command.adminOnly && !this.isAdminUser(msg.from.id.toString())) {
        this.bot.sendMessage(msg.chat.id, 'You do not have permission to execute this command.');
      } else {
        try {
          command.callback(msg, params);
        } catch (error) {
          console.error(error);
          this.bot.sendMessage(msg.chat.id, 'An error occurred while executing the command.');
        }
      }
    }
  }

  handleAddAdmin(msg, params) {
    const username = params[0];

    this.resolveUserId(username)
      .then((userId) => {
        if (userId) {
          if (!this.adminUsers.includes(userId)) {
            this.adminUsers.push(userId);
            this.saveStorage();
            this.bot.sendMessage(msg.chat.id, `@${username} (${userId}) has been added as an admin user.`);
          } else {
            this.bot.sendMessage(msg.chat.id, `@${username} (${userId}) is already an admin user.`);
          }
        } else {
          this.bot.sendMessage(msg.chat.id, `Failed to resolve user ID for '${username}'.`);
        }
      })
      .catch((error) => {
        this.bot.sendMessage(msg.chat.id, `Failed to add admin user. ${error.message}`);
      });
  }

  handleRemoveAdmin(msg, params) {
    const username = params[0];
    const userId = this.resolveUserId(username);

    if (userId) {
      const index = this.adminUsers.indexOf(userId);
      if (index !== -1) {
        this.adminUsers.splice(index, 1);
        this.saveStorage();
        this.bot.sendMessage(msg.chat.id, `@${username} (${userId}) has been removed from admin users.`);
      } else {
        this.bot.sendMessage(msg.chat.id, `@${username} (${userId}) is not an admin user.`);
      }
    } else {
      this.bot.sendMessage(msg.chat.id, `Failed to remove admin user. User ID not found.`);
    }
  }

  handleAddWhiteListedGroup(msg, params) {
    const groupName = params[0];
    this.resolveGroupId(groupName)
      .then((groupId) => {
        if (groupId) {
          this.whiteListedGroups.add(groupId);
          this.saveStorage();
          this.bot.sendMessage(msg.chat.id, `Group ${groupName} (${groupId}) has been whitelisted.`);
        } else {
          this.bot.sendMessage(msg.chat.id, `Failed to resolve group ID for '${groupName}'.`);
        }
      })
      .catch((error) => {
        this.bot.sendMessage(msg.chat.id, `Failed to add whitelisted group. ${error.message}`);
      });
  }

  handleRemoveWhiteListedGroup(msg, params) {
    const groupName = params[0];
    this.resolveGroupId(groupName)
      .then((groupId) => {
        if (groupId) {
          if (this.whiteListedGroups.has(groupId)) {
            this.whiteListedGroups.delete(groupId);
            this.saveStorage();
            this.bot.sendMessage(msg.chat.id, `Group ${groupName} (${groupId}) has been removed from the whitelist.`);
          } else {
            this.bot.sendMessage(msg.chat.id, `Group ${groupName} (${groupId}) is not whitelisted.`);
          }
        } else {
          this.bot.sendMessage(msg.chat.id, `Failed to resolve group ID for '${groupName}'.`);
        }
      })
      .catch((error) => {
        this.bot.sendMessage(msg.chat.id, `Failed to remove whitelisted group. ${error.message}`);
      });
  }

  resolveUserId(username) {
    return new Promise((resolve, reject) => {
      this.bot.getChatMember('@' + this.botInfo.username, username)
        .then((result) => {
          resolve(result.user.id.toString());
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  resolveGroupId(groupName) {
    return new Promise((resolve, reject) => {
      this.bot.getChat('@' + groupName)
        .then((result) => {
          resolve(result.id.toString());
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

const bot = new vxAssistBotBot();
bot.start();
