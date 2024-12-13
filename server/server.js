const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const { parse, isValid, format } = require("date-fns");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const StudentCollection = require("./models/Student");
const ClassCollection = require("./models/Class");
const getClassForStudent = require("./utils/getClassForStudent");
const isPreinscrit = require("./utils/isPreinscrit");
const { fr } = require("date-fns/locale");

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
  .connect("mongodb://localhost:27017/4DEVS")
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

// Endpoint pour récupérer les élèves par classe
app.get("/api/classes", async (req, res) => {
  try {
    const classes = await ClassCollection.find().populate({
      path: "students",
      model: "Student", // Assurez-vous que le modèle est correct
    });

    res.status(200).json(classes);
  } catch (error) {
    console.error("Erreur lors de la récupération des classes :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Endpoint pour récupérer les préinscrits
app.get("/api/preinscrits", async (req, res) => {
  const currentYear = new Date().getFullYear();
  const dateRentree = req.query.dateRentrée || `${currentYear}-09-01`; // Utilise la date de rentrée envoyée par le client, ou une valeur par défaut

  try {
    // Récupérer tous les étudiants (préinscrits) de la base de données
    const preinscrits = await StudentCollection.find();

    // Filtrer les étudiants pour obtenir uniquement ceux qui sont préinscrits
    const filteredPreinscrits = preinscrits.filter((student) =>
      isPreinscrit(student.dateDeNaissance, dateRentree)
    );

    // Renvoie la liste des préinscrits filtrée
    res.status(200).json(filteredPreinscrits);
  } catch (error) {
    console.error("Erreur lors de la récupération des préinscrits :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Endpoint pour enregistrer les préinscrits
app.post("/api/preinscrits", upload.single("preinscrit"), async (req, res) => {
  console.log(req.file); // Vérifier ce qui est reçu

  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu." });
  }

  try {
    const preinscritFile = req.file.buffer.toString("utf-8");
    // console.log("Contenu du fichier:", preinscritFile); // Affichez le contenu du fichier

    const lines = preinscritFile.split("\n");
    const students = [];

    // Traitement du fichier texte comme avant
    for (const line of lines) {
      const parts = line.trim().split(" ");
      if (parts.length >= 5) {
        const nom = parts[0];
        const prenom = parts[1];
        const dateDeNaissanceStr = parts.slice(2).join(" ");

        try {
          const dateDeNaissance = parse(
            dateDeNaissanceStr,
            "dd MMMM yyyy",
            new Date(),
            { locale: fr }
          );

          if (isValid(dateDeNaissance)) {
            students.push({
              nom,
              prenom,
              dateDeNaissance: dateDeNaissance.toISOString(),
            });
          } else {
            console.error(`Date invalide : ${dateDeNaissanceStr}`);
          }
        } catch (dateError) {
          console.error(
            `Erreur lors du parsing de la date : ${dateDeNaissanceStr}`,
            dateError
          );
        }
      } else {
        console.error(`Ligne incorrecte : ${line}`);
      }
    }

    const savedPreinscrit = await StudentCollection.insertMany(students);

    res.status(200).json({
      message: "Préinscrits enregistrés avec succès",
      students: savedPreinscrit,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des préinscrits :", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement des préinscrits",
      error: error.message,
    });
  }
});

// Endpoint pour enregistrer les élèves
app.post("/api/students", async (req, res) => {
  const { students } = req.body;
  const currentYear = new Date().getFullYear();
  const dateRentree = req.body.dateRentree || `${currentYear}-09-01`;

  if (!students || students.length === 0) {
    return res.status(400).json({ message: "Aucun élève à enregistrer." });
  }

  try {
    const savedStudents = [];
    for (const student of students) {
      const existingStudent = await StudentCollection.findOne({
        nom: student.nom,
        prenom: student.prenom,
        dateDeNaissance: student.dateDeNaissance,
      });
      if (existingStudent) continue;

      const newStudent = new StudentCollection(student);
      const savedStudent = await newStudent.save();
      savedStudents.push(savedStudent);

      const className = getClassForStudent(
        student.dateDeNaissance,
        dateRentree
      );
      let classCollection = await ClassCollection.findOne({
        classe: className,
      });

      if (!classCollection) {
        classCollection = new ClassCollection({
          classe: className,
          students: [],
        });
      }

      if (!classCollection.students.includes(savedStudent._id)) {
        classCollection.students.push(savedStudent._id);
        await classCollection.save();
      }
    }

    res.status(200).json({
      message: "Élèves enregistrés avec succès.",
      students: savedStudents,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Erreur serveur lors de l'enregistrement des élèves." });
  }
});

// Endpoint pour mettre à jour les classes selon les redoublants
app.post("/api/update-classes", async (req, res) => {
  const { redoublants } = req.body; // Liste des élèves redoublants (avec nom, prénom, dateDeNaissance)

  try {
    // Vérifie si redoublants est défini et non vide
    if (!Array.isArray(redoublants) || redoublants.length === 0) {
      return res.status(400).json({ message: "Aucun redoublant spécifié" });
    }

    // Créer un set des redoublants avec _id pour un accès rapide
    const redoublantsSet = new Set();

    for (let student of redoublants) {
      const { nom, prenom, dateDeNaissance } = student;

      // Recherche de l'élève dans la base de données par nom, prénom et date de naissance
      const existingStudent = await StudentCollection.findOne({
        nom: nom,
        prenom: prenom,
        dateDeNaissance: dateDeNaissance,
      });

      // Si l'élève est trouvé, on l'ajoute au set avec son _id
      if (existingStudent) {
        redoublantsSet.add(existingStudent._id.toString());
      } else {
        console.log(`Élève non trouvé: ${nom} ${prenom}`);
      }
    }

    // console.log("Redoublants Set :", redoublantsSet);

    // Définir l'ordre des classes
    const order = [
      "Petite section",
      "Moyenne section",
      "Grande section",
      "CP",
      "CE1",
      "CE2",
      "CM1",
      "CM2",
    ];

    // Itérer sur toutes les classes
    for (let i = 0; i < order.length; i++) {
      const currentClassName = order[i];
      const nextClassName = order[i + 1] || null;

      // Récupérer la classe actuelle
      const currentClass = await ClassCollection.findOne({
        classe: currentClassName,
      }).populate("students");

      if (!currentClass) continue;

      // console.log("Classe actuelle :", currentClass);
      // console.log("Élèves dans la classe actuelle :", currentClass.students);

      // Boucler sur tous les étudiants de la classe
      for (let student of currentClass.students) {
        // Vérifier si l'étudiant est un redoublant
        if (redoublantsSet.has(student._id.toString())) {
          // L'étudiant est un redoublant : il reste dans la même classe
          continue;
        } else {
          // L'étudiant n'est pas un redoublant : il passe à la classe suivante
          if (nextClassName) {
            // Récupérer la classe suivante
            const nextClass = await ClassCollection.findOne({
              classe: nextClassName,
            }).populate("students");

            // console.log("Classe suivante :", nextClass);

            if (nextClass) {
              // Ajouter l'étudiant à la classe suivante (s'il n'est pas déjà dedans)
              const nextClassStudentIds = nextClass.students.map((student) =>
                student._id.toString()
              );

              if (!nextClassStudentIds.includes(student._id.toString())) {
                await ClassCollection.findOneAndUpdate(
                  { _id: nextClass._id },
                  { $push: { students: student } }
                );
              }
            }

            // Retirer l'étudiant de la classe actuelle après l'avoir ajouté à la suivante
            await ClassCollection.findOneAndUpdate(
              { _id: currentClass._id },
              { $pull: { students: student._id } }
            );
          }
        }
      }
    }

    // Retirer les élèves non redoublants de la dernière classe (CM2)
    const lastClass = await ClassCollection.findOne({ classe: "CM2" }).populate(
      "students"
    );
    if (lastClass) {
      for (let student of lastClass.students) {
        if (!redoublantsSet.has(student._id.toString())) {
          await ClassCollection.findOneAndUpdate(
            { _id: lastClass._id },
            { $pull: { students: student._id } }
          );
        }
      }
    }

    res.status(200).json({ message: "Mise à jour des classes effectuée." });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des classes :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});


// Lancer le serveur
app.listen(5000, () => {
  console.log("Serveur démarré sur http://localhost:5000");
});
