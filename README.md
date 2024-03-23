# Doctor Consultation with Artificial Intelligence.

*Release:  **March 2024***

Hello everyone,  the purpose of this repository is  create a  a simple program that will answer medical questions by using the latest technologies of **IBM**.

The aim of this program is help people who require help.  This program does not replace a real doctor but help to identify the possible health solution.

The technologies which will use is **WatsonX** of **IBM** and **Watson Assistant.**

![](assets/images/posts/README/im-778762.png)

**Watsonx.ai** is part of the IBM watsonx platform that brings together new generative AI capabilities, powered by foundation models, and traditional machine learning into a powerful studio spanning the AI lifecycle. With watsonx.ai, you can train, validate, tune, and deploy generative AI, foundation models, and machine learning capabilities with ease and build AI applications in a fraction of the time with a fraction of the data.

The structure of the program contains four parts.

1. [**Environment creation**](./1-Environment/README.md)

   Here we are going to create the environment to create the models locally that later can be used

2. [**Creation of the Medical Dataset.**](./2-Data/README.md)

   In this part we are going to build the Datasets that will be used create the **Medical Model**

3. [**Creation of the model by using RAG**](./3-Modeling/README.md)

In this part we will perform feature engineering and create the model

We are going to use  **Foundation Models**  and test different models such as:

- **flan-ul2-20b**  - It is an encoder decoder model based on the T5 architecture and instruction-tuned using the Fine-tuned LAnguage Net.Model by Google
- **mt0-xxl-13b**  - An instruction-tuned iteration on mT5.Model by BigScience
- **gpt-neox-20b** - A 20 billion parameter autoregressive language model trained on the Pile.Model by EleutherAI
- **flan-t5-xxl-11b**  - It is an 11 billion parameter model based on the Flan-T5 family.Model by Google
- **mpt-7b-instruct**  - It is a decoder-style transformer pretrained from scratch on 1T tokens of English text and code. 

4. **Implementation of a chatbot with WatsonX in production.**

   Here we will create a chatbot with the capability to answer questions by using the Model created before.

> Let us use the best technologies in the world to help us.  

## Hugging Face Playground 

Beta version for free

[![](assets/images/posts/README/future.jpg)](https://huggingface.co/spaces/ruslanmv/AI-Medical-Chatbot)

## Contributing

Please free to contribute following the standard guidelines for submitting patches and additions or solutions. Feel free to submit issues and enhancement requests.

To more information visit www.ruslanmv.com/doctor

Copyright 2023 Ruslan Magana Vsevolodovna This program is distributed under the terms of the GNU Lesser General Public License.





