import json
import re

transcript_path = '/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs/transcript_full.jsonl'
output_app_js = '/Users/onkarbhople/nyvron/frontend/_recovered/full_recovered_app.js'

with open(transcript_path, 'r') as f:
    for line_idx, line in enumerate(f):
        try:
            data = json.loads(line)
            step = data.get('step_index', 0)
            
            # Look for write_to_file or replace_file_content calls containing app.js
            type_ = data.get('type')
            status = data.get('status')
            
            # Check model responses (tool calls)
            if type_ == 'PLANNER_RESPONSE' and data.get('tool_calls'):
                for tool in data['tool_calls']:
                    name = tool.get('name')
                    args = tool.get('args', {})
                    if isinstance(args, str):
                        continue
                    
                    target = args.get('TargetFile', '')
                    if 'app.js' in target:
                        # If it is a write_to_file call or replace_file_content with a large block
                        content = args.get('CodeContent', '') or args.get('ReplacementContent', '')
                        if content and len(content) > 50000:
                            print(f"Step {step}: Found large code write to app.js ({len(content)} bytes)")
                            with open(f"/Users/onkarbhople/nyvron/frontend/_recovered/app_step_{step}.js", "w") as out:
                                out.write(content)
                                
            # Check system outputs (views of file)
            if status == 'DONE' and data.get('content'):
                content = data.get('content', '')
                if 'app.js' in content and 'File Path:' in content:
                    # Check if it contains line numbers and looks like a full file view
                    matches = re.findall(r'^(\d+):\s(.*)$', content, re.MULTILINE)
                    if len(matches) > 1000:
                        print(f"Step {step}: Found large file view of app.js ({len(matches)} lines)")
                        lines = [None] * (max(int(m[0]) for m in matches) + 1)
                        for m in matches:
                            lines[int(m[0])] = m[1]
                        
                        # Stitch together
                        full_code = []
                        for i in range(1, len(lines)):
                            if lines[i] is not None:
                                full_code.append(lines[i])
                            else:
                                full_code.append("")
                        
                        with open(f"/Users/onkarbhople/nyvron/frontend/_recovered/app_view_step_{step}.js", "w") as out:
                            out.write("\n".join(full_code))
                            
        except Exception as e:
            pass

print("Scan complete.")
