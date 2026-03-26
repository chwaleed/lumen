from fastapi import  FastAPI
from contextlib import asynccontextmanager
from src.core.config import Settings,get_settings
from src.db.session import init_db

app = FastAPI()

def create_app(*, settings: Settings | None = None, init_db_on_startup: bool = True)-> FastAPI:
    app_settings = settings or get_settings()
    
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if init_db_on_startup:
            init_db(app_settings)
        yield
        
    app = FastAPI(title="Lumen LaTeX Editor API", lifespan=lifespan)
    # app.include_router(auth_router)
        
    @app.get("/health")
    async def health_check():
        return {"status": "ok"}
    return app
    
app = create_app()