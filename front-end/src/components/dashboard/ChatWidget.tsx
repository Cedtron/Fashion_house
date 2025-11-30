import { useRef, useEffect, useState } from 'react';
import { FiSend, FiMessageSquare, FiX, FiBarChart2 } from 'react-icons/fi';
import { useNavigate } from "react-router-dom";
import api from '../../utils/axios';

// --------------------------------------
// INTERFACES
// --------------------------------------
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

// --------------------------------------
// SOUNDS
// --------------------------------------
const sendSound = new Audio("/sounds/send.mp3");
const receiveSound = new Audio("/sounds/receive.mp3");

// --------------------------------------
// MAIN COMPONENT
// --------------------------------------
const ChatWidget = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => {

  const navigate = useNavigate();

  // --------------------------------------
  // STATE (with localStorage persistence)
  // --------------------------------------
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("bubble_messages");
    return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
  });

  const [newMessage, setNewMessage] = useState(
    localStorage.getItem("bubble_input") || ""
  );

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --------------------------------------
  // SCROLL TO BOTTOM
  // --------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("bubble_messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("bubble_input", newMessage);
  }, [newMessage]);

  // --------------------------------------
  // SEND USER MESSAGE
  // --------------------------------------
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
    };

    sendSound.play();
    setMessages((prev) => [...prev, userMsg]);
    processAssistantReply(newMessage);

    setNewMessage("");
  };

  // --------------------------------------
  // ASSISTANT LOGIC (RULES BASED)
  // --------------------------------------
  const processAssistantReply = async (input: string) => {
    setIsTyping(true);

    // SIMULATE THINKING
    setTimeout(async () => {
      let reply = "";

      const text = input.toLowerCase().trim();

      // --------------------------------------
      // ADMIN COMMANDS
      // --------------------------------------
      if (text === "clear chat") {
        localStorage.removeItem("bubble_messages");
        setMessages([]);
        reply = "Chat cleared! Fresh start 😄";
      }

      else if (text === "clear cache") {
        localStorage.clear();
        reply = "Cache cleared. Everything is fresh now!";
      }

      else if (text === "reset bubble") {
        localStorage.clear();
        setMessages([]);
        setNewMessage("");
        reply = "Bubble has been fully reset!";
      }

      else if (text === "help") {
        reply = `
Here are my commands:

📌 **Navigation**
- go home
- open stock
- open suppliers
- open settings
- open category
- open users
- notifications

📌 **Data Tasks**
- list categories
- low stock
- how many stocks?
- stock summary

📌 **Admin Commands**
- clear chat
- clear cache
- reset bubble

📌 **Fun**
- tell me a joke
- advice
- who are you?

Ask me anything!
        `;
      }

      // --------------------------------------
      // NAVIGATION COMMANDS
      // --------------------------------------
      else if (text === "go home") {
        navigate("/app");
        reply = "Going home 🏠";
      }

      else if (text === "open stock") {
        navigate("/app/stock");
        reply = "Opening stock 📦";
      }

      else if (text === "open suppliers") {
        navigate("/app/suppliers");
        reply = "Opening suppliers 🚚";
      }

      else if (text === "open settings") {
        navigate("/app/settings");
        reply = "Opening settings ⚙️";
      }

      else if (text === "open category") {
        navigate("/app/category");
        reply = "Opening categories 🗂️";
      }

      else if (text === "open users") {
        navigate("/app/users");
        reply = "Opening users 👥";
      }

      else if (text === "notifications") {
        navigate("/app/notifications");
        reply = "Here are your notifications 🔔";
      }

      // --------------------------------------
      // FUN COMMANDS
      // --------------------------------------
      else if (text === "tell me a joke") {
        reply = "Why did the inventory system go to school? To improve its *stock* knowledge! 🤣";
      }

      else if (text === "advice") {
        reply = "Small progress each day leads to big results. Keep pushing! 💪";
      }

      else if (text === "who are you?") {
        reply = "I'm Bubble — your cute mini assistant inside Fashion House 😄";
      }

      // --------------------------------------
      // API COMMANDS (simple fetch)
      // --------------------------------------
       else if (text === "how many stocks?" || text === "stock count") {
        const res = await api.get("/stock");
        const data = res.data;
        reply = `You currently have **${data.length}** stock items 📦`;
      }

      else if (text === "low stock") {
        const res = await api.get("/stock");
        const data = res.data;
        const low = data.filter((s: any) => s.quantity < 10);
        reply = `You have **${low.length}** low stock items.`;
      }

      else if (text === "list categories") {
        const res = await api.get("/categories");
        const data = res.data;
        reply = `Categories:\n- ${data.map((c: any) => c.name).join("\n- ")}`;
      }


      else {
        reply = "Hmm... I didn't understand that 😅 Try typing **help** to see what I can do!";
      }

      // FINISH
      setIsTyping(false);

      const botMsg: ChatMessage = {
        id: Date.now().toString(),
        text: reply,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      receiveSound.play();
    }, 800);
  };

  // --------------------------------------
  // ENTER KEY SHORTCUT
  // --------------------------------------
  const handleEnter = (e: any) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --------------------------------------
  // UI
  // --------------------------------------
  return (
    <div className="fixed z-50 bottom-6 right-6">

      {/* BUTTON */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center transition rounded-full shadow-xl w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-110"
      >
        {isOpen ? <FiX className="w-6 h-6 text-white" /> : <FiMessageSquare className="w-6 h-6 text-white" />}
      </button>

      {/* CHAT BOX */}
      {isOpen && (
        <div className="absolute right-0 overflow-hidden bg-white border border-gray-200 shadow-2xl bottom-16 w-80 sm:w-96 rounded-xl">

          {/* HEADER */}
          <div className="flex items-center gap-3 p-4 text-white bg-gradient-to-r from-blue-600 to-purple-600">
            <FiBarChart2 />
            <div>
              <h3 className="font-bold">Bubble Assistant</h3>
              <p className="text-xs">Fashion House Mini Assistant</p>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="p-4 overflow-y-auto h-80 bg-gray-50">

            {messages.map((msg) => (
              <div key={msg.id} className={`mb-3 ${msg.sender === "user" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                    msg.sender === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white border rounded-bl-none text-gray-800"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
                  <div className="text-[10px] mt-1 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="mb-3 text-left">
                <div className="inline-block px-4 py-2 bg-white border rounded-bl-none rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 delay-100 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 delay-200 bg-gray-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef}></div>
          </div>

          {/* INPUT */}
          <div className="p-3 bg-white border-t">
            <div className="flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleEnter}
                className="flex-1 px-3 py-2 text-sm border rounded-full"
                placeholder="Ask Bubble..."
              />
              <button
                onClick={handleSendMessage}
                className="p-3 text-white bg-blue-600 rounded-full hover:bg-blue-700"
              >
                <FiSend />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ChatWidget;
