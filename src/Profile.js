import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const topicOrder = [
  "Array",
  "LinkedList",
  "Stack",
  "Queue",
  "Tree",
  "Graph",
  "DynamicProgramming",
];

const topicEmojis = {
  Array: "📦",
  LinkedList: "🔗",
  Stack: "📚",
  Queue: "🚶",
  Tree: "🌳",
  Graph: "🕸️",
  DynamicProgramming: "🧠",
};

const Profile = ({ user, userData }) => {
  const navigate = useNavigate();

  const currentTopicIndex = topicOrder.indexOf(userData?.topic ?? "Array");

  return (
    <div style={styles.wrapper}>

      {/* 🔝 Header */}
      <div style={styles.header}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/world")}
          style={styles.backBtn}
        >
          ← Back to World
        </motion.button>
        <div style={styles.headerTitle}>🏠 Home Base</div>
        <div style={styles.statBadge}>
          💰 {userData?.credits ?? 100} Credits
        </div>
      </div>

      {/* 👤 Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.profileCard}
      >
        <img
          src={user?.photoURL}
          alt="avatar"
          style={styles.avatar}
        />
        <div style={styles.profileName}>
          {user?.displayName}
        </div>
        <div style={styles.profileEmail}>
          {user?.email}
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              {userData?.level ?? 1}
            </div>
            <div style={styles.statLabel}>Level</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              {userData?.credits ?? 100}
            </div>
            <div style={styles.statLabel}>Credits</div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statValue}>
              {userData?.xp ?? 0}
            </div>
            <div style={styles.statLabel}>XP</div>
          </div>
        </div>
      </motion.div>

      {/* 📚 Topic Progress */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        style={styles.section}
      >
        <div style={styles.sectionTitle}>📚 DSA Topic Progress</div>
        <div style={styles.topicGrid}>
          {topicOrder.map((topic, index) => {
            const isCompleted = index < currentTopicIndex;
            const isCurrent = index === currentTopicIndex;
            const isLocked = index > currentTopicIndex;

            return (
              <motion.div
                key={topic}
                whileHover={{ scale: isLocked ? 1 : 1.04 }}
                style={{
                  ...styles.topicCard,
                  borderColor: isCompleted
                    ? "#00c896"
                    : isCurrent
                    ? "#1a73e8"
                    : "#333",
                  background: isCompleted
                    ? "rgba(0,200,150,0.07)"
                    : isCurrent
                    ? "rgba(26,115,232,0.1)"
                    : "rgba(255,255,255,0.03)",
                  opacity: isLocked ? 0.45 : 1,
                }}
              >
                <div style={styles.topicEmoji}>
                  {topicEmojis[topic]}
                </div>
                <div style={styles.topicName}>{topic}</div>
                <div
                  style={{
                    ...styles.topicStatus,
                    color: isCompleted
                      ? "#00c896"
                      : isCurrent
                      ? "#1a73e8"
                      : "#555",
                  }}
                >
                  {isCompleted
                    ? "✅ Completed"
                    : isCurrent
                    ? "🔵 Current"
                    : "🔒 Locked"}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 🚀 Quick Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        style={styles.actionRow}
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate("/home")}
          style={styles.actionBtn}
        >
          🏢 Go to Office → Start Practicing
        </motion.button>
      </motion.div>

    </div>
  );
};

// 🎨 Styles
const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#0f0f1a",
    fontFamily: "Arial, sans-serif",
    color: "white",
    paddingBottom: "80px",
  },

  // Header
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 40px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(15,15,26,0.95)",
    backdropFilter: "blur(12px)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "20px",
    padding: "8px 18px",
    color: "white",
    fontWeight: "bold",
    fontSize: "14px",
    cursor: "pointer",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1a73e8",
  },
  statBadge: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "20px",
    padding: "8px 18px",
    fontSize: "14px",
    fontWeight: "bold",
    color: "white",
  },

  // Profile Card
  profileCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(26,115,232,0.3)",
    borderRadius: "20px",
    padding: "40px 30px",
    maxWidth: "500px",
    margin: "50px auto 0 auto",
    textAlign: "center",
    boxShadow: "0 0 30px rgba(26,115,232,0.15)",
  },
  avatar: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    border: "3px solid #1a73e8",
    objectFit: "cover",
    marginBottom: "16px",
  },
  profileName: {
    fontSize: "24px",
    fontWeight: "bold",
    color: "white",
  },
  profileEmail: {
    fontSize: "14px",
    color: "#888",
    marginTop: "6px",
    marginBottom: "24px",
  },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  statBox: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "14px",
    padding: "16px 28px",
    textAlign: "center",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1a73e8",
  },
  statLabel: {
    fontSize: "12px",
    color: "#888",
    marginTop: "4px",
  },

  // Topic Progress
  section: {
    maxWidth: "900px",
    margin: "50px auto 0 auto",
    padding: "0 30px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "24px",
    color: "white",
  },
  topicGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  topicCard: {
    border: "1px solid",
    borderRadius: "14px",
    padding: "20px 16px",
    textAlign: "center",
    transition: "all 0.3s ease",
  },
  topicEmoji: {
    fontSize: "2rem",
    marginBottom: "8px",
  },
  topicName: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "white",
    marginBottom: "6px",
  },
  topicStatus: {
    fontSize: "12px",
    fontWeight: "bold",
  },

  // Action Button
  actionRow: {
    textAlign: "center",
    marginTop: "40px",
  },
  actionBtn: {
    background: "linear-gradient(90deg, #1a73e8, #a855f7)",
    border: "none",
    borderRadius: "25px",
    padding: "14px 32px",
    color: "white",
    fontWeight: "bold",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default Profile;
