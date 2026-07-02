import json

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            if step == 5103:
                print(f"Step 5103: keys={list(data.keys())}")
                if 'content' in data:
                    print("Content length:", len(data['content']))
                    print(data['content'][:2000])
        except Exception as e:
            pass
