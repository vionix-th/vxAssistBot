const { AIInterface } = require('./AIInterface.js');
const { program } = require('commander');
const fs = require('fs');
require('colors');

function readPersonaFile(filePath) {
  const personaData = fs.readFileSync(filePath, 'utf-8');
  return {
    name: 'Assistant',
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

  let title = 'Unknown Story';
  writerResponse.forEach(i => {
    const result = i.match(/^TITLE: (.+)/mg);
    if(result){
      title = result[0];
    }
  }); 

  const filename = generateFilename(writerPersona, editorPersona, title);
  saveContentToFile(filename, writerResponse);
}

main().catch((error) => {
  console.error('An error occurred:', error);
});
