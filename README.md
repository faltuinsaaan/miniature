# Miniature Studio - Cozy 3D Room Builder diorama 🌿

An interactive, web-based 3D diorama designer for building cozy miniature rooms and environments using a catalog of stylized, procedurally modeled digital blocks.

Try designing your own diorama by running a local server and opening `index.html`!

## ✨ Features
* **Modular Room Builder**: Grid snapping (0.5 units) and vertical stacking support. Hover over any block/surface to see a placement preview.
* **📦 Pick Up & Move (`M`)**: Reposition already-placed blocks. Select any block in the diorama and press `M` (or click **Pick Up & Move** in the Properties panel) to detach the block and move it. Press `Esc` to cancel and return the block to its original position.
* **🔄 Robust 45° Snapped Rotation (`R` / `Q`)**: Rotate blocks in 45-degree increments (8 directional angles) to place furniture diagonally:
  - Press **`R`** to rotate clockwise.
  - Press **`Q`** (or **`Shift + R`**) to rotate counter-clockwise.
  - Or use the **Rotation Angle** slider in the properties panel to adjust orientation dynamically.
* **Procedural 3D Assets**: Handcrafted models constructed entirely from Three.js primitives (walls with gardens, flooring, tea counters, bookcases, tables, lighting, and a herald trumpet *White Rabbit* figure).
* **Dynamic Texture Generators**: Materials (wood planks, checkered tiles, Roman numeral clock face, wallpapers) drawn programmatically onto 2D canvas layers.
* **Web Audio Synthesizer**: Organic retro sound effects (placement clops, glass clinks, sweep deletions, and arpeggios) synthesized natively.
* **Animated Day/Night Cycle**: Blends warm solar lighting into cozy moonlit ambient fog and activates placed warm point-light lanterns.
* **Scene Templates**: Includes presets like *Alice's Tea Corner* diorama. Automatically saves and loads your scene using `localStorage`.
* **Polaroid Exporter**: Renders the scene and frame captures into a retro Polaroid photo download.

## 🚀 How to Run Standalone
1. **Clone this repository**:
   ```bash
   git clone https://github.com/faltuinsaaan/miniature.git
   cd miniature
   ```
2. **Launch a local server** (e.g. using Python, Node, or VS Code Live Server):
   ```bash
   # Python 3 (macOS Native)
   python3 -m http.server 8000
   
   # Node.js (http-server)
   npx http-server -p 8000
   ```
3. Open **`http://localhost:8000`** in your browser.

## 🛠️ Tech Stack
* Core Engine: **Three.js** (loaded via unpkg CDN Import Maps)
* Camera Control: **OrbitControls**
* Styling: **Vanilla CSS Glassmorphism**
* Audio: **Web Audio API**
