import logging
import asyncio
import json

from dotenv import load_dotenv

import os
from google.cloud import aiplatform
from google.oauth2 import service_account
from vertexai.preview import rag

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    MetricsCollectedEvent,
    RunContext,
    cli,
    metrics,
    room_io,
    BackgroundAudioPlayer,
    AudioConfig,
    BuiltinAudioClip,
)
from livekit.agents.llm import function_tool
from livekit.plugins import silero
# from livekit.plugins.turn_detector.multilingual import MultilingualModel  # Not used, VAD handles turn detection
from livekit.plugins import deepgram
from livekit.plugins import elevenlabs
from livekit.plugins import openai
from livekit.plugins import google
from livekit import rtc
from livekit.agents import ModelSettings, Agent
from typing import AsyncIterable

from .utils.agent_id_extractor import extract_trunk_id, extract_phone_from_room_name
from .utils.fillers import get_filler_for_query
from .clients.backend_client import (
    get_agent_config,
    get_agent_config_by_trunk,
    AgentNotFoundError,
    BackendAPIError
)
from .clients.external_client import (
    get_user_with_policies,
    UserNotFoundError as ExternalUserNotFoundError,
    ExternalAPIError
)
from .services.recording import start_room_recording



logger = logging.getLogger("basic-agent")

load_dotenv()

# Initialize Vertex AI (lazy - only when needed)
_vertex_ai_initialized = False

def _ensure_vertex_ai_initialized():
    """Initialize Vertex AI on first use (lazy loading)"""
    global _vertex_ai_initialized
    if not _vertex_ai_initialized:
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if creds_path and os.path.exists(creds_path):
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            aiplatform.init(
                project=os.getenv("VERTEX_AI_PROJECT_ID"),
                location=os.getenv("VERTEX_AI_LOCATION"),
                credentials=credentials,
            )
            _vertex_ai_initialized = True
            logger.info("Vertex AI initialized successfully")
        else:
            logger.warning("Vertex AI credentials not found - RAG features disabled")


