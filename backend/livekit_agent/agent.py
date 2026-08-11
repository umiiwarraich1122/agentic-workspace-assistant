import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli
from livekit.agents import Agent, AgentSession
from livekit.plugins import openai, cartesia, silero, deepgram
from livekit_agent.tool_bridge import JarvisToolBridge
from livekit_agent.session_manager import get_voice_system_prompt
import json
import os

load_dotenv()
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("voice-agent")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load(
        activation_threshold=0.6,
        min_speech_duration=0.2,
        min_silence_duration=0.5,
        deactivation_threshold=0.7
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

            if not access_token and user_id:
                from app.services.memory_store import store
                db_tokens = store.get_tokens(user_id)
                if db_tokens and "access_token" in db_tokens:
                    access_token = db_tokens["access_token"]
                    logger.info("Fetched Google access_token from MemoryStore.")
            elif access_token:
                logger.info("Extracted Google credentials from participant metadata.")
        except Exception as e:
            logger.warning(f"Failed to parse participant metadata: {e}")

    # Build the tool bridge
    tool_bridge = JarvisToolBridge(access_token=access_token, user_id=user_id)

    # STT setup
    stt_impl = None
    deepgram_api_key = os.environ.get("DEEPGRAM_API_KEY")
    if deepgram_api_key:
        logger.info("Initializing Deepgram STT.")
        stt_impl = deepgram.STT(api_key=deepgram_api_key, model="nova-2-general")
    else:
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if groq_api_key:
            logger.info("Initializing Groq Whisper STT.")
            stt_impl = openai.STT(
                api_key=groq_api_key,
                base_url="https://api.groq.com/openai/v1",
                model="whisper-large-v3",
            )

    # LLM setup
    llm_impl = openai.LLM(
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ.get("GROQ_API_KEY") or "dummy"
    )

    # TTS setup
    tts_impl = cartesia.TTS(api_key=os.environ.get("CARTESIA_API_KEY", "dummy_key"))

    # VAD
    vad_impl = ctx.proc.userdata.get("vad") or silero.VAD.load()
    
    # Wrap VAD with our secure interceptor
    from livekit_agent.custom_audio.secure_vad import SecureVAD
    secure_vad_impl = SecureVAD(vad_impl)

    # Create agent with instructions and tools from the tool bridge
    agent = Agent(
        instructions=get_voice_system_prompt(),
        tools=tool_bridge.flatten(),
    )

    # Create and start session
    session = AgentSession(
        stt=stt_impl,
        llm=llm_impl,
        tts=tts_impl,
        vad=secure_vad_impl,
    )

    # Give the tool bridge access to the session for filler responses
    tool_bridge.session = session

    try:
        await session.start(room=ctx.room, agent=agent)
        await session.generate_reply(
            instructions="Greet the user warmly. Say: Hello, I am Jarvis. How can I assist you today?"
        )
    except Exception as e:
        logger.exception("Agent runtime error: %s", e)


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
