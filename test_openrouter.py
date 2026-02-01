"""
Test script to verify OpenRouter API connection.
Run: python test_openrouter.py
"""
import os
from dotenv import load_dotenv

load_dotenv()

def test_openrouter():
    print("=" * 50)
    print("OpenRouter API Test")
    print("=" * 50)

    # Check environment variables
    api_key = os.getenv("OPENROUTER_API_KEY")
    use_openrouter = os.getenv("USE_OPENROUTER", "false").lower() == "true"

    print(f"\nUSE_OPENROUTER: {use_openrouter}")
    print(f"OPENROUTER_API_KEY: {'Set (' + api_key[:20] + '...)' if api_key else 'NOT SET'}")

    if not api_key:
        print("\nERROR: OPENROUTER_API_KEY not found in .env file")
        return

    # Test with raw HTTP request first
    print("\n" + "-" * 50)
    print("Testing with raw HTTP request...")
    print("-" * 50)

    import requests

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # First, let's check available models
    print("\nFetching available free models...")
    try:
        models_response = requests.get(
            "https://openrouter.ai/api/v1/models",
            headers=headers
        )
        if models_response.status_code == 200:
            models = models_response.json().get("data", [])
            free_models = [m["id"] for m in models if ":free" in m["id"]]
            print(f"Found {len(free_models)} free models:")
            for m in free_models[:10]:  # Show first 10
                print(f"  - {m}")
            if len(free_models) > 10:
                print(f"  ... and {len(free_models) - 10} more")
        else:
            print(f"Failed to fetch models: {models_response.status_code}")
            print(models_response.text)
    except Exception as e:
        print(f"Error fetching models: {e}")

    # Test a simple completion
    print("\n" + "-" * 50)
    print("Testing chat completion...")
    print("-" * 50)

    # Try different free models (from the available list)
    test_models = [
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "nvidia/nemotron-3-nano-30b-a3b:free",
        "arcee-ai/trinity-large-preview:free",
        "upstage/solar-pro-3:free",
    ]

    for model in test_models:
        print(f"\nTrying model: {model}")

        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": "Say 'Hello' in one word."}
            ],
            "max_tokens": 10,
        }

        try:
            response = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload
            )

            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                print(f"Response: {content}")
                print(f"\n SUCCESS! Model '{model}' works!")
                print(f"\nUpdate config.py with this model:")
                print(f'    OPENROUTER_MODEL: str = "{model}"')
                return model
            else:
                print(f"Error: {response.text}")

        except Exception as e:
            print(f"Exception: {e}")

    print("\nNo working free model found. Check your API key or try paid models.")
    return None


if __name__ == "__main__":
    working_model = test_openrouter()

    if working_model:
        print("\n" + "=" * 50)
        print("Test with LangChain")
        print("=" * 50)

        try:
            from langchain_openai import ChatOpenAI

            llm = ChatOpenAI(
                model=working_model,
                temperature=0.1,
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                openai_api_base="https://openrouter.ai/api/v1",
            )

            response = llm.invoke("Say hello in one word.")
            print(f"\nLangChain response: {response.content}")
            print("\nLangChain integration working!")

        except Exception as e:
            print(f"\nLangChain error: {e}")
