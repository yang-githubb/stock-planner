from fastapi import FastAPI

app = FastAPI(title="Stock Platform API")


@app.get("/")
async def root():
    return {"status": "ok"}
