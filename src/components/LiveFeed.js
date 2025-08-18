// src/components/LiveFeed.js
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, ScrollView, Animated, Easing, Dimensions } from "react-native";

/**
 * 🎬 LiveFeed - Interactive Text Animation Component
 * 
 * A powerful, easy-to-use component for displaying animated text messages.
 * Perfect for announcements, live feeds, status updates, or any dynamic text display.
 * 
 * Features:
 * - 8 different animation styles
 * - 6 beautiful color themes  
 * - Customizable timing and speeds
 * - Terminal-style effects
 * - Marquee scrolling
 * - Matrix-style animations
 * - Simple API for non-coders
 * 
 * Usage Examples:
 * 
 * // Basic usage
 * <LiveFeed messages={["Hello World!", "Welcome to the app"]} />
 * 
 * // With custom style and theme
 * <LiveFeed 
 *   messages={["System online", "All systems go"]}
 *   animationType="terminal"
 *   colorTheme="matrix"
 *   speed="fast"
 * />
 * 
 * // Advanced customization
 * <LiveFeed 
 *   messages={messages}
 *   animationType="marquee"
 *   colorTheme="neon"
 *   boxWidth={300}
 *   boxHeight={120}
 *   maxLines={4}
 *   speed="slow"
 * />
 */

// ========================================
// 🎨 COLOR THEMES - Choose Your Style!
// ========================================
const COLOR_THEMES = {
  // Classic green terminal look
  terminal: {
    background: "#000000",
    border: "#00ff00",
    primaryText: "#00ff00",
    secondaryText: "#008800",
    cursor: "#00ff00",
    accent: "#ffffff"
  },
  
  // Matrix/hacker style
  matrix: {
    background: "#0a0a0a",
    border: "#00ff41",
    primaryText: "#00ff41",
    secondaryText: "#008f2d",
    cursor: "#ffffff",
    accent: "#ff0080"
  },
  
  // Cyberpunk neon
  neon: {
    background: "#1a0d2e",
    border: "#e94560",
    primaryText: "#f39c12",
    secondaryText: "#16213e",
    cursor: "#00d9ff",
    accent: "#e94560"
  },
  
  // Ocean blue theme
  ocean: {
    background: "#001122",
    border: "#0066cc",
    primaryText: "#00ccff",
    secondaryText: "#0088cc",
    cursor: "#ffffff",
    accent: "#ff6600"
  },
  
  // Retro amber
  retro: {
    background: "#2a1810",
    border: "#ff8800",
    primaryText: "#ffaa00",
    secondaryText: "#cc7700",
    cursor: "#ffffff",
    accent: "#ff4400"
  },
  
  // Clean modern
  modern: { background: "#1e1e1e", border: "#444444", primaryText: "#ffffff", secondaryText: "#888888", cursor: "#007acc", accent: "#4fc3f7" },

  bp: {
    background: "#000000",      // deep black background
    border: "#2a2a2a",          // subtle dark border
    primaryText: "#ff69b4",     // bright pink for main text
    secondaryText: "#f5a9d6",   // softer light pink for secondary text
    cursor: "#ff4da6",          // vibrant hot pink cursor
    accent: "#ff1493"           // strong neon pink accent
  },

  blackpink: {
    background: "#1a1a2e",      // deep midnight blue
    border: "#fc46aa",          // vivid pink
    primaryText: "#fc46aa",     // Blackpink pink
    secondaryText: "#fff",      // white
    cursor: "#fff",             // white (for cursors)
    accent: "#0ed1d9"           // blue accent (optional)
  }
  
};

// ========================================
// ⚡ ANIMATION SPEEDS - Control The Pace
// ========================================
const SPEEDS = {
  slow: { typing: 120, cursor: 800, scroll: 3000, fade: 1000 },
  normal: { typing: 80, cursor: 600, scroll: 2000, fade: 600 },
  fast: { typing: 40, cursor: 400, scroll: 1000, fade: 300 },
  instant: { typing: 10, cursor: 200, scroll: 500, fade: 150 }
};

