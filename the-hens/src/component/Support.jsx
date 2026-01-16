import React, { useState } from "react";
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
  MessageCircle,
} from "lucide-react";

const Support = () => {
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [message, setMessage] = useState(
    "I need help with an issue. Are you available?"
  );

  const contactInfo = {
    email: "sagargupta12396@gmail.com",
    phone: "+91 96851 67586",
    portfolio: "https://sagar-gupta12396.vercel.app/",
    linkedin: "https://www.linkedin.com/in/sagargupta12396/",
    github: "https://github.com/sagar9685",
    whatsapp: "+919685167586",
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

  const handleWhatsAppClick = () => {
    setShowWhatsAppModal(true);
  };

  const sendWhatsAppMessage = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${contactInfo.whatsapp}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank", "noopener noreferrer");
    setShowWhatsAppModal(false);
  };

  const defaultMessages = [
    "I need help with an issue. Are you available?",
    "I have a question about an update/change request.",
    "I need technical support for a problem.",
    "Can we discuss a project requirement?",
  ];

  const handleQuickMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      sendWhatsAppMessage();
    }, 300);
  };

  return (
    <div className={styles.container}>
      {/* WhatsApp Floating Button */}
      <div className={styles.whatsappFloating} onClick={handleWhatsAppClick}>
        <div className={styles.whatsappIcon}>
          <MessageCircle size={28} />
        </div>
        <span className={styles.whatsappLabel}>Chat on WhatsApp</span>
        <div className={styles.pulseRing}></div>
      </div>

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowWhatsAppModal(false)}
        >
          <div
            className={styles.whatsappModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalIcon}>
                <MessageCircle size={32} />
              </div>
              <h3>Send WhatsApp Message</h3>
              <button
                className={styles.closeModal}
                onClick={() => setShowWhatsAppModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalSubtitle}>
                Your message will open in WhatsApp
              </p>

              <div className={styles.quickMessages}>
                <h4>Quick Messages:</h4>
                <div className={styles.quickMessageGrid}>
                  {defaultMessages.map((msg, index) => (
                    <button
                      key={index}
                      className={styles.quickMessageBtn}
                      onClick={() => handleQuickMessage(msg)}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.customMessage}>
                <h4>Or Type Your Own Message:</h4>
                <textarea
                  className={styles.messageInput}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows="4"
                  placeholder="Type your message here..."
                />
                <div className={styles.charCount}>
                  {message.length}/500 characters
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowWhatsAppModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.sendWhatsappBtn}
                onClick={sendWhatsAppMessage}
                disabled={message.trim().length === 0}
              >
                <MessageCircle size={18} />
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

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
              <MessageCircle size={20} />
              <span>WhatsApp Available</span>
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

            {/* WhatsApp Card */}
            <div className={`${styles.contactCard} ${styles.whatsappCard}`}>
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${styles.whatsappIcon}`}>
                  <MessageCircle size={24} />
                </div>
                <h3>WhatsApp Support</h3>
              </div>
              <p className={styles.contactDetail}>{contactInfo.whatsapp}</p>
              <p className={styles.contactDesc}>
                Quick chat for instant messaging and file sharing
              </p>
              <button
                className={`${styles.actionBtn} ${styles.whatsappActionBtn}`}
                onClick={handleWhatsAppClick}
              >
                <MessageCircle size={16} />
                <span>Chat on WhatsApp</span>
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
            <div className={styles.responseContent}>
              <div className={styles.responseHeader}>
                <MessageCircle size={48} className={styles.responseIcon} />
                <h2>Need Immediate Assistance?</h2>
              </div>
              <p>
                For urgent technical issues or quick queries, WhatsApp is the
                fastest way to reach me. I typically respond within minutes
                during business hours.
              </p>
              <div className={styles.responseActions}>
                <button
                  className={`${styles.actionBtn} ${styles.whatsappPrimaryBtn}`}
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle size={16} />
                  <span>Chat on WhatsApp</span>
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.secondaryBtn}`}
                  onClick={handleCallClick}
                >
                  <Phone size={16} />
                  <span>Call Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className={styles.footerNote}>
          <p className={styles.note}>
            <strong>Response Time:</strong> WhatsApp: Within minutes | Email: 24
            hours |<strong> Business Hours:</strong> Mon-Sat, 9 AM - 6 PM IST
          </p>
          <p className={styles.whatsappNote}>
            💬 <strong>WhatsApp Preferred:</strong> For fastest response, use
            WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};

export default Support;
