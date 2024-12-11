import React, { useState } from "react";
import Papa from "papaparse";
import { parse, isValid, format } from "date-fns";

function App() {
  const [file, setFile] = useState(null);
  const [redoublantsFile, setRedoublantsFile] = useState(null); // Nouveau fichier pour les redoublants
  const [data, setData] = useState([]);

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

  // Envoi des données des élèves au backend
  const sendDataToBackend = async (students) => {
    try {
      const response = await fetch("http://localhost:5000/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ students }),
      });

      if (response.ok) {
        alert("Les élèves ont été enregistrés.");
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
      const response = await fetch("http://localhost:5000/api/update-year", {
        method: "POST",
        body: formData,
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
        "http://localhost:5000/api/validate-redoublants",
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
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur d'envoi des redoublants:", error);
      alert("Une erreur est survenue avec la route validate-redoublants.");
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="bg-blue-600 text-white p-6 text-center rounded-md shadow-md">
        <h1 className="text-3xl font-bold">Gestion des Élèves</h1>
        <p className="text-sm mt-2">
          Importez et gérez les données de vos élèves.
        </p>
      </header>

      <main className="mt-10 max-w-4xl mx-auto bg-transparent">
        <section className="bg-white p-6 rounded-md shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Importer un fichier CSV
          </h2>
          <label className="block">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden" // Masquer le champ file par défaut
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-blue-700"
            >
              Choisir un fichier
            </label>
          </label>
        </section>

        <section className="bg-white p-6 rounded-md shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Indiquer les redoublants
          </h2>
          <label className="block">
            <input
              type="file"
              accept=".csv"
              onChange={handleRedoublantsFileChange}
              className="hidden" // Masquer le champ file par défaut
              id="redoublants-upload"
            />
            <label
              htmlFor="redoublants-upload"
              className="cursor-pointer bg-green-600 text-white font-medium py-2 px-4 rounded-md shadow-md hover:bg-green-700"
            >
              Choisir un fichier
            </label>
          </label>
        </section>

        {data.length > 0 && (
          <section className="bg-white p-6 rounded-md shadow-md">
            <h3 className="text-xl font-semibold mb-4">Aperçu des données</h3>
            <table className="w-full border-collapse border border-gray-400">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((header, index) => (
                    <th
                      key={index}
                      className="border border-gray-300 px-4 py-2 bg-gray-100"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border border-gray-300 px-4 py-2"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
