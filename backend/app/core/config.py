from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite+aiosqlite:///./stock_platform.db"
    DATABASE_SSL_VERIFY: bool = True
    FINNHUB_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4.1-mini"
    SUPABASE_JWKS_URL: str = ""
    SUPABASE_JWT_ISSUER: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    TRENDING_SYMBOLS: list[str] = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"]
    JOBS_ENABLED: bool = True
    INSIDER_INGEST_INTERVAL_MINUTES: int = 30


settings = Settings()
