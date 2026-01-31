import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Message, User } from '../types';
import { Send, X, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from './ui';

interface ChatWindowProps {
  orderId: string;
  currentUser: User;
  onClose: () => void;
  title: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ orderId, currentUser, onClose, title }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const msgs = await api.getMessages(orderId);
    // Sort by timestamp
    msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setMessages(msgs);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 10 seconds for new messages to avoid hitting API limits too hard
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setSending(true);
    // Optimistic UI
    const tempMsg: Message = {
      id: 'temp', order_id: orderId, sender_id: currentUser.id, sender_name: currentUser.nama_lengkap,
      content: inputText, timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');

    await api.sendMessage({
      order_id: orderId,
      sender_id: currentUser.id,
      sender_name: currentUser.nama_lengkap,
      content: tempMsg.content
    });
    setSending(false);
    fetchMessages(); // Sync real ID
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-brand-green text-white p-4 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm">Chat Pesanan</h3>
            <p className="text-xs opacity-80">{title}</p>
          </div>
          <div className="flex gap-3">
             <button onClick={fetchMessages}><RefreshCw size={18}/></button>
             <button onClick={onClose}><X size={20}/></button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
          {loading && messages.length === 0 ? <LoadingSpinner /> : (
            messages.length === 0 ? <p className="text-center text-gray-400 text-xs mt-10">Belum ada pesan. Mulai obrolan!</p> :
            messages.map((msg, idx) => {
              const isMe = msg.sender_id === currentUser.id;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-brand-green text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    {!isMe && <p className="text-[10px] font-bold text-brand-dark mb-1">{msg.sender_name}</p>}
                    <p>{msg.content}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-brand-green"
            placeholder="Tulis pesan..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={sending || !inputText.trim()}
            className="bg-brand-green text-white p-2 rounded-full hover:bg-green-700 transition disabled:bg-gray-300"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};