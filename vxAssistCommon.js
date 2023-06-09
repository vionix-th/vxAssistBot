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

module.exports = {
    readPersonaFile,
    generateFilename,
    saveContentToFile
};
