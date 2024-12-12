import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import Auth from "./components/Auth";
import App from "./App";

const Root = () => {
    return <div>
        <Outlet />
    </div>
}

const router = createBrowserRouter([
    {
      path: "/",
      element: <Root />,
      children: [
        {
          path: "main",
          element: <App />,
        },
        {
          path: "login",
          element: <Auth />,
        },
    ]}
]);

function Main() {
    return <RouterProvider router={router} />;
}

export default Main;
