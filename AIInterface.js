const { Configuration, OpenAIApi } = require('openai');
const { encode } = require('gpt-3-encoder')
const fs = require('fs');
require('colors');

const { AIOpenAI } = require('./AIOpenAI');
const { AIHuggingFace } = require("./AIHuggingFace");
const { AILocalSystem } = require("./AILocalSystem");
const { escapeMarkupV2String, readApiKey, debugOut } = require("./vxAssistCommon");


class AIInterface {
  /**
   * Constructs an instance of the AIInterface.
   * @param {string} apiKey - The API key for the OpenAI GPT-3 API.
   */
  constructor() {
    this.apiKey = readApiKey('apikey.txt');
    this.client = new OpenAIApi(new Configuration({ apiKey: this.apiKey }));
    this.messages = [];
    this.lastQueryTimestamp = 0;
    this.queryCount = 0;
    this.queryLimit = 30;
    this.queryInterval = 60000;
    this.initializingAgent = 0;
    this.persona = {
      "name": "AIInterface",
      "model": "gpt-3.5-turbo",
      "maxToken": 4096,
      "temperature": 0.5,
      "role": [],
      "prompt": [[]],
      "persistentPrompt": []
    };
  }

  /**
   * Pauses execution for the specified number of milliseconds.
   * @param {number} ms - The number of milliseconds to sleep.
   * @returns {Promise<void>} A promise that resolves after sleeping.
   */
  async sleep(ms) {
    return new Promise((resolve) => {
      debugOut('Request limit reached. Taking a short break...');
      setTimeout(resolve, ms);
    });
  }

  /**
   * Expands the prompt by replacing placeholder tokens with provided arguments.
   * @param {Array<string>} prompt - The prompt to expand.
   * @param {object} args - The arguments to replace in the prompt.
   * @returns {Array<string>} The expanded prompt.
   */
  expandArguments(prompt, args) {
    const expand = arg => {
      if (arg.startsWith("file://")) {
        arg = arg.replace("file://", "");
        arg = fs.readFileSync(arg);
      }

      return arg;
    }

    return prompt.map(i => {
      Object.keys(args).forEach(j => {
        if (i.indexOf("{%" + j + "%}") > -1) {
          i = i.replace("{%" + j + "%}", expand(args[j]));
        }
      });
      return i;
    });
  }

  /**
   * Assigns a role to the messages in the interface.
   * @param {Array<string>} role - The role to assign.
   * @param {object} parameter - Additional parameters for expanding the role.
   */
  assignRole(role, parameter) {
    let messages = this.messages.filter(i => (i.role !== "system"));

    if (role && role.length) {
      let system = [];
      this.expandArguments(role, parameter).forEach(i => {
        system.push({ role: 'system', content: i });
      });
      this.messages = [...system, ...messages];
    }
  }

  /**
   * Retrieves the content of all system messages in memory.
   *
   * @returns {string[]} - An array containing the content of system messages.
   */
  role() {
    var role = this.messages.filter(i => (i.role === "system"));
    role = role.map((i) => {
      return i.content
    });

    return role;
  }

