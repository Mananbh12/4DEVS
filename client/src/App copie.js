import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";

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
      const response = await fetch("http://localhost:3000/api/classes");
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
      const response = await fetch("http://localhost:3000/api/preinscrits");
      if (response.ok) {
        const preinscritsData = await response.json();
        console.log("Préinscrits récupérés :", preinscritsData); // Debugging
        setPreinscrits(preinscritsData);
      } else {
        console.error("Erreur lors de la récupération des préinscrits");
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
          headers: {
            "Content-Type": "application/json",
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


  return (
    <div className="min-h-screen bg-gray-100 bg-transparent">
      <header className="text-white p-10 text-center ">
        <h1 className="text-3xl font-bold">Gestion des Élèves</h1>
        <p className="text-sm mt-2">
          Importez et gérez les données de vos élèves.
        </p>
      </header>

      <main className="mt-10 max-w-7xl mx-auto ">
        {/* Import des fichiers */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Importer des fichiers :
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Champ pour les préinscrits */}
            <div className="flex flex-col items-center bg-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-semibold mb-4">Préinscrits</h3>
              <input
                type="file"
                accept=".txt"
                onChange={addPreinscrit}
                id="preinscrit-upload"
                className="hidden" />
              <label
                htmlFor="preinscrit-upload"
                className="cursor-pointer bg-indigo-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-indigo-700"
              >
                Choisir un fichier texte
              </label>
            </div>

            {/* Champ pour les étudiants */}
            <div className="flex flex-col items-center bg-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-semibold mb-4">Élèves</h3>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                id="file-upload"
                className="hidden" />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-blue-700"
              >
                Choisir un fichier csv
              </label>
            </div>

            {/* Champ pour les redoublants */}
            <div className="flex flex-col items-center bg-white p-6 rounded-md shadow-md">
              <h3 className="text-lg font-semibold mb-4">Redoublants</h3>
              <input
                type="file"
                accept=".csv"
                onChange={handleRedoublantsFileChange}
                id="redoublants-upload"
                className="hidden" />
              <label
                htmlFor="redoublants-upload"
                className="cursor-pointer bg-green-600 text-white py-2 px-4 rounded-md shadow-md hover:bg-green-700"
              >
                Choisir un fichier csv
              </label>
            </div>
          </div>
        </section>

        {/* Tableaux des classes */}
        <section>
          <div className="grid grid-cols-3 gap-6">
            {classes.map((classItem, classIndex) => (
              <div
                key={classIndex}
                className="bg-white p-4 rounded-md shadow-md"
              >
                <h3 className="text-xl font-bold mb-2">{classItem.classe}</h3>
                {classItem.students.length > 0 ? (
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
                      {classItem.students.map((student, studentIndex) => (
                        <tr key={studentIndex}>
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