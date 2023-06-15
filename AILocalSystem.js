const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

function executeShellCommand(command) {
  return new Promise((resolve, reject) => {
    const childProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });

    childProcess.on('error', reject);
  });
}

class AILocalSystem {
  async text2Speech(prompt, parameter) {
    const tempWavFilePath = path.join(os.tmpdir(), `AILocalSystem.text2speech.${process.pid}.temp.aiff`);
    const tempTxtFilePath = path.join(os.tmpdir(), `AILocalSystem.text2speech.${process.pid}.temp.txt`);

    fs.writeFileSync(tempTxtFilePath, prompt);

    var result = null;

    try {
      result = await executeShellCommand(`say -v ${parameter.Text2SpeechModel} -o ${tempWavFilePath} -f ${tempTxtFilePath}`);

      const data = fs.readFileSync(tempWavFilePath);
      result = new Blob([data], { type: 'application/octet-stream' });
    } catch (error) {
      throw error;
    } finally {
      fs.rmSync(tempWavFilePath);
      fs.rmSync(tempTxtFilePath);
    }

    return [result];
  }
}

module.exports = {
  AILocalSystem
}