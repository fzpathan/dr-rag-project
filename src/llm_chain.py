"""
LLM chain for generating responses from retrieved context.
"""
import logging
from typing import Tuple, List

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from src.config import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Prompt template for remedy queries
REMEDY_PROMPT = """You are a professional homeopathic medicine consultant. Your role is to provide accurate remedy recommendations based strictly on classical homeopathy textbooks.

STRICT GUIDELINES:
- Use ONLY information from the provided textbook excerpts below
- Do NOT use external knowledge or make assumptions beyond the source material
- If the information is not found in the context, respond: "The provided textbooks do not contain specific information for this query."

RESPONSE FORMAT:
Structure your response in the following sections:

## Recommended Remedies
List 1-3 most suitable remedies based on the sources. For each remedy:
- **[Remedy Name]**: One sentence describing its primary indication for this condition.

## Report
Create a specific symptom-overlap grid to help the doctor visualize which remedies cover which patient symptoms.
- **Format**: Use a Markdown table.
- **Rows**: List the specific key symptoms found in the {question}.
- **Columns**: The top recommended remedies.
- **Cells**: Mark with an "X" (or a Grade 1-4 if the text specifies intensity/formatting) if the source text confirms the remedy covers that symptom.
- **Total**: The bottom row must calculate the "Total Symptoms Covered" for each remedy.

*Example Format:*
| Symptom / Rubric | Remedy A | Remedy B | Remedy C |
| :--- | :---: | :---: | :---: |
| Burning pain | X | | X |
| Better by heat | X | X | |
| **Total Covered** | **2** | **1** | **1** |

## Detailed Explanation
Provide a brief, human-friendly summary (2-4 sentences) explaining why these remedies are suggested and their key characteristics relevant to the query.

## Clinical Reasoning
Explain how you arrived at these recommendations:
- Which symptoms or characteristics from the query matched the source material
- Cite the specific sources using [Source X] format
- Note any distinguishing features that differentiate between the recommended remedies

---

TEXTBOOK EXCERPTS:
{context}

---

PATIENT QUERY: {question}

Provide your professional assessment based solely on the textbook excerpts above:"""


def get_llm():
    """
    Get configured LLM instance.

    Priority:
    1. OpenRouter (if USE_OPENROUTER=true and OPENROUTER_API_KEY is set)
    2. OpenAI (if OPENAI_API_KEY is set)

    Returns:
        ChatOpenAI instance
    """
    # Check for OpenRouter first
    if config.USE_OPENROUTER and config.OPENROUTER_API_KEY:
        logger.info(f"Using OpenRouter with model: {config.OPENROUTER_MODEL}")
        logger.info(f"OpenRouter base URL: {config.OPENROUTER_BASE_URL}")
        return ChatOpenAI(
            model=config.OPENROUTER_MODEL,
            temperature=config.LLM_TEMPERATURE,
            openai_api_key=config.OPENROUTER_API_KEY,
            openai_api_base=config.OPENROUTER_BASE_URL,
        )

    # Fall back to OpenAI
    if config.OPENAI_API_KEY:
        logger.info(f"Using OpenAI with model: {config.LLM_MODEL}")
        return ChatOpenAI(
            model=config.LLM_MODEL,
            temperature=config.LLM_TEMPERATURE,
            openai_api_key=config.OPENAI_API_KEY,
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
