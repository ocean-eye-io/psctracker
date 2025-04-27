// src/components/FloatingChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Book, ChevronRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const FloatingChatbot = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I can help you with fleet information. Ask me about vessels, ports, or voyage details.", sender: "bot", timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showDetailedExamples, setShowDetailedExamples] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isAuthPage = location.pathname.includes('/login') ||
    location.pathname.includes('/signup') ||
    location.pathname.includes('/forgot-password') ||
    location.pathname.includes('/reset-password') ||
    location.pathname.includes('/confirm-signup');

  const shouldRender = !isAuthPage && currentUser;
  const LAMBDA_URL = "https://z2knkxpjffymu254qmwpms6kia0kjacj.lambda-url.ap-south-1.on.aws/";

  const quickSuggestions = [
    "Vessels at sea",
    "Australia arrivals",
    "Upcoming ETAs"
  ];

  const detailedExamples = [
    "How many vessels are currently at sea?",
    "Which vessels are scheduled to arrive in Australia this week?",
    "When will SPAR APUS arrive at its destination port?",
    "How many vessels are at anchor right now?"
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (messages.length > 2) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
    if (isOpen) {
      setShowPulse(false);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (isOpen && chatContainerRef.current) {
      void chatContainerRef.current.offsetWidth;
      chatContainerRef.current.classList.add('chat-visible');
    }
  }, [isOpen]);

  const handleOpenChat = () => setIsOpen(true);

  const handleCloseChat = () => {
    setIsOpen(false);
    setShowDetailedExamples(false);
  };

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    if (inputRef.current) inputRef.current.focus();
  };

  const toggleDetailedExamples = () => setShowDetailedExamples(!showDetailedExamples);

  const sendMessage = async () => {
    if (inputValue.trim() === '') return;
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.text }),
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const data = await response.json();
      setTimeout(() => {
        const botMessage = {
          id: Date.now(),
          text: data.answer || "I'm sorry, I couldn't process your request.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      setTimeout(() => {
        const errorMessage = {
          id: Date.now(),
          text: "Sorry, there was an error processing your request. Please try again.",
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsTyping(false);
      }, 800);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!shouldRender) return null;

  return (
    <div className="fleet-ai-chatbot">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap');
        .fleet-ai-chatbot {
          --primary-color: #FF7A30;
          --primary-dark: #E86014;
          --primary-glow: rgba(255, 122, 48, 0.4);
          --blue-accent: #3BADE5;
          --blue-dark: #1C8EC0;
          --bg-dark: rgba(10, 23, 37, 0.85);
          --bg-darker: rgba(7, 17, 28, 0.9);
          --bg-lighter: rgba(19, 35, 55, 0.8);
          --text-color: #FFFFFF;
          --text-muted: rgba(255, 255, 255, 0.7);
          --text-faint: rgba(255, 255, 255, 0.4);
          --border-color: rgba(255, 255, 255, 0.1);
          --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
          --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
          --radius-sm: 6px;
          --radius-md: 10px;
          --radius-lg: 14px;
          --radius-full: 9999px;
          --font-sans: 'Nunito', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          --transition-fast: 0.15s ease;
          --transition-normal: 0.25s ease;
          font-family: var(--font-sans);
        }
        .ask-ai-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%);
          color: white;
          border-radius: var(--radius-full);
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          z-index: 10000;
          border: none;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 
            0 6px 16px rgba(0, 0, 0, 0.2),
            0 2px 4px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 4px 12px var(--primary-glow);
          transition: all var(--transition-normal);
          transform: translateY(0);
          overflow: hidden;
        }
        .ask-ai-button::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.05));
          pointer-events: none;
          border-radius: var(--radius-full);
        }
        .ask-ai-button::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 55%;
          border-radius: var(--radius-full) var(--radius-full) 10px 10px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.05));
          pointer-events: none;
        }
        .ask-ai-button:hover {
          transform: translateY(-3px);
          box-shadow: 
            0 10px 20px rgba(0, 0, 0, 0.25),
            0 4px 6px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset,
            0 6px 16px var(--primary-glow),
            0 0 20px var(--primary-glow);
        }
        .button-icon-container {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 20px;
          height: 20px;
        }
        .button-icon {
          position: relative;
          z-index: 2;
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
        }
        .icon-glow {
          position: absolute;
          width: 100%;
          height: 100%;
          background: var(--primary-color);
          border-radius: 50%;
          filter: blur(6px);
          opacity: 0.4;
          z-index: 1;
          animation: pulse-icon 3s infinite ease-in-out;
        }
        @keyframes pulse-icon {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        .ask-ai-button-text {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 2;
        }
        .pulse-ring {
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: var(--radius-full);
          border: 2px solid var(--primary-color);
          opacity: 0;
          animation: pulse 2s infinite ease-out;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          70% { transform: scale(1.1); opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
        .chat-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 480px;
          height: 700px;
          max-height: calc(100vh - 40px);
          background: var(--bg-dark);
          border-radius: var(--radius-md);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(10px);
          transition: all var(--transition-normal);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: var(--shadow-md), 0 0 30px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .chat-container::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(circle at top right, rgba(59, 173, 229, 0.08) 0%, transparent 60%),
            radial-gradient(circle at bottom left, rgba(255, 122, 48, 0.05) 0%, transparent 50%);
          pointer-events: none;
          z-index: -1;
          opacity: 0.8;
        }
        .chat-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .chat-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-darker);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .chat-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(to right, 
            transparent, 
            rgba(255, 122, 48, 0.3), 
            rgba(59, 173, 229, 0.3), 
            transparent
          );
          z-index: 1;
        }
        .header-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 2px 8px rgba(255, 122, 48, 0.3);
          overflow: hidden;
        }
        .header-icon::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.25), transparent 70%);
          z-index: 0;
        }
        .header-icon::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 55%;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .header-icon-inner {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
        }
        .header-text h3 {
          margin: 0;
          padding: 0;
          color: var(--text-color);
          font-size: 16px;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .header-text p {
          margin: 2px 0 0;
          padding: 0;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 400;
        }
        .close-btn {
          width: 28px;
          height: 28px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        .messages-area {
          display: flex;
          flex-direction: column;
          padding: 16px;
          overflow-y: auto;
          flex-grow: 1;
          gap: 16px;
          background-color: transparent;
          position: relative;
          z-index: 1;
        }
        .messages-area::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--bg-dark);
          z-index: -1;
        }
        .message {
          max-width: 85%;
          animation: fade-in 0.2s ease forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-content {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          line-height: 1.5;
          position: relative;
          color: var(--text-color);
          font-weight: 400;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .bot-message {
          align-self: flex-start;
        }
        .bot-message .message-content {
          background-color: rgba(30, 50, 75, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(59, 173, 229, 0.15);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        }
        .bot-message .message-content::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          border-radius: 12px 12px 0 0;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .user-message {
          align-self: flex-end;
        }
        .user-message .message-content {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          color: white;
          text-align: right;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          position: relative;
          overflow: hidden;
        }
        .user-message .message-content::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .message-time {
          font-size: 11px;
          color: var(--text-faint);
          margin-top: 4px;
        }
        .typing {
          align-self: flex-start;
          padding: 12px 16px;
          background-color: rgba(30, 50, 75, 0.6);
          border-radius: var(--radius-md);
          display: flex;
          gap: 4px;
          width: fit-content;
          border: 1px solid rgba(59, 173, 229, 0.15);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background-color: var(--blue-accent);
          animation: typing-dot 1.4s infinite ease-in-out;
          opacity: 0.7;
          box-shadow: 0 0 5px rgba(59, 173, 229, 0.3);
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing-dot {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        .suggestion-chips {
          display: flex;
          gap: 8px;
          margin-top: 2px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .suggestion-chip {
          background-color: rgba(255, 122, 48, 0.15);
          border: 1px solid rgba(255, 122, 48, 0.2);
          border-radius: var(--radius-full);
          padding: 6px 12px;
          font-size: 12px;
          color: var(--text-color);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .suggestion-chip::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .suggestion-chip:hover {
          background-color: rgba(255, 122, 48, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(255, 122, 48, 0.2);
        }
        .examples-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: var(--primary-color);
          font-size: 12px;
          cursor: pointer;
          padding: 0;
          transition: all var(--transition-fast);
          text-shadow: 0 0 8px rgba(255, 122, 48, 0.3);
        }
        .examples-toggle:hover {
          color: var(--primary-dark);
        }
        .examples-list {
          margin-top: 10px;
          background-color: rgba(255, 122, 48, 0.08);
          border-radius: var(--radius-md);
          overflow: hidden;
          animation: fade-in 0.2s ease forwards;
          border: 1px solid rgba(255, 122, 48, 0.15);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .example-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          transition: all var(--transition-fast);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .example-item:last-child {
          border-bottom: none;
        }
        .example-item:hover {
          background-color: rgba(255, 122, 48, 0.15);
        }
        .example-icon {
          color: var(--primary-color);
        }
        .example-text {
          font-size: 13px;
          color: var(--text-color);
        }
        .input-area {
          padding: 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--bg-lighter);
          position: relative;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .input-area::before {
          content: '';
          position: absolute;
          top: 0;
          left: 15%;
          right: 15%;
          height: 1px;
          background: linear-gradient(to right, 
            transparent, 
            rgba(255, 122, 48, 0.2), 
            rgba(59, 173, 229, 0.2), 
            transparent
          );
        }
        .input-wrapper {
          flex: 1;
          position: relative;
        }
        .chat-input {
          width: 100%;
          padding: 10px 14px;
          background-color: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-full);
          color: var(--text-color);
          font-size: 14px;
          font-family: var(--font-sans);
          transition: all var(--transition-fast);
          outline: none;
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
        }
        .chat-input:focus {
          border-color: var(--primary-color);
          background-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 0 0 1px rgba(255, 122, 48, 0.2);
        }
        .chat-input::placeholder {
          color: var(--text-faint);
        }
        .send-button {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(255, 122, 48, 0.25);
        }
        .send-button::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0));
          pointer-events: none;
        }
        .send-button:hover {
          background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 122, 48, 0.3);
        }
        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        /* Markdown/ReactMarkdown styles */
        .formatted-message h1, .formatted-message h2, .formatted-message h3 {
          color: var(--primary-color);
          margin: 12px 0 6px 0;
          font-weight: 700;
        }
        .formatted-message ul, .formatted-message ol {
          margin: 8px 0 8px 18px;
          padding-left: 18px;
        }
        .formatted-message li {
          margin-bottom: 4px;
        }
        .formatted-message table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 13px;
        }
        .formatted-message th, .formatted-message td {
          border: 1px solid #3BADE5;
          padding: 4px 8px;
          text-align: left;
          background: rgba(59,173,229,0.05);
        }
        .formatted-message th {
          background: rgba(59,173,229,0.15);
          color: var(--primary-color);
        }
        .formatted-message strong {
          color: white;
          font-weight: 600;
        }
        .formatted-message em {
          font-style: italic;
          opacity: 0.9;
        }
        .formatted-message p {
          margin: 0 0 8px 0;
          text-align: left;
        }
        .formatted-message p:last-child {
          margin-bottom: 0;
        }
        @media (max-width: 600px) {
          .chat-container {
            width: calc(100% - 16px);
            right: 8px;
            bottom: 8px;
            height: calc(100vh - 32px);
          }
        }
      `}</style>

      {!isOpen && (
        <button className="ask-ai-button" onClick={handleOpenChat}>
          <div className="button-icon-container">
            <div className="icon-glow"></div>
            <MessageCircle className="button-icon" size={18} />
          </div>
          <span className="ask-ai-button-text">Ask AI</span>
          {showPulse && <div className="pulse-ring"></div>}
        </button>
      )}

      {isOpen && (
        <div className="chat-container" ref={chatContainerRef}>
          <div className="chat-header">
            <div className="header-content">
              <div className="header-icon">
                <MessageCircle className="header-icon-inner" size={18} color="white" />
              </div>
              <div className="header-text">
                <h3>ASK AI</h3>
                <p>Your maritime intelligence assistant</p>
              </div>
              <div class="watermark">
                  Powered by Perplexity AI
              </div>
            </div>
            <button className="close-btn" onClick={handleCloseChat} aria-label="Close chat">
              <X size={16} />
            </button>
          </div>
          <div className="messages-area">
            {messages.map(message => (
              <div
                key={message.id}
                className={`message ${message.sender === 'bot' ? 'bot-message' : 'user-message'}`}
              >
                <div className="message-content">
                  {message.sender === 'bot' ? (
                    <div className="formatted-message">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.text
                  )}
                  <div className="message-time">{formatTime(message.timestamp)}</div>
                </div>
              </div>
            ))}
            {showSuggestions && messages.length === 1 && (
              <>
                <div className="suggestion-chips">
                  {quickSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="suggestion-chip"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <button className="examples-toggle" onClick={toggleDetailedExamples}>
                  <Book size={12} />
                  <span>{showDetailedExamples ? 'Hide examples' : 'Show more examples'}</span>
                </button>
                {showDetailedExamples && (
                  <div className="examples-list">
                    {detailedExamples.map((example, index) => (
                      <div
                        key={index}
                        className="example-item"
                        onClick={() => handleSuggestionClick(example)}
                      >
                        <ChevronRight size={12} className="example-icon" />
                        <span className="example-text">{example}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {isTyping && (
              <div className="typing">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="input-area">
            <div className="input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder="Ask about your fleet..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              className="send-button"
              onClick={sendMessage}
              disabled={inputValue.trim() === ''}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbot;