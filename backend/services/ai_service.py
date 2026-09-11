import os
from typing import List, Dict, Optional, Any
from openai import OpenAI
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.hf_key = os.getenv("HF_API_KEY")
        
        # Configure OpenAI (Optional)
        if self.openai_key and "your_" not in self.openai_key.lower():
            self.openai_client = OpenAI(api_key=self.openai_key)
        else:
            self.openai_client = None

        # Configure Hugging Face
        if self.hf_key and "your_" not in self.hf_key.lower():
            self.hf_client = InferenceClient(api_key=self.hf_key)
        else:
            self.hf_client = None

    async def get_response(
        self, 
        prompt: str, 
        history: Optional[List[Dict[str, str]]] = None,
        provider: str = "huggingface"
    ) -> str:
        """Get AI response from the specified provider (defaults to HuggingFace)."""
        if provider == "huggingface" and self.hf_client:
            return await self._get_hf_response(prompt, history)
        elif self.openai_client:
            return await self._get_openai_response(prompt, history)
        elif self.hf_client:
            return await self._get_hf_response(prompt, history)
        else:
            raise Exception("No AI provider configured properly.")

    async def _get_hf_response(self, prompt: str, history: Optional[List[Dict[str, str]]]) -> str:
        try:
            messages = []
            if history:
                for msg in history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": prompt})
            
            # Using meta-llama/Meta-Llama-3-8B-Instruct via the free Serverless Inference API
            response = self.hf_client.chat_completion(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=messages,
                max_tokens=600,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Hugging Face Error: {e}")
            raise

    async def _get_openai_response(self, prompt: str, history: Optional[List[Dict[str, str]]]) -> str:
        try:
            messages = []
            if history:
                for msg in history:
                    messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": prompt})
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI Error: {e}")
            raise

# Global instance
ai_service = AIService()
