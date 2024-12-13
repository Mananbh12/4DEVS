const ClassCollection = require("../models/Class");
const { ObjectId } = require("mongodb"); // Si vous utilisez ObjectId pour manipuler les identifiants

// Fonction pour obtenir la classe suivante
const getNextClass = (currentClass) => {
  const classOrder = [
    "Petite Section",
    "Moyenne Section",
    "Grande Section",
    "CP",
    "CE1",
    "CE2",
    "CM1",
    "CM2",
  ];
  const currentIndex = classOrder.indexOf(currentClass);
  return currentIndex < classOrder.length - 1
    ? classOrder[currentIndex + 1]
    : null;
};

const updateClassesForRedoublantsAndNonRedoublants = async (
  redoublantsData
) => {
  try {
    // Récupérer les données nécessaires
    const redoublantsIds = redoublantsData.map((student) => student.id);
    const classes = await ClassCollection.find().populate("students");

    // Identifier tous les identifiants des étudiants dans les classes actuelles
    const allStudentIdsInClasses = classes.flatMap((classe) =>
      classe.students.map((student) => student._id.toString())
    );

    // Identifier les identifiants des non-redoublants
    const nonRedoublantsIds = allStudentIdsInClasses.filter(
      (id) => !redoublantsIds.includes(id)
    );

    // Parcourir chaque classe
    for (let classe of classes) {
      console.log("Classe actuelle :", classe.classe);

      // Sauvegarder les étudiants initiaux pour les restaurer en cas d'erreur
      const initialStudents = [...classe.students];

      // Filtrer les étudiants redoublants et non redoublants dans cette classe
      const redoublantsInClass = classe.students.filter((student) =>
        redoublantsIds.includes(student._id.toString())
      );
      const studentsNotInRedoublants = classe.students.filter((student) =>
        nonRedoublantsIds.includes(student._id.toString())
      );

      console.log("Redoublants :", redoublantsInClass);
      console.log("Non redoublants :", studentsNotInRedoublants);

      // Mise à jour de la classe actuelle pour conserver uniquement les redoublants
      try {
        // Utilisation de $set pour conserver uniquement les redoublants
        await ClassCollection.findOneAndUpdate(
          { _id: classe._id },
          {
            $set: {
              students: redoublantsInClass.map((student) => student._id),
            },
          }
        );
        console.log("Classe mise à jour avec les redoublants.");
      } catch (error) {
        console.error(
          "Échec de la mise à jour des redoublants. Annulation des modifications..."
        );
        await ClassCollection.findOneAndUpdate(
          { _id: classe._id },
          { $set: { students: initialStudents.map((student) => student._id) } }
        );
        continue; // Passer à la classe suivante
      }

      // Déterminer la classe suivante
      const nextClass = getNextClass(classe.classe);
      console.log("Classe suivante :", nextClass);

      if (nextClass) {
        const nextClassCollection = await ClassCollection.findOne({
          classe: nextClass,
        });

        if (nextClassCollection) {
          // Utiliser $set pour ajouter les élèves non redoublants à la classe suivante
          for (let student of studentsNotInRedoublants) {
            await nextClassCollection.updateOne(
              {
                "students._id": {
                  $nin: studentsNotInRedoublants.map((s) => s._id), // Assurez-vous que s._id est déjà un ObjectId
                },
              },
              {
                $addToSet: {
                  students: {
                    $each: studentsNotInRedoublants.map(
                      (s) =>
                        s._id instanceof ObjectId ? s._id : new ObjectId(s._id) // Convertir en ObjectId uniquement si nécessaire
                    ),
                  },
                },
              }
            );

            console.log(
              `Ajouté ${student.prenom} ${student.nom} à la classe suivante.`
            );
          }
        } else {
          // Si la classe suivante n'existe pas, la créer
          const newClass = new ClassCollection({
            classe: nextClass,
            students: studentsNotInRedoublants.map((s) => s._id),
          });
          await newClass.save();
          console.log(`Nouvelle classe créée : ${nextClass}`);
        }
      }
    }

    console.log("Mise à jour des classes terminée.");
  } catch (error) {
    console.error("Erreur lors de la mise à jour des classes :", error);
  }
};

module.exports = updateClassesForRedoublantsAndNonRedoublants;
