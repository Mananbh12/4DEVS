const addStudentToClass = async (studentId, className) => {
  try {
    let classCollection = await ClassCollection.findOne({ classe: className });

    if (!classCollection) {
      // Créer la classe si elle n'existe pas encore
      classCollection = new ClassCollection({
        classe: className,
        students: [],
      });
    }

    if (!classCollection.students.includes(studentId)) {
      // Ajouter l'étudiant à la classe s'il n'est pas déjà présent
      classCollection.students.push(studentId);
      await classCollection.save();
    }
  } catch (error) {
    console.error(
      `Erreur lors de l'ajout d'un étudiant à la classe ${className}:`,
      error
    );
  }
};

module.exports = addStudentToClass;
