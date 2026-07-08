with open('/Users/onkarbhople/nyvron/frontend/index.html', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if 'id="feature-slideshow"' in line:
        start_idx = i - 1 # include the comment
    if '</script>' in line and start_idx != -1 and i > start_idx + 100:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    new_content = """          <!-- Video Playing Features -->
          <div style="flex:1; width:100%; height:100%; overflow:hidden; border-radius: 12px;">
            <video autoplay loop muted playsinline style="width:100%; height:100%; object-fit:cover;">
              <source src="login_sample.mp4" type="video/mp4">
            </video>
          </div>
"""
    lines[start_idx:end_idx+1] = [new_content]
    with open('/Users/onkarbhople/nyvron/frontend/index.html', 'w') as f:
        f.writelines(lines)
    print("Replaced successfully.")
else:
    print(f"Could not find indices. Start: {start_idx}, End: {end_idx}")
