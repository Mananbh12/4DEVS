function isPreinscrit(dateDeNaissance, dateRentree) {
    const naissance = new Date(dateDeNaissance);
    const rentree = new Date(dateRentree);
  
    // Calculer l'âge en années à la date de la rentrée
    const age = rentree.getFullYear() - naissance.getFullYear();
  
    // Si l'élève a moins de 3 ans à la date de rentrée, c'est un préinscrit
    if (age < 3 || (age === 3 && rentree.getMonth() < naissance.getMonth())) {
      return true;
    }
  
    return false;
  }
  
  module.exports = isPreinscrit;
  