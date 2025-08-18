import { StyleSheet } from "react-native";

const pookieStyles = StyleSheet.create({
    pookieContainer: {
      backgroundColor: "#000000", // keep solid black base
      flex: 1,
      alignItems: "center",
      justifyContent: "flex-start",
    },
  
    feedWrap: {
      width: "100%",
      alignItems: "center",
      marginTop: 12,
    },
  
    centered: {
      width: "100%",
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 10,
    },
  
    glow: {
      position: "absolute",
      width: 260,
      height: 260,
      borderRadius: 260,
      backgroundColor: "rgba(255,20,147,0.08)", // hot pink soft glow
      shadowColor: "#ff1493",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 18,
      elevation: 2,
      top: 70,
    },
  
    kittyWrapper: {
      marginTop: 30,
      marginBottom: 8,
      alignItems: "center",
    },
  
    timeWrap: {
      marginTop: 6,
      marginBottom: 8,
      paddingVertical: 6,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "#ff69b4",
      borderStyle: "solid",
      alignSelf: "center",
    },
  
    kawaiiStatusText: {
      marginTop: 8,
      color: "#f5a9d6",
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
  
    lockText: {
      color: "#ff69b4",
      fontWeight: "800",
      textTransform: "lowercase",
    },
  
    input: {
      width: "90%",
      marginTop: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255,182,193,0.12)",
      backgroundColor: "#04120e", // very dark greenish black to feel secure
      color: "#ffdce6",
      fontFamily: "monospace",
      fontSize: 16,
    },
  
    primaryButton: {
      marginTop: 12,
      width: 220,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: "#ff1493", // hot pink pill
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#ff1493",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 2,
    },
  
    biometricButton: {
      marginTop: 10,
      width: 220,
      paddingVertical: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: "#ff69b4",
      backgroundColor: "#000000",
      alignItems: "center",
      justifyContent: "center",
    },
  
    devButton: {
      marginTop: 10,
      width: 220,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
      alignItems: "center",
      justifyContent: "center",
    },
  
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: 0.6,
    },
  
    linkButton: {
      marginTop: 14,
      paddingVertical: 6,
    },
  
    linkText: {
      color: "#c8ffdf",
      textDecorationLine: "underline",
      fontSize: 13,
    },
    // Add these to pookieStyles (or merge with your file)
    // wrapper around kitty to preserve spacing
    kittyWrapper: {
      marginTop: 4,
      marginBottom: 8,
      alignItems: "center",
    },
  
    // feed + status
    kawaiiStatusText: {
      marginTop: 8,
      color: "#d9a7bf", // muted rose-pink
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    lockText: {
      color: "#ff6fb5", // bright pookie pink
      fontWeight: "700",
      textTransform: "lowercase",
    },
  
    // input wrapper to animate glow/border
    inputWrap: {
      width: "90%",
      marginTop: 18,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.06)",
      backgroundColor: "#040407", // near black
      shadowColor: "#ff69b4",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    inputText: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      color: "#ffdfe9",
      fontSize: 15,
      fontFamily: "monospace",
    },
  
    // primary button: pill with subtle inner highlight and deep shadow
    primaryWrap: {
      marginTop: 14,
    },
    primaryButton: {
      width: 220,
      paddingVertical: 12,
      borderRadius: 999,
      backgroundColor: "#ff2fa0", // saturated pink
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#ff2fa0",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18,
      shadowRadius: 14,
      elevation: 6,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.4,
    },
  
    // biometric smaller secondary CTA
    biometricWrap: {
      marginTop: 10,
    },
    biometricButton: {
      width: 190,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1.2,
      borderColor: "rgba(255,111,181,0.24)",
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    buttonTextSecondary: {
      color: "#ff9fcf",
      fontSize: 14,
      fontWeight: "700",
    },
  
    // dev & link
    devButton: {
      marginTop: 12,
      backgroundColor: "transparent",
    },
  
    linkButton: {
      marginTop: 14,
    },
    linkText: {
      color: "#c8ffd8",
    },
    linkTextSecondary: {
      color: "#a6f0d4",
    },
  
    // small helpers
    placeholderColor: "#9f6f86",
  });