# AI Medical Chatbot

<div align="center">

![AI Medical Chatbot](assets/images/posts/README/im-778762.png)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python Version](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/downloads/)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

**Production-ready AI Medical Chatbot using IBM WatsonX, OpenAI, and advanced LLM technologies**

[Features](#features) • [Quick Start](#quick-start) • [Installation](#installation) • [Usage](#usage) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---

## About

The **AI Medical Chatbot** is a production-ready, enterprise-grade conversational AI system designed to provide medical consultation assistance using state-of-the-art technologies including **IBM WatsonX**, **OpenAI GPT models**, and advanced **Retrieval Augmented Generation (RAG)** techniques.

**Watsonx.ai** is part of the IBM watsonx platform that brings together new generative AI capabilities, powered by foundation models, and traditional machine learning into a powerful studio spanning the AI lifecycle. With watsonx.ai, you can train, validate, tune, and deploy generative AI, foundation models, and machine learning capabilities with ease and build AI applications in a fraction of the time with a fraction of the data.

> **Disclaimer:** This program does not replace a real doctor but helps identify possible health solutions. Always consult with a qualified healthcare professional for medical advice.

### Release Information

- **Current Version:** 2.0.0
- **Release Date:** April 2024
- **Status:** Production-Ready

---

## Features

### Core Capabilities

- **Multi-Model Support**: Integration with multiple foundation models including:
  - **flan-ul2-20b** - Encoder decoder model based on T5 architecture (Google)
  - **mt0-xxl-13b** - Instruction-tuned iteration on mT5 (BigScience)
  - **gpt-neox-20b** - 20B parameter autoregressive language model (EleutherAI)
  - **flan-t5-xxl-11b** - 11B parameter Flan-T5 model (Google)
  - **mpt-7b-instruct** - Decoder-style transformer pretrained on 1T tokens
  - OpenAI GPT-4 and GPT-3.5 models
  - Meta Llama 3 fine-tuned variants

- **RAG-Powered Responses**: Utilizes Retrieval Augmented Generation for accurate, context-aware medical information

- **Vector Database Integration**: Milvus, FAISS, and ChromaDB for efficient similarity search

- **Interactive Interfaces**: Gradio-based web UI with medical interviewer capabilities

- **Production-Ready Infrastructure**:
  - Comprehensive test suite with pytest
  - Type hints and PEP 8 compliance
  - Automated CI/CD pipeline support
  - Makefile-driven development workflow
  - Comprehensive documentation

---

## Quick Start

### Prerequisites

- Python 3.9 or higher
- UV package manager (recommended) or pip
- API keys for OpenAI and/or IBM WatsonX

### Installation

#### Using UV (Recommended)

```bash
# Install uv package manager
pip install uv

# Clone the repository
git clone https://github.com/ruslanmv/ai-medical-chatbot.git
cd ai-medical-chatbot

# Install dependencies
make install

# For development
make install-dev

# For GPU support
make install-gpu
```

#### Using pip

```bash
# Clone the repository
git clone https://github.com/ruslanmv/ai-medical-chatbot.git
cd ai-medical-chatbot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -e .
```

### Environment Setup

Create a `.env` file in the project root:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# IBM WatsonX Configuration (optional)
WATSONX_API_KEY=your_watsonx_api_key_here
WATSONX_PROJECT_ID=your_project_id_here

# Milvus Configuration (optional)
REMOTE_SERVER=127.0.0.1

# System Configuration
SYSTEM_MESSAGE=You are a helpful medical assistant.
```

---

## Usage

### Running the Medical Chatbot

```bash
# Using Makefile
make run-chatbot

# Or directly with Python
python 5-HuggingFace/app.py
```

### Running the Medical Interviewer

```bash
# Using Makefile
make run-interviewer

# Or directly with Python
python 8-Interviewer/hf/app.py
```

### Using the Makefile

The project includes a comprehensive Makefile for common operations:

```bash
# Show all available commands
make help

# Code quality checks
make format          # Format code with black and isort
make lint            # Run linters (flake8, pylint)
make type-check      # Run mypy type checking
make check           # Run all quality checks

# Testing
make test            # Run all tests
make test-unit       # Run unit tests only
make test-integration # Run integration tests only
make test-cov        # Run tests with coverage report

# Cleaning
make clean           # Remove all artifacts
```

---

## Project Structure

The structure of the program contains the following main components:

1. [**Environment creation**](./1-Environment/README.md)

   Here we are going to create the environment to create the models locally that later can be used

2. [**Creation of the Medical Dataset.**](./2-Data/README.md)

   In this part we are going to build the Datasets that will be used create the **Medical Model**

3. [**Creation of the model by using RAG**](./3-Modeling/README.md)
   In this part we will perform feature engineering and create the model

4. [**Finetuning Models for the Medical Chatbot**](./6-FineTunning/README.md)
   We create a custom model based on medical information


5. [**Multimodal Medical Chatbot**](./7-Multimodal/README.md)
   We develop a medical chatbot multimodal, that from images can give you a description of the issue. We analazize different Medical Images Datasets.


## Chatbot with WatsonX

**Implementation of a chatbot with WatsonX in production.**

Here we will create a chatbot with the capability to answer questions by using the Model created before.
For Production in WatsonX you can checkout this repo


[Watsonx-Assistant-with-Milvus-as-Vector-Database](https://github.com/ruslanmv/Watsonx-Assistant-with-Milvus-as-Vector-Database)


## Chatbot with Custom LLM 
We have also developed another version which uses a custom LLM 

[Medical-Chatbot-with-Langchain-with-a-Custom-LLM](https://github.com/ruslanmv/Medical-Chatbot-with-Langchain-with-a-Custom-LLM)

## Playground Demo 


**Medical-Chatbot by RAG method**.

[https://huggingface.co/spaces/ruslanmv/Medical-Llama3-Chatbot](https://huggingface.co/spaces/ruslanmv/Medical-Llama3-Chatbot)

[![](assets/images/posts/README/future.jpg)](https://huggingface.co/spaces/ruslanmv/AI-Medical-Chatbot)



**Medical Chatbot by using Medical-Llama3-8B**

[https://huggingface.co/spaces/ruslanmv/Medical-Llama3-Chatbot](https://huggingface.co/spaces/ruslanmv/Medical-Llama3-Chatbot)


[![](assets/2024-05-16-09-23-02.png)](https://huggingface.co/spaces/ruslanmv/Medical-Llama3-Chatbot)




## Fine-tunning Models with ai-medical chatbot

Currently there are two base models that were pretrained with ai-medical-chatbot

## Meta Llama 3
This repository provides a fine-tuned version of the powerful Llama3 8B model, specifically designed to answer medical questions in an informative way. It leverages the rich knowledge contained in the AI Medical Chatbot dataset.




[Medical-Llama3-8B](https://huggingface.co/ruslanmv/Medical-Llama3-8B)

The latest version of the Medical Llama 2 v2 with an improved Chatbot Interface in Google Colab


[Medical-Llama3-v2](https://huggingface.co/ruslanmv/Medical-Llama3-v2)



## Mixtral-7B
Fine-tuned Mixtral model for answering medical assistance questions. This model is a novel version of mistralai/Mistral-7B-Instruct-v0.2, adapted to a subset of 2.0k records from the AI Medical Chatbot dataset, which contains 250k records . The purpose of this model is to provide a ready chatbot to answer questions related to medical assistance.

[Medical-Mixtral-7B-v2k](https://huggingface.co/ruslanmv/Medical-Mixtral-7B-v2k)

For more details how was pretrained you can visit this post [here](https://ruslanmv.com/blog/How-to-Fine-Tune-Mixtral-87B-Instruct-model-with-PEFT)

> Let us use the best technologies in the world to help us. 



## Medical Interviewer
[![](assets/2024-09-08-19-33-56.png)](https://huggingface.co/spaces/ruslanmv/Medical-Interviewer)

Chatbot that perform medical interview

For more details visit [this](./8-Interviewer/README.md)


## DeepSeek-R1-Distill-Llama-8B

Currently we are developing  a new AI model in collaboration with the [Tilburg University](https://www.tilburguniversity.edu/), to create a new novel model able to understand your feelings.

The study of emotions and their underlying needs is a critical component of understanding human communication, particularly in contexts such as psychology, nonviolent communication (NVC), and conflict resolution. Emotional states often manifest as evaluative expressions—terms like "betrayed," "belittled," or "manipulated"—which not only convey subjective experiences but also point to unmet needs such as trust, respect, or autonomy. Effectively mapping these evaluative expressions to their associated feelings and corresponding needs is vital for creating tools that enhance emotional understanding and foster constructive dialogue.

[![image-20250203130739209](./assets/image-20250203130739209.png)](https://huggingface.co/spaces/ruslanmv/Empathy_Chatbot_v1)
You can test our current model [here](
https://huggingface.co/spaces/ruslanmv/Empathy_Chatbot_v1)

For more details of this project click [here](https://github.com/energycombined/empathyondemand)
## 🩺 Watsonx Medical MCP Server
Watsonx Medical MCP Server is a micro-service that wraps IBM watsonx.ai behind the MCP protocol, giving watsonx Orchestrate instant access to both a general-purpose chat endpoint (`chat_with_watsonx`) and a medical-symptom assessment tool (`analyze_medical_symptoms`).  


[![](https://github.com/ruslanmv/watsonx-medical-mcp-server/raw/master/docs/assets/2025-07-12-19-17-12.png)](https://github.com/ruslanmv/watsonx-medical-mcp-server/blob/master/docs/README.md)

Fully discoverable via STDIO, the server also exposes conversation-management helpers, rich resources/prompts, and ships with a Makefile-driven workflow for linting, auto-formatting, tests, and Docker packaging.  Zero-downtime reloads are achievable in development, and a lightweight Dockerfile plus CI workflow ensure smooth deployment. 

Explore the project [watsonx-medical-mcp-server](https://github.com/ruslanmv/watsonx-medical-mcp-server).



## Contributing
[![Stargazers over time](https://starchart.cc/ruslanmv/ai-medical-chatbot.svg?variant=adaptive)](https://starchart.cc/ruslanmv/ai-medical-chatbot)

Please free to contribute following the standard guidelines for submitting patches and additions or solutions. Feel free to submit issues and enhancement requests.

To more information visit www.ruslanmv.com

---

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 Ruslan Magana Vsevolodovna

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## Author

**Ruslan Magana Vsevolodovna**

- 🌐 Website: [ruslanmv.com](https://ruslanmv.com)
- 📧 Email: contact@ruslanmv.com
- 💼 GitHub: [@ruslanmv](https://github.com/ruslanmv)
- 🤗 Hugging Face: [@ruslanmv](https://huggingface.co/ruslanmv)

---

## Acknowledgments

- IBM WatsonX team for their foundation models
- OpenAI for GPT models and APIs
- Hugging Face for model hosting and deployment infrastructure
- Tilburg University for empathy research collaboration
- The open-source community for their invaluable contributions

---

<div align="center">

**Made with ❤️ by [Ruslan Magana Vsevolodovna](https://ruslanmv.com)**

[⬆ Back to Top](#ai-medical-chatbot)

</div>





