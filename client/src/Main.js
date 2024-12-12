import { createBrowserRouter, RouterProvider, Outlet, useNavigate, Navigate } from 'react-router-dom';
import Auth from "./components/Auth";
import App from "./App";

const Root = () => {
  return (
         <div className="flex items-center justify-center p-15 min-h-screen">
            <Outlet />
        </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
       {
        index: true, // Route par défaut pour "/"
        element: <Navigate to="/login" replace={true} />, // Redirection vers "/login"
        },
      {
        path: "main",
        element: <App />,
      },
      {
        path: "login",
        element: <Auth />,
      },
    ]
  }
]);

function Main() {
  return <RouterProvider router={router} />;
}

export default Main;
