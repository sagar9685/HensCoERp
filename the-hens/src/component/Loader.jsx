import "../App.css";

const Loader = () => {
  return (
    <div className="terminal-container">
      <div className="terminal-loader">
        <div className="terminal-header">
          <div className="terminal-title">bash</div>
          <div className="terminal-controls">
            <div className="control close"></div>
            <div className="control minimize"></div>
            <div className="control maximize"></div>
          </div>
        </div>
        <div className="terminal-content">
          <span className="text">Loading system...</span>
        </div>
      </div>
    </div>
  );
};

export default Loader;
