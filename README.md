# 🍔 YumRush - Arcade Food Catching Game

A fast-paced, colourful browser arcade game built with **Python (Flask)** on the backend and **HTML5, CSS3, and Vanilla JavaScript** on the frontend.

---

## 🎮 Game Overview

Catch mouth-watering treats falling from the sky into your chef's basket before they hit the ground! 
Survive the **120-second rush**, climb through multiple difficulty levels, and set a new personal best score.

### Key Features
- **Modern Arcade Presentation:** Vibrant retro-modern design, smooth 60fps HTML5 Canvas physics, high-DPI retina display support, and fluid animations.
- **Dynamic Food Types:**
  - 🍎 **Fresh Apple:** 10 points
  - 🍟 **Crispy Fries:** 15 points
  - 🍔 **Mega Burger:** 20 points
  - 🍕 **Cheesy Pizza:** 25 points
  - 🌮 **Spicy Taco:** 30 points
  - 🧁 **Chef's Golden Cupcake (Bonus):** 50 points (sparkling aura & extra points!)
- **Lives & Difficulty Scaling:** Start with 3 lives. Dropping an item costs 1 life. As your score grows, levels advance with increased fall speed and spawn frequency.
- **Accurate 120-Second Countdown:** Uses timestamp-based elapsed time (never drifts when paused or between animation frames).
- **Pause & Resume:** Press `Esc` or click the Pause button to freeze gameplay, falling items, and the timer.
- **Persistent Personal Best:** Automatically tracks and saves your all-time high score and highest level in your browser's `localStorage` (never overwritten by a lower score).
- **Lag-Free Synthesized Audio:** Uses the native Web Audio API to create retro arcade sound effects for catches, misses, level-ups, and game over without downloading external sound files. Includes a global mute switch.
- **Touch & Mouse Friendly:** Responsive controls tailored for desktop keyboards, mouse dragging, and mobile touch screens.

---

## 📁 Project Structure

```text
YumRush/
├── .venv/                   # Python virtual environment (ignored in git)
├── .gitignore               # Standard git ignore rules
├── app.py                   # Lightweight Flask backend server
├── requirements.txt         # Project dependencies (Flask)
├── README.md                # Documentation and setup guide
├── templates/
│   └── index.html           # Main game interface and HUD overlays
└── static/
    ├── css/
    │   └── style.css        # Arcade styling, responsive layout, and animations
    └── js/
        ├── audio.js         # Web Audio API sound synthesizer
        └── game.js          # Game loop, collision detection, and canvas physics
```

---

## 🚀 Setup & Running Instructions (Windows 11)

Follow these simple steps in **Windows PowerShell**:

### 1. Open Windows PowerShell and Navigate to the Project Folder
```powershell
cd C:\Users\user\.gemini\antigravity\scratch\YumRush
```

### 2. Create the Python Virtual Environment
*(If not already created)*
```powershell
python -m venv .venv
```

### 3. Activate the Virtual Environment
```powershell
.\.venv\Scripts\Activate.ps1
```
> **Note:** If PowerShell displays an execution policy error, run:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and retry.

### 4. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 5. Launch the Flask Game Server
```powershell
python app.py
```

### 6. Play the Game!
Open your browser and navigate to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

### 7. How to Stop the Server
When you are done playing, return to the PowerShell window and press **`Ctrl + C`**.

---

## 🕹️ Controls

| Action | Keyboard | Mouse / Touchscreen |
| :--- | :--- | :--- |
| **Move Basket Left** | `⬅️` Left Arrow or `A` | Drag cursor / finger left, or tap `⬅️` button |
| **Move Basket Right** | `➡️` Right Arrow or `D` | Drag cursor / finger right, or tap `➡️` button |
| **Pause / Resume** | `Esc` key | Click `⏸️` button in top HUD |
| **Mute / Unmute** | N/A | Click `🔊` button in HUD or menu |

---

## 🔧 Technical Details & Design Decisions

1. **Client-Side Physics & Rendering:**
   Food falling physics, basket movement, and collision detection run directly on the client using `requestAnimationFrame`. This guarantees 60fps performance without network latency.
2. **Accurate Non-Drifting Timer:**
   Rather than decrementing a counter on each frame (which runs faster or slower depending on display refresh rates), the timer calculates `Date.now() - gameStartTime - pausedDuration`. When paused, time is frozen accurately.
3. **Collision Safety:**
   Items are assigned a `collected: true` flag the instant a collision is verified, preventing double-counting or multi-hit glitches.
4. **Web Audio API:**
   All sound effects are synthesized mathematically in `audio.js` using oscillators and gain envelopes. No external sound assets are needed, preventing 404 errors or slow downloads.
5. **Offline & Privacy Friendly:**
   Zero external trackers, zero cloud accounts, and zero paid APIs.

---

## 🛠️ Troubleshooting

- **Port 5000 already in use?**
  Open `app.py` and change `port=5000` to `port=5001`, then access `http://127.0.0.1:5001`.
- **Audio isn't playing?**
  Modern browsers block audio until the user clicks anywhere on the webpage. Click the "Play Now" or "Sound" button to enable sound.
- **High score didn't save?**
  Make sure your browser is not in strict Incognito mode with local storage disabled.
