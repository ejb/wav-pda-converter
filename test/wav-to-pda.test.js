const test = require("ava");
const { readFile, writeFile, mkdir, rm } = require("node:fs/promises");
const { exec } = require("child_process");

const wavToPdaPkg = require("../dist/wav-to-pda");
const { setTimeout } = require("node:timers/promises");
const { wavToPda } = wavToPdaPkg;

test.before(async (t) => {
  t.context = {
    wavPCM: await readFile("./test/fixtures/SetPuzzleComplete-16bitPCM.wav"),
    wavADPCM: await readFile("./test/fixtures/SetPuzzleComplete-IMAADPCM.wav"),
    pdaPCM: await readFile("./test/expected/SetPuzzleComplete-16bitPCM.pda"),
    pdaADPCM: await readFile("./test/expected/SetPuzzleComplete-IMAADPCM.pda"),
  };
});

test("PCM WAV to PDA", async (t) => {
  const pda = wavToPda(t.context.wavPCM);
  t.is(pda.length, t.context.pdaPCM.length);
  t.deepEqual(pda, t.context.pdaPCM);
});

test.failing("IMAADPCM WAV to PDA", async (t) => {
  const pda = wavToPda(t.context.wavADPCM);
  t.is(pda.length, t.context.pdaADPCM.length);
  t.deepEqual(pda, t.context.pdaADPCM);
});

test("command line usage", async (t) => {
  t.teardown(async () => {
    await rm("./test/tmp", { recursive: true, force: true });
  });
  await mkdir("./test/tmp", { recursive: true });
  await exec(
    `node ./bin/index.js \
    ./test/fixtures/SetPuzzleComplete-16bitPCM.wav \
    ./test/tmp/SetPuzzleComplete-16bitPCM.pda
    `
  );
  await setTimeout(100);
  const pda = await readFile("./test/tmp/SetPuzzleComplete-16bitPCM.pda");
  t.is(pda.length, t.context.pdaPCM.length);
  t.deepEqual(pda, t.context.pdaPCM);
});
