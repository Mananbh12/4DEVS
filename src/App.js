import "./App.css";

function App() {
  return (
    <div className="font-sans bg-gray-100 min-h-screen">
      {/* Navbar avec deux boutons */}
      <nav className="bg-blue-600 p-4 text-white text-center">
        <button className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mx-2 focus:outline-none">
          Importer des élèves
        </button>
        <button className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded-lg mx-2 focus:outline-none">
          Gérer année suivante
        </button>
      </nav>

      {/* Section avec un tableau */}
      <section className="p-6">
        <h2 className="text-3xl text-center text-gray-800 mb-6">
          Liste des étudiants
        </h2>
        <div className="overflow-x-auto bg-white p-4 rounded-lg shadow-md">
          <table className="w-full text-left table-auto">
            <thead>
              <tr>
                <th className="py-2 px-4 text-gray-600">Nom</th>
                <th className="py-2 px-4 text-gray-600">Prénom</th>
                <th className="py-2 px-4 text-gray-600">Classe</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="py-2 px-4">John</td>
                <td className="py-2 px-4">Doe</td>
                <td className="py-2 px-4">1A</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-2 px-4">Jane</td>
                <td className="py-2 px-4">Smith</td>
                <td className="py-2 px-4">2B</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-2 px-4">Mark</td>
                <td className="py-2 px-4">Johnson</td>
                <td className="py-2 px-4">3C</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default App;
