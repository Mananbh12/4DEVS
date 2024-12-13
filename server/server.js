const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const { parse, isValid, format } = require("date-fns");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Student = require("./models/Student");
const ClassCollection = require("./models/ClassCollection");
const getClassForStudent = require("./utils/getClassForStudent");
const { fr } = require('date-fns/locale');
const jwt = require("jsonwebtoken");
const isPreinscrit = require("./utils/isPreinscrit");



const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = "votre_clé_secrète"; // Clé utilisée pour signer et vérifier les tokens

// Définir un modèle pour les utilisateurs
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema, "users");

// Middleware pour vérifier le token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token manquant !" });
    }

    try {
        const payload = jwt.verify(token, SECRET_KEY);
        req.user = payload;
        next();
    } catch (err) {
        res.status(403).json({ message: "Token invalide !" });
    }
};

const corsOptions = {
  origin: "http://localhost:3001", // Remplacez par l'origine de votre front-end
  methods: "GET,POST",
  allowedHeaders: "Content-Type",
};
app.use(cors(corsOptions));


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

// Route pour authentifier et générer un token
// Endpoint pour authentifier et générer un token
app.post("/api/auth", async (req, res) => {
  const { username, password } = req.body;

  try {
      // Connexion à la base de données
      await mongoose.connect("mongodb://localhost:27017/4DEVS", {
          useNewUrlParser: true,
          useUnifiedTopology: true,
      });

      // Vérifier si l'utilisateur existe dans la base de données
      const user = await User.findOne({ username: username })
      console.log("user : ",user);
      if (user && user.password === password) {
          // Générer un token si l'utilisateur est trouvé et que le mot de passe est correct
          const token = jwt.sign({ username: user.username }, SECRET_KEY, { expiresIn: "1h" });
          res.json({ token });
      } else {
          res.status(401).json({ username, password, user });
      }
  } catch (error) {
      console.error("Erreur lors de la connexion :", error.message);
      res.status(500).json({ message: "Erreur serveur" });
  } finally {
      mongoose.disconnect(); // Déconnecter de la base de données
  }
});


// Endpoint pour enregistrer les préinscrits
app.post("/api/preinscrits", upload.single("preinscrit"), async (req, res) => {
  console.log(req.file); // Vérifier ce qui est reçu

  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier reçu." });
  }

  try {
    await mongoose.connect('mongodb://localhost:27017/4DEVS', { useNewUrlParser: true, useUnifiedTopology: true });
    const preinscritFile = req.file.buffer.toString("utf-8");
    // console.log("Contenu du fichier:", preinscritFile); // Affichez le contenu du fichier

    const lines = preinscritFile.split("\n");
    const student = [];

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
            student.push({
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

    const savedPreinscrit = await Student.insertMany(student); // Correctif de la variable `student`

    res.status(200).json({
      message: "Préinscrits enregistrés avec succès",
      Student: savedPreinscrit,
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement des préinscrits :", error);
    res.status(500).json({
      message: "Erreur lors de l'enregistrement des préinscrits",
      error: error.message,
    });
  }
});

// Endpoint pour récupérer les préinscrits
app.get("/api/preinscrits", async (req, res) => {
  const currentYear = new Date().getFullYear();
  const dateRentree = req.query.dateRentrée || `${currentYear}-09-01`; // Utilise la date de rentrée envoyée par le client, ou une valeur par défaut

  try {
    // Récupérer tous les étudiants (préinscrits) de la base de données
    const preinscrits = await Student.find();

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

// Endpoint pour enregistrer les élèves
app.post("/api/students", verifyToken, async (req, res) => {
  const { students } = req.body;
  const currentYear = new Date().getFullYear();
  const dateRentrée = req.body.dateRentrée || `${currentYear}-09-01`;

  console.log("Body:", req.body);
  console.log("User from token:", req.user); // Ajout pour vérifier le contenu du token

  if (!students || students.length === 0) {
    return res.status(400).json({ message: "Aucun élève à enregistrer." });
  }

  try {
    // Connecter à MongoDB avant d'exécuter des opérations
    await mongoose.connect('mongodb://localhost:27017/4DEVS', { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connexion à MongoDB établie');

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

    res.status(200).json({
      message: "Élèves enregistrés avec succès.",
      students: savedStudents,
    });
  } catch (err) {
    console.error("Erreur lors de l'enregistrement des élèves:", err);
    res.status(500).json({ error: "Erreur serveur lors de l'enregistrement des élèves." });
  }
});



// Endpoint pour récupérer les élèves par classe
app.get("/api/classes", verifyToken, async (req, res) => {
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

app.post("/api/update-year", verifyToken, upload.single("redoublants"), async (req, res) => {
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

app.post("/api/validate-redoublants", verifyToken, async (req, res) => {
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
app.listen(3000, () => {
  console.log("Serveur démarré sur http://localhost:3000");
});
