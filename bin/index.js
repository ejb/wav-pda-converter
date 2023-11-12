const { readFile, writeFile } = require("node:fs/promises");
const { wavToPda } = require("../dist/wav-to-pda.js");

main();

async function main() {
  const [input, output] = process.argv.slice(2);

  if (!input) {
    console.error("No input file specified");
  }
  if (!output) {
    console.error("No output file specified");
  }

  const wavFile = await readFile(input);

  const pdaFile = wavToPda(wavFile);

  await writeFile(output, pdaFile);
}
