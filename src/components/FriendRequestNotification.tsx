import React from 'react';
import { UserPlus, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface FriendRequestNotificationProps {
  request: {
    id: string;
    sender_id: string;
    sender_name: string;
  };
  onClose: () => void;
}

export function FriendRequestNotification({ request, onClose }: FriendRequestNotificationProps) {
  const handleAction = async (action: 'accept' | 'reject') => {
    if (!supabase) return;

    try {
      await supabase
        .from('friend_requests')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', request.id);
      
      onClose();
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-20 right-4 bg-white/10 backdrop-blur-md rounded-lg p-4 shadow-lg max-w-sm w-full"
    >
      <div className="flex items-center gap-3">
        <div className="bg-white/20 rounded-full p-2">
          <UserPlus className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-medium">Friend Request</p>
          <p className="text-white/80 text-sm">{request.sender_name} wants to connect</p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => handleAction('reject')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
        >
          <X className="h-4 w-4" />
          <span>Decline</span>
        </button>
        <button
          onClick={() => handleAction('accept')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition"
        >
          <Check className="h-4 w-4" />
          <span>Accept</span>
        </button>
      </div>
    </motion.div>
  );
}