import { chatService } from "../services/chatService.js";
import { asyncHandler } from "../utils/errors.js";

export const chatController = {
  threads: asyncHandler(async (req, res) => {
    const threads = await chatService.threads(req.auth);
    res.json({ success: true, data: threads });
  }),

  create: asyncHandler(async (req, res) => {
    const thread = await chatService.create(req.body, req.auth);
    res.status(201).json({ success: true, data: thread });
  }),

  messages: asyncHandler(async (req, res) => {
    const messages = await chatService.messages(req.params.threadId, req.auth);
    res.json({ success: true, data: messages });
  }),

  send: asyncHandler(async (req, res) => {
    const message = await chatService.send(req.params.threadId, req.body, req.auth);
    res.status(201).json({ success: true, data: message });
  })
};
