import json
import re

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript_full.jsonl'

def extract_step_lines(target_step):
    with open(transcript_path, 'r') as f:
        for line in f:
            try:
                data = json.loads(line)
                step = data.get('step_index', 0)
                if step == target_step:
                    content = data.get('content', '')
                    matches = re.findall(r'^(\d+):\s(.*)$', content, re.MULTILINE)
                    if matches:
                        print(f"Step {step}: Extracted {len(matches)} lines")
                        return {int(m[0]): m[1] for m in matches}
            except Exception as e:
                pass
    return None

lines_5293 = extract_step_lines(5293)
if lines_5293:
    print(f"5293 min line: {min(lines_5293.keys())}, max line: {max(lines_5293.keys())}")
    with open('/Users/onkarbhople/nyvron/frontend/_recovered/app_5293_1_800.js', 'w') as out:
        for i in range(min(lines_5293.keys()), max(lines_5293.keys())+1):
            out.write(lines_5293.get(i, "") + "\n")

lines_5319 = extract_step_lines(5319)
if lines_5319:
    print(f"5319 min line: {min(lines_5319.keys())}, max line: {max(lines_5319.keys())}")
    with open('/Users/onkarbhople/nyvron/frontend/_recovered/app_5319_2080_2165.js', 'w') as out:
        for i in range(min(lines_5319.keys()), max(lines_5319.keys())+1):
            out.write(lines_5319.get(i, "") + "\n")
