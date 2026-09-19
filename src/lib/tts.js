// Web Speech API wrapper (zh-CN). Voices load asynchronously on most browsers.
let voices = []
function refresh() {
  try {
    voices = window.speechSynthesis?.getVoices() || []
  } catch {
    voices = []
  }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  refresh()
  window.speechSynthesis.onvoiceschanged = refresh
}

export function available() {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

function pickVoice() {
  const zh = voices.filter((v) => /^zh([-_]CN)?/i.test(v.lang) || /zh-Hans/i.test(v.lang) || /普通话|Chinese/i.test(v.name))
  return zh.find((v) => /Tingting|Ting-Ting|Xiaoxiao|Yunxi|Huihui|Kangkang|Lili|Google 普通话/i.test(v.name)) || zh[0] || null
}

export function speak(text, { rate = 0.9, onEnd } = {}) {
  if (!available() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  if (onEnd) u.onend = onEnd
  synth.speak(u)
}

export function stop() {
  if (available()) window.speechSynthesis.cancel()
}
