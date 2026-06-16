"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import {
  Mic,
  MicOff,
  Monitor,
  Phone,
  Video,
  VideoOff,
} from "lucide-react";
import { logoutUser } from "@/lib/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AlertItem = {
  id: string;
  message: string;
  timestamp: string;
  type: string;
};

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
};

const getScoreColor = (score: number) => {
  if (score > 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-400";
  return "bg-red-500";
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`h-full rounded-full ${getScoreColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function InterviewRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const noFaceChecksRef = useRef(0);
  const noFaceCountRef = useRef<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const durationRef = useRef<number>(0);
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const lastNoiseAlert = useRef<number>(0);
  const sessionAlertsRef = useRef<string[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [focusScore, setFocusScore] = useState(50);
  const [confidenceScore, setConfidenceScore] = useState(50);
  const [trustScore, setTrustScore] = useState(85);
  const [overallScore, setOverallScore] = useState(62);
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: "1",
      message: "Interview room initialized.",
      timestamp: "00:00",
      type: "info",
    },
  ]);
  const [duration, setDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnected, setPeerConnected] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [aiReport, setAiReport] = useState<{
    overallScore: number;
    recommendation: string;
    behavioralAssessment: string;
    suspiciousActivities: string[];
    weakPoints: string[];
    strongPoints: string[];
    courseRecommendations: { title: string; platform: string; url: string; reason: string }[];
    summary: string;
  } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "live" | "error"
  >("connecting");

  const addAlert = (message: string, type: string, alertType: string) => {
    const now = Date.now();
    if (now - (lastAlertTimeRef.current[alertType] || 0) < 5000) return;
    lastAlertTimeRef.current[alertType] = now;

    setAlerts((prev) => [
      {
        id: crypto.randomUUID(),
        message,
        type,
        timestamp: (() => {
          const s = durationRef.current % 60;
          const m = Math.floor(durationRef.current / 60);
          return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        })(),
      },
      ...prev,
    ].slice(0, 10));
    sessionAlertsRef.current.push(message);
  };

  const roomId = params.roomId;

  const getFaceApi = async () => {
    if (typeof window === "undefined") return null;
    if ((window as any).faceapi) return (window as any).faceapi;
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src =
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js";
      s.onload = () => resolve((window as any).faceapi);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("[InGuard] Remote track received, streams:", event.streams.length);
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStream(stream);
      setPeerConnected(true);
      
      const attachStream = () => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(e => 
            console.log("[InGuard] Remote video play error:", e)
          );
          console.log("[InGuard] Remote video attached successfully");
        } else {
          console.log("[InGuard] remoteVideoRef not ready, retrying...");
          setTimeout(attachStream, 500);
        }
      };
      attachStream();
    };

    pc.onconnectionstatechange = () => {
      console.log("[InGuard] Peer connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setPeerConnected(true);
        addAlert("✅ Peer connected - video call active", "info", "peer-connected");
      }
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setPeerConnected(false);
        addAlert("⚠️ Peer disconnected", "warning", "peer-disconnected");
      }
    };

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, streamRef.current!);
      });
    }

    peerRef.current = pc;
    return pc;
  };

  const generateInterviewReport = async () => {
    setIsGeneratingReport(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
      const sessionDuration = durationRef.current;
      const minutes = Math.floor(sessionDuration / 60);
      const seconds = sessionDuration % 60;
      const durationStr = `${minutes}m ${seconds}s`;

      const suspiciousCount = sessionAlertsRef.current.length;
      const faceAlerts = sessionAlertsRef.current.filter(a => a.includes('Face')).length;
      const noiseAlerts = sessionAlertsRef.current.filter(a => a.includes('noise')).length;
      const tabAlerts = sessionAlertsRef.current.filter(a => a.includes('Tab')).length;

      const prompt = `You are an expert HR analyst. Analyze this interview monitoring data and generate a report.

Interview Data:
- Duration: ${durationStr}
- Final Focus Score: ${focusScore}/100
- Final Confidence Score: ${confidenceScore}/100  
- Final Trust Score: ${trustScore}/100
- Final Overall Score: ${overallScore}/100
- Total Suspicious Alerts: ${suspiciousCount}
- Face Not Visible Alerts: ${faceAlerts}
- Background Noise Alerts: ${noiseAlerts}
- Tab Switch Alerts: ${tabAlerts}

Return ONLY valid JSON, no markdown, no explanation:
{
  "overallScore": 75,
  "recommendation": "Recommended for next round" or "Not recommended" or "Consider with reservations",
  "behavioralAssessment": "2-3 sentence assessment of candidate behavior during interview",
  "suspiciousActivities": ["activity 1", "activity 2"],
  "weakPoints": ["weak point 1", "weak point 2", "weak point 3"],
  "strongPoints": ["strong point 1", "strong point 2"],
  "courseRecommendations": [
    {"title": "Course Name", "platform": "Udemy", "url": "https://udemy.com", "reason": "why helpful"}
  ],
  "summary": "Overall 2-3 sentence summary of the candidate performance"
}`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const report = JSON.parse(clean);
      setAiReport(report);
      setShowReport(true);
    } catch (err) {
      console.error("Report generation failed:", err);
      setAiReport({
        overallScore: overallScore,
        recommendation: overallScore >= 70 ? "Recommended for next round" : "Consider with reservations",
        behavioralAssessment: "The candidate completed the interview session.",
        suspiciousActivities: sessionAlertsRef.current.slice(0, 5),
        weakPoints: ["Detailed analysis unavailable"],
        strongPoints: ["Completed the interview"],
        courseRecommendations: [],
        summary: `Candidate scored ${overallScore}/100 overall during a ${Math.floor(durationRef.current/60)} minute session.`,
      });
      setShowReport(true);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    const overall = Math.round((focusScore + confidenceScore + trustScore) / 3);
    setOverallScore(overall);
  }, [focusScore, confidenceScore, trustScore]);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    const userStr = localStorage.getItem("auth-user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        useAuthStore.getState().setAuth(user, token);
      } catch (e) {
        console.error("Failed to parse stored user");
      }
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const connectingTimer = window.setTimeout(() => {
      setIsConnecting(false);
    }, 2000);

    return () => window.clearTimeout(connectingTimer);
  }, []);

  useEffect(() => {
    const durationTimer = window.setInterval(() => {
      setDuration((currentDuration) => {
        const newDuration = currentDuration + 1;
        durationRef.current = newDuration;
        return newDuration;
      });
    }, 1000);

    return () => window.clearInterval(durationTimer);
  }, []);

  useEffect(() => {
    let alreadyHidden = false;
    const tabInterval = window.setInterval(() => {
      const hidden = document.hidden;
      if (hidden && !alreadyHidden) {
        alreadyHidden = true;
        console.log('[InGuard] TAB HIDDEN - firing alert');
        const now = Date.now();
        const sec = durationRef.current % 60;
        const min = Math.floor(durationRef.current / 60);
        const ts = min.toString().padStart(2,'0')+':'+sec.toString().padStart(2,'0');
        setAlerts(prev => [
          { id: String(now), message: '📱 Tab switch detected', type: 'danger', timestamp: ts },
          ...prev
        ].slice(0, 10));
        sessionAlertsRef.current.push("Tab switch detected");
        setTrustScore(prev => Math.max(0, prev - 15));
      }
      if (!hidden) alreadyHidden = false;
    }, 500);
    return () => window.clearInterval(tabInterval);
  }, []);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !token) {
      router.push("/login");
      return;
    }
  }, [isHydrated, router, token, user]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !token) {
      router.push("/login");
      return;
    }

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnectionStatus("live"));

    socket.on("disconnect", () => setConnectionStatus("error"));

    socket.on("connect_error", () => setConnectionStatus("error"));

    socket.on("webrtc-offer", async ({ offer }) => {
      console.log("[InGuard] Received WebRTC offer");
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc-answer", { roomId, answer });
    });

    socket.on("webrtc-answer", async ({ answer }) => {
      console.log("[InGuard] Received WebRTC answer");
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.on("webrtc-ice", async ({ candidate }) => {
      console.log("[InGuard] Received ICE candidate");
      if (peerRef.current) {
        try {
          if (peerRef.current.remoteDescription) {
            await peerRef.current.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("[InGuard] ICE candidate added");
          } else {
            console.log("[InGuard] No remote description yet, queuing ICE");
            setTimeout(async () => {
              try {
                if (peerRef.current) {
                  await peerRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                  );
                }
              } catch (e) {
                console.error("[InGuard] Queued ICE error:", e);
              }
            }, 1000);
          }
        } catch (e) {
          console.error("[InGuard] ICE candidate error:", e);
        }
      }
    });

    socket.on("user-joined", async ({ userId, role }) => {
      console.log("[InGuard] User joined:", userId, role);
      addAlert(`👤 ${role} joined the room`, "info", "user-joined");
      
      if (user?.role === "recruiter") {
        console.log("[InGuard] Waiting 2s then creating offer...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!streamRef.current) {
          console.log("[InGuard] No local stream yet, waiting more...");
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log("[InGuard] Creating WebRTC offer");
        try {
          const pc = createPeerConnection();
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          socket.emit("webrtc-offer", { roomId, offer });
          console.log("[InGuard] Offer sent");
        } catch (err) {
          console.error("[InGuard] Offer creation failed:", err);
        }
      }
    });

    socket.emit("join-room", {
      roomId,
      userId: user.id,
      role: user.role,
    });

    return () => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      socket.emit("leave-room", {
        roomId,
        userId: user.id,
      });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isHydrated, roomId, router, token, user]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user || !token) {
      return;
    }

    let isMounted = true;

    const emitSuspiciousEvent = (
      type: "tab-switch" | "multiple-persons" | "noise",
      message: string,
      alertType: string,
      trustPenalty = 5
    ) => {
      addAlert(message, type === "tab-switch" ? "danger" : "warning", alertType);
      setTrustScore((currentScore) => Math.max(0, currentScore - trustPenalty));
      socketRef.current?.emit("suspicious-event", { roomId, type });
    };

    const startFaceDetection = () => {
      detectionIntervalRef.current = window.setInterval(async () => {
        console.log('Face detection tick, readyState:', localVideoRef.current?.readyState);
        const localVideo = localVideoRef.current;
        const faceapi = await getFaceApi();

        if (!localVideo || localVideo.readyState < 2 || !faceapi) {
          return;
        }

        try {
          const detections = await faceapi
            .detectAllFaces(
              localVideo,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.2 })
            )
            .withFaceLandmarks()
            .withFaceExpressions();

          if (!isMounted) {
            return;
          }

          if (!detections || detections.length === 0) {
            noFaceCountRef.current = (noFaceCountRef.current || 0) + 1;
            setFocusScore(prev => Math.max(0, prev - 5));
            if (noFaceCountRef.current >= 3) {
              noFaceCountRef.current = 0;
              addAlert('👁 Face not visible - please stay in frame', 'warning', 'face-missing');
              setTrustScore(prev => Math.max(0, prev - 5));
              socketRef.current?.emit('suspicious-event', { roomId, type: 'multiple-persons' });
            }
            return;
          }

          noFaceCountRef.current = 0;
          const detection = detections[0];
          const box = detection.detection.box;
          const videoWidth = localVideoRef.current?.videoWidth || 640;
          const videoHeight = localVideoRef.current?.videoHeight || 480;

          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const offsetX = Math.abs(faceCenterX - videoWidth / 2) / (videoWidth / 2);
          const offsetY = Math.abs(faceCenterY - videoHeight / 2) / (videoHeight / 2);
          const newFocus = Math.round(Math.max(0, 100 - offsetX * 50 - offsetY * 30));
          setFocusScore(newFocus);

          const expressions = detection.expressions;
          const positive = (expressions.happy||0)*100 + (expressions.neutral||0)*75 + (expressions.surprised||0)*50;
          const negative = (expressions.fearful||0)*80 + (expressions.sad||0)*70 + (expressions.angry||0)*90;
          const newConfidence = Math.min(100, Math.round(Math.max(0, positive - negative * 0.5) * 1.2));
          setConfidenceScore(newConfidence);

        } catch (error) {
          console.error("Face detection failed:", error);
        }
      }, 800);
    };

    const startNoiseDetection = (stream: MediaStream) => {
      const audioContext = new AudioContext();
      audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      audioContextRef.current = audioContext;
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioIntervalRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        const nonZero = Array.from(dataArray).filter(v => v > 0).length;
        if (nonZero > 5) {
          const now = Date.now();
          if (now - lastNoiseAlert.current < 8000) return;
          lastNoiseAlert.current = now;
          const sec = durationRef.current % 60;
          const min = Math.floor(durationRef.current / 60);
          const ts = min.toString().padStart(2,'0')+':'+sec.toString().padStart(2,'0');
          setAlerts(prev => [
            { id: String(now), message: '🔊 Background noise detected', type: 'warning', timestamp: ts },
            ...prev
          ].slice(0, 10));
          sessionAlertsRef.current.push("Background noise detected");
          setTrustScore(prev => Math.max(0, prev - 3));
        }
      }, 3000);
    };

    const startMonitoring = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;

          try {
            await localVideoRef.current.play();
          } catch (playError) {
            console.error("Local video playback failed:", playError);
          }
        }

        startNoiseDetection(stream);
        addAlert("Loading AI models...", "info", "loading-ai-models");

        const faceapi = await getFaceApi();
        if (!faceapi) return;

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        if (!isMounted) {
          return;
        }

        addAlert("AI monitoring active", "info", "ai-active");
        startFaceDetection();
      } catch (error) {
        console.error("Monitoring setup failed:", error);
        setFocusScore(0);
        setConfidenceScore(0);
        setTrustScore(0);
        setConnectionStatus("error");
        setCameraError("Camera access denied. Please allow camera permissions and refresh.");
        addAlert(
          "Camera access denied. Please allow camera permissions and refresh.",
          "danger",
          "camera-error"
        );
      }
    };

    void startMonitoring();

    return () => {
      isMounted = false;

      if (detectionIntervalRef.current) {
        window.clearInterval(detectionIntervalRef.current);
      }

      if (audioIntervalRef.current) {
        window.clearInterval(audioIntervalRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioContextRef.current?.close();
    };
  }, [isHydrated, roomId, token, user]);

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
    setIsCameraOn((prev) => !prev);
  };

  const handleEndCall = () => {
    if (!user) {
      logoutUser();
      return;
    }

    router.push(
      user.role === "recruiter" ? "/dashboard/recruiter" : "/dashboard/candidate"
    );
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-white text-lg">Loading interview room...</p>
      </div>
    );
  }

  // Guaranteed tab switch detection - runs outside React lifecycle
  if (typeof window !== 'undefined' && !(window as any).__inguardTabListenerSet) {
    (window as any).__inguardTabListenerSet = true;
    (window as any).__inguardSetAlerts = null;
    (window as any).__inguardSetTrust = null;
    (window as any).__inguardLastTabSwitch = 0;
    (window as any).__inguardDurationRef = null;
    (window as any).__inguardLastAlertRef = null;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      console.log('[InGuard] GLOBAL visibilitychange fired');
      const now = Date.now();
      const lastRef = (window as any).__inguardLastAlertRef;
      if (lastRef && now - (lastRef.current?.['tab-switch'] || 0) < 5000) return;
      if (lastRef) lastRef.current['tab-switch'] = now;
      const dRef = (window as any).__inguardDurationRef;
      const dur = dRef?.current || 0;
      const s = dur % 60;
      const m = Math.floor(dur / 60);
      const ts = m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
      const setA = (window as any).__inguardSetAlerts;
      const setT = (window as any).__inguardSetTrust;
      if (setA) setA((prev: any) => [{ id: Math.random().toString(36), message: '📱 Tab switch detected', type: 'danger', timestamp: ts }, ...prev].slice(0, 10));
      sessionAlertsRef.current.push("Tab switch detected");
      if (setT) setT((prev: number) => Math.max(0, prev - 15));
    });
  }
  if (typeof window !== 'undefined') {
    (window as any).__inguardSetAlerts = setAlerts;
    (window as any).__inguardSetTrust = setTrustScore;
    (window as any).__inguardDurationRef = durationRef;
    (window as any).__inguardLastAlertRef = lastAlertTimeRef;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="grid min-h-screen gap-4 p-4 lg:grid-cols-[60fr_40fr]">
        <section className="flex min-h-[620px] flex-col gap-4">
          <div
            id="local-video"
            className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-gray-800 bg-black"
          >
            <video
              ref={localVideoRef}
              autoPlay={true}
              playsInline={true}
              muted={true}
              className="w-full h-full object-contain rounded-xl bg-black"
              style={{ transform: "scaleX(-1)" }}
            />

            {cameraError ? (
              <div className="absolute inset-x-4 top-4 rounded-lg border border-red-500/40 bg-red-600 px-4 py-3 text-center shadow-lg">
                <p className="text-sm font-semibold text-white">{cameraError}</p>
              </div>
            ) : null}

            {isConnecting ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm">
                <p className="text-sm font-medium text-gray-200">
                  Connecting to interview room...
                </p>
              </div>
            ) : null}
          </div>

          <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            {!peerConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <Video className="h-8 w-8 text-gray-600" />
                <p className="text-gray-500 text-sm">
                  Waiting for other participant...
                </p>
              </div>
            )}
            {peerConnected && (
              <div className="absolute bottom-2 left-2 bg-black/60 rounded px-2 py-1">
                <p className="text-white text-xs">Remote</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 rounded-lg border border-gray-800 bg-gray-900/80 p-4">
            <Button
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              className="h-11 w-11 rounded-full border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = isMuted;
                  });
                }
                setIsMuted(prev => !prev);
              }}
              size="icon"
              title={isMuted ? "Unmute" : "Mute"}
              variant="outline"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              aria-label={isCameraOn ? "Turn off camera" : "Turn on camera"}
              className="h-11 w-11 rounded-full border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current.getVideoTracks().forEach(track => {
                    track.enabled = !isCameraOn;
                  });
                }
                setIsCameraOn(prev => !prev);
              }}
              size="icon"
              title={isCameraOn ? "Camera off" : "Camera on"}
              variant="outline"
            >
              {isCameraOn ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
            <Button
              aria-label="Share screen"
              className="h-11 w-11 rounded-full border-gray-700 bg-gray-800 text-white hover:bg-gray-700"
              onClick={async () => {
                try {
                  const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                  if (localVideoRef.current) {
                    localVideoRef.current.srcObject = screenStream;
                  }
                  screenStream.getVideoTracks()[0].onended = () => {
                    if (localVideoRef.current && streamRef.current) {
                      localVideoRef.current.srcObject = streamRef.current;
                    }
                  };
                } catch (e) {
                  console.error('Screen share failed', e);
                }
              }}
              size="icon"
              title="Share screen"
              variant="outline"
            >
              <Monitor className="h-5 w-5" />
            </Button>
            <button
              onClick={async () => {
                console.log("[InGuard] Manual reconnect triggered");
                if (peerRef.current) {
                  peerRef.current.close();
                  peerRef.current = null;
                }
                setPeerConnected(false);
                if (user?.role === "recruiter" && socketRef.current) {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  const pc = createPeerConnection();
                  const offer = await pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true,
                  });
                  await pc.setLocalDescription(offer);
                  socketRef.current.emit("webrtc-offer", { roomId, offer });
                  console.log("[InGuard] Reconnect offer sent");
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700"
              title="Reconnect video"
              aria-label="Reconnect video"
            >
              🔄
            </button>
            <Button
              aria-label="End call"
              className="h-11 rounded-full bg-red-600 px-5 text-white hover:bg-red-700"
              onClick={async () => {
                if (user?.role === "recruiter") {
                  await generateInterviewReport();
                } else {
                  socketRef.current?.emit("leave-room", { roomId, userId: user?.id });
                  if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
                  if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
                  window.location.href = "/dashboard/candidate";
                }
              }}
              title="End call"
            >
              {isGeneratingReport ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating Report...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> End Call
                </span>
              )}
            </Button>
          </div>
        </section>

        <aside className="grid gap-4 lg:grid-rows-[auto_1fr_auto]">
          <Card className="border-gray-800 bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="text-lg">AI Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ScoreBar label="Focus Score" value={focusScore} />
              <ScoreBar label="Confidence Score" value={confidenceScore} />
              <ScoreBar label="Trust Score" value={trustScore} />
              <ScoreBar label="Overall Score" value={overallScore} />
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      className="rounded-md border border-gray-800 bg-gray-950 px-3 py-2"
                      key={alert.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-gray-200">{alert.message}</p>
                        <Badge
                          className="border-gray-700 text-gray-300"
                          variant="outline"
                        >
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{alert.timestamp}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No alerts detected.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-800 bg-gray-900 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Room ID</span>
                <span className="max-w-[220px] truncate font-mono text-gray-100">
                  {roomId}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Status</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${
                  connectionStatus === 'live' ? 'bg-green-500' :
                  connectionStatus === 'error' ? 'bg-red-500' : 
                  'bg-blue-500'
                }`}>
                  {connectionStatus === 'live' ? 'Live' : 
                   connectionStatus === 'error' ? 'Error' : 'Connecting'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Duration</span>
                <span className="font-mono text-gray-100">
                  {formatDuration(duration)}
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>

        {showReport && aiReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gray-900 p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Interview Report</h2>
                <div className={`rounded-full px-4 py-1 text-sm font-semibold ${
                  aiReport.recommendation === "Recommended for next round"
                    ? "bg-green-500/20 text-green-400"
                    : aiReport.recommendation === "Not recommended"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {aiReport.recommendation}
                </div>
              </div>

              <div className="mb-6 flex items-center justify-center">
                <div className={`flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white ${
                  aiReport.overallScore >= 70 ? "bg-green-500" :
                  aiReport.overallScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                }`}>
                  {aiReport.overallScore}
                </div>
              </div>

              <p className="mb-6 text-center text-sm text-gray-400">{aiReport.summary}</p>

              <div className="mb-4 rounded-xl bg-gray-800 p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Behavioral Assessment</h3>
                <p className="text-sm text-gray-400">{aiReport.behavioralAssessment}</p>
              </div>

              <div className="mb-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-green-400">Strong Points</h3>
                  {aiReport.strongPoints.map((p, i) => (
                    <div key={i} className="mb-1 flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-0.5 text-green-400">✓</span>{p}
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-red-400">Weak Points</h3>
                  {aiReport.weakPoints.map((p, i) => (
                    <div key={i} className="mb-1 flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-0.5 text-red-400">✗</span>{p}
                    </div>
                  ))}
                </div>
              </div>

              {aiReport.suspiciousActivities.length > 0 && (
                <div className="mb-4 rounded-xl bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-yellow-400">Suspicious Activities</h3>
                  {aiReport.suspiciousActivities.map((a, i) => (
                    <div key={i} className="mb-1 flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-0.5 text-yellow-400">⚠</span>{a}
                    </div>
                  ))}
                </div>
              )}

              {aiReport.courseRecommendations.length > 0 && (
                <div className="mb-6 rounded-xl bg-gray-800 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-blue-400">Course Recommendations</h3>
                  {aiReport.courseRecommendations.map((c, i) => (
                    <div key={i} className="mb-3 rounded-lg bg-gray-700/50 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{c.title}</p>
                        <span className="rounded border border-gray-600 px-2 py-0.5 text-xs text-gray-400">{c.platform}</span>
                      </div>
                      <p className="mb-1 text-xs text-gray-400">{c.reason}</p>
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                        View Course →
                      </a>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowReport(false);
                    socketRef.current?.emit("leave-room", { roomId, userId: user?.id });
                    if (peerRef.current) { peerRef.current.close(); }
                    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); }
                    window.location.href = "/dashboard/recruiter";
                  }}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary/90"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    const reportText = `InGuard1 Interview Report\n\nScore: ${aiReport.overallScore}/100\nRecommendation: ${aiReport.recommendation}\n\nSummary: ${aiReport.summary}\n\nStrong Points:\n${aiReport.strongPoints.join('\n')}\n\nWeak Points:\n${aiReport.weakPoints.join('\n')}`;
                    const blob = new Blob([reportText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'interview-report.txt';
                    a.click();
                  }}
                  className="rounded-xl border border-gray-600 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Download Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
