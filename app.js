const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
const { program } = require('commander');
require('colors');

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
    await this.sleep(21000);

    system && this.expandArguments(system, parameter).forEach(i => {
      this.messages.push({ role: 'system', content: i });
    });
    user && this.expandArguments(user, parameter).forEach(i => {
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

function readPersonaFile(filePath) {
  const personaData = fs.readFileSync(filePath, 'utf-8');
  return {
    name: 'Bob',
    temperature: '0.5',
    role: '',
    prompt: '',
    ...JSON.parse(personaData)
  };
}

function readApiKey(filePath) {
  const apiKey = fs.readFileSync(filePath, 'utf-8');
  return apiKey;
}

function generateFilename(writer, editor, title) {
  const writerName = writer.name.replace(/\s+/g, '_');
  const editorName = editor.name.replace(/\s+/g, '_');
  const filename = `${writerName}_${editorName}_${title}.txt`;
  return filename;
}

function saveContentToFile(filename, content) {
  fs.writeFileSync(filename, content.join("\n"), "utf-8");
  console.log(`Content saved to file: ${filename}`);
}

async function main() {
  program
    .requiredOption('-w, --writer <writerPersonaFile>', 'Writer persona file')
    .requiredOption('-e, --editor <editorPersonaFile>', 'Editor persona file')
    .requiredOption('-n, --iterations <numIterations>', 'Number of iterations')
    .option('-p, --parameter <param>', 'Additional parameter as JSON object')
    .parse(process.argv);

  const opts = program.opts();

  const writerPersonaFile = opts.writer;
  const editorPersonaFile = opts.editor;
  const iterations = parseInt(opts.iterations, 10);
  const parameter = opts.parameter ? JSON.parse(opts.parameter) : null;
  const apiKey = readApiKey('apikey.txt');

  const writerPersona = readPersonaFile(writerPersonaFile);
  const editorPersona = readPersonaFile(editorPersonaFile);

  const writerAI = new AIInterface(apiKey);
  const editorAI = new AIInterface(apiKey);

  console.log(editorPersona.role.join("\n").red);
  console.log("\n");
  let editorResponse = '';
  for (let i = 0; i < editorPersona.prompt.length; i++) {
    const prompt = editorPersona.prompt[i];
    console.log(editorAI.expandArguments(prompt, parameter).join("\n").red);
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>".red);
    let editorResponse = await editorAI.createCompletion(i == 0 ? editorPersona.role : null, prompt, editorPersona.temperature, parameter);
    console.log(editorResponse.join("\n").blue);
    console.log("--------------------------------".blue);
  }

  console.log(writerPersona.role.join("\n").red);
  console.log("\n");
  let writerResponse = '';
  for (let i = 0; i < writerPersona.prompt.length; i++) {
    const prompt = writerPersona.prompt[i];
    console.log(writerAI.expandArguments(prompt, parameter).join("\n").red);
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>".red);
    writerResponse = await writerAI.createCompletion(i == 0 ? writerPersona.role : null, prompt, writerPersona.temperature, parameter);
    console.log(writerResponse.join("\n").green);
    console.log("--------------------------------".green);
  }

  for (let i = 0; i < iterations; i++) {
    console.log(`Iteration ${i + 1}`);

    editorResponse = await editorAI.createCompletion(null, writerResponse, writerPersona.temperature);
    console.log(editorResponse.join("\n").blue);
    console.log("--------------------------------".blue);

    writerResponse = await writerAI.createCompletion(null, editorResponse, editorPersona.temperature);
    console.log(writerResponse.join("\n").green);
    console.log("--------------------------------".green);
  }

  const filename = generateFilename(writerPersona, editorPersona, 'title');
  saveContentToFile(filename, writerResponse);
}

main().catch((error) => {
  console.error('An error occurred:', error);
});
