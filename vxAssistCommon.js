const fs = require('fs');

/**
 * Reads the persona data from a file and returns an object with additional properties.
 *
 * @param {string} filePath - The path to the persona file.
 * @returns {Object} - An object containing the persona data.
 */
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

/**
 * Generates a filename based on the provided writer, editor, title, and suffix.
 *
 * @param {Object} writer - The writer object.
 * @param {Object} editor - The editor object.
 * @param {string} title - The title of the content.
 * @param {string} suffix - The file suffix.
 * @returns {string} - The generated filename.
 */
function generateFilename(writer, editor, title, suffix) {
    const writerName = writer.name.replace(/\s+/g, '_');
    const editorName = editor.name.replace(/\s+/g, '_');
    const filename = `${writerName}_${editorName}_${sanitizeString(title)}.${suffix}`;
    return filename;
}


/**
 * Saves the content to a file with the specified filename.
 *
 * @param {string} filename - The name of the file to save the content to.
 * @param {string} content - The content to be saved.
 * @returns {void}
 */
function saveContentToFile(filename, content) {
    fs.writeFileSync(filename, content, "utf-8");
    console.log(`Content saved to file: ${filename}`);
}

/**
 * Reads the API key from a file.
 *
 * @param {string} filePath - The path to the API key file.
 * @returns {string} - The API key.
 */
function readApiKey(filePath) {
    const apiKey = fs.readFileSync(filePath, 'utf-8');
    return apiKey;
}

/**
 * Sanitizes a string by replacing special characters and removing non-alphanumeric characters.
 *
 * @param {string} input - The string to be sanitized.
 * @returns {string} - The sanitized string.
 */
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

/**
 * Creates and returns an object with default parameters.
 *
 * @returns {Object} - An object with default parameters.
 */
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

/**
 * Extracts a JSON object from the provided text.
 *
 * @param {string} text - The text to extract the JSON object from.
 * @returns {Object|null} - The extracted JSON object, or null if no JSON object is found.
 */
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

/**
 * Escapes special characters in a markup V2 string.
 *
 * @param {string} text - The markup V2 string to escape.
 * @returns {string} - The escaped markup V2 string.
 */
function escapeMarkupV2String(text) {
    const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
    let escapedText = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (specialChars.includes(char)) {
            escapedText += `\\${char}`;
        } else {
            escapedText += char;
        }
    }

    return escapedText;
}

/**
 * Asynchronously sleeps for the specified number of milliseconds.
 *
 * @param {number} ms - The number of milliseconds to sleep.
 * @returns {Promise<void>} - A promise that resolves after the specified time.
 */
async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

/**
 * Creates a deep copy of the provided object.
 *
 * @param {any} obj - The object to create a deep copy of.
 * @returns {any} - The deep copy of the object.
 */
function deepCopy(obj) {    
    if (typeof obj === 'object' && obj !== null) {
        const copy = Array.isArray(obj) ? [] : {};

        for (let key in obj) {
            copy[key] = deepCopy(obj[key]);
        }

        return copy;
    }

    return obj;
}

/**
 * Logs a debug message along with function call details.
 *
 * @param {string} msg - The debug message to be logged.
 * @returns {void}
 */
function debugOut(msg) {
    debugOut.debugOutCallCounter ??= 0;

    let e = new Error();
    let frame = e.stack.split("\n")[2];
    let lineNumber = frame.split(":").reverse()[1];
    let functionName = frame.split(" ")[5];

    console.error(`${debugOut.debugOutCallCounter++} ${new Date().toISOString()} ${lineNumber}.${functionName}(...): ${msg}`);
}

module.exports = {
    escapeMarkupV2String,
    debugOut,
    deepCopy,
    sleep,
    extractJSON,
    createDefaultParameters,
    sanitizeString,
    readPersonaFile,
    generateFilename,
    saveContentToFile,
    readApiKey
};
