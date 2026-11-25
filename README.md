# Barrier
Open public/index.html directly for 1 vs CPU, How to Play and Settings.

## Host an online duel
Use Node.js 22.13+ or 24. From the extracted Barrier directory run:

    node server/local.mjs

Open http://localhost:8080. On the same Wi-Fi, a friend can use the host computer's LAN address and port 8080. For internet play, deploy this Node process with an HTTPS URL accessible to both players. Set PORT for the listening port and BARRIER_DB for a writable SQLite path if desired. No npm packages are needed. A static-only host supports CPU play; online play uses the included room server.

Choose Play Online, then Create Room. Share the invite link or 12-character room code. Your friend chooses Join Room. When both seats are occupied the host chooses Start Round. Returning to the menu closes the room. Refreshing the page in the same tab restores the seat. Inactive rooms expire after two hours.

Arrow keys, WASD, swipe or the direction pad steer the rider. Crossing either trail, a barrier or the boundary ends the round. A simultaneous crash is a draw.
