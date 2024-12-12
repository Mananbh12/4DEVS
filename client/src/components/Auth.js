import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Auth({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // Hook pour naviguer entre les pages

  const handleLogin = async () => {
    try {
      console.log("Username:", email);
      console.log("Password:", password);

      const response = await fetch("http://localhost:3000/api/auth", {
        method: "POST",
        headers: 
          {
            'Authorization': `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        body: JSON.stringify({ username: email, password: password }),
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess && onLoginSuccess(data.token); // Appel de la prop si elle est définie
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role); // Stocker le rôle
        alert("Connexion réussie");

        // Redirection vers /main après la connexion réussie
        navigate("/main");
      } else {
        const errorData = await response.json();
        alert(`Erreur : ${errorData.message}`);
      }
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      alert("Une erreur est survenue lors de la tentative de connexion.");
    }
  };

  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  return (
    <div className="min-h-screen">
        <header className=" text-white p-20 text-center">
            <h1 className="text-3xl font-bold">
                Connexion
            </h1>
        </header>
        <div className="flex items-center justify-center p-15">
            <div className="bg-black p-8 rounded shadow-md w-80 bg-opacity-20">
                <input
                type="text"
                placeholder="identifiant"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 mb-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                onClick={handleLogin}
                className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                >
                Se connecter
                </button>
            </div>
        </div>
    </div>
  );
}

export default Auth;
