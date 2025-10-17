// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyBOapljpGiHp36QJziAKkrtnNu_O0OvEac",
//   authDomain: "jelambi-chef.firebaseapp.com",
//   projectId: "jelambi-chef",
//   storageBucket: "jelambi-chef.firebasestorage.app",
//   messagingSenderId: "262049336341",
//   appId: "1:262049336341:web:9c00bee0a8c5443b38d21c",
//   measurementId: "G-ZP5EG1D1E8"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// REEMPLAZA ESTO CON LA CONFIGURACIÓN DE TU PROYECTO DE FIREBASE
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