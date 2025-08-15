// src/components/KittyLive.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Animated, Easing, TouchableWithoutFeedback } from "react-native";
import KittyPixelArt from "./KittyPixelArt";

type Props = {
  boxSize?: number;        
  onTap?: () => void;      
  interactive?: boolean;   
  personality?: {
    playfulness: number;   
    energy: number;        
  };
};

export default function KittyLive({ 
  boxSize = 200, 
  onTap, 
  interactive = true,
  personality = { playfulness: 0.7, energy: 0.8 }
}: Props) {
  // Core animation state
  const [eyesOpen, setEyesOpen] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Simplified animated values to prevent UI thread conflicts
  const breathe = useRef(new Animated.Value(0)).current;     // Gentle breathing
  const bounce = useRef(new Animated.Value(1)).current;      // Scale for interactions
  const sway = useRef(new Animated.Value(0)).current;        // Side-to-side movement
  
  // Cleanup refs
  const blinkTimer = useRef<NodeJS.Timeout | null>(null);
  const spontaneousTimer = useRef<NodeJS.Timeout | null>(null);
  const mounted = useRef(true);

  // Blink function - simple and reliable
  const doBlink = useCallback(() => {
    if (!mounted.current) return;
    
    setEyesOpen(false);
    setTimeout(() => {
      if (mounted.current) {
        setEyesOpen(true);
      }
    }, 120); // Quick blink
  }, []);

  // Schedule next blink
  const scheduleBlink = useCallback(() => {
    if (blinkTimer.current) {
      clearTimeout(blinkTimer.current);
    }
    
    // Random blink interval 2-5 seconds
    const interval = 2000 + Math.random() * 3000;
    blinkTimer.current = setTimeout(() => {
      if (mounted.current) {
        doBlink();
        scheduleBlink(); // Schedule next blink
      }
    }, interval);
  }, [doBlink]);

  // Wave animation - simple and stable
  const doWave = useCallback(() => {
    if (isAnimating || !mounted.current) return;
    setIsAnimating(true);

    // Quick excited bounce + sway
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1.15,
          duration: 150,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.bounce),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: -0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.bounce),
          useNativeDriver: true,
        }),
      ]),
    ]).start((finished) => {
      if (finished && mounted.current) {
        setIsAnimating(false);
      }
    });

    // Blink during wave
    setTimeout(doBlink, 100);
  }, [isAnimating, bounce, sway, doBlink]);

  // Dance animation - energetic but stable
  const doDance = useCallback(() => {
    if (isAnimating || !mounted.current) return;
    setIsAnimating(true);

    Animated.sequence([
      // Excited bounce up
      Animated.timing(bounce, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      // Dance moves
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sway, { toValue: 1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(sway, { toValue: -1.2, duration: 200, useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0.8, duration: 200, useNativeDriver: true }),
          Animated.timing(sway, { toValue: -0.8, duration: 200, useNativeDriver: true }),
          Animated.timing(sway, { toValue: 0, duration: 300, easing: Easing.out(Easing.bounce), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(bounce, { toValue: 0.9, duration: 200, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 1.1, duration: 200, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 0.95, duration: 200, useNativeDriver: true }),
          Animated.timing(bounce, { toValue: 1, duration: 400, easing: Easing.out(Easing.bounce), useNativeDriver: true }),
        ]),
      ]),
    ]).start((finished) => {
      if (finished && mounted.current) {
        setIsAnimating(false);
      }
    });

    // Multiple happy blinks
    setTimeout(doBlink, 150);
    setTimeout(doBlink, 600);
    setTimeout(doBlink, 1000);
  }, [isAnimating, bounce, sway, doBlink]);

  // Handle taps based on personality
  const handleTap = useCallback(() => {
    if (!interactive || isAnimating) return;
    
    const random = Math.random();
    const playfulnessThreshold = personality.playfulness;
    
    if (random < playfulnessThreshold * 0.4) {
      // Very playful - dance
      doDance();
    } else if (random < playfulnessThreshold * 0.8) {
      // Moderately playful - wave
      doWave();
    } else {
      // Just excited bounce and blink
      doBlink();
      Animated.sequence([
        Animated.timing(bounce, { 
          toValue: 1.08, 
          duration: 120, 
          useNativeDriver: true 
        }),
        Animated.timing(bounce, { 
          toValue: 1, 
          duration: 250, 
          easing: Easing.out(Easing.bounce), 
          useNativeDriver: true 
        }),
      ]).start();
    }
    
    onTap?.();
  }, [interactive, isAnimating, personality.playfulness, doDance, doWave, doBlink, bounce, onTap]);

  // Initialize animations and cleanup
  useEffect(() => {
    mounted.current = true;
    
    // Start gentle breathing animation
    const breathingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    
    breathingLoop.start();
    
    // Start blinking after initial delay
    const initialDelay = setTimeout(() => {
      if (mounted.current) {
        scheduleBlink();
      }
    }, 1500);
    
    // Spontaneous cute animations
    const scheduleSpontaneous = () => {
      if (!mounted.current) return;
      
      const delay = 12000 + Math.random() * 18000; // 12-30 seconds
      spontaneousTimer.current = setTimeout(() => {
        if (mounted.current && !isAnimating && Math.random() < personality.playfulness * 0.25) {
          Math.random() > 0.7 ? doDance() : doWave();
        }
        scheduleSpontaneous();
      }, delay);
    };
    
    scheduleSpontaneous();

    return () => {
      mounted.current = false;
      clearTimeout(initialDelay);
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
      if (spontaneousTimer.current) clearTimeout(spontaneousTimer.current);
      breathingLoop.stop();
    };
  }, [scheduleBlink, personality.playfulness, isAnimating, doWave, doDance, breathe]);

  // Calculate optimal sizing for the 24x28 pixel art
  const PIXEL_WIDTH = 24;
  const PIXEL_HEIGHT = 28;
  const padding = 20;
  const usableSize = boxSize - padding * 2;
  
  // Calculate scale to fit while maintaining aspect ratio
  const scaleX = Math.floor(usableSize / PIXEL_WIDTH);
  const scaleY = Math.floor(usableSize / PIXEL_HEIGHT);
  const pixelScale = Math.max(2, Math.min(scaleX, scaleY)); // Minimum scale of 2
  
  const artWidth = PIXEL_WIDTH * pixelScale;
  const artHeight = PIXEL_HEIGHT * pixelScale;

  // Animation interpolations
  const breatheTransform = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2], // Subtle upward movement
  });
  
  const swayTransform = sway.interpolate({
    inputRange: [-1.5, 1.5],
    outputRange: ['-4deg', '4deg'], // Gentle rotation
  });

  return (
    <View 
      style={{ 
        width: boxSize, 
        height: boxSize, 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "transparent"
      }}
    >
      <TouchableWithoutFeedback onPress={handleTap}>
        <Animated.View
          style={{
            width: artWidth,
            height: artHeight,
            transform: [
              { translateY: breatheTransform },
              { rotate: swayTransform },
              { scale: bounce }
            ],
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <KittyPixelArt 
            scale={pixelScale} 
            eyesOpen={eyesOpen}
            palette={{
              w: "#FFFFFF",   // Pure white
              b: "#000000",   // Black features
              r: "#E60026",   // Official red bow
              y: "#F7B500",   // Official yellow nose
              p: "#FF9DB0",   // Pink body
              o: "#FFB6C1",   // Light pink bow highlights
              t: "transparent"
            }}
          />
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
}