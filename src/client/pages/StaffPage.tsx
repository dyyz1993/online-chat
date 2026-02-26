/**
 * Staff Page - Customer service interface
 * Responsive design: PC shows sidebar, Mobile uses floating button
 */

import { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { useStaffStore } from '@client/stores/staffStore';
import { SessionList } from '@client/components/staff/SessionList';
import { StaffChatWindow } from '@client/components/staff/StaffChatWindow';
import { QueueList } from '@client/components/staff/QueueList';

// Check if device is mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

// Update URL with session ID
const updateUrlSessionId = (sessionId: string | null) => {
  const url = new URL(window.location.href);
  if (sessionId) {
    url.searchParams.set('s', sessionId);
  } else {
    url.searchParams.delete('s');
  }
  window.history.replaceState({}, '', url.toString());
};

export function StaffPage() {
  const {
    sessions,
    currentSessionId,
    messages: messagesMap,
    hasMore: hasMoreMap,
    loading,
    messagesLoading,
    sending,
    sseConnected,
    totalUnread,
    error,
    inputMode,
    loadSessions,
    selectSession,
    loadMoreMessages,
    sendMessage,
    uploadFile,
    markAsRead,
    initFromUrl,
    connectSSE,
    clearError,
    setInputMode,
    updateTopic,
    updateTaskStatus,
  } = useStaffStore();

  // UI state for mobile
  const [isMobile, setIsMobile] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const [showQueueList, setShowQueueList] = useState(false); // 新增：队列弹窗状态

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load sessions, connect SSE and check URL params on mount
  useEffect(() => {
    loadSessions();
    connectSSE();
    initFromUrl();
  }, [loadSessions, connectSSE, initFromUrl]);

  // Get current session info
  const currentSession = sessions.find((s) => s.id === currentSessionId) || null;
  const currentMessages = currentSessionId ? messagesMap.get(currentSessionId) || [] : [];
  const currentHasMore = currentSessionId ? hasMoreMap.get(currentSessionId) || false : false;

  const handleSelectSession = useCallback((sessionId: string) => {
    selectSession(sessionId);
    markAsRead(sessionId);
    // Update URL with session ID
    updateUrlSessionId(sessionId);
    // Close session list on mobile after selection
    if (isMobile) {
      setShowSessionList(false);
    }
  }, [selectSession, markAsRead, isMobile]);

  const handleSend = (content: string, type: 'text' | 'image' | 'video' | 'file') => {
    // 如果是主题模式，更新主题而不是发送消息
    if (inputMode === 'topic' && currentSessionId) {
      updateTopic(currentSessionId, content);
      setInputMode('chat'); // 更新后切回聊天模式
    } else {
      sendMessage(content, type);
    }
  };

  const handleUpload = (file: File) => {
    uploadFile(file);
  };

  const handleTopicChange = (topic: string) => {
    if (currentSessionId) {
      updateTopic(currentSessionId, topic);
    }
  };

  const handleStatusChange = (status: 'requirement_discussion' | 'requirement_confirmed' | 'in_progress' | 'delivered' | 'reviewed') => {
    if (currentSessionId) {
      updateTaskStatus(currentSessionId, status);
    }
  };

  const toggleSessionList = () => {
    setShowSessionList((prev) => !prev);
  };

  // Styles
  const pageStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isMobile ? '12px 16px' : '12px 24px',
    backgroundColor: '#001529',
    color: '#fff',
    flexShrink: 0,
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative',
  };

  const sidebarStyle: React.CSSProperties = isMobile ? {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '85%',
    maxWidth: '320px',
    zIndex: 100,
    transform: showSessionList ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s ease',
    boxShadow: showSessionList ? '2px 0 8px rgba(0,0,0,0.15)' : 'none',
  } : {
    width: '320px',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
  };

  const statusStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '8px' : '16px',
    fontSize: '14px',
  };

  const statusItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const dotStyle = (connected: boolean): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: connected ? '#52c41a' : '#ff4d4f',
  });

  const errorStyle: React.CSSProperties = {
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#ff4d4f',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    zIndex: 1001,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  // Floating button for mobile
  const floatingButtonStyle: React.CSSProperties = {
    position: 'fixed',
    left: '16px',
    bottom: '90px',
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: '#1890ff',
    color: '#fff',
    border: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    zIndex: 99,
    transition: 'transform 0.2s ease',
  };

  // Overlay for mobile
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 50,
    display: showSessionList ? 'block' : 'none',
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>
          客服中心
        </div>
        <div style={statusStyle}>
          {/* Queue button */}
          <button
            onClick={() => setShowQueueList(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '16px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
            title="查看任务队列"
          >
            <Users size={14} />
            <span style={{ display: isMobile ? 'none' : 'inline' }}>队列</span>
          </button>
          <div style={statusItemStyle}>
            <span style={dotStyle(sseConnected)}></span>
            <span style={{ display: isMobile ? 'none' : 'inline' }}>
              {sseConnected ? '已连接' : '连接中...'}
            </span>
          </div>
          {totalUnread > 0 && (
            <div style={statusItemStyle}>
              <span
                style={{
                  backgroundColor: '#ff4d4f',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              >
                {totalUnread}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div style={errorStyle}>
          <span>{error}</span>
          <button
            onClick={clearError}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={mainStyle}>
        {/* Overlay (mobile only) */}
        {isMobile && (
          <div style={overlayStyle} onClick={() => setShowSessionList(false)} />
        )}

        {/* Sidebar - Session List */}
        <div style={sidebarStyle}>
          <SessionList
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelect={handleSelectSession}
            loading={loading}
          />
        </div>

        {/* Chat Window */}
        <div style={contentStyle}>
          <StaffChatWindow
            session={currentSession}
            messages={currentMessages}
            hasMore={currentHasMore}
            loading={messagesLoading}
            sending={sending}
            inputMode={inputMode}
            isMobile={isMobile}
            onLoadMore={loadMoreMessages}
            onSend={handleSend}
            onUpload={handleUpload}
            onModeChange={setInputMode}
            onTopicChange={handleTopicChange}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>

      {/* Floating button (mobile only) */}
      {isMobile && (
        <button
          style={floatingButtonStyle}
          onClick={toggleSessionList}
          title="会话列表"
        >
          <MessageCircle size={24} />
          {totalUnread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ff4d4f',
                color: '#fff',
                fontSize: '12px',
                minWidth: '20px',
                height: '20px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Queue List Modal */}
      <QueueList
        isOpen={showQueueList}
        onClose={() => setShowQueueList(false)}
        onSelectSession={handleSelectSession}
      />
    </div>
  );
}
