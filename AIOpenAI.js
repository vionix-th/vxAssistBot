const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const { readApiKey } = require("./vxAssistCommon");
const fs = require('fs');
require('colors');

require('colors');

class AIOpenAI {
    async createImage(ai, prompt, parameter) {
        const response = await ai.client.createImage({
            prompt: ai.expandArguments([prompt], parameter)[0],
            n: 1,
            size: "1024x1024",
        });
        const image = await axios.get(response.data.data[0].url, {
            responseType: 'arraybuffer'
        });

        return image.data;
    }
};



module.exports = {
    AIOpenAI
}