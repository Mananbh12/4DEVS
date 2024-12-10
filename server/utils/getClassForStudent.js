const { differenceInYears } = require("date-fns");

function getClassForStudent(dateDeNaissance, dateRentrée) {
  const age = differenceInYears(
    new Date(dateRentrée),
    new Date(dateDeNaissance)
  );

  if (age < 3) {
    return "Non éligible";
  } else if (age === 3) {
    return "Petite Section";
  } else if (age === 4) {
    return "Moyenne Section";
  } else if (age === 5) {
    return "Grande Section";
  } else if (age === 6) {
    return "CP";
  } else if (age === 7) {
    return "CE1";
  } else if (age === 8) {
    return "CE2";
  } else if (age === 9) {
    return "CM1";
  } else if (age === 10) {
    return "CM2";
  } else {
    return "Non éligible";
  }
}

module.exports = getClassForStudent;
