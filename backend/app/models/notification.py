from sqlalchemy import Column, DateTime, Integer, String, Text, func

from app.core.database import Base


class UserNotification(Base):
    __tablename__ = "user_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, index=True)
    payload = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    read_at = Column(DateTime, nullable=True)
