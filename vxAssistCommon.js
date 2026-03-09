const fs = require('fs');

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

/**
 * Write data to a file. 
 * The data is first written to a temporary file. 
 * If a file wile the specified filename already exists, the existing file is renamed. 
 * Eventually the temporary file is renamed to the specified filename.
 */
function writeFileSafely(filePath, data, opts = {}) {
    const bakDate = new Date();
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bakDate.getDay()];
    const hourOfDay = bakDate.getHours();
    const bakFilePath = `${filePath}.${dayOfWeek}.${hourOfDay}.previous`;
    const tempFilePath = `${filePath}.${dayOfWeek}.${hourOfDay}.tmp`;

    if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, bakFilePath);
    }

    fs.writeFileSync(tempFilePath, data, opts);
    fs.renameSync(tempFilePath, filePath);
}

module.exports = {
    writeFileSafely,
    escapeMarkupV2String,
    debugOut,
    deepCopy,
    sleep,
    extractJSON,
    sanitizeString,
    readApiKey
};
