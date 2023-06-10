const { Configuration, OpenAIApi } = require('openai');
const { HfInference } = require("@huggingface/inference")
const axios = require('axios');
const fs = require('fs');
require('colors');

class AIInterface {
    /**
     * Constructs an instance of the AIInterface.
     * @param {string} apiKey - The API key for the OpenAI GPT-3 API.
     */
    constructor(apiKey) {
        if (!apiKey) {
            apiKey = this.readApiKey('apikey.txt');
        }
        const configuration = new Configuration({
            apiKey
        });
        this.client = new OpenAIApi(configuration);
        this.messages = [];
        this.lastQueryTimestamp = 0;
        this.queryCount = 0;
        this.queryLimit = 30;
        this.queryInterval = 60000;
    }

    /**
     * Reads the API key from a file.
     * @param {string} filePath - The path to the API key file.
     * @returns {string} The API key.
     */
    readApiKey(filePath) {
        const apiKey = fs.readFileSync(filePath, 'utf-8');
        return apiKey;
    }

    /**
     * Pauses execution for the specified number of milliseconds.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise<void>} A promise that resolves after sleeping.
     */
    async sleep(ms) {
        return new Promise((resolve) => {
            console.log('Request limit reached. Taking a short break...');
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
        return prompt.map(i => {
            Object.keys(args).forEach(j => {
                i = i.replace("{%" + j + "%}", args[j]);
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
     * Initializes the AI agents with the provided persona and parameters.
     * @param {object} persona - The persona for the agents.
     * @param {object} parameter - Additional parameters for expanding the persona.
     * @param {function} callback - The callback function to invoke after initialization.
     * @returns {Array<string>} The response from the agents.
     */
    async initializeAgent(persona, parameter, callback) {
        var response = [];

        // Assign the persona to the agents  
        this.assignRole(persona.role, parameter);

        console.log(persona.role.join("\n").yellow);
        for (let i = 0; i < persona.prompt.length; i++) {
            // Complete the initialization prompts for the editor agent
            const prompt = persona.prompt[i];
            console.log(this.expandArguments(prompt, parameter).join("\n").red);
            console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>".red);

            response = await this.createCompletion(prompt, persona.temperature, parameter);
            callback && callback({ persona, parameter, response });
        }

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
     * Creates a completion using the OpenAI GPT-3 API.
     * @param {Array<string>} user - The user's input messages.
     * @param {number} temperature - The temperature for text generation.
     * @param {object} parameter - Additional parameters for expanding the user input.
     * @returns {Array<string>} The generated completion from the AI model.
     */
    async createCompletion(user, temperature, parameter) {
        if (!user || user.length === 0) {
            return [];
        }

        await this.enforceLimits();

        user.length && this.expandArguments(user, parameter).forEach(i => {
            this.messages.push({ role: 'user', content: i });
        });

        var content = [];

        try {
            const response = await this.client.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: [...this.messages],
                temperature: temperature,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
                n: 1,
            }, {
                timeout: 180000
            });

            response.data.choices.forEach(i => {
                content.push(i.message.content);
                this.messages.push(i.message); npm
            });

            this.accountLimits();
        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
            } else {
                console.log(error.message);
            }
        }

        return content;
    }

    async createImage(prompt, parameter) {
        let retryCount = 0;
        while (retryCount < 3) {
            try {
                const response = await this.client.createImage({
                    prompt: this.expandArguments([prompt], parameter)[0],
                    n: 1,
                    size: "1024x1024",
                });
                const image = await axios.get(response.data.data[0].url, {
                    responseType: 'arraybuffer'
                });

                return image.data;
            } catch (error) {                
                retryCount++;
                if (retryCount >= 3) {
                    throw error;
                }else{
                    console.log(`createImage: ${error.message}`);
                }
            }
        }
    }

    async text2Speech(prompt) {
        const apiKey = this.readApiKey('apikeyHuggingFace');
        const hf = new HfInference(apiKey);
        var result = null;

        let retryCount = 0;
        while (retryCount < 3) {
            try {
                result = await hf.textToSpeech({
                    model: 'facebook/fastspeech2-en-ljspeech',
                    inputs: prompt
                })
            } catch (error) {
                if(retryCount++ >= 3) {
                    throw error;
                }else{
                    console.log(`text2Speech: ${error.message}`);
                }
            }
        }

        return result;
    }

}

module.exports = {
    AIInterface
};
