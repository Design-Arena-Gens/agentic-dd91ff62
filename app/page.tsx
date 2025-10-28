"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";
import { Special_Elite } from "next/font/google";

const handwritten = Special_Elite({ subsets: ["latin"], weight: "400" });

const TOTAL_DURATION = 30;
type Phase = "intro" | "reveal" | "escalation" | "climax" | "after";

const determinePhase = (time: number): Phase => {
  if (time >= TOTAL_DURATION) return "after";
  if (time >= 27) return "climax";
  if (time >= 20) return "escalation";
  if (time >= 10) return "reveal";
  return "intro";
};

const textCues: Record<Phase, string> = {
  intro: "is it you... staring back?",
  reveal: "no, it blinks when you don't",
  escalation: "it's learning your face",
  climax: "it's inside the glass",
  after: "it remembers you now"
};

type AudioController = {
  triggerClimax: () => void;
  fadeOut: () => void;
  dispose: () => void;
};

type AudioContextConstructor = typeof AudioContext;

const getAudioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === "undefined") return null;
  const { AudioContext: StandardContext } = window;
  const legacy = (window as typeof window & { webkitAudioContext?: AudioContextConstructor })
    .webkitAudioContext;
  return StandardContext ?? legacy ?? null;
};

const createAudioController = async (): Promise<AudioController> => {
  const AudioCtor = getAudioContextConstructor();
  if (!AudioCtor) {
    throw new Error("Web Audio not supported");
  }

  const ctx = new AudioCtor();
  await ctx.resume();

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const ambientOsc = ctx.createOscillator();
  ambientOsc.type = "triangle";
  ambientOsc.frequency.setValueAtTime(48, ctx.currentTime);
  ambientOsc.frequency.linearRampToValueAtTime(36, ctx.currentTime + TOTAL_DURATION);

  const ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  ambientGain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 1.5);
  ambientGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 12);
  ambientGain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 24);

  ambientOsc.connect(ambientGain).connect(masterGain);
  ambientOsc.start();

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i += 1) {
    const fade = 1 - i / noiseData.length;
    noiseData[i] = (Math.random() * 2 - 1) * Math.pow(fade, 1.6);
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 8);
  noiseGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 20);
  noiseGain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 26);

  noiseSource.connect(noiseGain).connect(masterGain);
  noiseSource.start();

  const scheduleCreak = (delaySeconds: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, ctx.currentTime + delaySeconds);
    osc.frequency.exponentialRampToValueAtTime(
      40,
      ctx.currentTime + delaySeconds + 1.2
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + delaySeconds);
    gain.gain.exponentialRampToValueAtTime(
      0.35,
      ctx.currentTime + delaySeconds + 0.22
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + delaySeconds + 1.4
    );
    osc.connect(gain).connect(masterGain);
    osc.start(ctx.currentTime + delaySeconds);
    osc.stop(ctx.currentTime + delaySeconds + 1.6);
    return () => {
      try {
        osc.disconnect();
      } catch (error) {
        // noop
      }
      try {
        gain.disconnect();
      } catch (error) {
        // noop
      }
    };
  };

  const cleanupCreaks = [9, 15.5, 21.5].map(scheduleCreak);

  let hasJump = false;

  const triggerClimax = () => {
    if (hasJump) return;
    hasJump = true;
    const now = ctx.currentTime;

    ambientGain.gain.cancelAndHoldAtTime(now);
    ambientGain.gain.linearRampToValueAtTime(0.8, now + 0.5);

    const burstOsc = ctx.createOscillator();
    burstOsc.type = "sawtooth";
    burstOsc.frequency.setValueAtTime(55, now);
    burstOsc.frequency.exponentialRampToValueAtTime(680, now + 0.35);

    const burstGain = ctx.createGain();
    burstGain.gain.setValueAtTime(0.0001, now);
    burstGain.gain.exponentialRampToValueAtTime(1.2, now + 0.12);
    burstGain.gain.exponentialRampToValueAtTime(0.04, now + 0.9);
    burstGain.gain.linearRampToValueAtTime(0.0001, now + 1.4);

    burstOsc.connect(burstGain).connect(masterGain);
    burstOsc.start(now);
    burstOsc.stop(now + 1.5);

    const screamBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.3, ctx.sampleRate);
    const screamData = screamBuffer.getChannelData(0);
    for (let i = 0; i < screamData.length; i += 1) {
      const t = i / ctx.sampleRate;
      const envelope = Math.pow(1 - t / 1.3, 0.2);
      const jitter = (Math.random() * 2 - 1) * 0.7;
      screamData[i] = envelope * Math.sin(2 * Math.PI * (420 + jitter * 120) * t);
    }
    const screamSource = ctx.createBufferSource();
    screamSource.buffer = screamBuffer;
    const screamGain = ctx.createGain();
    screamGain.gain.setValueAtTime(0.0001, now);
    screamGain.gain.exponentialRampToValueAtTime(0.9, now + 0.08);
    screamGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    screamSource.connect(screamGain).connect(masterGain);
    screamSource.start(now);
    screamSource.stop(now + 1.3);
  };

  const fadeOut = () => {
    const now = ctx.currentTime;
    masterGain.gain.cancelAndHoldAtTime(now);
    masterGain.gain.linearRampToValueAtTime(0.0001, now + 2);
  };

  const dispose = () => {
    const stopAt = ctx.currentTime + 2.1;
    try {
      ambientOsc.stop(stopAt);
    } catch (error) {
      // noop
    }
    try {
      noiseSource.stop(stopAt);
    } catch (error) {
      // noop
    }
    cleanupCreaks.forEach((stop) => stop());
    fadeOut();
    setTimeout(() => {
      void ctx.close();
    }, 2200);
  };

  return {
    triggerClimax,
    fadeOut,
    dispose
  };
};