// ========================================
// 🎭 ANIMATION FUNCTIONS - The Magic Happens Here
// ========================================

/**
 * 🔤 Typewriter Effect
 * Classic terminal-style typing animation with blinking cursor
 */
const TypewriterAnimation = ({ text, theme, speed, onComplete }) => {
  const [displayText, setDisplayText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    setDisplayText("");
    setIsComplete(false);

    const typeInterval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed.typing);

    return () => clearInterval(typeInterval);
  }, [text, speed.typing, onComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, speed.cursor);

    return () => clearInterval(cursorInterval);
  }, [speed.cursor]);

  return (
    <Text style={{ fontFamily: "monospace", color: theme.primaryText, fontSize: 14 }}>
      {displayText}
      {!isComplete && <Text style={{ opacity: cursorVisible ? 1 : 0 }}>|</Text>}
    </Text>
  );
};

/**
 * 🌊 Marquee Effect
 * Smooth horizontal scrolling text
 */
const MarqueeAnimation = ({ text, theme, speed }) => {
  const translateX = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    translateX.setValue(300);
    Animated.loop(
      Animated.timing(translateX, {
        toValue: -300,
        duration: speed.scroll,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [text, translateX, speed.scroll]);

  return (
    <View style={{ overflow: 'hidden', height: 20 }}>
      <Animated.Text 
        style={{
          fontFamily: "monospace",
          color: theme.primaryText,
          fontSize: 14,
          transform: [{ translateX }],
          position: 'absolute',
          whiteSpace: 'nowrap'
        }}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

/**
 * 🖤💖 Blackpink Date/Time Display
 * Renders current date/time in Blackpink style.
 * Props:
 *   mode: "date", "time", or "datetime"
 *   style: additional styles you may want to add
 */
export function BlackpinkDateTime({ mode = "datetime", style = {} }) {
    // Helper to format date/time
    function getFormatted() {
      const now = new Date();
      if (mode === "date") {
        return now.toLocaleDateString();
      }
      if (mode === "time") {
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      // Default: show both
      return (
        now.toLocaleDateString() +
        " " +
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    }
  
    const [display, setDisplay] = useState(getFormatted());
    useEffect(() => {
      // update every second for live time
      const timer = setInterval(() => setDisplay(getFormatted()), 1000);
      return () => clearInterval(timer);
    }, [mode]);
  
    return (
      <View
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: "#1a1a2e",
          borderRadius: 12,
          borderWidth: 2,
          borderColor: "#fc46aa",
          alignSelf: "center",
          marginVertical: 8,
          ...style
        }}
      >
        <Text
          style={{
            color: "#fc46aa",
            fontSize: 14,
            fontFamily: "monospace",
            fontWeight: "bold",
            letterSpacing: 1.5,
          }}
        >
          {display}
        </Text>
      </View>
    );
  }
  

/**
 * ✨ Fade Effect
 * Gentle fade in/out animation
 */
const FadeAnimation = ({ text, theme, speed, onComplete }) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: speed.fade,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(opacity, {
        toValue: 0.7,
        duration: speed.fade,
        useNativeDriver: true,
      })
    ]).start(() => onComplete?.());
  }, [text, opacity, speed.fade, onComplete]);

  return (
    <Animated.Text 
      style={{
        fontFamily: "monospace",
        color: theme.primaryText,
        fontSize: 14,
        opacity
      }}
    >
      {text}
    </Animated.Text>
  );
};

/**
 * 🎯 Slide Effect
 * Text slides in from the side
 */
const SlideAnimation = ({ text, theme, speed, onComplete }) => {
  const translateX = useRef(new Animated.Value(200)).current;

  useEffect(() => {
    translateX.setValue(200);
    Animated.timing(translateX, {
      toValue: 0,
      duration: speed.fade,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: true,
    }).start(() => onComplete?.());
  }, [text, translateX, speed.fade, onComplete]);

  return (
    <Animated.Text 
      style={{
        fontFamily: "monospace",
        color: theme.primaryText,
        fontSize: 14,
        transform: [{ translateX }]
      }}
    >
      {text}
    </Animated.Text>
  );
};

