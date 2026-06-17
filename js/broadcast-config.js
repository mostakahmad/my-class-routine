// Firebase setup for cross-device broadcast.
// 1. Create a free Firebase project: https://console.firebase.google.com
// 2. Enable Firestore (test mode or rules below)
// 3. Paste your web app config below and set enabled: true
//
// Firestore rules (example):
//   match /databases/{database}/documents {
//     match /cis_broadcasts/{doc} {
//       allow read: if true;
//       allow write: if request.resource.data.adminPin == "YOUR_PIN";
//     }
//     match /cis_subscribers/{id} {
//       allow read: if true;
//       allow create, update: if true;
//     }
//   }

const BROADCAST_CONFIG = {
  enabled: false,
  adminPin: "cis2026",
  broadcastDoc: "latest",
  subscribersCollection: "cis_subscribers",
  broadcastsCollection: "cis_broadcasts",
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
