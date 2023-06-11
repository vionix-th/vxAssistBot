const { HfInference } = require("@huggingface/inference")
const { readApiKey } = require("./vxAssistCommon");
require('colors');

class AIHuggingFace {
    async text2Speech(prompt) {
        const apiKey = readApiKey('apikeyHuggingFace.txt');
        const hf = new HfInference(apiKey);
        var result = [];

        for (let input of prompt.split('\n\n')) {
            let paragraph = await hf.textToSpeech({
                model: 'facebook/fastspeech2-en-ljspeech',
                inputs: input
            })
            result.push(paragraph);
        }

        return result;
    }
};



module.exports = {
    AIHuggingFace
}