const { HfInference } = require("@huggingface/inference")
const { readApiKey } = require("./vxAssistCommon");
require('colors');

class AIHuggingFace {
    apiKey = readApiKey('apikeyHuggingFace.txt');

    async text2Speech(prompt, parameter) {
        const hf = new HfInference(this.apiKey);
        var result = [];

        for (let input of prompt.split('\n\n')) {
            let paragraph = await hf.textToSpeech({
                model: parameter.Text2SpeechModel,
                inputs: input
            })
            result.push(paragraph);
        }

        return result;
    }

    async createImage(ai, prompt, parameter) {        
        const hf = new HfInference(this.apiKey);

        var negative_prompt = parameter.VisualStyleNegative;
        var inputs = ai.expandArguments([prompt], parameter)[0];
        var result = await hf.textToImage({
            model: parameter.Text2ImageModel,
            inputs,
            parameters: {
                negative_prompt
              }
        });

        return Buffer.from(await result.arrayBuffer());
    }
};



module.exports = {
    AIHuggingFace
}