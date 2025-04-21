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

/** Defines the binary structure of a PDA file */
const PDAFile = new r.Struct({
  fileType: new r.String(12),
  sampleRate: r.uint24le,
  audioDataFormat: r.uint8,
});

/** Extracts data relevant to PDA from WAV buffer */
export function parseWav(buffer) {
  let wav = new WaveFile();
  wav.fromBuffer(buffer);

  if (wav.fmt.numChannels !== 1 && wav.fmt.numChannels !== 2) {
    throw new Error(`Invalid numChannels: ${wav.fmt.numChannels}`);
  }

  //https://www.signalogic.com/index.pl?page=audio_waveform_file_formats#table
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

  if (
    Object.values(pdaAudioDataFormats).includes(pdaFormatEquivalent) === false
  ) {
    throw new Error(`Invalid pdaFormatEquivalent: ${pdaFormatEquivalent}`);
  }

  const pdaFormatEquivalentCode = parseInt(
    Object.entries(pdaAudioDataFormats).find(([i, fmt]) => {
      return fmt === pdaFormatEquivalent;
    })[0]
  );

  const wavData = {
    sampleRate: wav.fmt.sampleRate,
    stereo,
    bitsPerSample,
    blockAlign: wav.fmt.blockAlign,
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
