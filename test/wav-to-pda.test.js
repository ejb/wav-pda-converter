const test = require("ava");
const { readFile, writeFile, mkdir, rm } = require("node:fs/promises");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const wavToPdaPkg = require("../dist/wav-to-pda");
const { setTimeout } = require("node:timers/promises");
const { wavToPda } = wavToPdaPkg;

test.before(async (t) => {
  t.context = {
    wav_PCM_stereo: await readFile(
      "./test/fixtures/SetPuzzleComplete-Stereo-16bitPCM.wav"
    ),
    wav_ADPCM_mono: await readFile(
      "./test/fixtures/SetPuzzleComplete-Mono-IMAADPCM.wav"
    ),
    wav_ADPCM_stereo: await readFile(
      "./test/fixtures/SetPuzzleComplete-Stereo-IMAADPCM.wav"
    ),
    pda_PCM_stereo: await readFile(
      "./test/expected/SetPuzzleComplete-Stereo-16bitPCM.pda"
    ),
    pda_ADPCM_mono: await readFile(
      "./test/expected/SetPuzzleComplete-Mono-IMAADPCM.pda"
    ),
    pda_ADPCM_stereo: await readFile(
      "./test/expected/SetPuzzleComplete-Stereo-IMAADPCM.pda"
    ),
  };
});

test("PCM WAV to PDA", async (t) => {
  const pda = wavToPda(t.context.wav_PCM_stereo);
  t.is(pda.length, t.context.pda_PCM_stereo.length);
  t.deepEqual(pda, t.context.pda_PCM_stereo);
});

test("IMAADPCM WAV to PDA", async (t) => {
  const pda = wavToPda(t.context.wav_ADPCM_mono);
  t.is(pda.length, t.context.pda_ADPCM_mono.length);
  t.deepEqual(pda, t.context.pda_ADPCM_mono);
});

test("IMAADPCM WAV to PDA, stereo", async (t) => {
  const pda = wavToPda(t.context.wav_ADPCM_stereo);
  t.is(pda.length, t.context.pda_ADPCM_stereo.length);
  t.deepEqual(pda, t.context.pda_ADPCM_stereo);
});

test("command line usage", async (t) => {
  t.teardown(async () => {
    await rm("./test/tmp", { recursive: true, force: true });
  });
  await mkdir("./test/tmp", { recursive: true });
  await exec(
    `node ./bin/index.js \
    ./test/fixtures/SetPuzzleComplete-Stereo-16bitPCM.wav \
    ./test/tmp/SetPuzzleComplete-Stereo-16bitPCM.pda
    `
  );
  await setTimeout(100);
  const pda = await readFile(
    "./test/tmp/SetPuzzleComplete-Stereo-16bitPCM.pda"
  );
  t.is(pda.length, t.context.pda_PCM_stereo.length);
  t.deepEqual(pda, t.context.pda_PCM_stereo);
});
