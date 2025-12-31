import React, { useState, useEffect, useRef } from "react";
import styles from "./Login.module.css";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaGoogle, FaFacebook, FaGithub, FaTwitter, FaApple, FaMicrosoft } from "react-icons/fa";
import { RiShieldKeyholeFill } from "react-icons/ri";
import { useDispatch } from "react-redux";
import { userLogin } from "../features/authSlice";
import { useNavigate } from "react-router";

// Toast Notification Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.toastContent}>
        <div className={styles.toastIcon}>
          {type === 'success' ? '🎉' : type === 'error' ? '❌' : 'ℹ️'}
        </div>
        <span className={styles.toastMessage}>{message}</span>
        <button className={styles.toastClose} onClick={onClose}>×</button>
      </div>
      <div className={styles.toastProgress}></div>
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [toasts, setToasts] = useState([]);
  const canvasRef = useRef(null);


  useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    navigate("/dashboard"); // if already logged in, skip login page
  }
}, [navigate]);


  // Add toast function
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  // Remove toast function
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Particle animation for background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 150;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.color = `hsl(${Math.random() * 60 + 200}, 70%, 60%)`;
        this.alpha = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Rotating features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    "Secure Authentication",
    "Real-time Monitoring",
    "Advanced Analytics",
    "Cloud Integration",
    "AI-Powered Insights"
  ];

  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)
    
    if (!username.trim()) {
      addToast('Please enter your username', 'error');
      return;
    }

    if (!password.trim()) {
      addToast('Please enter your password', 'error');
      return;
    }

   try {
    const resultAction = await dispatch(userLogin({ username, password }));
    if (userLogin.fulfilled.match(resultAction)) {
      addToast(`Welcome back, ${username}! 🎉`, 'success');
        navigate("/dashboard");
      
    
      setUsername("");
      setPassword("");
    } else {
            addToast("Invalid username or password", "error");

    }
  } catch (err) {
    addToast("Something went wrong", err);
  }finally {
    setLoading(false);
  }


  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  

  return (
    <div className={styles.container}>
      {/* Toast Notifications */}
      <div className={styles.toastContainer}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Advanced Particle Background */}
      <canvas ref={canvasRef} className={styles.particleCanvas}></canvas>

      {/* Animated Background Elements */}
      <div className={styles.backgroundElements}>
        <div className={styles.floatingOrb1}></div>
        <div className={styles.floatingOrb2}></div>
        <div className={styles.floatingOrb3}></div>
        <div className={styles.neonGlow1}></div>
        <div className={styles.neonGlow2}></div>
        <div className={styles.holographicLine}></div>
      </div>

      {/* Magnetic Floating Card */}
      <div 
        className={styles.loginCard}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Advanced Card Effects */}
        <div className={`${styles.cardGlow} ${isHovered ? styles.glowActive : ''}`}></div>
        <div className={styles.cardShine}></div>
        <div className={styles.cardParticles}></div>

        {/* Premium Header Section */}
        <div className={styles.premiumHeader}>
          <div className={styles.logoSection}>
            <div className={styles.logoContainer}>
              <div className={styles.logoOrbit}>
                <div className={styles.logoParticle}></div>
                <div className={styles.logoParticle}></div>
                <div className={styles.logoParticle}></div>
              </div>
              <img 
                src="/img/logo.png"
                alt="Hensco Logo" 
                className={styles.logo}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className={styles.logoPlaceholder}>
                <RiShieldKeyholeFill className={styles.logoIcon} />
                <div className={styles.logoTextContainer}>
                  <span className={styles.logoText}>HENSCO</span>
                  <span className={styles.logoSubtitle}>ENTERPRISE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Animated Feature Text */}
          <div className={styles.featureRotator}>
            <div className={styles.featureText}>
              {features.map((feature, index) => (
                <span
                  key={feature}
                  className={`${styles.feature} ${index === activeIndex ? styles.active : ''}`}
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Form Section */}
        <div className={styles.formContainer}>
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Animated Input Fields */}
            <div className={styles.inputContainer}>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaUser className={styles.icon} />
                  <div className={styles.iconPulse}></div>
                </div>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className={styles.input}
                />
                <div className={styles.inputBorder}></div>
                <div className={styles.inputShine}></div>
              </div>
            </div>

            <div className={styles.inputContainer}>
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <FaLock className={styles.icon} />
                  <div className={styles.iconPulse}></div>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                />
                <button 
                  type="button" 
                  className={styles.passwordToggle}
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                  <div className={styles.toggleEffect}></div>
                </button>
                <div className={styles.inputBorder}></div>
                <div className={styles.inputShine}></div>
              </div>
            </div>

            {/* Enhanced Options */}
            <div className={styles.enhancedOptions}>
              <label className={styles.premiumCheckbox}>
                <input type="checkbox" />
                <span className={styles.checkboxDesign}>
                  <span className={styles.checkboxTick}></span>
                </span>
                <span className={styles.optionText}>Keep me signed in</span>
              </label>
              <a href="#" className={styles.enhancedLink} onClick={(e) => {
                e.preventDefault();
                addToast('Password reset instructions sent!', 'info');
              }}>
                <span>Forgot Security Key?</span>
                <div className={styles.linkTrail}></div>
              </a>
            </div>

            {/* Premium Login Button */}
                                    <button 
                            type="submit" 
                            className={`${styles.loginButton} ${loading ? styles.loading : ''}`}
                            disabled={loading}
                            >
                            <span className={styles.buttonContent}>
                                <span className={styles.buttonText}>
                                {loading ? "Signing In..." : "Access Dashboard"}
                                </span>
                                <span className={styles.buttonIcon}>→</span>
                            </span>
                            <div className={styles.buttonGlow}></div>
                            <div className={styles.buttonParticles}></div>
                            </button>

          </form>

         

          {/* Premium Footer */}
          <div className={styles.premiumFooter}>
            <div className={styles.securityBadge}>
              <RiShieldKeyholeFill className={styles.shieldIcon} />
              <span>Enterprise Grade Security</span>
            </div>
                <p>Designed By Sagar gupta</p>
          </div>
        </div>

        {/* Floating Decorations */}
        <div className={styles.floatingDecoration1}></div>
        <div className={styles.floatingDecoration2}></div>
        <div className={styles.floatingDecoration3}></div>
      </div>

      {/* Background Audio Toggle */}
       
    </div>
  );
};

export default Login;