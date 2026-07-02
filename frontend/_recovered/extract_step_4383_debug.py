import json

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript.jsonl'

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index')
            if step is not None and abs(int(step) - 4383) < 5:
                print(f"Step {step}: type={data.get('type')}, status={data.get('status')}")
                if 'content' in data:
                    print("Content is present")
                    # print first 500 characters
                    print(data['content'][:500])
                    print("="*40)
        except Exception as e:
            pass
