import os
import json
from datetime import datetime
import shutil

history_dirs = [
    "/Users/onkarbhople/Library/Application Support/Code/User/History",
    "/Users/onkarbhople/Library/Application Support/Cursor/User/History"
]
dest_dir = "/Users/onkarbhople/nyvron/frontend/_recovered/history"
os.makedirs(dest_dir, exist_ok=True)

found_entries = []

for history_dir in history_dirs:
    if os.path.exists(history_dir):
        print(f"Scanning {history_dir}...")
        for root, dirs, files in os.walk(history_dir):
            if "entries.json" in files:
                entries_path = os.path.join(root, "entries.json")
                try:
                    with open(entries_path, 'r') as f:
                        data = json.load(f)
                        resource = data.get("resource", "")
                        if "app.js" in resource or "index.html" in resource or "styles.css" in resource:
                            entries = data.get("entries", [])
                            for entry in entries:
                                ts = entry.get("timestamp", 0)
                                id_val = entry.get("id", "")
                                dt = datetime.fromtimestamp(ts / 1000.0)
                                
                                hist_file_path = os.path.join(root, id_val)
                                if os.path.exists(hist_file_path):
                                    size = os.path.getsize(hist_file_path)
                                    found_entries.append({
                                        "timestamp": ts,
                                        "datetime": dt.strftime('%Y-%m-%d %H:%M:%S'),
                                        "resource": resource,
                                        "hist_file_path": hist_file_path,
                                        "size": size,
                                        "id": id_val,
                                        "source": "Cursor" if "Cursor" in history_dir else "VSCode"
                                    })
                except Exception as e:
                    pass

print(f"Total entries found: {len(found_entries)}")
found_entries.sort(key=lambda x: x["timestamp"], reverse=True)

# Copy the latest 40 entries
for idx, entry in enumerate(found_entries[:40]):
    res_name = os.path.basename(entry["resource"])
    clean_date = entry["datetime"].replace(" ", "_").replace(":", "-")
    new_name = f"{idx:02d}_{entry['source']}_{res_name}_{clean_date}_{entry['size']}bytes"
    shutil.copy2(entry["hist_file_path"], os.path.join(dest_dir, new_name))
    print(f"Copied: {new_name} from {entry['datetime']} ({entry['size']} bytes) - {entry['resource']}")
