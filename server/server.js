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
const { fr } = require('date-fns/locale');

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

// Endpoint pour enregistrer les préinscrits
app.post("/api/preinscrit", async (req, res) => {
  const preinscritFile = req.body.preinscrit; // Recevez le fichier au format texte
  console.log("Entrée POST");

  try {
    if (!preinscritFile) {
      console.log("Aucun fichier reçu.");
      return res.status(400).json({ message: "Aucun fichier reçu." });
    }

    console.log("Fichier reçu :", preinscritFile);

    // Convertir le fichier texte en JSON
    const lines = preinscritFile.split("\n");
    console.log("Lignes découpées :", lines);

    const students = [];

    for (const line of lines) {
      const parts = line.trim().split(" ");
      console.log("Parties découpées de la ligne :", parts);

      if (parts.length >= 5) {
        const nom = parts[0];
        const prenom = parts[1];
        const dateDeNaissanceStr = parts.slice(2).join(" ");

        try {
          // Conversion de la date
          const dateDeNaissance = parse(dateDeNaissanceStr, 'dd MMMM yyyy', new Date(), { locale: fr });

          if (isValid(dateDeNaissance)) {
            students.push({
              nom,
              prenom,
              dateDeNaissance: dateDeNaissance.toISOString(),
            });
            console.log(`Étudiant ajouté : ${nom} ${prenom} - Date de naissance : ${dateDeNaissanceStr}`);
          } else {
            console.error(`Date invalide : ${dateDeNaissanceStr}`);
          }
        } catch (dateError) {
          console.error(`Erreur lors du parsing de la date : ${dateDeNaissanceStr}`, dateError);
        }
      } else {
        console.error(`Ligne incorrecte : ${line}`);
      }
    }

    // Enregistrement des préinscrits dans la collection `students`
    console.log("Enregistrement des étudiants en cours...");
    const savedPreinscrit = await Student.insertMany(students);
    console.log("Préinscrits enregistrés :", savedPreinscrit);

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
  const dateRentrée = req.body.dateRentrée || `${currentYear}-09-01`;

  if (!students || students.length === 0) {
    return res.status(400).json({ message: "Aucun élève à enregistrer." });
  }

  try {
    const savedStudents = [];
    for (const student of students) {
      const existingStudent = await Student.findOne({
        nom: student.nom,
        prenom: student.prenom,
        dateDeNaissance: student.dateDeNaissance,
      });
      if (existingStudent) continue;

      const newStudent = new Student(student);
      const savedStudent = await newStudent.save();
      savedStudents.push(savedStudent);

      const className = getClassForStudent(
        student.dateDeNaissance,
        dateRentrée
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

    res
      .status(200)
      .json({
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

// Endpoint pour récupérer les élèves par classe
app.get("/api/classes", async (req, res) => {
  try {
    const classes = await ClassCollection.find()
      .populate("students") // Assure que les IDs dans `students` sont remplacés par leurs documents complets
      .exec();

    res.status(200).json(classes);
  } catch (error) {
    console.error("Erreur lors de la récupération des classes :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.post("/api/update-year", upload.single("redoublants"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ error: "Fichier des redoublants non fourni." });
  }

  const redoublants = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      const rawDate = row["Date de naissance"];
      const parsedDate = parse(rawDate, "dd/MM/yyyy", new Date());
      if (isValid(parsedDate)) {
        redoublants.push({
          nom: row["Nom"],
          prenom: row["Prenom"],
          dateDeNaissance: format(parsedDate, "yyyy-MM-dd"),
        });
      }
    })
    .on("end", async () => {
      try {
        const processedStudents = [];
        for (const redoublant of redoublants) {
          let student = await Student.findOne({
            nom: redoublant.nom,
            prenom: redoublant.prenom,
            dateDeNaissance: new Date(redoublant.dateDeNaissance),
          });

          if (!student) {
            student = new Student(redoublant);
            await student.save();
          }

          const className = getClassForStudent(
            student.dateDeNaissance,
            new Date()
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

          if (!classCollection.students.includes(student._id)) {
            classCollection.students.push(student._id);
            await classCollection.save();
          }
          processedStudents.push(student);
        }

        const allStudents = await Student.find();
        const promotedStudents = allStudents.filter(
          (s) => !processedStudents.some((r) => r._id.equals(s._id))
        );

        for (const student of promotedStudents) {
          const currentClass = getClassForStudent(
            student.dateDeNaissance,
            new Date()
          );
          const nextClass = getNextClass(currentClass);
          if (nextClass) {
            let classCollection = await ClassCollection.findOne({
              classe: nextClass,
            });
            if (!classCollection) {
              classCollection = new ClassCollection({
                classe: nextClass,
                students: [],
              });
            }

            if (!classCollection.students.includes(student._id)) {
              classCollection.students.push(student._id);
              await classCollection.save();
            }
          }
        }

        res.status(200).json({ message: "Mise à jour effectuée." });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur." });
      }
    });
});

app.post("/api/validate-redoublants", async (req, res) => {
  try {
    const redoublants = req.body.redoublants;

    if (!redoublants || redoublants.length === 0) {
      return res.status(400).json({ message: "Aucun redoublant à valider." });
    }

    const validRedoublants = [];
    for (const redoublant of redoublants) {
      const { nom, prenom, dateDeNaissance } = redoublant;

      // Validation des champs obligatoires
      if (!nom || !prenom || !dateDeNaissance) {
        console.error(
          `Données invalides pour le redoublant: ${JSON.stringify(redoublant)}`
        );
        continue; // Ignorer ce redoublant
      }

      // Vérification du format de la date
      const parsedDate = new Date(dateDeNaissance);
      if (isNaN(parsedDate)) {
        console.error(`Date de naissance invalide : ${dateDeNaissance}`);
        continue; // Ignorer ce redoublant
      }

      // Recherche ou création de l'élève
      let student = await Student.findOne({
        nom,
        prenom,
        dateDeNaissance: parsedDate,
      });

      if (!student) {
        student = new Student({ nom, prenom, dateDeNaissance: parsedDate });
        await student.save();
      }

      validRedoublants.push(student);
    }

    res.status(200).json({
      message: "Redoublants validés et traités.",
      validRedoublants: validRedoublants.map((s) => ({
        nom: s.nom,
        prenom: s.prenom,
        dateDeNaissance: s.dateDeNaissance,
      })),
    });
  } catch (error) {
    console.error("Erreur lors de la validation des redoublants :", error);
    res.status(500).json({ message: "Erreur interne." });
  }
});

// Lancer le serveur
app.listen(5000, () => {
  console.log("Serveur démarré sur http://localhost:5000");
});
