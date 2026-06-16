const activeRooms = new Map();

const getTimestamp = () => new Date().toISOString();

const logSocketEvent = (eventName, payload) => {
  console.log(`[${getTimestamp()}] socket:${eventName}`, payload);
};

const getRoomState = (roomId) => {
  if (!activeRooms.has(roomId)) {
    activeRooms.set(roomId, { participants: [] });
  }

  return activeRooms.get(roomId);
};

const removeParticipantFromRoom = (roomId, userId) => {
  const roomState = activeRooms.get(roomId);

  if (!roomState) {
    return false;
  }

  const nextParticipants = roomState.participants.filter(
    (participant) => participant.userId !== userId
  );
  const participantRemoved = nextParticipants.length !== roomState.participants.length;

  if (!participantRemoved) {
    return false;
  }

  if (nextParticipants.length === 0) {
    activeRooms.delete(roomId);
  } else {
    roomState.participants = nextParticipants;
    activeRooms.set(roomId, roomState);
  }

  return true;
};

const buildAlertMessage = (type) => {
  switch (type) {
    case "tab-switch":
      return "Tab switching detected during the interview.";
    case "multiple-persons":
      return "Multiple persons detected in the interview frame.";
    case "noise":
      return "Unexpected background noise detected during the interview.";
    default:
      return "Suspicious activity detected during the interview.";
  }
};

const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    logSocketEvent("connection", { socketId: socket.id });

    socket.on("join-room", ({ roomId, userId, role }) => {
      logSocketEvent("join-room", {
        socketId: socket.id,
        roomId,
        userId,
        role,
      });

      if (!roomId || !userId || !role) {
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userId = userId;
      socket.data.role = role;

      const roomState = getRoomState(roomId);
      const participantExists = roomState.participants.some(
        (participant) => participant.userId === userId
      );

      if (!participantExists) {
        roomState.participants.push({ userId, role, socketId: socket.id });
      }

      socket.to(roomId).emit("user-joined", { userId, role });
    });

    socket.on("ai-score-update", ({ roomId, scores }) => {
      logSocketEvent("ai-score-update", {
        socketId: socket.id,
        roomId,
        scores,
      });

      if (!roomId || !activeRooms.has(roomId)) {
        return;
      }

      io.to(roomId).emit("score-broadcast", { scores });
    });

    socket.on("webrtc-offer", ({ roomId, offer }) => {
      console.log(`[${new Date().toISOString()}] webrtc-offer in room ${roomId}`);
      socket.to(roomId).emit("webrtc-offer", { offer });
    });

    socket.on("webrtc-answer", ({ roomId, answer }) => {
      console.log(`[${new Date().toISOString()}] webrtc-answer in room ${roomId}`);
      socket.to(roomId).emit("webrtc-answer", { answer });
    });

    socket.on("webrtc-ice", ({ roomId, candidate }) => {
      console.log(`[${new Date().toISOString()}] webrtc-ice in room ${roomId}`);
      socket.to(roomId).emit("webrtc-ice", { candidate });
    });

    socket.on("suspicious-event", ({ roomId, type }) => {
      const alertPayload = {
        type,
        message: buildAlertMessage(type),
      };

      logSocketEvent("suspicious-event", {
        socketId: socket.id,
        roomId,
        ...alertPayload,
      });

      if (!roomId || !activeRooms.has(roomId)) {
        return;
      }

      io.to(roomId).emit("alert", alertPayload);
    });

    socket.on("leave-room", ({ roomId, userId }) => {
      logSocketEvent("leave-room", {
        socketId: socket.id,
        roomId,
        userId,
      });

      if (!roomId || !userId) {
        return;
      }

      socket.leave(roomId);
      removeParticipantFromRoom(roomId, userId);
      socket.to(roomId).emit("user-left", { userId });
    });

    socket.on("disconnect", (reason) => {
      const { roomId, userId } = socket.data || {};

      logSocketEvent("disconnect", {
        socketId: socket.id,
        roomId,
        userId,
        reason,
      });

      if (!roomId || !userId) {
        return;
      }

      const participantRemoved = removeParticipantFromRoom(roomId, userId);

      if (participantRemoved) {
        socket.to(roomId).emit("user-left", { userId });
      }
    });
  });
};

module.exports = setupSocketHandlers;
