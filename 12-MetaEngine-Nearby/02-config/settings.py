from pydantic import BaseModel


class Settings(BaseModel):
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    user_agent: str = "medos-metaengine-nearby/1.0"


settings = Settings()
