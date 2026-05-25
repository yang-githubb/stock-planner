from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite+aiosqlite:///./stock_platform.db"
    FINNHUB_API_KEY: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    TRENDING_SYMBOLS: list[str] = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"]


settings = Settings()
