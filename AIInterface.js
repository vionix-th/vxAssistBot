const { Configuration, OpenAIApi } = require('openai');

class AIInterface {
    constructor(apiKey) {
        const configuration = new Configuration({
            apiKey
        });
        this.client = new OpenAIApi(configuration);
        this.messages = [];
    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    expandArguments(prompt, args) {

        args = args || {};

        return prompt.map(i => {
            Object.keys(args).forEach(j => {
                i = i.replace("{%" + j + "%}", args[j]);
            });
            return i;
        });
    };

    async createCompletion(system, user, temperature, parameter) {
        await this.sleep(20000);

        system = system || [];
        user = user || [];

        if(system.length + user.length === 0){
            return {};
        }

        system.length && this.expandArguments(system, parameter).forEach(i => {
            this.messages.push({ role: 'system', content: i });
        });
        user.length && this.expandArguments(user, parameter).forEach(i => {
            this.messages.push({ role: 'user', content: i });
        });

        let content = [];

        try {
            const response = await this.client.createChatCompletion({
                model: 'gpt-3.5-turbo',
                messages: [...this.messages],
                temperature: temperature,
                top_p: 1.0,
                frequency_penalty: 0.0,
                presence_penalty: 0.0,
                n: 1,
            });

            response.data.choices.forEach(i => {
                content.push(i.message.content);
                this.messages.push(i.message);
            });

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
}

module.exports = {
    AIInterface
}
