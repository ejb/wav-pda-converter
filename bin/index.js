import fs from "node:fs/promises";

import { wavToPda } from "../src/wav-to-pda.js";

main();

async function main() {
  const [input, output] = process.argv.slice(2);

  const wavFile = await fs.readFile(input);

  if (wavFile.audioFormat === "ADPCM") {
    throw new Error("ADPCM-encoded WAV files are not yet supported, sorry");
  }

  const pdaFile = wavToPda(wavFile);

  await fs.writeFile(output, pdaFile);
}
