import UserDashboard from "../component/user/UserDashboard";
import UserSideBar from "../component/user/UserSidebar";

const HomePage = () => {
  return (
    <>
      <div class="container-scroller">
        <UserSideBar />
        <UserDashboard />
      </div>
    </>
  );
};

export default HomePage;
