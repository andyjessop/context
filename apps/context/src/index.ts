import * as fs from 'node:fs';
import * as path from 'node:path';
import minimist from 'minimist';

const args = minimist(process.argv.slice(2));
const { inputFolder, outputFile } = args;

if (!inputFolder) {
    console.log("No --inputFolder flag provided.");
    process.exit(1);
}

if (!outputFile) {
    console.log("No --outputFile flag provided.");
    process.exit(1);
}

main(inputFolder, outputFile);

function readFileContents(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
}

function processDirectory(dirPath: string, outputString: string): string {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            outputString = processDirectory(filePath, outputString);
        } else {
            const fileContents = readFileContents(filePath);
            outputString += `File: ${filePath}\n\n${fileContents}\n\n`;
        }
    }

    return outputString;
}

function main(inputFolder: string, outputFile:string): void {
    const outputString = processDirectory(inputFolder, "");
    fs.writeFileSync(outputFile, outputString);
    console.log(`Contents saved to ${outputFile}`);
}