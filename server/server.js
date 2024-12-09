const express = require("express");
const { connectToDatabase } = require("./utils/db");
const Student = require("./models/Student");

const app = express();

// Connexion à MongoDB
connectToDatabase();
app.use(express.json());

app.use("/", async (req, res) => {
    try {
      const students = await Student.find();
      res.status(200).json(students);
    } catch (error) {
      console.error("Erreur lors de la récupération des élèves :", error);
      res.status(500).json({ message: "Erreur lors de la récupération des élèves" });
    }
  });

app.listen(5000, () => {
  console.log("Serveur démarré sur le port 5000");
});
