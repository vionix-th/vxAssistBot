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
    const filename = `${writerName}_${editorName}_${title}.${suffix}`;
    return filename;
}

function saveContentToFile(filename, content) {
    fs.writeFileSync(filename, content, "utf-8");
    console.log(`Content saved to file: ${filename}`);
}

/**
 * Reads the API key from a file.
 * @param {string} filePath - The path to the API key file.
 * @returns {string} The API key.
 */
function readApiKey(filePath) {
    const apiKey = fs.readFileSync(filePath, 'utf-8');
    return apiKey;
}

module.exports = {
    readPersonaFile,
    generateFilename,
    saveContentToFile,
    readApiKey
};
