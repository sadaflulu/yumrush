"""
YumRush - Arcade Food Catching Browser Game
Backend Server powered by Flask

This script serves the YumRush game webpage and static assets.
Game mechanics run smoothly in the browser using HTML5, CSS3, and JavaScript.
"""

import os
import sys
from flask import Flask, render_template, jsonify

# Initialize Flask application
app = Flask(__name__, template_folder='templates', static_folder='static')

# Application configuration
app.config['SECRET_KEY'] = 'yumrush-secret-arcade-key-2026'

@app.route('/')
def index():
    """
    Renders and serves the main YumRush game interface.
    """
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    """
    Simple health-check endpoint to verify backend service status.
    Returns status: ok and game metadata.
    """
    return jsonify({
        'status': 'ok',
        'game': 'YumRush',
        'version': '1.0.0',
        'description': 'YumRush browser arcade game backend is running happily!'
    })

@app.route('/favicon.ico')
def favicon():
    """
    Returns HTTP 204 No Content for favicon requests.
    """
    return ('', 204)

if __name__ == '__main__':
    # Running locally on http://127.0.0.1:5000
    host = '127.0.0.1'
    port = 5000
    print("=" * 60)
    print(" [YumRush] Arcade Food Catching Game Server Starting...")
    print(f" Local URL: http://{host}:{port}")
    print(" Press Ctrl+C in this terminal window to stop the server.")
    print("=" * 60)
    app.run(host=host, port=port, debug=False)
