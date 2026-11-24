
import { useEffect, useRef, useState } from "react";
import {
  HeartPulse,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  Bot,
  User,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Clock,
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import "./Chatbot.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function Chatbot({ user }) {
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const getToken = async () => {
    const currentUser = user;

    if (!currentUser) {
      throw new Error("Please log in to use CareBridge AI.");
    }

    return await currentUser.getIdToken();
  };

  const apiRequest = async (url, options = {}) => {
    const token = await getToken();
    console.log("Firebase user:", user?.uid);
    console.log("Firebase token received:", !!token);
    console.log("Firebase token length:", token?.length);
    console.log("API URL:", `${API}${url}`);

    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.detail || "Unable to connect to CareBridge AI."
      );
    }

    return result;
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);

      const result = await apiRequest("/api/chat/history");

      setHistory(result.conversations || []);
    } catch (err) {
      console.error("History error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages, loading]);

  const newChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setError("");
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const openConversation = async (id) => {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest(`/api/chat/${id}`);

      setConversationId(result.conversation_id);
      setMessages(result.messages || []);
      setSidebarOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id, event) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    try {
      await apiRequest(`/api/chat/${id}`, {
        method: "DELETE"
      });

      setHistory((previous) =>
        previous.filter(
          (item) => item.conversation_id !== id
        )
      );

      if (conversationId === id) {
        newChat();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setError("");

    const userMessage = {
      role: "user",
      content: message
    };

    setMessages((previous) => [
      ...previous,
      userMessage
    ]);

    setInput("");
    setLoading(true);

    try {
      const result = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          conversation_id: conversationId
        })
      });

      setConversationId(result.conversation_id);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: result.response
        }
      ]);

      await loadHistory();
    } catch (err) {
      setError(err.message);

      setMessages((previous) =>
        previous.filter(
          (item, index) =>
            !(item === userMessage && index === previous.length - 1)
        )
      );

      setInput(message);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    {
      icon: <HeartPulse />,
      title: "Health concerns",
      description: "Understand common symptoms"
    },
    {
      icon: <Stethoscope />,
      title: "First aid guidance",
      description: "Learn basic first-aid steps"
    },
    {
      icon: <ShieldCheck />,
      title: "Wellness advice",
      description: "Explore healthy habits"
    }
  ];

  return (
    <div className={`cb-chat-app ${darkMode ? "dark" : "light"}`}>

      <aside className={`cb-sidebar ${sidebarOpen ? "open" : ""}`}>

        <div className="cb-sidebar-header">
          <div className="cb-brand">
            <div className="cb-brand-icon">
              <HeartPulse size={25} />
            </div>
            <div>
              <h2>CareBridge</h2>
              <span>AI HEALTH ASSISTANT</span>
            </div>
          </div>

          <button
            className="cb-icon-button cb-mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <button className="cb-new-chat" onClick={newChat}>
          <Plus size={19} />
          <span>New conversation</span>
        </button>

        <div className="cb-history-title">
          <Clock size={15} />
          RECENT CONVERSATIONS
        </div>

        <div className="cb-history-list">

          {historyLoading && (
            <div className="cb-history-empty">
              Loading conversations...
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div className="cb-history-empty">
              Your conversations will appear here.
            </div>
          )}

          {history.map((item) => (
            <div
              key={item.conversation_id}
              className={`cb-history-item ${
                conversationId === item.conversation_id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                openConversation(item.conversation_id)
              }
            >
              <MessageSquare size={17} />

              <span className="cb-history-name">
                {item.title || "New conversation"}
              </span>

              <button
                className="cb-delete-button"
                onClick={(event) =>
                  deleteConversation(
                    item.conversation_id,
                    event
                  )
                }
                title="Delete conversation"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}

        </div>

        <div className="cb-sidebar-footer">
          <div className="cb-security">
            <ShieldCheck size={19} />
            <div>
              <strong>Secure conversations</strong>
              <span>Your chats are linked to your account.</span>
            </div>
          </div>

          <div className="cb-user-info">
            <div className="cb-user-avatar">
              {user?.displayName
                ? user.displayName.charAt(0).toUpperCase()
                : <User size={18} />}
            </div>
            <div className="cb-user-details">
              <strong>
                {user?.displayName || "CareBridge User"}
              </strong>
              <span>{user?.email || "Authenticated user"}</span>
            </div>
          </div>
        </div>

      </aside>

      {sidebarOpen && (
        <div
          className="cb-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="cb-main">

        <header className="cb-topbar">

          <div className="cb-topbar-left">

            <button
              className="cb-icon-button"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <div>
              <h3>AI Health Assistant</h3>
              <span className="cb-online">
                <span className="cb-online-dot" />
                AI Assistant Online
              </span>
            </div>

          </div>

          <div className="cb-topbar-right">

            <div className="cb-secure-label">
              <ShieldCheck size={16} />
              Private & Secure
            </div>

            <button
              className="cb-icon-button"
              onClick={() => setDarkMode(!darkMode)}
              title="Toggle theme"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

          </div>

        </header>

        <section className="cb-chat-content">

          {messages.length === 0 ? (

            <div className="cb-welcome">

              <div className="cb-welcome-icon">
                <Sparkles size={31} />
              </div>

              <span className="cb-welcome-tag">
                YOUR PERSONAL HEALTH COMPANION
              </span>

              <h1>
                How can I help
                <br />
                <span>you today?</span>
              </h1>

              <p className="cb-welcome-description">
                Welcome to CareBridge AI. Ask health-related
                questions, understand symptoms and explore
                safe wellness information.
              </p>

              <div className="cb-suggestions">

                {suggestions.map((item, index) => (
                  <button
                    key={index}
                    className="cb-suggestion-card"
                    onClick={() => {
                      setInput(
                        index === 0
                          ? "I want to understand some health concerns."
                          : index === 1
                          ? "Can you explain some basic first aid guidance?"
                          : "Please suggest some healthy lifestyle habits."
                      );
                      inputRef.current?.focus();
                    }}
                  >
                    <div className="cb-suggestion-icon">
                      {item.icon}
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>
                  </button>
                ))}

              </div>

            </div>

          ) : (

            <div className="cb-messages">

              {messages.map((message, index) => (

                <div
                  key={index}
                  className={`cb-message ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                >

                  <div className="cb-message-avatar">
                    {message.role === "user"
                      ? <User size={19} />
                      : <Bot size={20} />}
                  </div>

                  <div className="cb-message-body">
                    <div className="cb-message-name">
                      {message.role === "user"
                        ? "You"
                        : "CareBridge AI"}
                    </div>

                    <div className="cb-message-text">
                      {message.content}
                    </div>
                  </div>

                </div>

              ))}

              {loading && (
                <div className="cb-message assistant-message">
                  <div className="cb-message-avatar">
                    <Bot size={20} />
                  </div>

                  <div className="cb-message-body">
                    <div className="cb-message-name">
                      CareBridge AI
                    </div>

                    <div className="cb-typing">
                      <span />
                      <span />
                      <span />
                      <small>Thinking...</small>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

            </div>

          )}

        </section>

        {error && (
          <div className="cb-error">
            <AlertCircle size={17} />
            {error}
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="cb-input-area">

          <form className="cb-input-form" onSubmit={sendMessage}>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask CareBridge AI anything about your health..."
              rows={1}
              maxLength={2000}
              disabled={loading}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  sendMessage(event);
                }
              }}
            />

            <button
              type="submit"
              className="cb-send-button"
              disabled={!input.trim() || loading}
            >
              {loading
                ? <LoaderCircle size={20} className="cb-spin" />
                : <Send size={19} />}
            </button>

          </form>

          <div className="cb-input-disclaimer">
            <ShieldCheck size={13} />
            AI can make mistakes. This assistant does not
            replace professional medical advice. For emergencies,
            call 112 in India.
          </div>

        </div>

      </main>

    </div>
  );
}

export default Chatbot;
