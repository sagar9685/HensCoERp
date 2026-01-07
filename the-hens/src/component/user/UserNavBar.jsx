import { FaUserCircle } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/authSlice";
import { useNavigate } from "react-router";
import { openStockModal } from "../../features/stockSlice";
import AddStockModal from "./AddStockModal";

const UserNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const modalOpen = useSelector((state) => state.stock.modalOpen);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/");
  };

  return (
    <>
      <nav className="navbar p-0 fixed-top d-flex flex-row">
        <div className="navbar-brand-wrapper d-flex d-lg-none align-items-center justify-content-center">
          <a className="navbar-brand brand-logo-mini" href="../../index.html">
            <img src="./src/assets/images/logo-mini.svg" alt="logo" />
          </a>
        </div>
        <div className="navbar-menu-wrapper flex-grow d-flex align-items-stretch">
          <button
            className="navbar-toggler navbar-toggler align-self-center"
            type="button"
            data-toggle="minimize"
          >
            <span className="mdi mdi-menu"></span>
          </button>
          <ul className="navbar-nav w-100">
            <li className="nav-item w-100">
              <form className="nav-link mt-2 mt-md-0 d-none d-lg-flex search">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search products"
                />
              </form>
            </li>
          </ul>
          <ul className="navbar-nav navbar-nav-right">
            <li className="nav-item dropdown d-none d-lg-block">
              <a
                className="nav-link btn btn-success create-new-button"
                style={{ cursor: "pointer" }}
                onClick={() => dispatch(openStockModal())} // ✔ open modal from redux
              >
                + Add New Stock
              </a>
            </li>

            <li className="nav-item dropdown">
              <a
                className="nav-link"
                id="profileDropdown"
                href="#"
                data-toggle="dropdown"
              >
                <div className="navbar-profile">
                  <FaUserCircle className="img-xs rounded-circle" />
                  <span className="count bg-success"></span>
                  <p className="mb-0 d-none d-sm-block navbar-profile-name">
                    User
                  </p>
                  <i className="mdi mdi-menu-down d-none d-sm-block"></i>
                </div>
              </a>
              <div
                className="dropdown-menu dropdown-menu-right navbar-dropdown preview-list"
                aria-labelledby="profileDropdown"
              >
                <h6 className="p-3 mb-0">Profile</h6>
                <div className="dropdown-divider"></div>
                <a className="dropdown-item preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-settings text-success"></i>
                    </div>
                  </div>
                  <div className="preview-item-content">
                    <p className="preview-subject mb-1">Settings</p>
                  </div>
                </a>
                <div className="dropdown-divider"></div>
                <a className="dropdown-item preview-item">
                  <div className="preview-thumbnail">
                    <div className="preview-icon bg-dark rounded-circle">
                      <i className="mdi mdi-logout text-danger"></i>
                    </div>
                  </div>
                  <div className="preview-item-content" onClick={handleLogout}>
                    <p className="preview-subject mb-1">Log out</p>
                  </div>
                </a>
                <div className="dropdown-divider"></div>
                <p className="p-3 mb-0 text-center">Advanced settings</p>
              </div>
            </li>
          </ul>
          <button
            className="navbar-toggler navbar-toggler-right d-lg-none align-self-center"
            type="button"
            data-toggle="offcanvas"
          >
            <span className="mdi mdi-format-line-spacing"></span>
          </button>
        </div>
      </nav>
      {/* ✅ Show modal */}
      {modalOpen && <AddStockModal />}
    </>
  );
};

export default UserNavbar;
