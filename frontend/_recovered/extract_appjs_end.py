import json

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript_full.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            if step >= 4800 and step <= 5200:
                content = data.get('content', '')
                if 'app.js' in content and 'File Path:' in content:
                    print(f"Step {step}: Found view of app.js")
                    # print first 2 lines and last 2 lines
                    lines = content.split('\n')
                    print("\n".join(lines[:10]))
                    print("...")
                    print("\n".join(lines[-15:]))
                    print("="*40)
        except:
            pass
