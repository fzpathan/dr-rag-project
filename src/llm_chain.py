"""
LLM chain for generating responses from retrieved context.
"""
from typing import Tuple, List

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from src.config import config


# Prompt template for remedy queries
REMEDY_PROMPT = """You are a knowledgeable assistant specializing in homeopathic medicine.
Your task is to answer questions about remedies based ONLY on the provided context from homeopathy textbooks.

IMPORTANT RULES:
1. ONLY use information from the provided context below - do not use any external knowledge
2. If the information is not found in the context, you MUST respond with: "Information not found in the provided corpus."
3. Always cite which source book the information comes from using [Source X] format
4. Be precise and factual - do not add information not present in the sources
5. Format your response clearly with remedy names, indications, and relevant details
6. If multiple remedies are mentioned for a condition, list them with their specific indications

CONTEXT FROM HOMEOPATHY TEXTBOOKS:
{context}

USER QUESTION: {question}

Based ONLY on the context above, provide a helpful response with proper citations:"""


def get_llm():
    """
    Get configured LLM instance.

    Default: OpenAI GPT-4o-mini
    Alternative: Ollama (see commented code below)

    Returns:
        ChatOpenAI instance
    """
    if not config.OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is required. Set it in .env file or environment."
        )

    return ChatOpenAI(
        model=config.LLM_MODEL,
        temperature=config.LLM_TEMPERATURE,
        openai_api_key=config.OPENAI_API_KEY,
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
            return "Information not found in the provided corpus.", []

        response = self.chain.invoke({"question": question, "context": context})

        return response, citations

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