const HorrorExperience = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [isComplete, setIsComplete] = useState(false);

  const frameRef = useRef<number>();
  const startRef = useRef<number>();
  const audioRef = useRef<AudioController | null>(null);
  const jumpRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current ?? 0);
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return undefined;
    }

    let mounted = true;
    startRef.current = performance.now();

    const step = (now: number) => {
      if (!mounted) return;
      if (!startRef.current) startRef.current = now;
      const delta = (now - startRef.current) / 1000;
      const nextElapsed = Math.min(delta, TOTAL_DURATION);
      setElapsed(nextElapsed);
      const nextPhase = determinePhase(nextElapsed);
      setPhase(nextPhase);

      if (!jumpRef.current && nextElapsed >= 27) {
        audioRef.current?.triggerClimax();
        jumpRef.current = true;
      }

      if (nextElapsed >= TOTAL_DURATION) {
        setIsComplete(true);
        setIsPlaying(false);
        audioRef.current?.fadeOut();
        return;
      }

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      mounted = false;
      cancelAnimationFrame(frameRef.current ?? 0);
    };
  }, [isPlaying]);

  const timelinePercent = useMemo(
    () => Math.min(100, (elapsed / TOTAL_DURATION) * 100),
    [elapsed]
  );

  const startExperience = async () => {
    if (isPlaying) return;
    jumpRef.current = false;
    setElapsed(0);
    setPhase("intro");
    setIsComplete(false);
    audioRef.current?.dispose();
    try {
      audioRef.current = await createAudioController();
    } catch (error) {
      console.error("Audio failed to initialise", error);
      audioRef.current = null;
    }
    setIsPlaying(true);
  };

  const hintText = textCues[phase];

  return (
    <div className={styles.wrapper}>
      <div className={styles.frame} data-phase={phase} data-complete={isComplete}>
        <div className={styles.noiseOverlay} />
        <div className={styles.vignette} />
        <div className={styles.mirror}>
          <div className={styles.mirrorGlow} />
          <div className={styles.subject} data-phase={phase}>
            <div className={styles.eyes} data-phase={phase} />
            <div className={styles.smile} data-phase={phase} />
          </div>
          <div className={styles.cracks} data-phase={phase} />
        </div>
        <div className={`${styles.textCue} ${handwritten.className}`} data-phase={phase}>
          <span>{hintText}</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${timelinePercent}%` }} />
        </div>
        <div className={styles.glitchLayer} data-phase={phase} />
        <div className={styles.jumpScare} data-active={phase === "climax"}>
          <div className={styles.jumpEyes} />
          <div className={styles.jumpMouth} />
        </div>
        <div className={styles.finalFrame} data-active={phase === "after"}>
          <span className={handwritten.className}>it followed you home.</span>
        </div>
        {!isPlaying && !isComplete && (
          <button className={styles.startButton} type="button" onClick={startExperience}>
            <span>touch the mirror</span>
          </button>
        )}
        {isComplete && (
          <button className={styles.restartButton} type="button" onClick={startExperience}>
            watch again
          </button>
        )}
      </div>
      <p className={styles.caption}>Best experienced with sound · 30 seconds</p>
    </div>
  );
};

export default function Home() {
  return (
    <main className={styles.main}>
      <HorrorExperience />
    </main>
  );
}
