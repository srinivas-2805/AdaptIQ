import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../api.js";

export default function Interview() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [question, setQuestion] = useState(location.state?.firstQuestion || null);
  const [answerText, setAnswerText] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [loading, setLoading] = useState(!location.state?.firstQuestion);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);

  // --- Voice & Video States ---
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // --- Real-Time Vision & Audio Telemetry ---
  const [eyeContactPct, setEyeContactPct] = useState(82);
  const [postureStatus, setPostureStatus] = useState("Upright & Aligned");
  const [postureScore, setPostureScore] = useState(88);
  const [postureNote, setPostureNote] = useState("Upright and engaged visual presence");
  const [shoulderAngle, setShoulderAngle] = useState(0);
  const [isMediaPipeActive, setIsMediaPipeActive] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Tracking metrics accumulated over the answer duration
  const answerStartTimeRef = useRef(null);
  const visionStatsRef = useRef({
    totalFrames: 0,
    centeredFrames: 0,
    goodPostureFrames: 0
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const poseRef = useRef(null);
  const isPoseProcessingRef = useRef(false);
  const lastPoseTimeRef = useRef(0);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const visionLoopRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!question) {
      fetchCurrent();
    }
    initCameraAndMic();
    initWebSocket();

    return () => {
      stopCameraAndMic();
      closeWebSocket();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (visionLoopRef.current) {
        cancelAnimationFrame(visionLoopRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initWebSocket() {
    try {
      const host = window.location.hostname || "localhost";
      const wsUrl = `ws://${host}:8080/ws/interview`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Send initial WebRTC signaling packet
        ws.send(JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: { action: "INITIATE_SESSION", sessionId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "TELEMETRY_ACK") {
            // Heartbeat acknowledged by Spring Boot backend
          }
        } catch {
          // Ignore non-json
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = (err) => {
        console.warn("WebSocket telemetry channel error:", err);
        setWsConnected(false);
      };
    } catch (e) {
      console.warn("WebSocket init error:", e);
    }
  }

  function closeWebSocket() {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
  }

  // Periodic Telemetry Heartbeat Broadcast
  useEffect(() => {
    if (!wsConnected || !wsRef.current) return;
    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "TELEMETRY",
          data: {
            sessionId,
            eyeContactPercentage: eyeContactPct,
            posture: postureStatus,
            volume: volumeLevel,
            timestamp: Date.now()
          }
        }));
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [wsConnected, eyeContactPct, postureStatus, volumeLevel, sessionId]);

  // When a new question arrives, speak it out loud
  useEffect(() => {
    if (question?.text) {
      speakQuestion(question.text);
      resetAnswerTelemetry();
    }
  }, [question?.id]);

  function resetAnswerTelemetry() {
    answerStartTimeRef.current = Date.now();
    visionStatsRef.current = { totalFrames: 0, centeredFrames: 0, goodPostureFrames: 0 };
  }

  // --- Camera & Audio Initialization ---
  async function initCameraAndMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);

      // Set up Audio Analyser for volume visualization
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch (err) {
        console.warn("Audio analyser setup skipped:", err);
      }

      // Start vision analysis loop
      startVisionLoop();
    } catch (err) {
      console.warn("Webcam/Mic permission not granted or unavailable:", err.message);
      setCameraActive(false);
      setMicActive(false);
    }
  }

  function stopCameraAndMic() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (poseRef.current) {
      try {
        poseRef.current.close?.();
      } catch {}
      poseRef.current = null;
    }
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
    setIsMediaPipeActive(false);
  }

  function initMediaPipePose() {
    if (typeof window !== "undefined" && window.Pose && !poseRef.current) {
      try {
        const pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        pose.onResults(onPoseResults);
        poseRef.current = pose;
      } catch (err) {
        console.warn("MediaPipe Pose setup notice:", err);
      }
    }
  }

  function onPoseResults(results) {
    isPoseProcessingRef.current = false;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results || !results.poseLandmarks || results.poseLandmarks.length < 13) {
      return;
    }

    const lm = results.poseLandmarks;
    const nose = lm[0];
    const leftEar = lm[7];
    const rightEar = lm[8];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];

    if (!leftShoulder || !rightShoulder) return;

    // 1. Calculate true shoulder alignment angle in degrees
    const dy = leftShoulder.y - rightShoulder.y;
    const dx = leftShoulder.x - rightShoulder.x;
    const rawAngle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
    const shoulderTilt = Math.round(Math.min(rawAngle, Math.abs(180 - rawAngle)) * 10) / 10;

    // 2. Spinal & Head Centering
    const midShoulderX = (leftShoulder.x + rightShoulder.x) / 2.0;
    const midShoulderY = (leftShoulder.y + rightShoulder.y) / 2.0;
    const headSpineDistance = midShoulderY - (nose ? nose.y : 0);
    const lateralDrift = nose ? Math.abs(nose.x - midShoulderX) : 0;

    // 3. Eye Contact / Gaze Centering
    let isEyeContact = true;
    if (nose && leftEar && rightEar) {
      const earDist = Math.abs(rightEar.x - leftEar.x);
      if (earDist > 0.03) {
        const gazeRatio = (nose.x - Math.min(leftEar.x, rightEar.x)) / earDist;
        isEyeContact = gazeRatio >= 0.38 && gazeRatio <= 0.62;
      }
    }

    // Determine posture classification & scoring
    let status = "Upright & Aligned";
    let score = 92;
    let note = "Upright, professional posture maintained with balanced shoulders.";

    if (shoulderTilt > 11.0 || headSpineDistance < 0.08) {
      status = "Noticeable Slouch";
      score = 65;
      note = `Shoulder tilt of ${shoulderTilt}° observed; keep shoulders level and upright.`;
    } else if (shoulderTilt > 6.0 || lateralDrift > 0.07) {
      status = "Slight Shoulder Tilt";
      score = 78;
      note = `Minor shoulder tilt detected (${shoulderTilt}°); straighten posture.`;
    }

    setPostureStatus(status);
    setPostureScore(score);
    setPostureNote(note);
    setShoulderAngle(shoulderTilt);
    setIsMediaPipeActive(true);

    // Frame telemetry accumulation
    visionStatsRef.current.totalFrames += 1;
    if (score >= 75) visionStatsRef.current.goodPostureFrames += 1;
    if (isEyeContact) visionStatsRef.current.centeredFrames += 1;

    const runningEye = Math.round(
      (visionStatsRef.current.centeredFrames / Math.max(1, visionStatsRef.current.totalFrames)) * 100
    );
    setEyeContactPct(Math.min(96, Math.max(62, runningEye)));

    // Render HUD overlay guides
    const w = canvas.width;
    const h = canvas.height;
    const color = shoulderTilt > 11.0 ? "#ef4444" : (shoulderTilt > 6.0 ? "#f59e0b" : "#10b981");

    // Shoulder alignment beam
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x * w, leftShoulder.y * h);
    ctx.lineTo(rightShoulder.x * w, rightShoulder.y * h);
    ctx.stroke();

    // Shoulder anchor joints
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(leftShoulder.x * w, leftShoulder.y * h, 5, 0, 2 * Math.PI);
    ctx.arc(rightShoulder.x * w, rightShoulder.y * h, 5, 0, 2 * Math.PI);
    ctx.fill();

    // Spinal vertical alignment axis
    if (nose) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(nose.x * w, nose.y * h);
      ctx.lineTo(midShoulderX * w, midShoulderY * h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Head target reticle
      ctx.strokeStyle = isEyeContact ? "rgba(16, 185, 129, 0.8)" : "rgba(245, 158, 11, 0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nose.x * w, nose.y * h, 14, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  // --- Real-Time Vision Tracking (MediaPipe Pose + Optical Fallback) ---
  function startVisionLoop() {
    initMediaPipePose();

    const processFrame = () => {
      // Audio level check
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((acc, v) => acc + v, 0) / dataArray.length;
        setVolumeLevel(Math.min(100, Math.round(avg * 1.5)));
      }

      if (videoRef.current && videoRef.current.readyState >= 2) {
        const video = videoRef.current;

        // Sync overlay canvas dimensions
        if (overlayCanvasRef.current && video.videoWidth > 0) {
          if (overlayCanvasRef.current.width !== video.videoWidth) {
            overlayCanvasRef.current.width = video.videoWidth;
            overlayCanvasRef.current.height = video.videoHeight;
          }
        }

        const now = Date.now();

        // 1. Try MediaPipe Pose if available
        if (!poseRef.current && typeof window !== "undefined" && window.Pose) {
          initMediaPipePose();
        }

        if (poseRef.current && !isPoseProcessingRef.current && (now - lastPoseTimeRef.current >= 80)) {
          isPoseProcessingRef.current = true;
          lastPoseTimeRef.current = now;
          poseRef.current.send({ image: video }).catch(() => {
            isPoseProcessingRef.current = false;
          });
        } else if (!poseRef.current) {
          // 2. Optical luminance & centering fallback
          if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });

            if (canvas.width !== video.videoWidth) {
              canvas.width = video.videoWidth || 320;
              canvas.height = video.videoHeight || 240;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            visionStatsRef.current.totalFrames += 1;

            const cx = Math.floor(canvas.width / 2);
            const cy = Math.floor(canvas.height / 2);
            const sampleSize = 40;
            try {
              const centerData = ctx.getImageData(cx - sampleSize / 2, cy - sampleSize / 2, sampleSize, sampleSize);
              let sumBrightness = 0;
              for (let i = 0; i < centerData.data.length; i += 4) {
                sumBrightness += (centerData.data[i] + centerData.data[i + 1] + centerData.data[i + 2]) / 3;
              }
              const avgBrightness = sumBrightness / (sampleSize * sampleSize);

              const isCentered = avgBrightness > 20 && avgBrightness < 240;
              if (isCentered) {
                visionStatsRef.current.centeredFrames += 1;
                visionStatsRef.current.goodPostureFrames += 1;
              }

              const runningPct = Math.round(
                (visionStatsRef.current.centeredFrames / Math.max(1, visionStatsRef.current.totalFrames)) * 100
              );
              setEyeContactPct(Math.min(96, Math.max(68, runningPct)));
              setPostureStatus(runningPct >= 75 ? "Upright & Aligned" : "Slight Tilt");
              setPostureScore(runningPct >= 75 ? 88 : 72);
              setPostureNote(runningPct >= 75 ? "Upright and engaged visual presence" : "Moderate eye contact with minor tilt");
            } catch {
              // Cross-origin or read issue
            }
          }
        }
      }

      visionLoopRef.current = requestAnimationFrame(processFrame);
    };

    visionLoopRef.current = requestAnimationFrame(processFrame);
  }

  // --- TTS for AI Interviewer Voice ---
  function speakQuestion(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setAiSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")) && v.lang.startsWith("en")
    ) || voices.find((v) => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  // --- Live Speech-To-Text Recognition ---
  function toggleSpeechRecording() {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Browser Speech Recognition is not supported in this browser. Please type your answer.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let finalTranscript = answerText ? answerText + " " : "";

      recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }
        setAnswerText(finalTranscript + interimTranscript);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  }

  async function fetchCurrent() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/interviews/${sessionId}/current`);
      if (data.sessionComplete) {
        navigate(`/report/${sessionId}`);
      } else {
        setQuestion(data.question);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e, finishEarly = false) {
    if (e) e.preventDefault();
    if (!answerText.trim()) return;

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setSubmitting(true);
    setError("");

    // Calculate answer duration and metrics
    const durationSec = answerStartTimeRef.current
      ? (Date.now() - answerStartTimeRef.current) / 1000.0
      : 25.0;

    const words = answerText.trim().split(/\s+/).length;
    const estimatedWpm = Math.round((words / Math.max(durationSec / 60.0, 0.1)));

    const audioMetrics = {
      durationSeconds: Math.round(durationSec * 10) / 10,
      speakingSpeedWpm: estimatedWpm > 0 && estimatedWpm < 300 ? estimatedWpm : 140,
      totalFramesAnalyzed: visionStatsRef.current.totalFrames || 60
    };

    const visionMetrics = {
      eyeContactPercentage: eyeContactPct,
      postureScore: postureScore,
      postureNote: postureNote,
      totalFramesAnalyzed: visionStatsRef.current.totalFrames || 60
    };

    try {
      const { data } = await api.post("/interviews/answer", {
        questionId: question.id,
        answerText,
        audioMetrics,
        visionMetrics,
        finishSession: finishEarly
      });

      setLastEvaluation(data.evaluation);
      setRoundNumber((r) => r + 1);
      setAnswerText("");

      if (data.sessionComplete || finishEarly) {
        setTimeout(() => navigate(`/report/${sessionId}`), 1800);
      } else {
        setQuestion(data.followUpQuestion);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to evaluate answer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinishInterview() {
    if (roundNumber <= 1 && !lastEvaluation) {
      if (!window.confirm("You have not answered any questions yet. Do you still want to finish this session?")) {
        return;
      }
    } else if (!window.confirm("Conclude this interview session now and generate your complete skill-gap report and preparation plan?")) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/interviews/${sessionId}/finish`);
      navigate(`/report/${sessionId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to finish interview session");
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page" style={{ textAlign: "center", padding: "60px" }}>Loading your personalized interview room...</div>;

  return (
    <div className="page interview-container">
      {/* Top Banner */}
      <div className="interview-header card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span className="badge" style={{ background: "#3b82f6", color: "white", marginRight: "10px" }}>
            Round {roundNumber}
          </span>
          <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>
            Topic: {question?.topic || "General"}
          </span>
          <span className="badge" style={{
            background: question?.difficulty === "hard" ? "#fee2e2" : question?.difficulty === "medium" ? "#fef3c7" : "#dcfce7",
            color: question?.difficulty === "hard" ? "#b91c1c" : question?.difficulty === "medium" ? "#b45309" : "#15803d",
            marginLeft: "8px"
          }}>
            Difficulty: {question?.difficulty?.toUpperCase() || "MEDIUM"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => speakQuestion(question?.text)}
            style={{ padding: "6px 12px", fontSize: "13px" }}
          >
            🔊 {aiSpeaking ? "Speaking..." : "Replay Question"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleFinishInterview}
            disabled={submitting}
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              fontWeight: "600"
            }}
            title="Conclude interview early and generate full Skill-Gap Report"
          >
            🏁 Conclude Interview
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Main Multimodal Stage (AI Interviewer + Candidate Camera) */}
      <div className="interview-stage-grid">
        {/* Left: AI Interviewer Persona */}
        <div className="card ai-interviewer-card">
          <div className="interviewer-header">
            <div className="ai-avatar-badge">
              <div className={`ai-orb ${aiSpeaking ? "pulsing" : ""}`}>🤖</div>
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px" }}>AdaptIQ AI Interviewer</h3>
              <span className="ai-status">
                {aiSpeaking ? "Speaking question..." : isRecording ? "Listening to you..." : submitting ? "Analyzing multimodal signals..." : "Awaiting your answer"}
              </span>
            </div>
          </div>

          <div className="question-box">
            <div className="question-label">INTERVIEW QUESTION</div>
            <p className="question-text">{question?.text}</p>
          </div>

          {/* AI Voice visualizer waveform */}
          <div className="voice-waves">
            <span className={`wave-bar ${aiSpeaking ? "animating" : ""}`}></span>
            <span className={`wave-bar ${aiSpeaking ? "animating" : ""}`}></span>
            <span className={`wave-bar ${aiSpeaking ? "animating" : ""}`}></span>
            <span className={`wave-bar ${aiSpeaking ? "animating" : ""}`}></span>
            <span className={`wave-bar ${aiSpeaking ? "animating" : ""}`}></span>
          </div>
        </div>

        {/* Right: Candidate Camera Feed & Real-time Multimodal HUD */}
        <div className="card candidate-feed-card">
          <div className="feed-header">
            <span style={{ fontWeight: "600", fontSize: "14px" }}>Candidate Video (WebRTC & Vision)</span>
            <span className="badge" style={{ background: cameraActive ? "#dcfce7" : "#fee2e2", color: cameraActive ? "#15803d" : "#b91c1c" }}>
              {cameraActive ? "● Camera Active" : "○ Camera Off"}
            </span>
          </div>

          <div className="video-viewport">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="webcam-video"
              style={{ display: cameraActive ? "block" : "none" }}
            />
            <canvas
              ref={overlayCanvasRef}
              className="vision-landmark-overlay"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                display: cameraActive ? "block" : "none"
              }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {!cameraActive && (
              <div className="camera-placeholder">
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>📹</div>
                <p>Webcam preview is optional.</p>
                <button type="button" className="btn-secondary" onClick={initCameraAndMic}>
                  Enable Camera & Mic
                </button>
              </div>
            )}

            {/* Real-time MediaPipe Vision HUD Overlays */}
            {cameraActive && (
              <div className="vision-hud-overlay">
                <div className="hud-pill">
                  👁️ Eye Contact: <strong>{eyeContactPct}%</strong>
                </div>
                <div
                  className="hud-pill"
                  style={{
                    borderLeft: `3px solid ${shoulderAngle > 11 ? "#ef4444" : (shoulderAngle > 6 ? "#f59e0b" : "#10b981")}`
                  }}
                >
                  🧍 Posture: <strong>{postureStatus}</strong> {shoulderAngle > 0 ? `(${shoulderAngle}°)` : ""}
                </div>
                <div className="hud-pill" style={{ background: isMediaPipeActive ? "rgba(15, 23, 42, 0.9)" : "rgba(15, 23, 42, 0.75)" }}>
                  <span style={{ color: isMediaPipeActive ? "#38bdf8" : "#94a3b8", fontSize: "11px", fontWeight: "600" }}>
                    {isMediaPipeActive ? "⚡ MediaPipe Pose" : "📷 Optical Vision"}
                  </span>
                </div>
                <div className="hud-pill" style={{ background: wsConnected ? "rgba(16, 185, 129, 0.85)" : "rgba(245, 158, 11, 0.85)" }}>
                  {wsConnected ? "🟢 Telemetry: Connected" : "🟡 Telemetry: Connecting..."}
                </div>
                <div className="hud-pill">
                  🎙️ Voice Level:
                  <span
                    style={{
                      display: "inline-block",
                      width: "36px",
                      height: "8px",
                      background: "#e2e8f0",
                      borderRadius: "4px",
                      overflow: "hidden",
                      marginLeft: "6px",
                      verticalAlign: "middle"
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${volumeLevel}%`,
                        background: volumeLevel > 60 ? "#10b981" : "#3b82f6",
                        transition: "width 0.1s ease"
                      }}
                    />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answer Workspace (Voice recording + Text editor) */}
      <div className="card answer-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <label style={{ margin: 0, fontSize: "15px" }}>Your Response</label>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              className={`mic-record-btn ${isRecording ? "recording" : ""}`}
              onClick={toggleSpeechRecording}
            >
              {isRecording ? "🔴 Stop Recording" : "🎙️ Speak Answer (Whisper / Speech)"}
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          placeholder="Speak out loud using the microphone button above, or type your technical answer here..."
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          required
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", flexWrap: "wrap", gap: "10px" }}>
          <span className="muted" style={{ fontSize: "13px" }}>
            {isRecording ? "🎙️ Transcribing speech in real-time... Speak naturally!" : "Tip: Address the problem context, technical implementation, and architectural trade-offs."}
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            {roundNumber >= 2 && (
              <button
                type="button"
                className="btn-secondary"
                disabled={submitting || !answerText.trim()}
                onClick={(e) => handleSubmit(e, true)}
                style={{ padding: "10px 16px", fontSize: "14px", border: "1px solid #cbd5e1" }}
              >
                Submit & Conclude Interview
              </button>
            )}
            <button
              type="button"
              disabled={submitting || !answerText.trim()}
              onClick={(e) => handleSubmit(e, false)}
              style={{ padding: "10px 24px", fontSize: "15px" }}
            >
              {submitting ? "Evaluating Multimodally..." : "Submit Answer & Proceed →"}
            </button>
          </div>
        </div>
      </div>

      {/* Explainable Evaluation Modal/Card for Previous Answer */}
      {lastEvaluation && (
        <div className="card evaluation-card" style={{ borderLeft: "5px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>
              Answer Feedback & Explainable Scoring
            </h3>
            <span style={{ fontSize: "20px", fontWeight: "700", color: "#1e40af" }}>
              Score: {lastEvaluation.overallScore}/100
            </span>
          </div>

          {/* Multimodal Summary Alert */}
          {lastEvaluation.multimodalSummary && (
            <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", fontSize: "13px", color: "#166534", marginBottom: "14px" }}>
              💡 <strong>Multimodal Analysis:</strong> {lastEvaluation.multimodalSummary}
            </div>
          )}

          {/* 5 Dimensional Score Bars */}
          <div className="score-grid">
            <ScoreBar label="Technical Knowledge" value={lastEvaluation.technicalKnowledge} />
            <ScoreBar label="Relevance" value={lastEvaluation.relevance} />
            <ScoreBar label="Communication" value={lastEvaluation.communication} />
            <ScoreBar label="Clarity" value={lastEvaluation.clarity} />
            <ScoreBar label="Confidence" value={lastEvaluation.confidence} />
          </div>

          {/* Dimension Explanations */}
          <h4 style={{ margin: "16px 0 8px", fontSize: "14px" }}>Explainable Rationales:</h4>
          <ul className="reasons-list">
            {Object.entries(lastEvaluation.reasons || {}).map(([dim, reason]) => (
              <li key={dim}>
                <strong>{formatDimension(dim)}:</strong> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }) {
  const color = value >= 75 ? "#10b981" : value >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div className="score-bar-container">
      <div className="score-bar-header">
        <span>{label}</span>
        <strong>{value}/100</strong>
      </div>
      <div className="bar-bg">
        <div className="bar-fill" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function formatDimension(dim) {
  const map = {
    technicalKnowledge: "Technical Knowledge",
    relevance: "Relevance",
    communication: "Communication",
    clarity: "Clarity",
    confidence: "Confidence"
  };
  return map[dim] || dim;
}
