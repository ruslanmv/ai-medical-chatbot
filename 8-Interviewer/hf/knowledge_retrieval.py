import random
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.retrievers import EnsembleRetriever
from ai_config import n_of_questions, openai_api_key
from prompt_instructions import get_interview_prompt_sarah, get_interview_prompt_aaron, get_report_prompt

n_of_questions = n_of_questions()

def setup_knowledge_retrieval(llm, language='english', voice='Sarah'):
    embedding_model = OpenAIEmbeddings(openai_api_key=openai_api_key)

    documents_faiss_index = FAISS.load_local("knowledge/faiss_index_all_documents", embedding_model,
                                               allow_dangerous_deserialization=True)

    documents_retriever = documents_faiss_index.as_retriever()

    combined_retriever = EnsembleRetriever(
        retrievers=[documents_retriever]
    )

    if voice == 'Sarah':
        interview_prompt = ChatPromptTemplate.from_messages([
            ("system", get_interview_prompt_sarah(language, n_of_questions)),
            ("human", "{input}")
        ])
    else:
        interview_prompt = ChatPromptTemplate.from_messages([
            ("system", get_interview_prompt_aaron(language, n_of_questions)),
            ("human", "{input}")
        ])

    report_prompt = ChatPromptTemplate.from_messages([
        ("system", get_report_prompt(language)),
        ("human", "Please provide a concise clinical report based on the interview.")
    ])

    interview_chain = create_stuff_documents_chain(llm, interview_prompt)
    report_chain = create_stuff_documents_chain(llm, report_prompt)

    interview_retrieval_chain = create_retrieval_chain(combined_retriever, interview_chain)
    report_retrieval_chain = create_retrieval_chain(combined_retriever, report_chain)

    return interview_retrieval_chain, report_retrieval_chain, combined_retriever


def get_next_response(interview_chain, message, history, question_count):
    combined_history = "\n".join(history)

    # Check if the interview should end
    if question_count >= n_of_questions:
        return "Thank you for your responses. I will now prepare a report."

    # Generate the next question
    result = interview_chain.invoke({
        "input": f"Based on the patient's last response: '{message}', and considering the full interview history, ask a specific, detailed question that hasn't been asked before and is relevant to the patient's situation.",
        "history": combined_history,
        "question_number": question_count + 1  # Increment question number here
    })

    next_question = result.get("answer", "Could you provide more details on that?")

    # Update history with the new question and response
    history.append(f"Q{question_count + 1}: {next_question}")
    history.append(f"A{question_count + 1}: {message}")

    return next_question


def generate_report(report_chain, history, language):
    combined_history = "\n".join(history)

    result = report_chain.invoke({
        "input": "Please provide a clinical report based on the interview.",
        "history": combined_history,
        "language": language
    })

    return result.get("answer", "Unable to generate report due to insufficient information.")


def get_initial_question(interview_chain):
    result = interview_chain.invoke({
        "input": "What should be the first question in a clinical psychology interview?",
        "history": "",
        "question_number": 1
    })
    return result.get("answer", "Could you tell me a little bit about yourself and what brings you here today?")
