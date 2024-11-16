import { WaveFile } from "wavefile";
import * as r from "restructure";

const pdaAudioDataFormats = {
  0: "kFormat8bitMono",
  1: "kFormat8bitStereo",
  2: "kFormat16bitMono",
  3: "kFormat16bitStereo",
  4: "kFormatADPCMMono",
  5: "kFormatADPCMStereo",
};

// ADPCM constants
const ADPCM_BLOCK_SIZE = 256;
const ADPCM_INDEX_TABLE = [
  -1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
];
const ADPCM_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
  253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
  3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
  11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767,
];

/** Defines the binary structure of a PDA file */
const PDAFile = new r.Struct({
  fileType: new r.String(12),
  sampleRate: r.uint24le,
  audioDataFormat: r.uint8,
});

/** Creates an ADPCM block header */
function createAdpcmBlockHeader(predictor, index, channel = 0) {
  const header = Buffer.alloc(4);
  header.writeUInt16LE(predictor, 0);
  header.writeUInt8(index, 2);
  header.writeUInt8(0, 3); // Reserved byte
  return header;
}

/** Converts PCM samples to ADPCM */
function encodePCMtoADPCM(samples, stereo = false) {
  const blocks = [];
  let predictor = 0;
  let index = 0;
  let step = ADPCM_STEP_TABLE[index];

  // Calculate number of samples per block (accounting for header)
  const samplesPerBlock = (ADPCM_BLOCK_SIZE - (stereo ? 8 : 4)) * 2; // *2 because 4-bit samples

  for (let i = 0; i < samples.length; i += samplesPerBlock) {
    const blockSamples = samples.slice(i, i + samplesPerBlock);
    const blockHeader = createAdpcmBlockHeader(predictor, index);
    const blockData = Buffer.alloc(ADPCM_BLOCK_SIZE - (stereo ? 8 : 4));

    let blockOffset = 0;
    for (let j = 0; j < blockSamples.length; j += 2) {
      const sample = blockSamples[j];
      const diff = sample - predictor;
      let delta = 0;

      if (diff >= 0) {
        delta = Math.min(7, Math.floor(diff / step));
      } else {
        delta = Math.min(8, Math.floor(-diff / step)) + 8;
      }

      predictor += (((delta & 7) * 2 + 1) * step) / 4;
      if (delta & 8) predictor -= (((delta & 7) * 2 + 1) * step) / 4;

      predictor = Math.max(-32768, Math.min(32767, predictor));
      index += ADPCM_INDEX_TABLE[delta];
      index = Math.max(0, Math.min(88, index));
      step = ADPCM_STEP_TABLE[index];

      // Pack two 4-bit samples into one byte
      if (j % 2 === 0) {
        blockData[blockOffset] = delta << 4;
      } else {
        blockData[blockOffset] |= delta;
        blockOffset++;
      }
    }

    blocks.push(Buffer.concat([blockHeader, blockData]));
  }

  return Buffer.concat(blocks);
}

/** Extracts data relevant to PDA from WAV buffer */
export function parseWav(buffer) {
  let wav = new WaveFile();
  wav.fromBuffer(buffer);

  if (wav.fmt.numChannels !== 1 && wav.fmt.numChannels !== 2) {
    throw new Error(`Invalid numChannels: ${wav.fmt.numChannels}`);
  }

  // https://www.signalogic.com/index.pl?page=audio_waveform_file_formats#table
  let audioFormat = null;
  if (wav.fmt.audioFormat === 1) {
    audioFormat = "PCM";
  }
  if ([2, 11, 16, 17, 36, 40, 64, 103].includes(wav.fmt.audioFormat)) {
    audioFormat = "ADPCM";
  }
  if (!audioFormat) {
    throw new Error(`Invalid audioFormat: ${wav.fmt.audioFormat}`);
  }

  const bitsPerSample = wav.fmt.bitsPerSample;
  const stereo = wav.fmt.numChannels === 2;

  const channelsName = stereo ? "Stereo" : "Mono";
  const pdaFormatEquivalent =
    audioFormat === "PCM"
      ? `kFormat${bitsPerSample}bit${channelsName}`
      : `kFormatADPCM${channelsName}`;

  if (!Object.values(pdaAudioDataFormats).includes(pdaFormatEquivalent)) {
    throw new Error(`Invalid pdaFormatEquivalent: ${pdaFormatEquivalent}`);
  }

  const pdaFormatEquivalentCode = parseInt(
    Object.entries(pdaAudioDataFormats).find(
      ([i, fmt]) => fmt === pdaFormatEquivalent
    )[0]
  );

  const wavData = {
    sampleRate: wav.fmt.sampleRate,
    stereo,
    bitsPerSample,
    audioFormat,
    pdaFormatEquivalentCode,
    pdaFormatEquivalent,
    data: wav.data,
    _original: wav,
  };

  return wavData;
}

/** Converts a PDA file buffer to a JSON representation */
export function parsePda(buffer) {
  const pdaData = PDAFile.fromBuffer(buffer);
  pdaData.audioDataFormatName = pdaAudioDataFormats[pdaData.audioDataFormat];
  return pdaData;
}

/** Converts a valid JSON representation of a PDA file to a binary buffer */
export function pdaDataToBinary(data) {
  return Buffer.from(PDAFile.toBuffer(data));
}

/** Converts PCM samples to the appropriate format for PDA */
function convertSamplesToPDAFormat(samples, wavData) {
  if (wavData.audioFormat === "ADPCM") {
    // If it's already ADPCM, return as is
    return samples;
  }

  // Write block size for ADPCM
  if (wavData.pdaFormatEquivalent.includes("ADPCM")) {
    const blockSizeBuffer = Buffer.alloc(2);
    blockSizeBuffer.writeUInt16LE(ADPCM_BLOCK_SIZE);
    const adpcmData = encodePCMtoADPCM(samples, wavData.stereo);
    return Buffer.concat([blockSizeBuffer, adpcmData]);
  }

  // For PCM formats, return as is
  return samples;
}

/** Converts a wav file buffer to a PDA buffer */
export function wavToPda(wav) {
  const wavData = parseWav(wav);
  const newPdaData = pdaDataToBinary({
    fileType: "Playdate AUD",
    sampleRate: wavData.sampleRate,
    audioDataFormat: wavData.pdaFormatEquivalentCode,
  });

  const convertedSamples = convertSamplesToPDAFormat(
    wavData.data.samples,
    wavData
  );

  return Buffer.concat([newPdaData, convertedSamples]);
}
