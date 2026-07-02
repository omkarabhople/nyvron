#!/usr/bin/env python3
"""
Receiver server: accepts POST with page source from iPhone bookmarklet.
Saves everything to recovered_*.html/js/css files.
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import json, os, time

SAVE_DIR = "/Users/onkarbhople/nyvron/frontend/_recovered"
os.makedirs(SAVE_DIR, exist_ok=True)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        
        try:
            data = json.loads(body)
        except:
            data = {"raw": body}
        
        ts = int(time.time())
        
        if "html" in data and data["html"]:
            path = os.path.join(SAVE_DIR, f"recovered_page_{ts}.html")
            with open(path, "w") as f:
                f.write(data["html"])
            print(f"[SAVED] HTML -> {path} ({len(data['html'])} bytes)")
        
        if "js" in data and data["js"]:
            path = os.path.join(SAVE_DIR, f"recovered_app_{ts}.js")
            with open(path, "w") as f:
                f.write(data["js"])
            print(f"[SAVED] JS -> {path} ({len(data['js'])} bytes)")
        
        if "css" in data and data["css"]:
            path = os.path.join(SAVE_DIR, f"recovered_styles_{ts}.css")
            with open(path, "w") as f:
                f.write(data["css"])
            print(f"[SAVED] CSS -> {path} ({len(data['css'])} bytes)")
        
        if "raw" in data:
            path = os.path.join(SAVE_DIR, f"recovered_raw_{ts}.txt")
            with open(path, "w") as f:
                f.write(data["raw"])
            print(f"[SAVED] RAW -> {path}")
        
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(b"SAVED OK")
        
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>Receiver is running. Use the bookmarklet on your phone.</h1>")

print(f"Receiver running on http://0.0.0.0:9999")
print(f"Phone should POST to http://192.168.31.21:9999/save")
print(f"Files will be saved to {SAVE_DIR}")
HTTPServer(("0.0.0.0", 9999), Handler).serve_forever()
