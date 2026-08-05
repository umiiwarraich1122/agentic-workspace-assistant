import logging
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, JobProcess, WorkerOptions, cli, llm, TurnHandlingOptions, EndpointingOptions, InterruptionOptions, PreemptiveGenerationOptions
from livekit.agents.voice import Agent as VoicePipelineAgent
from livekit.plugins import openai, cartesia, silero, inference, ai_coustics
from livekit_agent.tool_bridge import JarvisToolBridge
from livekit_agent.session_manager import get_voice_system_prompt
import json
import os

load_dotenv()
logger = logging.getLogger("voice-agent")

def prewarm(proc: JobProcess):
    # Load VAD model into userdata for reuse in jobs.
    # This is useful for server-side speech activity detection if STT is enabled.
    proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: JobContext):
    # Retrieve user tokens from the job metadata or attributes.
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

    initial_ctx = llm.ChatContext()
    # Instructions are passed separately to the VoicePipelineAgent. Keep the chat context empty for session history.

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    stt_impl = None
    openai_api_key = os.environ.get("OPENAI_API_KEY")
    groq_api_key = os.environ.get("GROQ_API_KEY")
    stt_api_key = openai_api_key or groq_api_key
    if stt_api_key:
        try:
            openai_model = os.environ.get("OPENAI_STT_MODEL", "gpt-4o-mini-transcribe")
            base_url = None
            if not openai_api_key and groq_api_key:
                logger.info("No OPENAI_API_KEY found; using GROQ_API_KEY for OpenAI-compatible STT.")
                base_url = "https://api.groq.com/openai/v1"
            logger.info(f"Initializing OpenAI STT with model={openai_model} base_url={base_url or 'default'}")
            stt_impl = openai.STT(
                api_key=stt_api_key,
                base_url=base_url,
                use_realtime=True,
                model=openai_model,
                vad=ctx.proc.userdata.get("vad"),
            )
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI STT: {e}")
            stt_impl = None
    else:
        logger.info("No OPENAI_API_KEY or GROQ_API_KEY found; server-side STT will be disabled.")

    agent = VoicePipelineAgent(
        instructions=get_voice_system_prompt(),
        # 1. Turn Detection: Use inference.TurnDetector() instead of VAD
        vad=inference.TurnDetector(),
        
        # Configure TurnHandlingOptions
        turn_handling=TurnHandlingOptions(
            # 2. Endpointing: dynamic mode with custom delays
            endpointing=EndpointingOptions(
                mode="dynamic",
                min_delay=0.4,
                max_delay=2.5,
            ),
            # 3. Interruption Handling: adaptive mode for false interruptions
            interruption=InterruptionOptions(
                enabled=True,
                mode="adaptive",
                min_duration=0.5,
                min_words=2,
                false_interruption_timeout=2.0,
                resume_false_interruption=True,
            ),
            # 4. Preemptive Generation: prevent long silence by starting generation early
            preemptive_generation=PreemptiveGenerationOptions(
                enabled=True,
                preemptive_tts=False,
                max_speech_duration=8.0,
                max_retries=2,
            ),
        ),
        
        # 5. Agent Speech Scheduling: delay before speaking again
        min_consecutive_speech_delay=0.3,
        
        stt=stt_impl,
        llm=openai.LLM(
            model="llama-3.1-8b-instant",
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY") or "dummy"
        ),
        tts=cartesia.TTS(api_key=os.environ.get("CARTESIA_API_KEY", "dummy_key")),
        chat_ctx=initial_ctx,
        fnc_ctx=JarvisToolBridge(access_token=access_token, user_id=user_id),
        
        # 6. Audio Processing: Enable AI-Coustics voice isolation
        enhancer=ai_coustics.AICousticsAudioEnhancer(model=ai_coustics.EnhancerModel.QUAIL_VF_L)
    )

    agent.start(ctx.room)
    
    await agent.say("Hello, I am Jarvis. How can I assist you today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm))
