from models import Base, TelegramBot
from models.database import engine

Base.metadata.create_all(bind=engine)
print("TelegramBot table created!")