  /**
   * Initializes the AI agents with the provided persona and parameters.
   * @param {object} persona - The persona for the agents.
   * @param {object} parameter - Additional parameters for expanding the persona.
   * @param {function} callback - The callback function to invoke after initialization.
   * @returns {Array<string>} The response from the agents.
   */
  async initializeAgent(persona, parameter, callback) {
    var response = [];

    this.initializingAgent = 1;

    if (persona) {
      this.persona = { ...this.persona, ...persona };
    }

    // Assign the persona to the agents  
    this.assignRole(persona.role, parameter);

    debugOut(persona.role.join("\n").yellow);
    for (let i = 0; i < persona.initialPrompt.length; i++) {
      // Complete the initialization prompts for the editor agent
      const prompt = persona.initialPrompt[i];
      debugOut(this.expandArguments(prompt, parameter).join("\n").red);
      debugOut(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>".red);

      response = await this.createCompletion(prompt, parameter);
      callback && callback({ persona, parameter, response });
    }

    this.initializingAgent = 0;

    return response;
  }

  /**
   * Enforces the rate limits by pausing if necessary.
   * @returns {Promise<void>} A promise that resolves after enforcing the limits.
   */
  async enforceLimits() {
    const currentTime = Date.now();
    const timeSinceLastQuery = currentTime - this.lastQueryTimestamp;

    if (timeSinceLastQuery < this.queryInterval) {
      if (this.queryCount >= this.queryLimit) {
        const sleepTime = this.queryInterval - timeSinceLastQuery;
        await this.sleep(sleepTime);
        this.queryCount = 0;
      }
    } else {
      this.queryCount = 0;
    }
  }

  /**
   * Updates the query count and timestamp to track the rate limits.
   */
  async accountLimits() {
    this.lastQueryTimestamp = Date.now();
    this.queryCount++;
  }

  /**
 * Removes messages from memory that match the given text. If no text is provided, clears the entire memory.
 *
 * @param {string[]} text - The text to be matched against the messages in memory.
 * @returns {void}
 */
  wipeMemory(text) {
    if (text) {
      this.messages = this.messages.filter(i => {
        for (let j of text) {
          if (i.content === j) {
            return false;
          }
        }

        return true;
      });
    } else {
      this.messages = [];
    }
  }

  /**
 * Removes all non-system messages from memory.
 *
 * @returns {void}
 */
  wipeContext() {
    this.messages = this.messages.filter(i => (i.role === "system"));
  }

  /**
 * Calculates the total number of tokens in the messages stored in memory.
 *
 * @returns {number} - The total number of tokens.
 */
  tokenizeMemory() {
    return this.messages.reduce((count, message) => count + countTokens(message.content), 0);
  }

  /**
 * Encodes the given text and returns the length of the encoded string.
 *
 * @param {string} text - The text to be encoded.
 * @returns {number} - The length of the encoded string.
 */
  tokenize(text) {
    const encoded = encode(text);
    return encoded.length;
  };

  /**
 * Retrieves the last two non-system messages from memory and removes them
 *
 * @throws {RangeError} - If the context is empty.
 * @returns {Object} - An object containing the retrieved dialog messages.
 */
  popDialog() {
    var dialog = {};

    var context = this.messages.filter(i => (i.role !== "system"));

    if (context.length > 1) {
      dialog.response = context.pop();
      dialog.message = context.pop();
      this.messages = [...this.messages.filter(i => (i.role === "system")), ...context];
    } else {
      throw new RangeError("Context is empty!");
    }

    return dialog;
  }

  /**
   * Reduces the messages in memory to fit within the specified maximum token limit.
   *
   * @param {number} maxTokens - The maximum number of tokens allowed.
   * @returns {void}
   */
  reduceContext(maxTokens) {
    let totalTokens = this.messages.reduce((count, message) => count + this.tokenize(message.content), 0);

    debugOut(`${totalTokens} / ${maxTokens} (${this.persona.maxToken})`);

    let system = this.messages.filter(i => (i.role === "system"));
    let messages = this.messages.filter(i => (i.role !== "system"));

    while (totalTokens > maxTokens) {
      const removedMessage = messages.shift();

      debugOut(` removing: ${removedMessage.role} / ${removedMessage.content.substring(0, 32)}...`);

      totalTokens -= this.tokenize(removedMessage.content);
    }

    this.messages = [...system, ...messages];
  }

  /**
   * Creates a completion using the OpenAI GPT-3 API.
   * @param {Array<string>} user - The user's input messages.
   * @param {number} temperature - The temperature for text generation.
   * @param {object} parameter - Additional parameters for expanding the user input.
   * @returns {Array<string>} The generated completion from the AI model.
   */
  async createCompletion(user, parameter) {
    if (!user || user.length === 0) {
      return [];
    }

    await this.enforceLimits();

    user.length && this.expandArguments(user, parameter).forEach(i => {
      this.messages.push({ role: 'user', content: i });
    });

    if (!this.initializingAgent) {
      this.persona.persistentPrompt.forEach(i => {
        this.messages.push({ role: 'user', content: i });
      });
    }

    this.reduceContext(parseInt(this.persona.maxToken));

    var content = [];

    let retryCount = 0;
    while (retryCount < 3) {
      try {
        const response = await this.client.createChatCompletion({
          model: this.persona.model,
          messages: [...this.messages],
          temperature: parseFloat(this.persona.temperature),
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          n: 1,
        }, {
          timeout: 180000
        });

        response.data.choices.forEach(i => {
          content.push(i.message.content);
          this.messages.push(i.message);
        });

        this.accountLimits();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= 3) {
          if (error.response) {
            debugOut(error.response.status);
            debugOut(error.response.data);
          } else {
            debugOut(error.message);
            debugOut(error.stack);
          }
        }
      }
    }

    return content;
  }

  /**
 * Creates an image using the specified backend API.
 *
 * @param {string} prompt - The prompt for generating the image.
 * @param {Object} parameter - The parameter object containing the Text2ImageAPI parameter.
 * @returns {Promise} - A promise that resolves to the created image.
 * @throws {Error} - If the image creation fails after multiple retries.
 */
  async createImage(prompt, parameter) {
    const backends = {
      openAi: new AIOpenAI(),
      huggingFace: new AIHuggingFace()
    };
    const backend = backends[parameter.Text2ImageAPI];

    let retryCount = 0;
    while (retryCount < 9) {
      try {
        return await backend.createImage(this, prompt, parameter);
      } catch (error) {
        retryCount++;
        if (retryCount >= 9) {
          throw error;
        } else {
          await this.sleep(3000);
        }
      }
    }
  }

  /**
 * Converts text to speech using the specified backend API.
 *
 * @param {string} prompt - The text to be converted to speech.
 * @param {Object} parameter - The parameter object containing the Text2SpeechAPI parameter.
 * @returns {Promise} - A promise that resolves to the generated speech.
 * @throws {Error} - If the text-to-speech conversion fails after multiple retries.
 */
  async text2Speech(prompt, parameter) {

    const backends = {
      localSystem: new AILocalSystem(),
      huggingFace: new AIHuggingFace()
    };
    const backend = backends[parameter.Text2SpeechAPI]

    let retryCount = 0;
    while (retryCount < 3) {
      try {
        return await backend.text2Speech(prompt, parameter);
      } catch (error) {
        retryCount++;
        if (retryCount >= 3) {
          throw error;
        }
      }
    }
  }
}

const parseEntities = (content, escape = true) => {
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
      entities.push({ entity: escape ? escapeMarkupV2String(entity) : entity, type: 'plain' });
    }
    lPos = rPos;
    rPos = content.indexOf('```', rPos + 3);
  }

  if (lPos < content.length) {
    let entity = content.substring(lPos);
    entities.push({ entity: escape ? escapeMarkupV2String(entity) : entity, type: 'plain' })
  }

  return entities.map((i) => i.entity);;
}

module.exports = {
  AIInterface,
  parseEntities
};