/**
 * 🎆 Glitch Effect
 * Matrix-style digital glitch animation
 */
const GlitchAnimation = ({ text, theme, speed, onComplete }) => {
  const [displayText, setDisplayText] = useState("");
  const [isGlitching, setIsGlitching] = useState(true);

  useEffect(() => {
    const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    let iterations = 0;
    
    const glitchInterval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (index < iterations) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iterations >= text.length) {
        clearInterval(glitchInterval);
        setDisplayText(text);
        setIsGlitching(false);
        onComplete?.();
      }

      iterations += 1 / 3;
    }, speed.typing);

    return () => clearInterval(glitchInterval);
  }, [text, speed.typing, onComplete]);

  return (
    <Text style={{ 
      fontFamily: "monospace", 
      color: isGlitching ? theme.accent : theme.accent, 
      fontSize: 14 
    }}>
      {displayText}
    </Text>
  );
};

/**
 * 📺 Terminal Effect
 * Retro terminal boot-up style
 */
const TerminalAnimation = ({ text, theme, speed, onComplete }) => {
  const [displayLines, setDisplayLines] = useState([]);
  const [currentChar, setCurrentChar] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    setDisplayLines([]);
    let charIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (charIndex < text.length) {
        setCurrentChar(text.slice(0, charIndex + 1));
        charIndex++;
      } else {
        setDisplayLines([text]);
        setCurrentChar("");
        clearInterval(typeInterval);
        onComplete?.();
      }
    }, speed.typing);

    return () => clearInterval(typeInterval);
  }, [text, speed.typing, onComplete]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, speed.cursor);

    return () => clearInterval(cursorInterval);
  }, [speed.cursor]);

  return (
    <View>
      {displayLines.map((line, index) => (
        <Text key={index} style={{ 
          fontFamily: "monospace", 
          color: theme.primaryText, 
          fontSize: 14 
        }}>
          &gt; {line}
        </Text>
      ))}
      {currentChar && (
        <Text style={{ 
          fontFamily: "monospace", 
          color: theme.primaryText, 
          fontSize: 14 
        }}>
          &gt; {currentChar}
          <Text style={{ opacity: showCursor ? 1 : 0, color: theme.cursor }}>█</Text>
        </Text>
      )}
    </View>
  );
};

// ========================================
// 🎪 MAIN LIVEFEED COMPONENT
// ========================================

