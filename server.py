import json
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
import os

DB_PATH = "Data.db"

# Ensure table exists
conn = sqlite3.connect(DB_PATH)
conn.execute("""
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    name TEXT,
    text TEXT,
    likes INTEGER DEFAULT 0,
    timestamp INTEGER
)
""")
conn.commit()
conn.close()

class Handler(BaseHTTPRequestHandler):

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/comments":
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM comments ORDER BY likes DESC, timestamp DESC"
            ).fetchall()
            conn.close()
            self._send_json([dict(row) for row in rows])
            return

        if self.path == "/" or self.path == "/index.html":
            file = "index.html"
        else:
            file = self.path.lstrip("/")

        if os.path.exists(file):
            self.send_response(200)
            if file.endswith(".css"):
                self.send_header("Content-Type", "text/css")
            elif file.endswith(".js"):
                self.send_header("Content-Type", "application/javascript")
            else:
                self.send_header("Content-Type", "text/html")
            self.end_headers()
            with open(file, "rb") as f:
                self.wfile.write(f.read())
        else:
            self._send_json({"error": "File not found"}, 404)

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        if self.path == "/api/comments":
            conn = sqlite3.connect(DB_PATH)
            conn.execute(
                "INSERT INTO comments(id, name, text, likes, timestamp) VALUES (?, ?, ?, ?, ?)",
                (body["id"], body["name"], body["text"], 0, body["timestamp"])
            )
            conn.commit()
            conn.close()
            self._send_json({"success": True})
            return

        if self.path == "/api/like":
            comment_id = body["id"]
            action = body.get("action", "like")
            conn = sqlite3.connect(DB_PATH)
            if action == "like":
                conn.execute("UPDATE comments SET likes = likes + 1 WHERE id = ?", (comment_id,))
            elif action == "unlike":
                conn.execute("UPDATE comments SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END WHERE id = ?", (comment_id,))
            conn.commit()
            conn.close()
            self._send_json({"success": True})
            return

print("Server running at http://localhost:5000")
HTTPServer(("0.0.0.0", 5000), Handler).serve_forever()
