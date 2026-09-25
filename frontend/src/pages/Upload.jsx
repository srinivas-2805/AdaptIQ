import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

const SAMPLE_PROFILES = [
  {
    name: "Full Stack Engineer (React + Spring Boot + MySQL)",
    resume: `SENIOR FULL STACK SOFTWARE ENGINEER
John Doe | john.doe@email.com | github.com/johndoe

SUMMARY
Experienced Software Engineer with 4+ years specializing in building scalable web applications using React, Java, Spring Boot, MySQL, and Docker. Proven experience designing RESTful APIs and microservices.

SKILLS
- Languages: Java, JavaScript, TypeScript, Python, SQL
- Frontend: React, Redux, HTML5, CSS3, Tailwind CSS, Vite
- Backend: Spring Boot, Spring Security, Hibernate, Node.js, Express, REST APIs, Microservices
- Databases: MySQL, PostgreSQL, Redis, MongoDB
- DevOps & Tools: Docker, Kubernetes, AWS (EC2, S3), Git, CI/CD, Linux

PROJECTS
- Scalable E-Commerce Microservices: Architected high-throughput order processing system in Spring Boot with MySQL and Redis caching. Handled 10,000+ daily orders with 99.9% uptime.
- Real-time Collaboration Dashboard: Built React + WebSockets application for live multi-user analytics. Reduced latency by 45%.
- Cloud Data Migration Pipeline: Containerized legacy monolith into Docker containers and migrated database schema with zero downtime.`,
    jd: `Role: Senior Full Stack Developer
Requirements:
- Strong proficiency in React.js and modern state management.
- Expertise in Java, Spring Boot, and building RESTful microservices.
- Solid experience with relational databases (MySQL/PostgreSQL), indexing, and query optimization.
- Hands-on knowledge of Docker, AWS, and CI/CD pipelines.
- Excellent communication and system design skills.`,
  },
  {
    name: "AI / ML Engineer (Python + PyTorch + FastAPI)",
    resume: `MACHINE LEARNING ENGINEER
Alice Smith | alice.smith@email.com

SUMMARY
Machine Learning Engineer with 3+ years experience building and deploying end-to-end deep learning and NLP models. Passionate about computer vision, LLM inference optimization, and MLOps.

SKILLS
- Languages: Python, C++, SQL, Bash
- ML/AI: PyTorch, TensorFlow, Hugging Face, OpenCV, scikit-learn, NLP, Computer Vision
- Backend & Cloud: FastAPI, Flask, Docker, AWS (SageMaker, S3), Ray, Git
- Databases: PostgreSQL, Vector DBs (ChromaDB, Pinecone)

PROJECTS
- Multimodal Video Sentiment Classifier: Trained custom PyTorch vision & audio model using MediaPipe landmarks and Whisper transcriptions for real-time analysis.
- Distributed LLM Inference API: Built high-throughput FastAPI service with model quantization and streaming responses, reducing latency by 40%.`,
    jd: `Role: Applied AI / ML Engineer
Requirements:
- Deep understanding of Python, PyTorch, and deep learning architectures.
- Experience building production inference APIs with FastAPI or Flask.
- Knowledge of multimodal models (vision and audio processing).
- Experience with Docker, cloud model deployment, and latency optimization.`,
  },
  {
    name: "DevOps & Cloud Engineer (Docker + K8s + AWS)",
    resume: `CLOUD & DEVOPS ENGINEER
David Kumar | david.kumar@email.com

SUMMARY
DevOps Engineer with 4 years expertise in infrastructure as code, container orchestration, CI/CD automation, and cloud security on AWS.

SKILLS
- Cloud: AWS, GCP, Terraform, CloudFormation
- Containers: Docker, Kubernetes, Helm
- CI/CD: GitHub Actions, Jenkins, GitLab CI
- Systems: Linux, Bash, Python, Networking, Monitoring (Prometheus, Grafana)

PROJECTS
- Zero-Downtime Kubernetes Cluster: Deployed auto-scaling EKS cluster with Prometheus alerting and automated canary rollouts.
- Automated Multi-Stage CI/CD Pipeline: Decreased build and deployment times from 45 min to 8 min using Docker caching and parallel test runners.`,
    jd: `Role: Site Reliability & Cloud DevOps Engineer
Requirements:
- Deep experience with AWS cloud infrastructure and Kubernetes orchestration.
- Proficiency in Docker containerization and Terraform IaC.
- Strong scripting skills in Python and Bash.
- Proven track record of high availability, monitoring, and incident response.`,
  }
];

