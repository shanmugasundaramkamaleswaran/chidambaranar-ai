# Audio Call Test

This is a completely isolated proof-of-concept audio call app built to validate real-time two-way microphone audio between two browser sessions.

## Requirements

- Node.js
- A modern browser with microphone access

## Start the signaling server

```bash
cd audio-call-test/server
npm install
node server.js
```

The server runs at:

http://localhost:3001

## Serve the client

Open a local static file server from the client folder, for example:

```bash
cd audio-call-test/client
python -m http.server 5500
```

Then open:

http://localhost:5500/

## Test flow

Use two separate browser tabs or windows.

### Window 1
- Name: Employee
- Role: Employee
- Room ID: TEST123

### Window 2
- Name: Psychologist
- Role: Psychologist
- Room ID: TEST123

Expected behavior:

1. Both users join the same room.
2. The first participant becomes the offerer.
3. The second participant becomes the answerer.
4. WebRTC offer/answer negotiation runs over Socket.IO.
5. ICE candidates are exchanged.
6. The remote audio stream is attached and the audio plays.
7. Employee hears Psychologist.
8. Psychologist hears Employee.

## Notes

- The server only handles signaling. It never handles audio directly.
- This app does not use the existing CHIDAMBARANAR AI code.
- It is intentionally isolated to prove the real WebRTC audio path works.
