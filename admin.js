const firebaseConfig = {
  apiKey: "AIzaSyBOapljpGiHp36QJziAKkrtnNu_O0OvEac",
  authDomain: "jelambi-chef.firebaseapp.com",
  projectId: "jelambi-chef",
  storageBucket: "jelambi-chef.firebasestorage.app",
  messagingSenderId: "262049336341",
  appId: "1:262049336341:web:9c00bee0a8c5443b38d21c",
  measurementId: "G-ZP5EG1D1E8"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Nuestra conexión a la base de datos Firestore