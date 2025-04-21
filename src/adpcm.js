/**
 * Process ADPCM mono data from a WAV file
 * @param {ArrayBuffer} inputBuffer - The input ADPCM data buffer
 * @param {number} blockSize - Size of each ADPCM block
 * @returns {ArrayBuffer} Processed output buffer
 */
export function processADPCM(inputBuffer, blockSize, stereo) {
  // Create data views for reading from input buffer
  const inputView = new DataView(new Uint8Array(inputBuffer).buffer);

  // Create output buffer (size will depend on input length, this is an estimate)
  const outputBuffer = new ArrayBuffer(inputBuffer.byteLength + 100); // Extra space for headers, etc.
  const outputView = new DataView(outputBuffer);
  let outputPos = 0;

  // Add block size to output buffer
  outputView.setInt16(outputPos, blockSize, true); // true for little-endian
  outputPos += 2;

  let inputPos = 0;
  const inputLength = inputBuffer.byteLength;

  // Process the input buffer in blocks
  while (inputPos < inputLength) {
    // Calculate the end of current block
    const blockEnd = Math.min(inputLength, inputPos + blockSize);

    // Validate mono/left channel
    ({ inputPos, outputPos } = validateBlock({
      inputView,
      inputPos,
      outputView,
      outputPos,
    }));
    if (stereo) {
      // Validate right channel too
      ({ inputPos, outputPos } = validateBlock({
        inputView,
        inputPos,
        outputView,
        outputPos,
      }));
    }

    while (inputPos < blockEnd) {
      if (stereo) {
        // Read left and right channel 32-bit values
        const leftVal = inputView.getUint32(inputPos, true);
        inputPos += 4;
        const rightVal = inputView.getUint32(inputPos, true);
        inputPos += 4;

        // Interleave the left and right channel data in 4-bit chunks
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x0000000f) << 4) | ((rightVal & 0x0000000f) << 0)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x000000f0) << 0) | ((rightVal & 0x000000f0) >> 4)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x00000f00) >> 4) | ((rightVal & 0x00000f00) >> 8)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x0000f000) >> 8) | ((rightVal & 0x0000f000) >> 12)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x000f0000) >> 12) | ((rightVal & 0x000f0000) >> 16)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x00f00000) >> 16) | ((rightVal & 0x00f00000) >> 20)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0x0f000000) >> 20) | ((rightVal & 0x0f000000) >> 24)
        );
        outputView.setUint8(
          outputPos++,
          ((leftVal & 0xf0000000) >> 24) | ((rightVal & 0xf0000000) >> 28)
        );
      } else {
        // Process mono data - swap nibbles for each byte
        const byte = inputView.getUint8(inputPos++);

        // Swap high and low nibbles: (low << 4) | (high >> 4)
        const swapped = ((byte & 0x0f) << 4) | ((byte & 0xf0) >> 4);

        outputView.setUint8(outputPos++, swapped);
      }
    }
  }

  // Return only the portion of the buffer that we used
  return Buffer.from(outputBuffer.slice(0, outputPos));
}

function validateBlock({ inputView, inputPos, outputView, outputPos }) {
  // Read the 32-bit state info value
  const stateInfo = inputView.getInt32(inputPos, true); // true for little-endian
  inputPos += 4;

  // Validate ADPCM index (high 16 bits should be <= 88)
  const index = (stateInfo >> 16) & 0xffff;
  if (index > 88) {
    console.error("Bad ADPCM data (idx > 88)");
    // Return partial buffer
    return outputBuffer.slice(0, outputPos);
  }

  // Add the validated state info to output
  outputView.setInt32(outputPos, stateInfo, true);
  outputPos += 4;

  return { inputPos, outputPos };
}
