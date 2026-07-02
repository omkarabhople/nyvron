import json

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript_full.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            if data.get('type') == 'VIEW_FILE' and data.get('status') == 'DONE':
                content = data.get('content', '')
                if 'app.js' in content and 'File Path:' in content:
                    # extract the line ranges
                    # e.g. "Showing lines 1 to 100"
                    import re
                    match = re.search(r"Showing lines (\d+) to (\d+)", content)
                    if match:
                        print(f"Step {step}: Viewed app.js lines {match.group(1)} to {match.group(2)}")
                    else:
                        print(f"Step {step}: Viewed app.js (no line range match)")
        except:
            pass
