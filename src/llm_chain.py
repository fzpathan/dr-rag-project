"""
LLM chain for generating responses from retrieved context.
"""
import logging
from typing import Tuple, List

import httpx
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from src.config import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Prompt template for remedy queries
REMEDY_PROMPT = """You are a homeopathic medicine consultant. Read the textbook excerpts and answer the patient query using only the information provided.

TEXTBOOK EXCERPTS:
{context}

PATIENT QUERY: {question}

Based on the excerpts above, recommend 1-3 remedies. For each remedy state:
- **Remedy name** and suggested potency/dose
- Key matching symptoms from the excerpts

Then write 2-3 sentences explaining which remedy best fits this case and why.

Use Markdown formatting. Only use information from the excerpts above."""

def get_llm():
    """
    Get configured LLM instance.

    Priority:
    1. OpenRouter (if USE_OPENROUTER=true and OPENROUTER_API_KEY is set)
    2. OpenAI (if OPENAI_API_KEY is set)

    Returns:
        ChatOpenAI instance
    """
    # Build a custom httpx client to avoid connection issues in containers
    http_client = httpx.Client(
        timeout=httpx.Timeout(60.0, connect=15.0),
        follow_redirects=True,
        transport=httpx.HTTPTransport(retries=3),
    )

    # Check for OpenRouter first
    if config.USE_OPENROUTER and config.OPENROUTER_API_KEY:
        logger.info(f"Using OpenRouter with model: {config.OPENROUTER_MODEL}")
        logger.info(f"OpenRouter base URL: {config.OPENROUTER_BASE_URL}")
        return ChatOpenAI(
            model=config.OPENROUTER_MODEL,
            temperature=config.LLM_TEMPERATURE,
            api_key=config.OPENROUTER_API_KEY,
            base_url=config.OPENROUTER_BASE_URL,
            default_headers={
                "HTTP-Referer": "https://dr-rag-api.run.app",
                "X-Title": "DR-RAG Homeopathy Finder",
            },
            http_client=http_client,
        )

    # Fall back to OpenAI
    if config.OPENAI_API_KEY:
        logger.info(f"Using OpenAI with model: {config.LLM_MODEL}")
        return ChatOpenAI(
            model=config.LLM_MODEL,
            temperature=config.LLM_TEMPERATURE,
            api_key=config.OPENAI_API_KEY,
            http_client=http_client,
        )

    raise ValueError(
        "No LLM API key configured. Set either OPENROUTER_API_KEY (with USE_OPENROUTER=true) "
        "or OPENAI_API_KEY in your .env file."
    )


# =============================================================================
# Alternative: Ollama local LLM
# =============================================================================
# Uncomment the following to use Ollama instead of OpenAI:
#
# from langchain_ollama import ChatOllama
#
# def get_ollama_llm():
#     """
#     Get Ollama-based local LLM.
#
#     Requires Ollama running locally with a model:
#         ollama pull llama3.2
#     """
#     return ChatOllama(
#         base_url=config.OLLAMA_BASE_URL,
#         model=config.OLLAMA_MODEL,
#         temperature=config.LLM_TEMPERATURE
#     )
#
# Then in RemedyChain.__init__, replace:
#     self.llm = get_llm()
# with:
#     self.llm = get_ollama_llm()


class RemedyChain:
    """Chain for generating remedy answers from context."""

    def __init__(self):
        self.llm = get_llm()
        self.prompt = ChatPromptTemplate.from_template(REMEDY_PROMPT)
        self.chain = self.prompt | self.llm | StrOutputParser()

    def generate_response(
        self,
        question: str,
        context: str,
        citations: List[str],
    ) -> Tuple[str, List[str]]:
        """
        Generate a response based on context.

        Args:
            question: User's question
            context: Retrieved context from documents
            citations: List of citation strings

        Returns:
            Tuple of (response_text, citations_used)
        """
        if not context:
            logger.warning("No context provided for response generation")
            return "Information not found in the provided corpus.", []

        logger.info(f"Generating response for question: {question[:50]}...")
        logger.info(f"Context length: {len(context)} characters")

        try:
            response = self.chain.invoke({"question": question, "context": context})
            logger.info(f"Response generated successfully, length: {len(response)} characters")
            return response, citations
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            raise

    def generate_response_streaming(self, question: str, context: str):
        """
        Generate a streaming response based on context.

        Args:
            question: User's question
            context: Retrieved context from documents

        Yields:
            Response tokens as they are generated
        """
        if not context:
            yield "Information not found in the provided corpus."
            return

        for chunk in self.chain.stream({"question": question, "context": context}):
            yield chunk
