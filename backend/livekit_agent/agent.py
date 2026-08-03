import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import openai, deepgram, cartesia, silero
from livekit_agent.tool_bridge import JarvisToolBridge
from livekit_agent.session_manager import get_voice_system_prompt
import json

load_dotenv()
logger = logging.getLogger("voice-agent")

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    # Retrieve user tokens from the job metadata or attributes
    # The frontend must pass `metadata` containing access_token and user_id when creating the token.
    metadata_str = ctx.job.metadata
    access_token = ""
    user_id = ""
    
    try:
        if metadata_str:
            meta = json.loads(metadata_str)
            access_token = meta.get("access_token", "")
            user_id = meta.get("user_id", "")
    except Exception as e:
        logger.error(f"Failed to parse metadata: {e}")

    initial_ctx = llm.ChatContext().append(
        role="system",
        text=get_voice_system_prompt(),
    )

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # We use Deepgram for fast STT, Cartesia for fast TTS, and Groq (via OpenAI plugin) for LLM
    agent = VoicePipelineAgent(
        vad=ctx.proc.userdata["vad"],
        stt=deepgram.STT(),
        # Groq exposes an OpenAI-compatible API
        llm=openai.LLM(
            model="llama-3.1-8b-instant",
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY")
        ),
        tts=cartesia.TTS(),
        chat_ctx=initial_ctx,
        fnc_ctx=JarvisToolBridge(access_token=access_token, user_id=user_id)
    )

    agent.start(ctx.room)
    
    await agent.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)

if __name__ == "__main__":
    import os
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
