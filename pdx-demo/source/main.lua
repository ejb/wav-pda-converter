import "CoreLibs/object"
import "CoreLibs/graphics"
import "CoreLibs/sprites"
import "CoreLibs/timer"

local audio_file = "./Assets/SetPuzzleComplete-Stereo-IMAADPCM"
print('playing '..audio_file)
local mySound, error = playdate.sound.sampleplayer.new(audio_file)
mySound:play(0)

function playdate.update()
  playdate.graphics.drawTextInRect(audio_file,10,10, 360, 400)
  if error then
    playdate.graphics.drawTextInRect(error,10,60, 360, 400)
  end
end