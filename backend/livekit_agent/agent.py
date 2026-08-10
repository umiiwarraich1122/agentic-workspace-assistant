import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.voice import Agent as VoicePipelineAgent
from livekit.agents import TurnHandlingOptions
from livekit.plugins import openai, cartesia, silero, deepgram
from livekit_agent.tool_bridge import JarvisToolBridge
from livekit_agent.session_manager import get_voice_system_prompt
import json
import os
import time

load_dotenv()
logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger("voice-agent")

def prewarm(proc: JobProcess):
    # VAD / Endpoint Tuning for Conversational AI
    # We want low endpointing delay but avoid false cut-offs
    proc.userdata["vad"] = silero.VAD.load(
        activation_threshold=0.6,   # Lowered to 0.6 to catch quieter/natural speech starts
        min_speech_duration=0.2,    # 200ms: Short detection delay for fast starts
        min_silence_duration=0.5,   # 500ms: Low endpointing delay (wait 0.5s after speech before finalizing)
        deactivation_threshold=0.7  # Drop background noise quickly
    )

class JarvisAgent(VoicePipelineAgent):
    def __init__(self, access_token: str, user_id: str, stt_impl, llm_impl, tts_impl, turn_handling) -> None:
        self.tool_bridge = JarvisToolBridge(access_token=access_token, user_id=user_id)
        # VoicePipelineAgent naturally handles streaming STT, streaming LLM, streaming TTS, and Barge-in!
        super().__init__(
            vad=silero.VAD.load(), # Initialized by default, but overwritten by prewarm/constructor injection usually.
            stt=stt_impl,
            llm=llm_impl,
            tts=tts_impl,
            turn_handling=turn_handling,
            instructions=get_voice_system_prompt(),
            tools=self.tool_bridge.flatten()
        )

        # Attach to the tool bridge so it can access say() if needed (though discouraged for fast tools)
        self.tool_bridge.session = self

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
            
            # Fetch from Backend DB if missing
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

    # 1. Streaming STT Setup
    stt_impl = None
    deepgram_api_key = os.environ.get("DEEPGRAM_API_KEY")
    
    if deepgram_api_key:
        logger.info("Initializing Deepgram STT for TRUE streaming ultra-low latency.")
        stt_impl = deepgram.STT(
            api_key=deepgram_api_key,
            model="nova-2-general"
        )
    else:
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        groq_api_key = os.environ.get("GROQ_API_KEY")
        stt_api_key = openai_api_key or groq_api_key
        if stt_api_key:
            try:
                openai_model = os.environ.get("OPENAI_STT_MODEL", "whisper-1")
                base_url = None
                if not openai_api_key and groq_api_key:
                    logger.info("No OPENAI_API_KEY found; using GROQ_API_KEY for STT. (Warning: Groq is not streaming)")
                    base_url = "https://api.groq.com/openai/v1"
                    openai_model = "whisper-large-v3"
                
                logger.info(f"Initializing OpenAI STT with model={openai_model}")
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
            logger.info("No STT API Key found; Server-side STT disabled.")

    # 2. Streaming LLM Setup
    llm_impl = openai.LLM(
        model="llama-3.3-70b-versatile",
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ.get("GROQ_API_KEY") or "dummy"
    )

    # 3. Streaming TTS Setup
    tts_impl = cartesia.TTS(api_key=os.environ.get("CARTESIA_API_KEY", "dummy_key"))

    # 4. Barge-in / Endpointing Tuning
    turn_handling = TurnHandlingOptions(
        interruption={
            "min_duration": 0.6, # Short interruption detection delay (600ms)
            "min_words": 2,      # Interpretation minimum words to interrupt: 2
            "resume_false_interruption": True,
            "false_interruption_timeout": 1.5,
        },
        preemptive_generation={"enabled": False},
    )

    agent = JarvisAgent(
        access_token=access_token, 
        user_id=user_id,
        stt_impl=stt_impl,
        llm_impl=llm_impl,
        tts_impl=tts_impl,
        turn_handling=turn_handling
    )

    # Latency Measurement Event removed due to dependency conflict.

    try:
        await agent.start(ctx.room)
        await agent.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)
    except Exception as e:
        logger.exception("Agent runtime error: %s", e)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
