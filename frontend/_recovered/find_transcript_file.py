import os

logs_dir = "/Users/onkarbhople/.gemini/antigravity/brain/7bd73408-4ade-4316-ab10-48a7a15803ac/.system_generated/logs"
if os.path.exists(logs_dir):
    print("Logs dir exists. Files:")
    for f in os.listdir(logs_dir):
        print(f, os.path.getsize(os.path.join(logs_dir, f)))
else:
    print("Logs dir does not exist")
