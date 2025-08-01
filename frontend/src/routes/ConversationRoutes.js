import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ConversationList from '../components/conversations/ConversationList';
import ConversationDetail from '../components/conversations/ConversationDetail';
import ConversationAnalytics from '../components/conversations/ConversationAnalytics';

/**
 * Conversation Routes
 * Handles routing for conversation-related components
 */
const ConversationRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ConversationList />} />
      <Route path="/analytics" element={<ConversationAnalytics />} />
      <Route path="/:id" element={<ConversationDetail />} />
    </Routes>
  );
};

export default ConversationRoutes;
