const fs = require('fs');

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

function generateFilename(writer, editor, title, suffix) {
    const writerName = writer.name.replace(/\s+/g, '_');
    const editorName = editor.name.replace(/\s+/g, '_');
    const filename = `${writerName}_${editorName}_${sanitizeString(title)}.${suffix}`;
    return filename;
}

function saveContentToFile(filename, content) {
    fs.writeFileSync(filename, content, "utf-8");
    console.log(`Content saved to file: ${filename}`);
}

function readApiKey(filePath) {
    const apiKey = fs.readFileSync(filePath, 'utf-8');
    return apiKey;
}

function sanitizeString(input) {
    const replacements = [
        ['ä', 'ae'],
        ['ö', 'oe'],
        ['ü', 'ue'],
        ['ß', 'ss'],
        [' ', '_']
    ];

    let sanitized = input;

    for (const [search, replace] of replacements) {
        sanitized = sanitized.replace(new RegExp(search, 'gi'), replace);
    }

    sanitized = sanitized.replace(/[^A-Za-z0-9_\.]/g, '');

    return sanitized;
}

function createDefaultParameters() {
    return {
        VisualStyle: null,
        VisualStyleCharacters: null,
        VisualStyleNegative: null,
        // Text2ImageAPI: 'openAi',
        Text2ImageAPI: 'huggingFace',
        // Text2ImageModel: 'gsdf/Counterfeit-V2.5', // Anime
        // Text2ImageModel: 'stabilityai/stable-diffusion-2-1', // Realistic
        // Text2ImageModel: 'dreamlike-art/dreamlike-photoreal-2.0',
        // Text2ImageModel: 'dreamlike-art/dreamlike-diffusion-1.0'
        // Text2ImageModel: 'dreamlike-art/dreamlike-anime-1.0' // Anime, Erotic
        Text2ImageModel: 'prompthero/openjourney',
        // Text2ImageModel: 'hakurei/waifu-diffusion',
        Text2SpeechAPI: 'localSystem',
        // Text2SpeechAPI: 'huggingFace',
        Text2SpeechModel: 'Ava',
        // Text2SpeechModel: 'espnet/kan-bayashi_ljspeech_vits',
        // Text2SpeechModel: 'facebook/fastspeech2-en-ljspeech',
    };
}

function extractJSON(text) {
    const jsonRegex = /{(?:[^{}]|{[^{}]*})*}/; // Regular expression to match JSON object
    const match = text.match(jsonRegex);

    if (match) {
        try {
            const jsonObject = JSON.parse(match[0]);
            return jsonObject;
        } catch (error) {
            console.error('Failed to parse JSON:', error);
        }
    } else {
        console.error('No JSON object found in the text.');
    }

    return null;
}

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function debugOut(msg) {
    debugOut.debugOutCallCounter ??= 0;
    
    let e = new Error();
    let frame = e.stack.split("\n")[2]; 
    let lineNumber = frame.split(":").reverse()[1];
    let functionName = frame.split(" ")[5];
    
    console.error(`${debugOut.debugOutCallCounter++} ${new Date().toISOString()} ${lineNumber}.${functionName}(...): ${msg}`);
  }

module.exports = {
    debugOut,
    sleep,
    extractJSON,
    createDefaultParameters,
    sanitizeString,
    readPersonaFile,
    generateFilename,
    saveContentToFile,
    readApiKey
};
