import json
import re

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'getFile' in content or 'saveFile' in content or 'IndexedDB' in content:
                # search for definition
                if 'function getFile' in content or 'const getFile' in content or 'open(' in content:
                    print(f"Found in step {data.get('step_index')}:")
                    # find lines containing getFile or saveFile
                    for l in content.split('\n'):
                        if 'getFile' in l or 'saveFile' in l or 'indexedDB' in l:
                            print("  ", l[:200])
        except Exception as e:
            pass
