"""
Speaker-embedding extraction for the wake-word voiceprint gate.

Model: WeSpeaker ResNet34-LM (VoxCeleb2, CC-BY-4.0), exported to ONNX by the
WeSpeaker project itself — bundled at app/models/speaker-embedding.onnx.
Feature extraction (80-dim Kaldi fbank + per-utterance CMN) mirrors WeSpeaker's
own reference inference script (wespeaker/bin/infer_onnx.py) exactly, but uses
kaldi-native-fbank instead of torchaudio so this stays torch-free.

Input to the model: 16kHz mono PCM16 samples (matches what LiveKit/Vosk already
use elsewhere in this project — no extra resampling needed for same-rate audio).
"""
import logging

import kaldi_native_fbank as knf
import numpy as np
import onnxruntime as ort

logger = logging.getLogger("voice-agent.speaker-id")

_MODEL_PATH = "app/models/speaker-embedding.onnx"
_SAMPLE_RATE = 16000
_NUM_MEL_BINS = 80

_session: ort.InferenceSession | None = None


def load_model() -> None:
    """Call once at process prewarm — mirrors silero.VAD.load() in session.py."""
    global _session
    if _session is not None:
        return
    so = ort.SessionOptions()
    so.inter_op_num_threads = 1
    so.intra_op_num_threads = 1
    _session = ort.InferenceSession(_MODEL_PATH, sess_options=so, providers=["CPUExecutionProvider"])
    logger.info("speaker-embedding model loaded (%s)", _MODEL_PATH)


def _fbank(samples_int16_scale: np.ndarray) -> np.ndarray:
    """samples_int16_scale: float32 array in the same magnitude as int16 PCM
    (i.e. NOT normalized to [-1, 1]) — matches WeSpeaker's own convention of
    scaling a normalized waveform back up by 1<<15 before extracting fbank."""
    opts = knf.FbankOptions()
    opts.frame_opts.samp_freq = _SAMPLE_RATE
    opts.frame_opts.dither = 0.0
    opts.frame_opts.window_type = "hamming"
    opts.mel_opts.num_bins = _NUM_MEL_BINS

    fbank = knf.OnlineFbank(opts)
    fbank.accept_waveform(_SAMPLE_RATE, samples_int16_scale.tolist())
    fbank.input_finished()

    frames = [np.array(fbank.get_frame(i), dtype=np.float32) for i in range(fbank.num_frames_ready)]
    mat = np.stack(frames, axis=0)  # [T, 80]
    # Per-utterance cepstral mean normalization (no variance norm), same as
    # WeSpeaker's reference script.
    mat = mat - mat.mean(axis=0, keepdims=True)
    return mat


def embed(pcm16_bytes: bytes) -> np.ndarray:
    """pcm16_bytes: raw little-endian int16 mono samples at 16kHz.
    Returns a unit-length 256-dim embedding vector."""
    if _session is None:
        raise RuntimeError("speaker_id.load_model() was never called")

    samples = np.frombuffer(pcm16_bytes, dtype=np.int16).astype(np.float32)
    feats = _fbank(samples)[np.newaxis, :, :]  # [1, T, 80]

    (embedding,) = _session.run(output_names=["embs"], input_feed={"feats": feats})
    vec = embedding[0]  # [256]
    return vec / (np.linalg.norm(vec) + 1e-9)


def average_embedding(embeddings: list[np.ndarray]) -> np.ndarray:
    """Combines multiple enrollment takes (already-unit-length vectors from
    embed()) into a single reference voiceprint."""
    mean = np.mean(np.stack(embeddings, axis=0), axis=0)
    return mean / (np.linalg.norm(mean) + 1e-9)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
