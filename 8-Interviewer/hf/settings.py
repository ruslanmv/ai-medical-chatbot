import traceback
from datetime import datetime
from pathlib import Path
import os
import random
import string
import tempfile
import re
import io
import PyPDF2
import docx
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from ai_config import n_of_questions, load_model, openai_api_key, convert_text_to_speech
from knowledge_retrieval import setup_knowledge_retrieval, generate_report

# Initialize settings
n_of_questions = n_of_questions()
current_datetime = datetime.now()
human_readable_datetime = current_datetime.strftime("%B %d, %Y at %H:%M")
current_date = current_datetime.strftime("%Y-%m-%d")

# Initialize the model and retrieval chain
try:
    llm = load_model(openai_api_key)
    interview_retrieval_chain, report_retrieval_chain, combined_retriever = setup_knowledge_retrieval(llm)
    knowledge_base_connected = True
    print("Successfully connected to the knowledge base.")
except Exception as e:
    print(f"Error initializing the model or retrieval chain: {str(e)}")
    knowledge_base_connected = False
    print("Falling back to basic mode without knowledge base.")

question_count = 0
interview_history = []
last_audio_path = None  # Variable to store the path of the last audio file
initial_audio_path = None  # Variable to store the path of the initial audio file
language = None

def generate_random_string(length=5):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
def respond(message, history, voice, selected_interviewer):
    global question_count, interview_history, combined_retriever, last_audio_path, initial_audio_path, language, interview_retrieval_chain, report_retrieval_chain

    if not isinstance(history, list):
        history = []
    if not history or not history[-1]:
        history.append(["", ""])

    # Extract the actual message text
    if isinstance(message, list):
        message = message[-1][0] if message and isinstance(message[-1], list) else message[-1]

    question_count += 1
    interview_history.append(f"Q{question_count}: {message}")
    history_str = "\n".join(interview_history)
    print("Starting interview", question_count)

    try:
        if knowledge_base_connected:
            if question_count == 1:
                # Capture the language from the first response
                language = message.strip().lower()
                # Reinitialize the interview chain with the new language
                interview_retrieval_chain, report_retrieval_chain, combined_retriever = setup_knowledge_retrieval(
                    llm, language, selected_interviewer)

            if question_count < n_of_questions:
                result = interview_retrieval_chain.invoke({
                    "input": f"Based on the patient's statement: '{message}', what should be the next question?",
                    "history": history_str,
                    "question_number": question_count + 1,
                    "language": language
                })
                question = result.get("answer", f"Can you tell me more about that? (in {language})")
            else:
                result = generate_report(report_retrieval_chain, interview_history, language)
                question = result
                speech_file_path = None  # Skip audio generation for the report

            if question:
                random_suffix = generate_random_string()
                speech_file_path = Path(__file__).parent / f"question_{question_count}_{random_suffix}.mp3"
                convert_text_to_speech(question, speech_file_path, voice)
                print(f"Question {question_count} saved as audio at {speech_file_path}")

                # Remove the last audio file if it exists
                if last_audio_path and os.path.exists(last_audio_path):
                    os.remove(last_audio_path)
                last_audio_path = speech_file_path
            else:
                speech_file_path = None  # Skip audio generation for the report

        else:
            # Fallback mode without knowledge base
            question = f"Can you elaborate on that? (in {language})"
            if question_count < n_of_questions:
                speech_file_path = Path(__file__).parent / f"question_{question_count}.mp3"
                convert_text_to_speech(question, speech_file_path, voice)
                print(f"Question {question_count} saved as audio at {speech_file_path}")

                if last_audio_path and os.path.exists(last_audio_path):
                    os.remove(last_audio_path)
                last_audio_path = speech_file_path
            else:
                speech_file_path = None

        history[-1][1] = f"{question}"

        # Remove the initial question audio file after the first user response
        if initial_audio_path and os.path.exists(initial_audio_path):
            os.remove(initial_audio_path)
        initial_audio_path = None

        # Clean up older files based on question_count
        if question_count > 1:
            previous_audio_path = Path(__file__).parent / f"question_{question_count-1}_{random_suffix}.mp3"
            if os.path.exists(previous_audio_path):
                os.remove(previous_audio_path)

        return history, str(speech_file_path) if speech_file_path else None

    except Exception as e:
        print(f"Error in retrieval chain: {str(e)}")
        print(traceback.format_exc())
        return history, None




