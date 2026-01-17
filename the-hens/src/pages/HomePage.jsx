import UserDashboard from "../component/user/UserDashboard";
import UserForm from "../component/user/UserForm";
import UserSideBar from "../component/user/UserSidebar";

const HomePage = () => {
  return (
    <>
      <div class="container-scroller">
        <UserSideBar />
       <UserForm/>
      </div>
    </>
  );
};

export default HomePage;
