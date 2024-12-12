import { Link, Outlet } from "react-router-dom";

const Page = () => {
  return (
    <div className="flex w-full flex-col justify-center items-center">
      <nav className="w-full flex justify-between list-none p-5">
        <li>
          <Link to="/main">App</Link>
        </li>
        <li>
          <Link to="/">Auth</Link>
        </li>
      </nav>
      <Outlet />
    </div>
  );
};

export default Page;