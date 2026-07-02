import json
import re

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            if step == 5103:
                content = data.get('content', '')
                matches = re.findall(r'^(\d+):\s(.*)$', content, re.MULTILINE)
                if matches:
                    print(f"Step 5103: Extracted {len(matches)} lines")
                    with open('/Users/onkarbhople/nyvron/frontend/_recovered/app_5103_1_800.js', 'w') as out:
                        for i in range(min(int(m[0]) for m in matches), max(int(m[0]) for m in matches)+1):
                            line_content = next((m[1] for m in matches if int(m[0]) == i), "")
                            out.write(line_content + "\n")
        except Exception as e:
            pass