def reset_interview():
    """Reset the interview state."""
    global question_count, interview_history, last_audio_path, initial_audio_path
    question_count = 0
    interview_history = []
    if last_audio_path and os.path.exists(last_audio_path):
        os.remove(last_audio_path)
    last_audio_path = None
    initial_audio_path = None


def read_file(file):
    if file is None:
        return "No file uploaded"

    if isinstance(file, str):
        with open(file, 'r', encoding='utf-8') as f:
            return f.read()

    if hasattr(file, 'name'):  # Check if it's a file-like object
        if file.name.endswith('.txt'):
            return file.content
        elif file.name.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.content))
            return "\n".join(page.extract_text() for page in pdf_reader.pages)
        elif file.name.endswith('.docx'):
            doc = docx.Document(io.BytesIO(file.content))
            return "\n".join(paragraph.text for paragraph in doc.paragraphs)
        else:
            return "Unsupported file format"

    return "Unable to read file"

def generate_report_from_file(file, language):
    try:
        file_content = read_file(file)
        if file_content == "No file uploaded" or file_content == "Unsupported file format" or file_content == "Unable to read file":
            return file_content

        file_content = file_content[:100000]
        
        report_language = language.strip().lower() if language else "english"
        print('preferred language:', report_language)
        print(f"Generating report in language: {report_language}")  # For debugging

        # Reinitialize the report chain with the new language
        _, report_retrieval_chain, _ = setup_knowledge_retrieval(llm, report_language)

        result = report_retrieval_chain.invoke({
            "input": "Please provide a clinical report based on the following content:",
            "history": file_content,
            "language": report_language
        })
        report_content = result.get("answer", "Unable to generate report due to insufficient information.")
        pdf_path = create_pdf(report_content)
        return report_content, pdf_path
    except Exception as e:
        return f"An error occurred while processing the file: {str(e)}", None


def generate_interview_report(interview_history, language):
    try:
        report_language = language.strip().lower() if language else "english"
        print('preferred report_language language:', report_language)
        _, report_retrieval_chain, _ = setup_knowledge_retrieval(llm, report_language)

        result = report_retrieval_chain.invoke({
            "input": "Please provide a clinical report based on the following interview:",
            "history": "\n".join(interview_history),
            "language": report_language
        })
        report_content = result.get("answer", "Unable to generate report due to insufficient information.")
        pdf_path = create_pdf(report_content)
        return report_content, pdf_path
    except Exception as e:
        return f"An error occurred while generating the report: {str(e)}", None

def create_pdf(content):

    random_string = generate_random_string()
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f'_report.pdf')
    doc = SimpleDocTemplate(temp_file.name, pagesize=letter)
    styles = getSampleStyleSheet()

    # Create a custom style for bold text
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10)

    # Create a custom style for normal text with justification
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], alignment=TA_JUSTIFY)

    flowables = []

    for line in content.split('\n'):
        # Use regex to find words surrounded by **
        parts = re.split(r'(\*\*.*?\*\*)', line)
        paragraph_parts = []

        for part in parts:
            if part.startswith('**') and part.endswith('**'):
                # Bold text
                bold_text = part.strip('**')
                paragraph_parts.append(Paragraph(bold_text, bold_style))
            else:
                # Normal text
                paragraph_parts.append(Paragraph(part, normal_style))

        flowables.extend(paragraph_parts)
        flowables.append(Spacer(1, 12))  # Add space between paragraphs

    doc.build(flowables)
    return temp_file.name