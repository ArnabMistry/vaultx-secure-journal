// src/styles.js
import { StyleSheet, Platform } from "react-native";

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: Platform.OS === "android" ? 24 : 0
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#0e2e24"
  },
  headerRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0e2e24",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    color: "#9ef5c9",
    fontSize: 20,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },
  subtitle: {
    color: "#7fbfa0",
    fontSize: 12,
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },

  content: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  smallMuted: {
    color: "#7aa78f",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 6
  },
  label: { color: "#9ef5c9", marginTop: 12, marginBottom: 6 },

  input: {
    backgroundColor: "#07120c",
    color: "#bff6d8",
    borderColor: "#0f3e2f",
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    width: "100%",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },

  note: { color: "#7aa78f", marginTop: 10, marginBottom: 12, fontSize: 12 },

  buttonPrimary: {
    backgroundColor: "#0ea37a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10
  },
  buttonSecondary: {
    backgroundColor: "#15392e",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#0d2a21"
  },
  buttonText: {
    color: "#00110a",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace"
  },

  footer: { padding: 12, borderTopWidth: 1, borderTopColor: "#0e2e24", alignItems: "center" },

  contentRow: { flex: 1, flexDirection: "row", padding: 12 },
  colLeft: { width: "35%", paddingRight: 8 },
  colRight: { width: "65%", paddingLeft: 8 },

  sectionTitle: { color: "#9ef5c9", fontWeight: "700", marginBottom: 8 },

  emptyBox: { backgroundColor: "#07120c", padding: 20, borderRadius: 8, borderWidth: 1, borderColor: "#0f3e2f" },

  entryCard: {
    backgroundColor: "#07120c",
    borderColor: "#0b3b2b",
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8
  },

  entryMeta: { color: "#8de6bf", fontSize: 12 },
  entryMetaSmall: { color: "#66cfa7", fontSize: 11 },
  entryHash: { color: "#aeeccf", fontSize: 11 },

  smallBtn: { borderColor: "#1b6b56", borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  smallBtnText: { color: "#9ef5c9", fontSize: 12 },

  logLine: { color: "#7aa78f", fontSize: 11 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalBox: { backgroundColor: "#07120c", padding: 16, width: "92%", borderRadius: 10, borderColor: "#0f3e2f", borderWidth: 1 },
  modalBoxLarge: { backgroundColor: "#07120c", padding: 16, width: "96%", borderRadius: 10, borderColor: "#0f3e2f", borderWidth: 1, maxHeight: "85%" },
  modalTitle: { color: "#9ef5c9", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  auditLine: { color: "#bfeed7", marginBottom: 6 }
});
