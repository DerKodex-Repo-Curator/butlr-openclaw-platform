"""Onboarding configuration models"""
from sqlalchemy import Column, Integer, String, JSON, ForeignKey, Enum as SQLEnum
from datetime import datetime
from enum import Enum
from .database import Base


class PersonalityType(str, Enum):
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    TECHNICAL = "technical"
    MINIMAL = "minimal"
    CREATIVE = "creative"
    COACH = "coach"
    SARCASTIC = "sarcastic"
    EXECUTIVE = "executive"
    BUTLER = "butler"
    PIRATE = "pirate"
    CUSTOM = "custom"


class StarterKit(str, Enum):
    DEVELOPER = "developer"
    WRITER = "writer"
    RESEARCHER = "researcher"
    MINIMAL = "minimal"


class CustomerConfig(Base):
    """Customer onboarding configuration"""
    __tablename__ = "customer_configs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), unique=True, nullable=False)
    
    # Bot Identity
    bot_name = Column(String, default="Butler")
    
    # Personality
    personality = Column(SQLEnum(PersonalityType), default=PersonalityType.FRIENDLY)
    custom_personality = Column(String, nullable=True)  # For CUSTOM type
    
    # Starter Kits (can have multiple)
    starter_kits = Column(JSON, default=["minimal"])  # ["developer", "writer"]
    
    # Additional preferences
    language = Column(String, default="en")  # en, de, es, etc.
    timezone = Column(String, default="UTC")
    
    # Generated SOUL.md content (cached)
    soul_md_content = Column(String, nullable=True)
    
    def __repr__(self):
        return f"<CustomerConfig {self.bot_name} ({self.personality})>"


# Personality descriptions for UI
PERSONALITY_INFO = {
    PersonalityType.PROFESSIONAL: {
        "name": "Professional",
        "emoji": "🎩",
        "description": "Formal, precise, and efficient. Perfect for business tasks.",
        "traits": ["Clear communication", "Structured responses", "Time-conscious"]
    },
    PersonalityType.FRIENDLY: {
        "name": "Friendly",
        "emoji": "😊",
        "description": "Warm, approachable, and supportive. Like a helpful friend.",
        "traits": ["Conversational", "Encouraging", "Uses emojis"]
    },
    PersonalityType.TECHNICAL: {
        "name": "Technical",
        "emoji": "🤖",
        "description": "Detailed, nerdy, and thorough. Great for developers.",
        "traits": ["Code examples", "Technical depth", "System thinking"]
    },
    PersonalityType.MINIMAL: {
        "name": "Minimal",
        "emoji": "⚡",
        "description": "Just the basics. Simple and efficient.",
        "traits": ["No frills", "Quick responses", "Straightforward"]
    },
    PersonalityType.CREATIVE: {
        "name": "Creative",
        "emoji": "🎨",
        "description": "Artistic, imaginative, and inspiring. Great for brainstorming.",
        "traits": ["Outside-the-box thinking", "Metaphors & analogies", "Playful ideas"]
    },
    PersonalityType.COACH: {
        "name": "Coach",
        "emoji": "🏋️",
        "description": "Motivational mentor who guides you to success.",
        "traits": ["Encouraging questions", "Growth mindset", "Accountability"]
    },
    PersonalityType.SARCASTIC: {
        "name": "Sarcastic",
        "emoji": "😏",
        "description": "Witty and dry humor, but still genuinely helpful.",
        "traits": ["Dry wit", "Playful roasts", "Hidden wisdom"]
    },
    PersonalityType.EXECUTIVE: {
        "name": "Executive",
        "emoji": "📊",
        "description": "Ultra-brief responses for busy professionals.",
        "traits": ["Bullet points only", "No fluff", "Action-focused"]
    },
    PersonalityType.BUTLER: {
        "name": "Butler",
        "emoji": "🎩",
        "description": "Classic formal butler. Dignified and proper.",
        "traits": ["Formal address", "Impeccable manners", "Discrete"]
    },
    PersonalityType.PIRATE: {
        "name": "Pirate",
        "emoji": "🏴‍☠️",
        "description": "Arrr! A swashbuckling assistant for fun conversations.",
        "traits": ["Pirate speak", "Adventure spirit", "Treasure hunting"]
    },
    PersonalityType.CUSTOM: {
        "name": "Custom",
        "emoji": "✨",
        "description": "Define your own personality traits.",
        "traits": ["Your rules", "Your style", "Your assistant"]
    }
}

# Starter kit descriptions for UI
STARTER_KIT_INFO = {
    StarterKit.DEVELOPER: {
        "name": "Developer Kit",
        "emoji": "💻",
        "description": "Git, Node.js, Python, Docker, and dev tools.",
        "tools": ["git", "node", "npm", "python3", "docker", "ripgrep", "jq"]
    },
    StarterKit.WRITER: {
        "name": "Writer Kit",
        "emoji": "📝",
        "description": "Pandoc, spell checkers, and content tools.",
        "tools": ["pandoc", "hunspell", "markdown", "wkhtmltopdf"]
    },
    StarterKit.RESEARCHER: {
        "name": "Researcher Kit",
        "emoji": "🔬",
        "description": "Web scraping, data analysis, and research tools.",
        "tools": ["pandas", "playwright", "scrapy", "jupyter"]
    },
    StarterKit.MINIMAL: {
        "name": "Minimal",
        "emoji": "⚡",
        "description": "Just the essential Clawdbot tools.",
        "tools": ["curl", "jq", "python3"]
    }
}
