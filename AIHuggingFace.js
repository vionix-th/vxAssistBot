const { HfInference } = require("@huggingface/inference")
const { readApiKey } = require("./vxAssistCommon");
require('colors');

class AIHuggingFace {
    Settings = {
        apiKey: readApiKey('apikeyHuggingFace.txt'),
        createImage: {
            // model: 'prompthero/openjourney'
            // model: 'hakurei/waifu-diffusion'
            // model: 'gsdf/Counterfeit-V2.5'
            model: 'stabilityai/stable-diffusion-2-1'
            // model: 'dreamlike-art/dreamlike-photoreal-2.0'
        },
        text2Speech: {
            model: 'facebook/fastspeech2-en-ljspeech'
        }
    };

    async text2Speech(prompt) {
        const hf = new HfInference(this.Settings.apiKey);
        var result = [];

        for (let input of prompt.split('\n\n')) {
            let paragraph = await hf.textToSpeech({
                model: Settings.text2Speech.model,
                inputs: input
            })
            result.push(paragraph);
        }

        return result;
    }

    async createImage(ai, prompt, parameter) {        
        const hf = new HfInference(this.Settings.apiKey);
        
        var result = await hf.textToImage({
            model: this.Settings.createImage.model,
            inputs: ai.expandArguments([prompt], parameter)[0],
            parameters: {
                negative_prompt: 'low quality, blurry',
              }
        });

        return Buffer.from(await result.arrayBuffer());
    }
};



module.exports = {
    AIHuggingFace
}