import asyncio
from typing import Dict, Set, Optional
from fastapi import WebSocket
from loguru import logger
import json


class NotificationManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            dead = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.active_connections[user_id].discard(ws)

    async def notify_needs_info(self, user_id: int, application_id: int, question: str, field: str):
        await self.send_to_user(user_id, {
            "type": "needs_info",
            "application_id": application_id,
            "question": question,
            "field": field,
            "message": f"🤖 AI Agent needs your help: {question}",
        })

    async def notify_applied(self, user_id: int, application_id: int, job_title: str, company: str):
        await self.send_to_user(user_id, {
            "type": "applied",
            "application_id": application_id,
            "message": f"✅ Successfully applied to {job_title} at {company}!",
        })

    async def notify_failed(self, user_id: int, application_id: int, reason: str):
        await self.send_to_user(user_id, {
            "type": "failed",
            "application_id": application_id,
            "message": f"❌ Application failed: {reason}",
        })

    async def notify_progress(self, user_id: int, application_id: int, message: str):
        await self.send_to_user(user_id, {
            "type": "progress",
            "application_id": application_id,
            "message": message,
        })


notification_manager = NotificationManager()
