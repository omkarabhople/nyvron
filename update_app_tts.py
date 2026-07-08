import re

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'r') as f:
    js = f.read()

# Replace the old `populateVoiceList` block
old_populate_regex = re.compile(r'function populateVoiceList\(\).*?let voiceCheckInterval = [^\n]*\n.*?\n.*?\n.*?\n  \}, 500\);', re.DOTALL)

new_populate = """
  let backendVoices = [];
  async function populateVoiceList() {
    const select = $('cr-speech-voice-select');
    if (!select) return;
    try {
      const res = await fetch('http://localhost:3000/api/tts/voices');
      const voices = await res.json();
      if (!voices || voices.length === 0) return;
      backendVoices = voices;
      select.innerHTML = '';
      
      const femaleNames = ["samantha", "siri", "victoria", "fiona", "hazel", "susan", "zira", "karen", "moira", "tessa", "veena"];
      const femaleSorted = [];
      const otherVoices = [];
      
      voices.forEach(v => {
        const nameL = v.name.toLowerCase();
        const isFemale = femaleNames.some(f => nameL.includes(f)) || nameL.includes("female");
        if (isFemale) {
          femaleSorted.push({ voice: v, label: `✨ [Female] ${v.name} (${v.lang})` });
        } else {
          otherVoices.push({ voice: v, label: `${v.name} (${v.lang})` });
        }
      });
      
      const allVoices = [...femaleSorted, ...otherVoices];
      allVoices.forEach(vObj => {
        const opt = document.createElement('option');
        opt.value = vObj.voice.name;
        opt.textContent = vObj.label;
        select.appendChild(opt);
      });
      
      const defaultVoice = allVoices.find(vObj => vObj.voice.name.toLowerCase().includes("samantha") || vObj.voice.name.toLowerCase().includes("siri"));
      if (defaultVoice) {
        select.value = defaultVoice.voice.name;
      }
    } catch (e) {
      console.error("Failed to load backend voices:", e);
    }
  }
  populateVoiceList();
"""

js = old_populate_regex.sub(new_populate, js, count=1)

# Now replace `toggleSpeech` logic
old_toggle_regex = re.compile(r'const toggleSpeech = async \(\) => \{.*?if \(siriVoice\).*?globalUtterance\.voice = siriVoice;.*?\}', re.DOTALL)

new_toggle = """
  let currentAudio = null;
  const toggleSpeech = async () => {
    if (isSpeaking) {
      if (currentAudio) {
         currentAudio.pause();
         currentAudio = null;
      }
      isSpeaking = false;
      if (speechPlayText) speechPlayText.textContent = "Start Reading";
      return;
    }

    const text = await getCurrentPageText();
    if (!text || text.trim().length === 0) {
      alert("No text could be extracted from this page for speech synthesis. Is the page fully loaded?");
      return;
    }

    const select = $('cr-speech-voice-select');
    const selectedVoiceName = select ? select.value : "Samantha";

    if (speechPlayText) speechPlayText.textContent = "Loading...";

    try {
      const res = await fetch('http://localhost:3000/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, voice: selectedVoiceName })
      });
      
      if (!res.ok) {
        alert("Backend TTS Engine failed to generate audio.");
        if (speechPlayText) speechPlayText.textContent = "Start Reading";
        return;
      }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      currentAudio = new Audio(url);
      
      currentAudio.onplay = () => {
        isSpeaking = true;
        if (speechPlayText) speechPlayText.textContent = "Stop Reading";
      };
      
      currentAudio.onended = () => {
        isSpeaking = false;
        if (speechPlayText) speechPlayText.textContent = "Start Reading";
        URL.revokeObjectURL(url);
      };
      
      currentAudio.play();
    } catch (e) {
      console.error("TTS Fetch Error:", e);
      alert("Could not connect to local TTS engine.");
      if (speechPlayText) speechPlayText.textContent = "Start Reading";
    }
"""

js = old_toggle_regex.sub(new_toggle, js, count=1)

# Because we changed `toggleSpeech`, we need to find if there's any remaining `window.speechSynthesis.speak(globalUtterance)` at the end of the replaced block
cleanup_regex = re.compile(r'window\.speechSynthesis\.speak\(globalUtterance\);\s*\}\s*isSpeaking = true;\s*if \(speechPlayText\) speechPlayText\.textContent = "Stop Reading";\s*\}')
js = cleanup_regex.sub('  }', js)

with open('/Users/onkarbhople/nyvron/frontend/app.js', 'w') as f:
    f.write(js)
