const mongoose = require("mongoose");

const MONGO_URI =
  "mongodb://student:student@localhost:27017/4DEVS?authSource=admin";

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    console.log("Déjà connecté à MongoDB.");
    return; // Si déjà connecté, ne rien faire
  }
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log("Connecté à MongoDB avec Mongoose");
  } catch (error) {
    console.error("Erreur de connexion à MongoDB:", error);
    process.exit(1); // Quitter le processus en cas d'échec de connexion
  }
}

module.exports = { connectToDatabase };
