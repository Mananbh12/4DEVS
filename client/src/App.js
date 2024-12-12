import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";
import {jsPDF} from "jspdf";

function App() {
  const [file, setFile] = useState(null);
  const [redoublantsFile, setRedoublantsFile] = useState(null); // Nouveau fichier pour les redoublants
  const [data, setData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [preinscrits, setPreinscrits] = useState([]);
  const [preinscritFile, setPreinscritFile] = useState(null);

  useEffect(() => {
    fetchClasses();
    fetchPreinscrits();
  }, []);

  const addPreinscrit = (e) => {
    const selectedFile = e.target.files[0];
    setPreinscritFile(selectedFile);
    sendPreinscritToBackend(selectedFile);
  };

  // Récupération des classes du backend
  const fetchClasses = async () => {
    try {
        const response = await fetch("http://localhost:3000/api/classes", {
            method: "GET", // Le type de la méthode est maintenant GET pour une récupération de données, non POST.
            headers: {
                'Authorization': `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        });

        if (response.ok) {
            const classData = await response.json();

            // Trier les classes dans l'ordre désiré
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

            const sortedClasses = classData.sort(
                (a, b) => order.indexOf(a.classe) - order.indexOf(b.classe)
            );
            setClasses(sortedClasses);
        } else {
            console.error("Erreur lors de la récupération des classes");
        }
    } catch (error) {
        console.error("Erreur lors de la connexion au serveur :", error);
    }
};


  // Fonction pour récupérer les préinscrits depuis le backend
  const fetchPreinscrits = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/preinscrits", {
        method: "GET", 
        headers: {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
        },
      });

      if (response.ok) {
        const preinscritsData = await response.json();
        setPreinscrits(preinscritsData);
      }
    } catch (error) {
      console.error("Erreur de connexion au serveur :", error);
    }
};


  // Gestion du fichier des élèves
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      Papa.parse(selectedFile, {
        complete: (result) => {
          const formattedData = result.data.map((row) => {
            const rawDate = row["Date de naissance"]?.trim();

            // Conversion de la date avec `date-fns`
            let dateDeNaissance = null;
            try {
              const parsedDate = parse(rawDate, "dd/MM/yyyy", new Date());
              if (isValid(parsedDate)) {
                dateDeNaissance = format(parsedDate, "yyyy-MM-dd");
              }
            } catch (error) {
              console.error("Erreur de format de date :", rawDate, error);
            }

            return {
              nom: row["Nom"]?.trim(),
              prenom: row["Prenom"]?.trim(),
              dateDeNaissance: dateDeNaissance, // Format correct ou null
            };
          });

          setData(formattedData);
          sendDataToBackend(formattedData); // Envoi des données transformées
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  };

  // Gestion du fichier des redoublants
  const handleRedoublantsFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setRedoublantsFile(selectedFile);

    if (selectedFile) {
      Papa.parse(selectedFile, {
        complete: (result) => {
          const formattedData = result.data.map((row) => {
            const rawDate = row["Date de naissance"]?.trim();

            let dateDeNaissance = null;
            try {
              const parsedDate = parse(rawDate, "dd/MM/yyyy", new Date()); // Remplacez par le format de vos données
              if (isValid(parsedDate)) {
                dateDeNaissance = format(parsedDate, "yyyy-MM-dd");
              } else {
                console.error(`Date invalide détectée : ${rawDate}`);
              }
            } catch (error) {
              console.error(
                "Erreur lors du parsing de la date :",
                rawDate,
                error
              );
            }

            return {
              nom: row["Nom"]?.trim(),
              prenom: row["Prenom"]?.trim(),
              dateDeNaissance: dateDeNaissance, // Null si invalide
            };
          });

          sendRedoublantsToBackend(formattedData); // Envoyer uniquement les données valides
        },
        header: true,
        skipEmptyLines: true,
      });
    }
  };

  const sendPreinscritToBackend = async (file) => {
    const formData = new FormData();
    formData.append("preinscrit", file); // Le champ doit être "preinscrit"

    try {
      const response = await fetch("http://localhost:3000/api/preinscrits", {
        method: "POST",
        body: formData, // Envoi de FormData qui contient le fichier
        headers: 
          {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
      });

      if (response.ok) {
        alert("Les préinscrits ont été enregistrés.");
        await fetchPreinscrits(); // Met à jour la liste des préinscrits
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi au serveur:", error);
      alert("Une erreur est survenue.");
    }
  };

  // Envoi des données des élèves au backend
  const sendDataToBackend = async (students) => {
    try {
      const response = await fetch("http://localhost:3000/api/students", {
        method: "POST",
        headers: 
          {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        body: JSON.stringify({ students }),
      });

      if (response.ok) {
        alert("Les élèves ont été enregistrés.");
        await fetchClasses();
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi au serveur:", error);
      alert("Une erreur est survenue.");
    }
  };

  // Fonction pour envoyer le fichier à Multer (backend)
  const sendRedoublantsFileToBackend = async (selectedFile) => {
    const formData = new FormData();
    formData.append("redoublants", selectedFile);

    try {
      const response = await fetch("http://localhost:3000/api/update-year", {
        method: "POST",
        body: formData,
        headers: 
          {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },

      });

      if (response.ok) {
        alert("Les redoublants ont été enregistrés et l'année mise à jour.");
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi au serveur:", error);
      alert("Une erreur est survenue dans la route api/update-year.");
    }
  };

  // Envoi des données formatées des redoublants au backend
  const sendRedoublantsToBackend = async (redoublants) => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/validate-redoublants",
        {
          method: "POST",
          headers: 
          {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ redoublants }), // Conversion en JSON avant l'envoi
        }
      );

      if (response.ok) {
        alert("Les redoublants ont été validés.");
        await fetchClasses();
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi des redoublants:", error);
      alert("Une erreur est survenue avec la route validate-redoublants.");
    }
  };

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  // Fonction pour archiver l'année scolaire
  const archiveYear = async () => {
    try {
        // Récupérer les classes depuis l'API
        const response = await fetch("http://localhost:3000/api/classes", {
            method: "GET", // Le type de la méthode est maintenant GET pour une récupération de données, non POST.
            headers: {
                'Authorization': `Bearer ${token}`,
                "Content-Type": "application/json"
            },
        });

        if (!response.ok) {
            console.error("Erreur lors de la récupération des classes :", response.statusText);
            return;
        }

        const classData = await response.json();

        if (!Array.isArray(classData) || classData.length === 0) {
            console.error("Aucune classe disponible ou les données sont invalides.");
            return;
        }

        // Trier les classes dans l'ordre désiré
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

        const sortedClasses = classData.sort(
            (a, b) => order.indexOf(a.classe) - order.indexOf(b.classe)
        );

        console.log("Classes triées :", sortedClasses);
        const currentDate = new Date().toLocaleDateString().replace(/\//g, "-");

        // Générer un fichier PDF contenant les classes triées
        const pdf = new jsPDF();
        pdf.text("Liste des classes", 10, 10);

        let pageNumber = 1;

        sortedClasses.forEach((classe, index) => {
            if (index > 0) {
                pdf.addPage(); // Ajouter une nouvelle page pour chaque classe, sauf la première
                pageNumber++;
            }

            // Titre de la classe (en haut de chaque page)
            pdf.text(`Classe : ${classe.classe}  ${currentDate}`, 10, 20);

            let yPosition = 30; // Position initiale pour les élèves, après le titre

            // Liste des élèves de la classe
            classe.students.forEach((student) => {
                const birthDate = new Date(student.dateDeNaissance).toLocaleDateString();
                pdf.text(`- ${student.prenom} ${student.nom} (né(e) le ${birthDate})`, 15, yPosition);
                yPosition += 10;

                // Vérification si la page est pleine
                if (yPosition > 280) { // Environ 280 pour une page A4 avec des marges
                    pdf.addPage();
                    pageNumber++;
                    pdf.text(`Page ${pageNumber}`, 10, 10);
                    pdf.text(`Classe : ${classe.classe} (suite)`, 10, 20);
                    yPosition = 30;
                }
            });
        });

        // Sauvegarder le PDF
        pdf.save(`classes-${currentDate}.pdf`);

    } catch (error) {
        console.error("Erreur lors de la connexion au serveur :", error);
    }
};



  return (
    <div className="min-h-screen">
      <header className=" text-white p-10 text-center">
        <h1 className="text-3xl font-bold">Gestion des Élèves</h1>
        <p className="text-sm mt-2">
          Importez et gérez les données de vos élèves.
        </p>
        <button onClick={archiveYear} className="cursor-pointer bg-red-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-red-700 mt-4">
          Archiver l'année scolaire
        </button>
      </header>

      <main className="mt-10 max-w-7xl mx-auto">
        {/* Import des présinscrit */}
        

        {/* Encadrés côte à côte */}
        <div className="flex justify-between gap-6 mb-10">

          <section className="flex-1 bg-white p-6 rounded-md shadow-md bg-opacity-75">
            <h2 className="text-2xl font-semibold mb-4">
              Importer les présinscrits
            </h2>
          <input
            type="file"
            accept=".txt"
            onChange={addPreinscrit}
              className="hidden"
              id="preinscrit-upload"
            />
            <label
              htmlFor="preinscrit-upload"
              className="cursor-pointer bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-blue-700 whitespace-nowrap"
            >
              Choisir un fichier
            </label>
          </section>
          <section className="flex-1 bg-white p-6 rounded-md shadow-md bg-opacity-75">
            <h2 className="text-2xl font-semibold mb-4">
              Importer un fichier CSV
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="whitespace-nowrap cursor-pointer bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-blue-700"
            >
              Choisir un fichier
            </label>
          </section>

          <section className="flex-1 bg-white p-6 rounded-md shadow-md bg-opacity-75">
            <h2 className="text-2xl font-semibold mb-4">
              Indiquer les redoublants
            </h2>
            <input
              type="file"
              accept=".csv"
              onChange={handleRedoublantsFileChange}
              className="hidden"
              id="redoublants-upload"
            />
            <label
              htmlFor="redoublants-upload"
              className=" whitespace-nowrap cursor-pointer bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-green-700"
            >
              Choisir un fichier
            </label>
          </section>
        </div>

        {/* Tableaux des classes */}
        <section>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {classes.map((classItem, classIndex) => (
              <div
                key={classIndex}
                className="bg-black p-4 rounded-md shadow-md bg-opacity-30 overflow-auto custom-scrollbar max-h-96"
              >
                <h3 className=" text-white text-xl font-bold mb-2">{classItem.classe}</h3>
                {classItem.students.length > 0 ? (
                  <table className=" min-w-full border-collapse border-gray-400 ">
                    <thead className=" z-10">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                          Nom
                        </th>
                        <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                          Prénom
                        </th>
                        <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                          Date de naissance
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {classItem.students.map((student, studentIndex) => (
                        <tr key={studentIndex}>
                          <td className="text-white border border-gray-300 px-4 py-2">
                            {student.nom}
                          </td>
                          <td className="text-white border border-gray-300 px-4 py-2">
                            {student.prenom}
                          </td>
                          <td className="text-white border border-gray-300 px-4 py-2">
                            {student.dateDeNaissance}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>Aucun étudiant dans cette classe.</p>
                )}
              </div>
            ))}

            {/* Tableau des préinscrits */}
            <div className="bg-white p-4 rounded-md shadow-md">
              <h3 className="text-xl font-bold mb-2">Préinscrits</h3>
              {preinscrits.length > 0 ? (
                <table className="w-full border-collapse border border-gray-400">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                        Nom
                      </th>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                        Prénom
                      </th>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100">
                        Date de naissance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preinscrits.map((student, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          {student.nom}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {student.prenom}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {student.dateDeNaissance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Aucun préinscrit pour le moment.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
        );

}

export default App;