import React from "react";
import styles from "./Support.module.css";
import {
  Mail,
  Phone,
  Globe,
  Send,
  HelpCircle,
  Clock,
  Shield,
  MessageSquare,
  Linkedin,
  Github,
  ExternalLink,
} from "lucide-react";

const Support = () => {
  const contactInfo = {
    email: "sagargupta12396@gmail.com",
    phone: "+91 96851 67586",
    portfolio: "https://sagar-gupta12396.vercel.app/",
    linkedin: "https://www.linkedin.com/in/sagargupta12396/",
    github: "https://github.com/sagar9685",
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:${contactInfo.email}?subject=Support Request&body=Hello Sagar,`;
  };

  const handleCallClick = () => {
    window.location.href = `tel:${contactInfo.phone}`;
  };

  const openLink = (url) => {
    window.open(url, "_blank", "noopener noreferrer");
  };

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIconWrapper}>
            <HelpCircle className={styles.headerIcon} size={48} />
            <div className={styles.headerBadge}>24/7 Support</div>
          </div>
          <h1 className={styles.title}>Support Center</h1>
          <p className={styles.subtitle}>
            Need help with updates, changes, or technical issues? I'm here to
            assist you.
          </p>
          <div className={styles.supportStats}>
            <div className={styles.statItem}>
              <Clock size={20} />
              <span>24h Response Time</span>
            </div>
            <div className={styles.statItem}>
              <Shield size={20} />
              <span>Professional Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.main}>
        {/* Contact Methods Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <MessageSquare className={styles.sectionIcon} size={32} />
            <h2>Contact Methods</h2>
            <p>Choose your preferred way to get in touch</p>
          </div>

          <div className={styles.contactGrid}>
            {/* Email Card */}
            <div className={`${styles.contactCard} ${styles.emailCard}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.emailIcon}`}>
                  <Mail size={24} />
                </div>
                <h3>Email Support</h3>
              </div>
              <p className={styles.contactDetail}>{contactInfo.email}</p>
              <p className={styles.contactDesc}>
                Best for detailed technical issues, update requests, and
                documentation
              </p>
              <button
                className={`${styles.actionBtn} ${styles.emailBtn}`}
                onClick={handleEmailClick}
              >
                <Send size={16} />
                <span>Send Email</span>
              </button>
            </div>

            {/* Phone Card */}
            <div className={`${styles.contactCard} ${styles.phoneCard}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.phoneIcon}`}>
                  <Phone size={24} />
                </div>
                <h3>Phone Support</h3>
              </div>
              <p className={styles.contactDetail}>{contactInfo.phone}</p>
              <p className={styles.contactDesc}>
                Quick calls for urgent issues and immediate assistance
              </p>
              <button
                className={`${styles.actionBtn} ${styles.phoneBtn}`}
                onClick={handleCallClick}
              >
                <Phone size={16} />
                <span>Call Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Digital Presence Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Globe className={styles.sectionIcon} size={32} />
            <h2>Digital Presence</h2>
            <p>Connect with me across platforms</p>
          </div>

          <div className={styles.digitalGrid}>
            {/* Portfolio */}
            <div
              className={`${styles.digitalCard} ${styles.portfolioCard}`}
              onClick={() => openLink(contactInfo.portfolio)}
            >
              <div className={styles.digitalCardHeader}>
                <div
                  className={`${styles.digitalIcon} ${styles.portfolioIcon}`}
                >
                  <Globe size={24} />
                </div>
                <div className={styles.digitalTitle}>
                  <h3>Portfolio</h3>
                  <ExternalLink size={16} className={styles.linkIcon} />
                </div>
              </div>
              <p className={styles.digitalLink}>{contactInfo.portfolio}</p>
              <p className={styles.digitalDesc}>
                View my work, projects, and professional experience
              </p>
            </div>

            {/* LinkedIn */}
            <div
              className={`${styles.digitalCard} ${styles.linkedinCard}`}
              onClick={() => openLink(contactInfo.linkedin)}
            >
              <div className={styles.digitalCardHeader}>
                <div className={`${styles.digitalIcon} ${styles.linkedinIcon}`}>
                  <Linkedin size={24} />
                </div>
                <div className={styles.digitalTitle}>
                  <h3>LinkedIn</h3>
                  <ExternalLink size={16} className={styles.linkIcon} />
                </div>
              </div>
              <p className={styles.digitalLink}>{contactInfo.linkedin}</p>
              <p className={styles.digitalDesc}>
                Professional network and work experience
              </p>
            </div>

            {/* GitHub */}
            <div
              className={`${styles.digitalCard} ${styles.githubCard}`}
              onClick={() => openLink(contactInfo.github)}
            >
              <div className={styles.digitalCardHeader}>
                <div className={`${styles.digitalIcon} ${styles.githubIcon}`}>
                  <Github size={24} />
                </div>
                <div className={styles.digitalTitle}>
                  <h3>GitHub</h3>
                  <ExternalLink size={16} className={styles.linkIcon} />
                </div>
              </div>
              <p className={styles.digitalLink}>{contactInfo.github}</p>
              <p className={styles.digitalDesc}>
                Code repositories, projects, and contributions
              </p>
            </div>
          </div>
        </div>

        {/* Quick Response Section */}
        <div className={styles.section}>
          <div className={`${styles.responseCard} ${styles.gradientCard}`}>
            <Shield size={48} className={styles.responseIcon} />
            <div className={styles.responseContent}>
              <h2>Need Immediate Assistance?</h2>
              <p>
                For urgent technical issues or deployment problems, please call
                directly. I prioritize quick responses to ensure minimal
                disruption to your workflow.
              </p>
              <div className={styles.responseActions}>
                <button
                  className={`${styles.actionBtn} ${styles.primaryBtn}`}
                  onClick={handleCallClick}
                >
                  <Phone size={16} />
                  <span>Call Now: {contactInfo.phone}</span>
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                  onClick={handleEmailClick}
                >
                  <Mail size={16} />
                  <span>Email for Details</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <p className={styles.note}>
            <strong>Response Time:</strong> Typically within 24 hours |
            <strong> Working Hours:</strong> Mon-Sat, 9 AM - 6 PM IST
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;
