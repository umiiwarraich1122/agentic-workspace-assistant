import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.voice import Agent as VoicePipelineAgent, AgentSession
from livekit.agents import TurnHandlingOptions
from livekit.plugins import openai, cartesia, silero, ai_coustics
from livekit_agent.tool_bridge import JarvisToolBridge
from livekit_agent.session_manager import get_voice_system_prompt
import json
import os

load_dotenv()
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("voice-agent")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        activation_threshold=0.85,  # Increased to 0.85 to ignore background chatter/noise
        min_speech_duration=0.4,  # Increased to 400ms to ignore short background sounds
        min_silence_duration=0.25, # Cut off faster when user stops speaking (default 0.55)
        deactivation_threshold=0.7 # Drop background noise quickly
    )

class JarvisAgent(VoicePipelineAgent):
    def __init__(self, access_token: str, user_id: str) -> None:
        self.tool_bridge = JarvisToolBridge(access_token=access_token, user_id=user_id)
        super().__init__(
            instructions=get_voice_system_prompt(),
            tools=self.tool_bridge.flatten()
        )

async def entrypoint(ctx: JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")
    
    access_token = ""
    user_id = ""
    if participant.metadata:
        try:
            meta = json.loads(participant.metadata)
            access_token = meta.get("access_token", "")
            user_id = meta.get("user_id", "")
            
            # If frontend didn't pass access_token (which it often can't), fetch from Backend DB
            if not access_token and user_id:
                from app.services.memory_store import store
                db_tokens = store.get_tokens(user_id)
                if db_tokens and "access_token" in db_tokens:
                    access_token = db_tokens["access_token"]
                    logger.info("Successfully fetched Google access_token from MemoryStore database.")
            elif access_token:
                logger.info("Successfully extracted Google credentials from participant metadata.")
                
        except Exception as e:
            logger.warning(f"Failed to parse participant metadata: {e}")

    stt_impl = None
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    groq_api_key = os.environ.get("GROQ_API_KEY")
    stt_api_key = openai_api_key or groq_api_key
    if stt_api_key:
        try:
            openai_model = os.environ.get("OPENAI_STT_MODEL", "whisper-1")
            base_url = None
            if not openai_api_key and groq_api_key:
                logger.info("No OPENAI_API_KEY found; using GROQ_API_KEY for OpenAI-compatible STT.")
                base_url = "https://api.groq.com/openai/v1"
                openai_model = "whisper-large-v3"
            
            logger.info(f"Initializing OpenAI STT with model={openai_model} base_url={base_url or 'default'}")
            stt_impl = openai.STT(
                api_key=stt_api_key,
                base_url=base_url,
                use_realtime=False if base_url else True,
                model=openai_model,
                vad=ctx.proc.userdata.get("vad"),
            )
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI STT: {e}")
            stt_impl = None
    else:
        logger.info("No OPENAI_API_KEY or GROQ_API_KEY found; server-side STT will be disabled.")

    agent = JarvisAgent(access_token=access_token, user_id=user_id)
    
    session = AgentSession(
        stt=stt_impl,
        llm=openai.LLM(
            model="llama-3.1-8b-instant",  # Reverted back since Mixtral is decommissioned.
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY") or "dummy"
        ),
        tts=cartesia.TTS(api_key=os.environ.get("CARTESIA_API_KEY", "dummy_key")),
        turn_handling=TurnHandlingOptions(
            interruption={
                "min_duration": 0.8,
                "min_words": 2,
                "resume_false_interruption": True,
                "false_interruption_timeout": 2.0,
            },
            preemptive_generation={"enabled": False},  # Disabled! This was predicting EOT and wasting thousands of tokens
        )
    )

    agent.tool_bridge.session = session
    
    try:
        await session.start(agent=agent, room=ctx.room)
        await session.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)
    except Exception as e:
        logger.exception("Agent runtime error: %s", e)
    
    # Intentionally removed `finally: await ctx.disconnect()` so the agent stays in the room and listens.

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
