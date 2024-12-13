const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  nom: String,
  prenom: String,
  dateDeNaissance: Date,
});

module.exports = mongoose.model("Student", studentSchema);
