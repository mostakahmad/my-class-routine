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

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional



const BROADCAST_CONFIG = {
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
    measurementId: "G-V9E9S2Y9ZV"
  },
};


// const firebaseConfig = {
//   apiKey: "AIzaSyCzjfP5yHWgI1Vi4IpOlGoPGiEXPpqTs5M",
//   authDomain: "cis-my-routine.firebaseapp.com",
//   projectId: "cis-my-routine",
//   storageBucket: "cis-my-routine.firebasestorage.app",
//   messagingSenderId: "178368542692",
//   appId: "1:178368542692:web:472150a07e3f1a58d039f1",
//   measurementId: "G-V9E9S2Y9ZV"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);