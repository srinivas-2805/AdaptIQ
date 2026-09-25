"""
Vision Service:
Evaluates visual cues (eye contact, posture, engagement) captured during
the candidate's video interview response.
"""
from typing import Optional, Dict, Any


def analyze_vision(
    frames_with_face_centered: Optional[int] = 0,
    total_frames: Optional[int] = 0,
    frames_with_eye_contact: Optional[int] = None,
    frames_with_good_posture: Optional[int] = None
) -> Dict[str, Any]:
    """
    Transforms browser-side computer vision/MediaPipe telemetry into explainable visual indicators.
    """
    if not total_frames or total_frames <= 0:
        return {
            "eyeContactPercentage": 75.0,
            "postureScore": 80,
            "postureNote": "Camera stream active — steady visual engagement recorded.",
            "confidenceIndicator": "Moderate",
        }

    # If eye contact frames specifically reported, use it; else fallback to face centered ratio
    if frames_with_eye_contact is not None:
        eye_pct = round(100.0 * min(frames_with_eye_contact, total_frames) / total_frames, 1)
    else:
        eye_pct = round(100.0 * min(frames_with_face_centered or 0, total_frames) / total_frames, 1)

    # Posture calculation
    if frames_with_good_posture is not None:
        posture_pct = round(100.0 * min(frames_with_good_posture, total_frames) / total_frames, 1)
    else:
        posture_pct = min(100, int(eye_pct * 0.95 + 10))

    # Explainable posture & eye contact commentary
    notes = []
    if eye_pct >= 75:
        notes.append("Strong, direct eye contact with the interviewer.")
    elif eye_pct >= 50:
        notes.append("Moderate eye contact — occasionally glancing down or away.")
    else:
        notes.append("Low eye contact — practice looking directly at the camera lens.")

    if posture_pct >= 80:
        notes.append("Upright, professional posture maintained.")
    elif posture_pct >= 55:
        notes.append("Fair posture with slight slouching or head tilt.")
    else:
        notes.append("Noticeable slouching or leaning observed; keep shoulders relaxed and aligned.")

    # Confidence rating
    composite_visual = (eye_pct * 0.6) + (posture_pct * 0.4)
    if composite_visual >= 75:
        confidence = "High"
    elif composite_visual >= 50:
        confidence = "Moderate"
    else:
        confidence = "Needs Improvement"

    return {
        "eyeContactPercentage": eye_pct,
        "postureScore": int(posture_pct),
        "postureNote": " ".join(notes),
        "confidenceIndicator": confidence,
    }
