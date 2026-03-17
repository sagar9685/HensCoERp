import styles from "./Footer.module.css";
import { useNavigate } from "react-router";
function Footer() {
  const navigate = useNavigate();
  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <span className={styles.footerText}>
            © {new Date().getFullYear()} Hens Co ERP
          </span>

          <span className={styles.footerDivider}>•</span>

          <span className={styles.footerCredit}>
            Built & Deployed by{" "}
            <strong
              className={styles.clickable}
              onClick={() => navigate("/support")}
            >
              Sagar
            </strong>
          </span>
        </div>
      </footer>
    </>
  );
}

export default Footer;
