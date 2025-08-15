// src/components/LiveFeed.js
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Animated, Easing } from "react-native";

const TYPER_SPEED = 18; // ms per char (lower -> faster)
const CURSOR_BLINK_MS = 600;

export default function LiveFeed({ events = [], maxLines = 6, style }) {
  // events: array of strings (newest first)
  const [lines, setLines] = useState(() => (events || []).slice(0, maxLines).reverse()); // oldest-first for display
  const [typing, setTyping] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // animate container in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // update lines when events prop changes
  useEffect(() => {
    const latest = (events || [])[0];
    if (!latest) return;

    // push current newest into lines (keep max)
    setLines((prev) => {
      const next = prev.concat([latest]).slice(-maxLines);
      return next;
    });

    // type the latest message (typewriter)
    let idx = 0;
    setTyping("");
    setCursorVisible(true);
    setTyping(""); // clear
    const chars = latest.split("");
    setTyping(""); // ensure clear before typing

    const t = setInterval(() => {
      idx++;
      setTyping(chars.slice(0, idx).join(""));
      if (idx >= chars.length) {
        clearInterval(t);
        // stop typing after small pause: keep cursor blinking
      }
    }, TYPER_SPEED);

    return () => clearInterval(t);
  }, [events, maxLines]);

  // cursor blink
  useEffect(() => {
    const id = setInterval(() => {
      setCursorVisible((v) => !v);
    }, CURSOR_BLINK_MS);
    return () => clearInterval(id);
  }, []);

  // auto-scroll to bottom (most recent) when lines change
  useEffect(() => {
    if (!scrollRef.current) return;
    // small timeout to allow layout
    const id = setTimeout(() => {
      try {
        scrollRef.current.scrollToEnd({ animated: true });
      } catch (e) {}
    }, 60);
    return () => clearTimeout(id);
  }, [lines, typing]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#070707",
          borderRadius: 6,
          padding: 8,
          borderColor: "#121212",
          borderWidth: 1,
          minHeight: 84,
          maxHeight: 140,
        },
        { opacity: fadeAnim },
        style,
      ]}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {lines.map((l, i) => {
          const isLast = i === lines.length - 1;
          // if it's the last, we'll show typing overlay
          return (
            <View key={`line-${i}`} style={{ marginBottom: 4 }}>
              <Text style={{ fontFamily: "monospace", color: "#9ad4a5", fontSize: 12 }}>
                {isLast ? l === typing ? typing : l : l}
              </Text>
            </View>
          );
        })}

        {/* typing line shown under the last static line when typing */}
        {typing ? (
          <Text style={{ fontFamily: "monospace", color: "#6cff82", fontSize: 12 }}>
            {typing}
            <Text style={{ opacity: cursorVisible ? 1 : 0 }}>|</Text>
          </Text>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}
