function getClassForStudent(dateDeNaissance, dateRentrée) {
  const rentréeDate = new Date(dateRentrée);
  const birthDate = new Date(dateDeNaissance);

  const ageOnRentrée =
    rentréeDate.getFullYear() -
    birthDate.getFullYear() -
    (rentréeDate.getMonth() < birthDate.getMonth() ||
    (rentréeDate.getMonth() === birthDate.getMonth() &&
      rentréeDate.getDate() < birthDate.getDate())
      ? 1
      : 0);

  if (ageOnRentrée === 3) return "Petite Section";
  if (ageOnRentrée === 4) return "Moyenne Section";
  if (ageOnRentrée === 5) return "Grande Section";
  if (ageOnRentrée === 6) return "CP";
  if (ageOnRentrée === 7) return "CE1";
  if (ageOnRentrée === 8) return "CE2";
  if (ageOnRentrée === 9) return "CM1";
  if (ageOnRentrée === 10) return "CM2";

  return null; // Cas d'âge en dehors du cycle scolaire
}

module.exports = getClassForStudent;