export default function Upload() {
  const [activeTab, setActiveTab] = useState("paste"); // "paste" | "upload"
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [file, setFile] = useState(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extraction, setExtraction] = useState(null);
  const navigate = useNavigate();

  function loadSample(sample) {
    setResumeText(sample.resume);
    setJdText(sample.jd);
    setFile(null);
    setActiveTab("paste");
    setError("");
  }

  async function handleFileChange(e) {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setError("");

    // If it's a plain text file, we can also preview it immediately in the textarea
    if (selected.type === "text/plain" || selected.name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (event) => setResumeText(event.target.result);
      reader.readAsText(selected);
    }
  }

  async function handleUploadAndStart(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let uploadData;

      if (file) {
        // Multipart file upload to backend
        const formData = new FormData();
        formData.append("resumeFile", file);
        if (jdText.trim()) {
          formData.append("jdText", jdText.trim());
        }
        const { data } = await api.post("/resumes/upload-file", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        uploadData = data;
      } else {
        if (!resumeText.trim()) {
          throw new Error("Please paste resume text or upload a resume file.");
        }
        const { data } = await api.post("/resumes", { resumeText, jdText });
        uploadData = data;
      }

      setExtraction(uploadData);

      // Start interview session with personalized questions
      const { data: startData } = await api.post("/interviews/start", {
        resumeId: uploadData.resumeId,
        jobDescriptionId: uploadData.jobDescriptionId,
        questionCount: Number(questionCount),
      });

      navigate(`/interview/${startData.sessionId}`, {
        state: { firstQuestion: startData.questions[0] }
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to process resume and start interview");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Start Personalized Interview</h1>
        <p className="muted">
          AdaptIQ extracts your skills, projects, and target role requirements to generate an adaptive, tailored interview.
        </p>
      </div>

      <div className="preset-bar card">
        <div style={{ marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
          🚀 Quick Test Drive — Load a Sample Profile:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {SAMPLE_PROFILES.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="btn-secondary"
              onClick={() => loadSample(p)}
              style={{ padding: "6px 12px", fontSize: "13px" }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="tabs" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "paste" ? "active" : ""}`}
          onClick={() => setActiveTab("paste")}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            background: activeTab === "paste" ? "#2563eb" : "#e5e7eb",
            color: activeTab === "paste" ? "white" : "#374151"
          }}
        >
          Paste Resume Text
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "600",
            background: activeTab === "upload" ? "#2563eb" : "#e5e7eb",
            color: activeTab === "upload" ? "white" : "#374151"
          }}
        >
          Upload Resume File (PDF / TXT)
        </button>
      </div>

      <form onSubmit={handleUploadAndStart} className="card">
        {activeTab === "upload" ? (
          <div>
            <label>Upload Resume File (.pdf or .txt)</label>
            <div
              style={{
                border: "2px dashed #93c5fd",
                borderRadius: "10px",
                padding: "32px",
                textAlign: "center",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
                marginBottom: "16px"
              }}
              onClick={() => document.getElementById("file-input").click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
              {file ? (
                <div>
                  <strong style={{ color: "#2563eb" }}>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "12px" }}>Click to replace file</p>
                </div>
              ) : (
                <div>
                  <strong>Click or Drag & Drop your resume here</strong>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: "13px" }}>Supports PDF or plain text</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label>Resume Content</label>
            <textarea
              rows={9}
              placeholder="Paste your resume content, experience, skills, and projects here..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              required={!file}
            />
          </div>
        )}

        <label>Target Job Description (Optional but recommended)</label>
        <textarea
          rows={5}
          placeholder="Paste the job description you're targeting (skills required, responsibilities)..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />

        <div style={{ marginTop: "16px" }}>
          <label>Number of Interview Rounds</label>
          <select value={questionCount} onChange={(e) => setQuestionCount(e.target.value)}>
            <option value={3}>3 Questions (Quick Practice)</option>
            <option value={5}>5 Questions (Standard Mock Interview)</option>
            <option value={8}>8 Questions (In-Depth Technical Simulation)</option>
          </select>
        </div>

        {error && <div className="error-banner" style={{ marginTop: "16px" }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            fontWeight: "600"
          }}
        >
          {loading ? "Analyzing Profile & Generating Questions..." : "Generate Personalized Questions & Begin"}
        </button>
      </form>

      {extraction && (
        <div className="card" style={{ borderLeft: "4px solid #2563eb" }}>
          <h3>Personalization Summary</h3>
          <p>
            <strong>Identified Skills:</strong>{" "}
            {extraction.skills?.length > 0 ? (
              <span style={{ color: "#1e40af" }}>{extraction.skills.join(", ")}</span>
            ) : (
              "General software engineering"
            )}
          </p>
          {extraction.projects?.length > 0 && (
            <p>
              <strong>Detected Projects:</strong> {extraction.projects.join(" • ")}
            </p>
          )}
          {extraction.requirements?.length > 0 && (
            <p>
              <strong>Target JD Alignment:</strong> {extraction.requirements.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
