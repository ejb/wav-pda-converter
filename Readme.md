# WAV to PDA Converter

Converting WAV files to PDA (Playdate Audio) for use with the [Playdate games console](https://play.date/).

Use it on the web here, no code required: https://ejb.github.io/wav-pda-converter/

## CLI usage

```sh
node bin/index.js input_file.wav output_file.pda
```

## Building the web app

```sh
npm ci
npm run dev
```

## Made possible by...

- Scratchminer on the Playdate Squad discord
- [This guide to Playdate file formats](https://github.com/cranksters/playdate-reverse-engineering/blob/main/formats/pda.md)
- [This YouTube video on working with WAV files](https://www.youtube.com/watch?v=udbA7u1zYfc)
- [This guide to WAV file formats](http://soundfile.sapp.org/doc/WaveFormat/)
