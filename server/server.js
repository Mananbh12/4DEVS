const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const { parse, isValid, format } = require("date-fns");
const upload = multer({ dest: "uploads/" });
const Student = require("./models/Student");
const ClassCollection = require("./models/ClassCollection");
const getClassForStudent = require("./utils/getClassForStudent");

const app = express();
app.use(cors());
app.use(express.json());

const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,POST",
  allowedHeaders: "Content-Type",
};

// Connexion à MongoDB
mongoose
  .connect("mongodb://localhost:27017/4DEVS", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connecté à MongoDB"))
  .catch((error) => console.log("Erreur de connexion à MongoDB", error));

function getNextClass(currentClass) {
  const classes = [
    "Petite Section",
    "Moyenne Section",
    "Grande Section",
    "CP",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
  ];
  const index = classes.indexOf(currentClass);
  return index >= 0 && index < classes.length - 1 ? classes[index + 1] : null;
}

// Endpoint pour enregistrer les élèves
app.post("/api/students", async (req, res) => {
  const students = req.body.students;

  // Définir une date de rentrée par défaut si elle n'est pas spécifiée
  const currentYear = new Date().getFullYear();
  const defaultDateRentrée = `${currentYear}-09-01`; // 1er septembre de l'année en cours
  const dateRentrée = req.body.dateRentrée || defaultDateRentrée;

  try {
    if (!students || students.length === 0) {
      return res.status(400).json({ message: "Aucun élève à enregistrer." });
    }
    console.log("Données des étudiants reçues :", students);

    // Enregistrement des élèves dans la collection `students`
    const savedStudents = await Student.insertMany(students);
    console.log("Élèves enregistrés :", savedStudents);

    // Gestion des classes : Ajout des élèves dans les collections de classes appropriées
    for (const student of savedStudents) {
      const className = getClassForStudent(
        student.dateDeNaissance,
        dateRentrée
      ); // Calcul de la classe de l'élève

      // Vérifiez si la collection de la classe existe
      let classCollection = await ClassCollection.findOne({
        classe: className,
      });

      if (!classCollection) {
        // Si la classe n'existe pas, créez-la
        classCollection = new ClassCollection({
          classe: className,
          students: [],
        });
      }

      // Ajoutez l'ID de l'élève à la liste des étudiants de la classe
      classCollection.students.push(student._id);
      await classCollection.save();
    }

    res.status(200).json({
      message: "Élèves enregistrés avec succès",
      students: savedStudents,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des élèves :", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement des élèves",
      error: error.message,
    });
  }
});

app.post("/api/update-year", upload.single("redoublants"), async (req, res) => {
  console.log("Fichier reçu :", req.file); // Vérification du fichier

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier fourni." });
    }

    const redoublantsFilePath = req.file.path;
    const redoublants = [];

    fs.createReadStream(redoublantsFilePath)
      .pipe(csv())
      .on("data", (data) => {
        console.log("Row received:", data);

        const rawDate = data["Date de naissance"];
        try {
          const parsedDate = parse(rawDate, "dd/MM/yyyy", new Date());
          if (isValid(parsedDate)) {
            data.dateDeNaissance = format(parsedDate, "yyyy-MM-dd");
          } else {
            console.error("Date invalide pour :", data);
            data.dateDeNaissance = null;
          }
        } catch (error) {
          console.error("Erreur de parsing de date :", error);
          data.dateDeNaissance = null;
        }

        // Ajoutez uniquement si les données sont valides
        if (data.Nom && data.Prenom && data.dateDeNaissance) {
          redoublants.push({
            nom: data.Nom,
            prenom: data.Prenom,
            dateDeNaissance: data.dateDeNaissance,
          });
        }
      })
      .on("end", async () => {
        try {
          if (redoublants.length === 0) {
            return res
              .status(400)
              .json({
                error: "Le fichier CSV ne contient aucune donnée valide.",
              });
          }

          console.log("Redoublants à traiter :", redoublants);

          for (const redoublant of redoublants) {
            // Trouver l'élève existant ou en créer un
            let student = await Student.findOne({
              nom: redoublant.nom,
              prenom: redoublant.prenom,
              dateDeNaissance: new Date(redoublant.dateDeNaissance),
            });

            if (!student) {
              student = new Student(redoublant);
              await student.save();
            }

            // Calculer la classe actuelle
            const currentClass = getClassForStudent(
              student.dateDeNaissance,
              new Date()
            );

            // Ajouter l'élève à sa classe
            let classCollection = await ClassCollection.findOne({
              classe: currentClass,
            });

            if (!classCollection) {
              classCollection = new ClassCollection({
                classe: currentClass,
                students: [],
              });
            }

            if (!classCollection.students.includes(student._id)) {
              classCollection.students.push(student._id);
              await classCollection.save();
            }
          }

          res.status(200).json({
            message: "Redoublants traités avec succès",
            redoublants,
          });
        } catch (error) {
          console.error("Erreur lors du traitement des redoublants :", error);
          res.status(500).json({ error: "Erreur interne du serveur." });
        }
      });
  } catch (error) {
    console.error("Erreur lors du traitement du fichier :", error);
    res.status(500).json({ error: "Erreur lors du traitement du fichier." });
  }
});

// Lancer le serveur
app.listen(5000, () => {
  console.log("Serveur démarré sur http://localhost:5000");
});