class MyAgent(Agent):
    def __init__(self, agent_config: dict, user_data: dict | None = None, background_audio: BackgroundAudioPlayer | None = None, room = None) -> None:
        """Initialize agent with config from backend and optional user data"""
        # Use system prompt from backend
        system_prompt = agent_config.get("systemPrompt", "")
        
        # Inject user data as JSON if available
        if user_data:
            user_data_json = json.dumps(user_data, indent=2)
            system_prompt += f"\n\n## Customer Information\n\n{user_data_json}"

        
        logger.info(f"System prompt: {system_prompt}")
        
        # Note: Context limiting is handled by max_output_tokens in LLM config
        # Combined with temperature=0.3 and frequency_penalty, this prevents context explosion
        super().__init__(instructions=system_prompt)
        
        # Store config for later use (e.g., RAG settings)
        self.agent_config = agent_config
        self.agent_id = agent_config["id"]
        self.agent_name = agent_config["name"]
        self.greeting = agent_config.get("greeting")  # Optional greeting from backend
        
        # Store user data (if available)
        self.user_data = user_data
        
        # Store background audio player and room reference
        self.background_audio = background_audio
        self.room = room

    async def on_enter(self):
        # Start background audio in background task after room is fully connected
        if self.background_audio and self.room:
            async def start_audio_delayed():
                # Wait for room to fully connect
                await asyncio.sleep(2.0)
                try:
                    await self.background_audio.start(room=self.room, agent_session=self.session)
                except Exception as e:
                    logger.warning(f"⚠️ Failed to start background audio: {e}")
            
            # Start audio in background without blocking greeting
            asyncio.create_task(start_audio_delayed())
        
        # Generate greeting message
        greeting = None
        
        # Use greeting from agent config if available
        if self.greeting:
            greeting = self.greeting
            
            # Replace placeholder if user data is available
            if self.user_data and self.user_data.get("user"):
                user = self.user_data["user"]
                first_name = user.get("firstName", "")
                # Replace both camelCase and snake_case formats
                greeting = greeting.replace("{firstName}", first_name)
        else:
            # Fallback to default personalized greeting based on user data
            if self.user_data and self.user_data.get("user"):
                user = self.user_data["user"]
                first_name = user.get("firstName", "")
                greeting = f"Hello {first_name}, welcome to Apple Care Plus, I am Lina how can i help you today?"
            else:
                # Default greeting if no user data
                greeting = "Hello! welcome to Apple Care Plus, I am Lina how can i help you today?"
        
        await self.session.say(greeting)

    # Knowledge base search disabled for Apple Care Plus use case
    # @function_tool
    async def search_knowledge_base(
        self,
        context: RunContext,
        query: str,
    ) -> str:
        """Search the Apple Care Plus knowledge base for relevant information.
        Use this when the user asks questions about products, services, plans, or procedures.
        
        Args:
            query: The user's question or search query
        """
        # Say a natural filler while searching (makes conversation feel natural)
        # filler = get_filler_for_query(query)
        # await self.session.say(filler)
        
        # Play keyboard typing sound during search
        play_handle = None
        if self.background_audio:
            play_handle = self.background_audio.play([
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING, volume=0.6, probability=0.5),
                AudioConfig(BuiltinAudioClip.KEYBOARD_TYPING2, volume=0.5, probability=0.5),
            ])
        
        try:
            
            # Get corpus ID from environment
            corpus_name = f"projects/{os.getenv('VERTEX_AI_PROJECT_ID')}/locations/{os.getenv('VERTEX_AI_LOCATION')}/ragCorpora/{os.getenv('VERTEX_AI_RAG_CORPUS_ID')}"
            
            # Retrieve relevant chunks from RAG corpus
            response = rag.retrieval_query(
                rag_resources=[
                    rag.RagResource(
                        rag_corpus=corpus_name,
                    )
                ],
                text=query,
                similarity_top_k=3,  # Get top 3 most relevant results
            )
            
            # Format the results
            if response.contexts:
                 # Combine all contexts without numbering
                contexts = [ctx.text for ctx in response.contexts.contexts]
                formatted_results = "\n\n".join(contexts)
                
                # Add instruction for voice-friendly synthesis
                return (
                    "Based on the following information from our knowledge base, "
                    "provide a concise and natural voice response:\n\n"
                    f"{formatted_results}"
                )
            else:
                logger.warning("⚠️ No results found in knowledge base")
                return "No relevant information found in the knowledge base."
                
        except Exception as e:
            logger.error(f"❌ Error searching knowledge base: {e}")
            return f"I encountered an error while searching the knowledge base: {str(e)}"
        finally:
            # Stop keyboard typing sound after search completes
            if play_handle:
                play_handle.stop()

    
    async def tts_node(
        self, text: AsyncIterable[str], model_settings: ModelSettings
    ) -> AsyncIterable[rtc.AudioFrame]:
        # Insert custom text processing here
        async for frame in Agent.default.tts_node(self, text, model_settings):
            yield frame


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    # Step 1: Extract ID from room name (trunk ID for inbound, agent ID for outbound)
    extracted_id, call_type = await extract_trunk_id(ctx)
    if not extracted_id:
        logger.error("Failed to extract ID from room name - exiting")
        raise
    
    # Step 2: Extract phone number from room name
    phone_number = extract_phone_from_room_name(ctx.job.room.name)
    
    # Step 3: Fetch user data from external server (if phone available)
    user_data = None
    if phone_number:
        try:
            user_data = await get_user_with_policies(phone_number)
        except ExternalUserNotFoundError:
            logger.warning(f"⚠️ User not found in external system: {phone_number}")
        except ExternalAPIError as e:
            logger.error(f"❌ Failed to fetch user data: {e}")
    
    # Step 4: Fetch agent config (by trunk for inbound, by ID for outbound)
    try:
        if call_type == 'outbound':
            # Outbound: Use agent ID directly
            agent_config = await get_agent_config(extracted_id)
        else:
            # Inbound: Look up agent by trunk ID
            agent_config = await get_agent_config_by_trunk(extracted_id)
    except AgentNotFoundError as e:
        logger.error(f"❌ Agent not found: {e} - rejecting job")
        raise
    except BackendAPIError as e:
        logger.error(f"❌ Failed to fetch agent config: {e}")
        raise
    
    # Set log context
    ctx.log_context_fields = {
        "room": ctx.room.name,
        "callType": call_type,
        "agentId": agent_config["id"],
        "tenantId": agent_config["tenantId"],
        "phone": phone_number,
        "userName": user_data["user"]["fullName"] if user_data else None,
    }

    # Configure LLM based on agent config
    llm_model = agent_config.get("llmModel", "gemini-2.5-flash-lite")
    
    if llm_model == "gpt-4o-mini":
        llm = openai.LLM(
            model="gpt-4o-mini",
            temperature=0.3,
            max_completion_tokens=300,
        )
    else:  # Default to gemini-2.5-flash-lite
        llm = google.LLM(
            model="gemini-2.5-flash-lite",
            temperature=0.3,           # Low temperature = deterministic, factual responses
            max_output_tokens=300,     # Limit response length (safe for RAG)
            top_p=0.9,                 # Nucleus sampling for focused responses
            top_k=40,                  # Top-k sampling reduces randomness
            tool_choice="auto",        # Automatic tool usage
        )

    session = AgentSession(
        stt=deepgram.STT(model="nova-2", language="en"),
        llm=llm,
        tts=elevenlabs.TTS(
            model="eleven_turbo_v2_5",
            voice_id="2zRM7PkgwBPiau2jvVXc",
        ),
        vad=ctx.proc.userdata["vad"],
        # turn_detection=MultilingualModel(),  # Disabled: adds 3s delay (predictEndOfTurn timeout=3), VAD handles turn detection
        resume_false_interruption=True,
        false_interruption_timeout=1.0,
        preemptive_generation=True,
    )

    # Ensure Vertex AI is initialized
    _ensure_vertex_ai_initialized()

    # Create background audio player with office ambience and thinking sounds
    background_audio = BackgroundAudioPlayer(
        ambient_sound=AudioConfig(BuiltinAudioClip.OFFICE_AMBIENCE, volume=1)
    )

    # log metrics as they are emitted, and total usage after session is over
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Usage: {summary}")

    async def cleanup_audio():
        await background_audio.aclose()

    # shutdown callbacks are triggered when the session is over
    ctx.add_shutdown_callback(log_usage)
    ctx.add_shutdown_callback(cleanup_audio)

    # Connect to the room first
    await ctx.connect()
    
    # Start recording after room connection is established
    async def start_recording():
        """Start recording in background after room is connected and agent enters"""
        # Wait for room to be fully ready and agent to enter
        await asyncio.sleep(1.5)
        
        egress_id = await start_room_recording(
            room_name=ctx.room.name,
            agent_id=agent_config["id"],
            tenant_id=agent_config["tenantId"]
        )
        if egress_id:
            logger.info(f"📼 Room recording active", {"egressId": egress_id})
        else:
            logger.warning("⚠️ Proceeding without recording")
    
    # Start recording in background (non-blocking)
    asyncio.create_task(start_recording())

    # Create agent instance with room reference
    agent = MyAgent(agent_config, user_data, background_audio, ctx.room)

    # Start session (background audio will start in agent's on_enter method)
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)