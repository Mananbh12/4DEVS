const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  dateDeNaissance: { type: Date, required: true },
});

const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
