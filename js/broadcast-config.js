// Firebase setup for cross-device broadcast.
// Uses firebase compat scripts from index.html (not ES modules).

export const BROADCAST_CONFIG = {
  enabled: true,
  adminPin: "cis2026",
  broadcastDoc: "latest",
  subscribersCollection: "cis_subscribers",
  broadcastsCollection: "cis_broadcasts",
  firebase: {
    apiKey: "AIzaSyCzjfP5yHWgI1Vi4IpOlGoPGiEXPpqTs5M",
    authDomain: "cis-my-routine.firebaseapp.com",
    projectId: "cis-my-routine",
    storageBucket: "cis-my-routine.firebasestorage.app",
    messagingSenderId: "178368542692",
    appId: "1:178368542692:web:472150a07e3f1a58d039f1",
    measurementId: "G-V9E9S2Y9ZV",
  },
};