export default function LiveFeed({
  // 📝 Content Settings
  messages = ["Welcome to LiveFeed!", "Choose your animation style"],
  maxLines = 5,
  
  // 🎬 Animation Settings  
  animationType = "typewriter", // "typewriter", "marquee", "fade", "slide", "glitch", "terminal", "bounce", "rainbow"
  speed = "normal", // "slow", "normal", "fast", "instant"
  
  // 🎨 Visual Settings
  colorTheme = "terminal", // "terminal", "matrix", "neon", "ocean", "retro", "modern"
  boxWidth = 280,
  boxHeight = 150,
  
  // 🔧 Advanced Settings
  autoScroll = true,
  showBorder = false,
  borderWidth = 1,
  borderRadius = 8,
  padding = 5,
  
  // 📱 Callbacks
  onMessageComplete = null,
  onAllComplete = null,
  
  // 🎛️ Custom Overrides
  customTheme = null,
  style = {}
}) {
  // State management
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [processedMessages, setProcessedMessages] = useState([]);
  const scrollRef = useRef(null);
  
  // Get theme and speed configs
  const theme = customTheme || COLOR_THEMES[colorTheme] || COLOR_THEMES.terminal;
  const speedConfig = SPEEDS[speed] || SPEEDS.normal;
  
  // Animation component selector
  const getAnimationComponent = useCallback(() => {
    const currentMessage = messages[currentMessageIndex] || "";
    
    const commonProps = {
      text: currentMessage,
      theme,
      speed: speedConfig,
      onComplete: () => {
        setProcessedMessages(prev => [...prev, currentMessage]);
        onMessageComplete?.(currentMessage, currentMessageIndex);
        
        if (currentMessageIndex < messages.length - 1) {
          setCurrentMessageIndex(prev => prev + 1);
        } else {
          onAllComplete?.();
        }
      }
    };

    switch (animationType) {
      case "marquee":
        return <MarqueeAnimation {...commonProps} />;
      case "fade":
        return <FadeAnimation {...commonProps} />;
      case "slide":
        return <SlideAnimation {...commonProps} />;
      case "glitch":
        return <GlitchAnimation {...commonProps} />;
      case "terminal":
        return <TerminalAnimation {...commonProps} />;
      case "typewriter":
      default:
        return <TypewriterAnimation {...commonProps} />;
    }
  }, [currentMessageIndex, messages, theme, speedConfig, animationType, onMessageComplete, onAllComplete]);

  // Reset when messages change
  useEffect(() => {
    setCurrentMessageIndex(0);
    setProcessedMessages([]);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      const timer = setTimeout(() => {
        try {
          scrollRef.current.scrollToEnd({ animated: true });
        } catch (e) {
          // Ignore scroll errors
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [processedMessages, autoScroll]);

  return (
    <View style={[
      {
        width: boxWidth,
        height: boxHeight,
        backgroundColor: theme.background,
        borderRadius: borderRadius,
        padding: padding,
        ...(showBorder && {
          borderWidth: borderWidth,
          borderColor: theme.border,
        }),
      },
      style
    ]}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Show completed messages */}
        {processedMessages.slice(-maxLines).map((message, index) => (
          <View key={`processed-${index}`} style={{ marginBottom: 4 }}>
            <Text style={{ 
              fontFamily: "monospace", 
              color: theme.secondaryText, 
              fontSize: 13,
              opacity: 0.8 
            }}>
              {message}
            </Text>
          </View>
        ))}
        
        {/* Show current animating message */}
        {currentMessageIndex < messages.length && (
          <View style={{ marginBottom: 30}}>
            {getAnimationComponent()}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ========================================
// 📖 DOCUMENTATION & EXAMPLES
// ========================================

/**
 * 🎯 Quick Start Examples:
 * 
 * // Basic announcement
 * <LiveFeed messages={["Server online", "All systems operational"]} />
 * 
 * // Matrix-style hacker feed
 * <LiveFeed 
 *   messages={["Accessing mainframe...", "Bypassing security...", "Access granted!"]}
 *   animationType="glitch"
 *   colorTheme="matrix"
 *   speed="fast"
 * />
 * 
 * // Retro terminal
 * <LiveFeed 
 *   messages={["BOOT SEQUENCE INITIATED", "LOADING SYSTEM...", "READY FOR INPUT"]}
 *   animationType="terminal"
 *   colorTheme="retro"
 *   speed="normal"
 * />
 * 
 * // Modern scrolling news
 * <LiveFeed 
 *   messages={["Breaking: New features released!", "Update available now"]}
 *   animationType="marquee"
 *   colorTheme="modern"
 *   boxWidth={350}
 * />
 * 
 * 🎨 Available Color Themes:
 * - "terminal" - Classic green on black
 * - "matrix" - Bright matrix green
 * - "neon" - Cyberpunk pink/blue
 * - "ocean" - Cool blue tones
 * - "retro" - Warm amber/orange
 * - "modern" - Clean white/gray
 * 
 * 🎬 Available Animations:
 * - "typewriter" - Classic typing effect
 * - "marquee" - Horizontal scrolling
 * - "fade" - Gentle fade in/out
 * - "slide" - Slide in from right
 * - "glitch" - Matrix-style glitch
 * - "terminal" - Boot-up terminal style
 * 
 * ⚡ Speed Options:
 * - "slow" - Relaxed, easy to read
 * - "normal" - Balanced speed
 * - "fast" - Quick, energetic
 * - "instant" - Almost immediate
 */