"""
Pytest configuration and fixtures for AI Medical Chatbot tests.

This module provides shared fixtures and configuration for all test modules.

Author: Ruslan Magana Vsevolodovna
Website: https://ruslanmv.com
License: Apache 2.0
"""

from typing import Any, Dict, Generator
import os
import pytest
from unittest.mock import MagicMock, patch


@pytest.fixture(scope="session")
def test_env_vars() -> Dict[str, str]:
    """
    Provide test environment variables.

    Returns:
        Dict[str, str]: Dictionary of environment variables for testing.
    """
    return {
        "OPENAI_API_KEY": "test-key-123456",
        "REMOTE_SERVER": "127.0.0.1",
        "SYSTEM_MESSAGE": "Test system message",
    }


@pytest.fixture(scope="function")
def mock_openai_client() -> Generator[MagicMock, None, None]:
    """
    Mock OpenAI client for testing.

    Yields:
        MagicMock: Mocked OpenAI client.
    """
    with patch("openai.OpenAI") as mock_client:
        mock_instance = MagicMock()
        mock_client.return_value = mock_instance
        yield mock_instance


@pytest.fixture(scope="function")
def mock_watsonx_client() -> Generator[MagicMock, None, None]:
    """
    Mock IBM WatsonX client for testing.

    Yields:
        MagicMock: Mocked WatsonX client.
    """
    with patch("ibm_watson_machine_learning.foundation_models") as mock_client:
        yield mock_client


@pytest.fixture(scope="function")
def mock_milvus_connection() -> Generator[MagicMock, None, None]:
    """
    Mock Milvus database connection for testing.

    Yields:
        MagicMock: Mocked Milvus connection.
    """
    with patch("pymilvus.connections.connect") as mock_connect:
        yield mock_connect


@pytest.fixture(scope="function")
def sample_medical_question() -> str:
    """
    Provide a sample medical question for testing.

    Returns:
        str: Sample medical question.
    """
    return "I have started to get lots of acne on my face, what can I do?"


@pytest.fixture(scope="function")
def sample_medical_answer() -> str:
    """
    Provide a sample medical answer for testing.

    Returns:
        str: Sample medical answer.
    """
    return (
        "Acne can be managed with proper skincare routine, including gentle cleansing, "
        "using non-comedogenic products, and consulting a dermatologist for treatment options."
    )


@pytest.fixture(scope="function")
def sample_interview_history() -> list:
    """
    Provide sample interview history for testing.

    Returns:
        list: Sample interview history.
    """
    return [
        "Q1: What brings you here today?",
        "A1: I have been experiencing headaches.",
        "Q2: How long have you been experiencing these headaches?",
        "A2: About two weeks.",
    ]


@pytest.fixture(autouse=True)
def reset_environment() -> Generator[None, None, None]:
    """
    Reset environment variables after each test.

    Yields:
        None
    """
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)
